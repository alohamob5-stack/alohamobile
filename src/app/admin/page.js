'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminHeader from './components/AdminHeader';
import { useAdminAuth } from './useAdminAuth';
import { FileText, Search, Package, MapPin } from 'lucide-react';

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [productMeta, setProductMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastCount, setLastCount] = useState(null);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [openDate, setOpenDate] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('sve');
  const [locationFilter, setLocationFilter] = useState('sve');
  const [statusUpdating, setStatusUpdating] = useState(null);
  const router = useRouter();
  const auth = useAdminAuth();

  useEffect(() => {
    if (!auth) return;
    const isAdminUser = auth.role === 'admin' || auth.username === 'magacin';
    if (!isAdminUser) { router.push('/admin/proizvodi'); return; }
    Notification.requestPermission();
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [auth]);

  async function fetchOrders() {
    const [{ data }, { data: locs }, { data: prods }] = await Promise.all([
      sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      sb.from('locations').select('*'),
      sb.from('products').select('id, barcode, categories(name), protection_type, shelf_location').range(0, 4999),
    ]);
    const orders = data || [];
    setOrders(orders);
    setLocations(locs || []);
    const metaMap = {};
    (prods || []).forEach(p => { metaMap[p.id] = { barcode: p.barcode, categoryName: p.categories?.name || 'Ostalo', protectionType: p.protection_type || null, shelfLocation: p.shelf_location || null }; });
    setProductMeta(metaMap);
    setLoading(false);
    const novaCount = orders.filter(o => o.status === 'nova').length;
    if (lastCount !== null && novaCount > lastCount) {
      if (Notification.permission === 'granted') {
        new Notification('Nova narudžbina!', { body: 'Stigla nova narudžbina na Aloha Mob!' });
      }
    }
    setLastCount(novaCount);
  }

  function toggleOrderOpen(id) {
    setOpenOrderId(prev => prev === id ? null : id);
  }

  async function togglePacked(itemId, currentPacked) {
    setOrders(prev => prev.map(o => ({
      ...o,
      order_items: o.order_items?.map(it => it.id === itemId ? { ...it, packed: !currentPacked } : it)
    })));
    const { error } = await sb.from('order_items').update({ packed: !currentPacked }).eq('id', itemId);
    if (error) {
      console.error('Greška pri čuvanju packed statusa:', error);
      setOrders(prev => prev.map(o => ({
        ...o,
        order_items: o.order_items?.map(it => it.id === itemId ? { ...it, packed: currentPacked } : it)
      })));
    }
  }

  // Atomska izmena zaliha (koristi istu adjust_stock funkciju u bazi kao dugmici +/- u Proizvodima) -
  // sprecava gubljenje izmena kad se vise akcija desava u istom periodu (ranija verzija je
  // citala trenutno stanje pa ga upisivala u dva odvojena koraka, sto je moglo da izgubi
  // istovremenu rucnu prodaju/korekciju).
  async function applyStockForDelivery(order) {
    const { data: magacin, error: magErr } = await sb.from('locations').select('*').eq('name', 'Magacin').single();
    if (magErr) console.error('applyStockForDelivery: greška pri čitanju Magacina:', magErr);
    if (!magacin) return;

    for (const item of order.order_items || []) {
      const { error: magRpcErr } = await sb.rpc('adjust_stock', {
        p_product_id: item.product_id, p_location_id: magacin.id, p_delta: -item.quantity
      });
      if (magRpcErr) console.error(`applyStockForDelivery: greška pri umanjenju magacina za proizvod ${item.product_id}:`, magRpcErr);

      if (order.source_location_id) {
        const { error: locRpcErr } = await sb.rpc('adjust_stock', {
          p_product_id: item.product_id, p_location_id: order.source_location_id, p_delta: item.quantity
        });
        if (locRpcErr) console.error(`applyStockForDelivery: greška pri uvećanju lokacije za proizvod ${item.product_id}:`, locRpcErr);
      }
    }
  }

  async function updateStatus(order, status) {
    // Sprecavanje duplog izvrsavanja: ako se vec obradjuje ova porudzbina, ignorisi novi klik
    if (statusUpdating === order.id) return;
    setStatusUpdating(order.id);
    try {
      // Proveri SVEZE stanje direktno iz baze (ne oslanjaj se na vec ucitanu, potencijalno zastarelu vrednost)
      const { data: current } = await sb.from('orders').select('status').eq('id', order.id).single();
      const wasAlreadyDelivered = current?.status === 'isporucena';
      await sb.from('orders').update({ status }).eq('id', order.id);
      if (status === 'isporucena' && !wasAlreadyDelivered) {
        await applyStockForDelivery(order);
      }
      fetchOrders();
    } finally {
      setStatusUpdating(null);
    }
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Aloha Mob - Narudzbine', 14, 15);
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date().toLocaleString('sr-RS')}`, 14, 22);
    orders.forEach((o, i) => {
      const prevY = i === 0 ? 22 : doc.lastAutoTable.finalY;
      const y = prevY + 10;
      if (y > 250) doc.addPage();
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${o.name} - ${o.phone}`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${o.city}, ${o.address} | ${o.payment === 'cod' ? 'Pouzecem' : 'Karticom'} | Status: ${o.status}`, 14, y + 5);
      autoTable(doc, {
        startY: y + 8,
        head: [['Proizvod', 'Kol.', 'Cena', 'Ukupno']],
        body: o.order_items?.map(x => [x.product_name, x.quantity, `${Number(x.price).toLocaleString('sr-RS')} RSD`, `${Number(x.price * x.quantity).toLocaleString('sr-RS')} RSD`]) || [],
        foot: [[{ content: `Ukupno: ${Number(o.total).toLocaleString('sr-RS')} RSD`, colSpan: 4, styles: { fontStyle: 'bold' } }]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [230, 57, 70] },
        margin: { left: 14, right: 14 },
      });
    });
    doc.save(`narudzbine-${new Date().toLocaleDateString('sr-RS')}.pdf`);
  }

  function exportOrderPDF(o) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Aloha Mob - Narudzbina', 14, 15);
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date(o.created_at).toLocaleString('sr-RS')}`, 14, 22);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${o.name} - ${o.phone}`, 14, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${o.city}, ${o.address}`, 14, 38);
    if (o.note) doc.text(`Napomena: ${o.note}`, 14, 44);
    doc.text(`Placanje: ${o.payment === 'cod' ? 'Pouzecem' : 'Karticom'}`, 14, o.note ? 50 : 44);
    autoTable(doc, {
      startY: 56,
      head: [['Proizvod', 'Kol.', 'Cena', 'Ukupno']],
      body: o.order_items?.map(x => [x.product_name, x.quantity, `${Number(x.price).toLocaleString('sr-RS')} RSD`, `${Number(x.price * x.quantity).toLocaleString('sr-RS')} RSD`]) || [],
      foot: [[{ content: `Ukupno: ${Number(o.total).toLocaleString('sr-RS')} RSD`, colSpan: 4, styles: { fontStyle: 'bold' } }]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [230, 57, 70] },
      margin: { left: 14, right: 14 },
    });
    doc.save(`narudzbina-${o.name.replace(/ /g, '_')}.pdf`);
  }

  const statusLabels = { nova: 'Nova', u_obradi: 'U obradi', isporucena: 'Isporučena', otkazana: 'Otkazana' };
  const statusColors = { nova: '#2563eb', u_obradi: '#d97706', isporucena: '#16a34a', otkazana: '#dc2626' };
  const statusBg = { nova: '#eff6ff', u_obradi: '#fffbeb', isporucena: '#f0fdf4', otkazana: '#fef2f2' };

  const locationStyles = {
    'Kula': { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a', badge: '#dcfce7' },
    'Vrbas': { bg: '#fef2f2', border: '#fca5a5', accent: '#dc2626', badge: '#fee2e2' },
    'Backa Topola': { bg: '#eff6ff', border: '#93c5fd', accent: '#2563eb', badge: '#dbeafe' },
  };

  function getLocationName(o) {
    if (!o.source_location_id) return null;
    const loc = locations.find(l => l.id === o.source_location_id);
    return loc?.name || null;
  }

  const PROTECTION_ORDER = { 'Obično': 0, '5D': 1, 'Privacy': 2, 'UV': 3 };
  function groupItemsByCategory(items) {
    const grouped = {};
    (items || []).forEach(item => {
      const catName = productMeta[item.product_id]?.categoryName || 'Ostalo';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(item);
    });
    if (grouped['Stakla']) {
      grouped['Stakla'] = [...grouped['Stakla']].sort((a, b) => {
        const pa = productMeta[a.product_id]?.protectionType;
        const pb = productMeta[b.product_id]?.protectionType;
        const oa = PROTECTION_ORDER[pa] ?? 99;
        const ob = PROTECTION_ORDER[pb] ?? 99;
        if (oa !== ob) return oa - ob;
        return (a.product_name || '').localeCompare(b.product_name || '');
      });
    }
    return grouped;
  }

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'sve' && o.status !== statusFilter) return false;
    if (locationFilter !== 'sve') {
      const locName = getLocationName(o);
      if (locationFilter === 'sajt' ? locName : locName !== locationFilter) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${o.name} ${o.phone} ${o.city}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  function dateKey(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  }
  function formatDateLabel(key) {
    const [y, m, d] = key.split('-');
    const today = dateKey(new Date());
    const yesterday = dateKey(new Date(Date.now() - 86400000));
    if (key === today) return `Danas — ${d}.${m}.${y}.`;
    if (key === yesterday) return `Juče — ${d}.${m}.${y}.`;
    return `${d}.${m}.${y}.`;
  }

  const ordersByDate = {};
  filteredOrders.forEach(o => {
    const key = dateKey(o.created_at);
    if (!ordersByDate[key]) ordersByDate[key] = [];
    ordersByDate[key].push(o);
  });
  const dateKeys = Object.keys(ordersByDate).sort((a, b) => b.localeCompare(a));
  const effectiveOpenDate = openDate !== null ? openDate : (dateKeys[0] || null);

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Učitavanje...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: '#1a1a1a' }}>Narudžbine</h1>
          <button onClick={exportPDF} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={15} /> Izvezi sve (PDF)</button>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pretraga po imenu, telefonu ili gradu..."
              style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}>
            <option value="sve">Svi statusi</option>
            <option value="nova">Nova</option>
            <option value="u_obradi">U obradi</option>
            <option value="isporucena">Isporučena</option>
            <option value="otkazana">Otkazana</option>
          </select>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}>
            <option value="sve">Sve lokacije</option>
            <option value="sajt">Sa sajta</option>
            <option value="Kula">Kula</option>
            <option value="Vrbas">Vrbas</option>
            <option value="Backa Topola">Bačka Topola</option>
          </select>
        </div>

        {filteredOrders.length === 0 ? <p style={{ color: '#666' }}>Nema narudžbina koje odgovaraju pretrazi.</p> : dateKeys.map(dk => {
          const dayOrders = ordersByDate[dk];
          const dayTotal = dayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
          const isDateOpen = effectiveOpenDate === dk;
          return (
            <div key={dk} style={{ marginBottom: '1rem' }}>
              <div onClick={() => setOpenDate(isDateOpen ? '' : dk)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.1rem', background: '#1a1a1a', color: '#fff', borderRadius: '10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', transform: isDateOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>{formatDateLabel(dk)}</span>
                  <span style={{ fontSize: '0.78rem', color: '#aaa' }}>({dayOrders.length} {dayOrders.length === 1 ? 'porudžbina' : 'porudžbina'})</span>
                </div>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#ef8a1c' }}>{dayTotal.toLocaleString('sr-RS')} RSD</span>
              </div>

              {isDateOpen && (
                <div style={{ marginTop: '0.6rem' }}>
                  {dayOrders.map(o => {
                    const locName = getLocationName(o);
                    const locStyle = locName ? locationStyles[locName] : null;
                    const isOpen = openOrderId === o.id;
                    const packedCount = (o.order_items || []).filter(it => it.packed).length;
                    const totalItems = o.order_items?.length || 0;
                    const groupedItems = isOpen ? groupItemsByCategory(o.order_items) : {};
                    const categoryOrder = Object.keys(groupedItems).sort();

                    return (
                      <div key={o.id} style={{
                        background: locStyle ? locStyle.bg : '#fff',
                        border: `1.5px solid ${locStyle ? locStyle.border : '#e8e8e8'}`,
                        borderRadius: '12px', marginBottom: '0.75rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden'
            }}>
              <div onClick={() => toggleOrderOpen(o.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem', cursor: 'pointer', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.85rem', color: '#999', transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s', flexShrink: 0 }}>›</span>
                  {locStyle && (
                    <span style={{ flexShrink: 0, padding: '0.15rem 0.5rem', background: locStyle.badge, color: locStyle.accent, borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800' }}>
                      <Package size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {locName}
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{o.name}</span>
                    <span style={{ color: '#888', fontWeight: '400', fontSize: '0.82rem' }}> — {o.phone}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#aaa', flexShrink: 0 }}>{totalItems} art. {packedCount > 0 && `(${packedCount}/${totalItems} ✓)`}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <span style={{ fontWeight: '800', fontSize: '1rem', color: '#ef8a1c' }}>{Number(o.total).toLocaleString('sr-RS')} RSD</span>
                  <select value={o.status} onChange={e => updateStatus(o, e.target.value)} disabled={statusUpdating === o.id}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: `2px solid ${statusColors[o.status] || '#ccc'}`, color: statusColors[o.status], background: statusBg[o.status] || '#fff', fontWeight: '700', cursor: statusUpdating === o.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: statusUpdating === o.id ? 0.5 : 1 }}>
                    <option value="nova">Nova</option>
                    <option value="u_obradi">U obradi</option>
                    <option value="isporucena">Isporučena</option>
                    <option value="otkazana">Otkazana</option>
                  </select>
                  <button onClick={() => exportOrderPDF(o)} style={{ padding: '0.35rem 0.5rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><FileText size={13} /></button>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '1rem 1.1rem', background: 'rgba(255,255,255,0.5)' }}>
                  <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.85rem' }}>{o.city}, {o.address}</p>
                  {o.note && <p style={{ margin: '0 0 0.3rem', color: '#888', fontSize: '0.82rem' }}>Napomena: {o.note}</p>}
                  <p style={{ margin: '0 0 0.3rem', fontSize: '0.82rem', color: '#888' }}>Plaćanje: {o.payment === 'cod' ? 'Pouzećem' : 'Karticom'}</p>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#aaa' }}>{new Date(o.created_at).toLocaleString('sr-RS')}</p>

                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '0.75rem' }}>
                    {categoryOrder.map(catName => (
                      <div key={catName} style={{ marginBottom: '0.85rem' }}>
                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{catName}:</p>
                        {groupedItems[catName].map((item) => {
                          const barcode = productMeta[item.product_id]?.barcode;
                          const shelfLocation = productMeta[item.product_id]?.shelfLocation;
                          const isPacked = !!item.packed;
                          return (
                            <div key={item.id} onClick={() => togglePacked(item.id, isPacked)}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#444', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', background: isPacked ? 'rgba(22,163,74,0.08)' : 'transparent' }}>
                              <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isPacked ? '#16a34a' : '#ccc'}`, background: isPacked ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                                {isPacked && <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '900' }}>✓</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ textDecoration: isPacked ? 'line-through' : 'none', opacity: isPacked ? 0.6 : 1 }}>{item.product_name} × {item.quantity}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.1rem' }}>
                                  {barcode && <span style={{ fontSize: '0.72rem', color: '#999', fontFamily: 'monospace' }}>{barcode}</span>}
                                  {shelfLocation && (
                                    <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                      <MapPin size={11} /> {shelfLocation}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span style={{ fontWeight: '600', flexShrink: 0 }}>{Number(item.price * item.quantity).toLocaleString('sr-RS')} RSD</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
