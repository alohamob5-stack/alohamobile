'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, makeSlug } from '../../lib/supabase';
import { getShopSession, shopLogout } from '../../lib/shopAuth';
import { Palmtree } from 'lucide-react';

export default function MojePorudzbine() {
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [productBarcodes, setProductBarcodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [openDate, setOpenDate] = useState(null);
  const [openOrderId, setOpenOrderId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const s = getShopSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    fetchOrders(s);
  }, []);

  async function fetchOrders(s) {
    let query = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (s.type === 'shop') {
      query = query.eq('source_location_id', s.locationId);
    } else if (s.type === 'customer') {
      query = query.eq('customer_id', s.customerId);
    }
    const [{ data }, { data: prods }] = await Promise.all([
      query,
      sb.from('products').select('id, barcode'),
    ]);
    setOrders(data || []);
    const barcodeMap = {};
    (prods || []).forEach(p => { barcodeMap[p.id] = p.barcode; });
    setProductBarcodes(barcodeMap);
    setLoading(false);
  }

  const statusLabels = { nova: 'Nova', u_obradi: 'U obradi', poslata: 'Poslata', otkazana: 'Otkazana' };
  const statusColors = { nova: '#2563eb', u_obradi: '#d97706', poslata: '#16a34a', otkazana: '#dc2626' };
  const statusBg = { nova: '#eff6ff', u_obradi: '#fffbeb', poslata: '#f0fdf4', otkazana: '#fef2f2' };

  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);

  function dateKey(dateStr) {
    return new Date(dateStr).toISOString().slice(0, 10);
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
  orders.forEach(o => {
    const key = dateKey(o.created_at);
    if (!ordersByDate[key]) ordersByDate[key] = [];
    ordersByDate[key].push(o);
  });
  const dateKeys = Object.keys(ordersByDate).sort((a, b) => b.localeCompare(a));
  const effectiveOpenDate = openDate !== null ? openDate : (dateKeys[0] || null);

  function handleLogout() {
    shopLogout();
    router.push('/');
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', color: 'var(--muted)' }}>Učitavanje...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#fff', padding: '0 1rem', borderBottom: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(15,30,61,0.08)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem', height: '56px' }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: '700', color: 'var(--black)', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--black), var(--lagoon))', color: '#fff', flexShrink: 0 }}><Palmtree size={16} /></span>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <button onClick={() => setLogoutConfirmOpen(true)} style={{ marginLeft: 'auto', background: '#fff', border: '1.5px solid var(--border)', color: 'var(--black)', padding: '0.5rem 1rem', borderRadius: 'var(--pill)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
            Odjava
          </button>
          <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1.5px solid var(--border)', color: 'var(--black)', padding: '0.5rem 1rem', borderRadius: 'var(--pill)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
            ← Početna
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 0.3rem' }}>Moje porudžbine</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
          {session?.type === 'shop' ? session.locationName : session?.name}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>Ukupno porudžbina</p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: '800', color: 'var(--text)' }}>{orders.length}</p>
          </div>
          <div style={{ flex: 1, minWidth: '140px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>Ukupno potrošeno</p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: '800', color: 'var(--red)' }}>{totalSpent.toLocaleString('sr-RS')} RSD</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
            <p>Nemate još nijednu porudžbinu.</p>
          </div>
        ) : dateKeys.map(dk => {
          const dayOrders = ordersByDate[dk];
          const dayTotal = dayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
          const isDateOpen = effectiveOpenDate === dk;
          return (
            <div key={dk} style={{ marginBottom: '1rem' }}>
              <div onClick={() => setOpenDate(isDateOpen ? '' : dk)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.1rem', background: 'var(--black)', color: '#fff', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', transform: isDateOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>{formatDateLabel(dk)}</span>
                  <span style={{ fontSize: '0.78rem', color: '#aaa' }}>({dayOrders.length})</span>
                </div>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--red)' }}>{dayTotal.toLocaleString('sr-RS')} RSD</span>
              </div>

              {isDateOpen && dayOrders.map(o => {
                const isOrderOpen = openOrderId === o.id;
                return (
                  <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: '0.6rem', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                    <div onClick={() => setOpenOrderId(isOrderOpen ? null : o.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '1rem 1.25rem', cursor: 'pointer' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
                          Porudžbina <strong style={{ color: 'var(--text)' }}>#{o.id}</strong> · {new Date(o.created_at).toLocaleString('sr-RS')}
                        </p>
                        <p style={{ margin: '0.2rem 0 0', fontWeight: '700', fontSize: '1.05rem', color: 'var(--text)' }}>{Number(o.total).toLocaleString('sr-RS')} RSD</p>
                      </div>
                      <span style={{ alignSelf: 'flex-start', padding: '0.3rem 0.75rem', borderRadius: 'var(--pill)', fontSize: '0.8rem', fontWeight: '700', color: statusColors[o.status], background: statusBg[o.status] }}>
                        {statusLabels[o.status] || o.status}
                      </span>
                    </div>
                    {isOrderOpen && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.25rem 1.25rem' }}>
                        {o.order_items?.map((item, i) => {
                          const barcode = productBarcodes[item.product_id];
                          return (
                            <div key={i} onClick={() => router.push(`/proizvod/${makeSlug(item.product_name, item.product_id)}`)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text)', cursor: 'pointer', padding: '0.3rem', margin: '0 -0.3rem 0.2rem', borderRadius: '6px' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div>
                                <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>{item.product_name}</span> × {item.quantity}
                                {barcode && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'monospace', marginTop: '0.1rem' }}>{barcode}</div>}
                              </div>
                              <span style={{ fontWeight: '600', flexShrink: 0, marginLeft: '0.75rem' }}>{Number(item.price * item.quantity).toLocaleString('sr-RS')} RSD</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {logoutConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={() => setLogoutConfirmOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '340px', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚪</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>Da li ste sigurni?</h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: 'var(--muted)' }}>Bićete odjavljeni sa naloga.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setLogoutConfirmOpen(false)} style={{ flex: 1, padding: '0.7rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: '#fff', fontWeight: '700', color: 'var(--text)' }}>Otkaži</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '0.7rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--red)', color: '#fff', fontWeight: '700' }}>Odjavi se</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
