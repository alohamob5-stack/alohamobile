'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../../lib/supabase';
import AdminHeader from '../components/AdminHeader';
import { useAdminAuth } from '../useAdminAuth';
import { Store, Globe, BarChart3, AlertTriangle } from 'lucide-react';

const RANGES = { danas: 1, '7dana': 7, '30dana': 30, sve: null };
const rangeLabels = { danas: 'Danas', '7dana': '7 dana', '30dana': '30 dana', sve: 'Sve vreme' };
const BAR_COLORS = ['#ef8a1c', '#f4a261', '#2a9d8f', '#457b9d', '#8b5cf6', '#e76f51', '#06923e', '#c9184a', '#3a86ff', '#ffb703'];

function getSinceIso(range) {
  if (range === 'sve') return null;
  if (range === 'danas') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  const days = RANGES[range];
  return new Date(Date.now() - days * 86400000).toISOString();
}

function TotalsCard({ totals, showInput, extraPct, extraCostInput, setExtraCostInput, applyExtraCost }) {
  const extraCost = totals.cost * (extraPct / 100);
  const finalProfit = totals.profit - extraCost;
  return (
    <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
      {showInput && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e5e5', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: '700' }}>Ostali troškovi (transport, carina...):</span>
          <input type="number" min={0} max={100} step={0.5} value={extraCostInput} placeholder="0"
            onChange={e => setExtraCostInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyExtraCost(); }}
            style={{ width: '70px', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: '700' }} />
          <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: '600' }}>% od nabavne vrednosti</span>
          <button onClick={applyExtraCost} style={{ padding: '0.4rem 0.9rem', borderRadius: '6px', border: 'none', background: '#1a1a1a', color: '#fff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
            Izračunaj
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#999', fontWeight: '700', textTransform: 'uppercase' }}>Prodajna vrednost</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#1a1a1a' }}>{totals.revenue.toLocaleString('sr-RS')} RSD</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#999', fontWeight: '700', textTransform: 'uppercase' }}>Nabavna vrednost</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#666' }}>{totals.cost.toLocaleString('sr-RS')} RSD</p>
        </div>
        {extraPct > 0 && (
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#999', fontWeight: '700', textTransform: 'uppercase' }}>Ostali troškovi ({extraPct}%)</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#d97706' }}>{extraCost.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD</p>
          </div>
        )}
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#999', fontWeight: '700', textTransform: 'uppercase' }}>Profit</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: finalProfit >= 0 ? '#16a34a' : '#dc2626' }}>{finalProfit.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD</p>
        </div>
      </div>
      {totals.costMissing && <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={13} /> Neki artikli nemaju unetu nabavnu cenu - profit je zato potcenjen</p>}
    </div>
  );
}

function SortableTh({ label, sortKey, currentKey, currentDir, onSort, align }) {
  const isActive = currentKey === sortKey;
  return (
    <th onClick={() => onSort(sortKey)}
      style={{ padding: '0.4rem 0.3rem', textAlign: align || 'left', cursor: 'pointer', userSelect: 'none', color: isActive ? '#1a1a1a' : '#999', whiteSpace: 'nowrap' }}>
      {label} <span style={{ fontSize: '0.68rem', opacity: isActive ? 1 : 0.35 }}>{isActive ? (currentDir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </th>
  );
}

function sortRows(rows, key, dir, getValue) {
  return [...rows].sort((a, b) => {
    const va = getValue(a, key);
    const vb = getValue(b, key);
    if (typeof va === 'string' || typeof vb === 'string') {
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    }
    return dir === 'asc' ? va - vb : vb - va;
  });
}

function makeSortToggle(currentKey, setKey, currentDir, setDir) {
  return (key) => {
    if (currentKey === key) { setDir(currentDir === 'asc' ? 'desc' : 'asc'); }
    else { setKey(key); setDir('desc'); }
  };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 900); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function Statistika() {
  const [range, setRange] = useState('danas');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [locationFilter, setLocationFilter] = useState('sve');
  const [catFilter, setCatFilter] = useState('sve');
  const [locations, setLocations] = useState([]);
  const [cats, setCats] = useState([]);
  const [storeSales, setStoreSales] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [catTotalsStore, setCatTotalsStore] = useState([]);
  const [catTotalsOnline, setCatTotalsOnline] = useState([]);
  const [storeTotals, setStoreTotals] = useState({ revenue: 0, cost: 0, profit: 0 });
  const [onlineTotals, setOnlineTotals] = useState({ revenue: 0, cost: 0, profit: 0 });
  const [extraCostInput, setExtraCostInput] = useState('');
  const [extraCostPercent, setExtraCostPercent] = useState(0);
  const [storeVisibleCount, setStoreVisibleCount] = useState(10);
  const [onlineVisibleCount, setOnlineVisibleCount] = useState(10);
  const [storeSortKey, setStoreSortKey] = useState('qty');
  const [storeSortDir, setStoreSortDir] = useState('desc');
  const [onlineSortKey, setOnlineSortKey] = useState('qty');
  const [onlineSortDir, setOnlineSortDir] = useState('desc');
  const [searchVal, setSearchVal] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [catsDrawerOpen, setCatsDrawerOpen] = useState(false);
  const auth = useAdminAuth();

  useEffect(() => {
    if (!auth) return;
    const isAdmin = auth.role === 'admin' || auth.username === 'magacin';
    if (!isAdmin) { router.push('/admin/proizvodi'); return; }
    fetchData();
  }, [auth, range, customFrom, customTo, locationFilter, catFilter]);

  function getDateBounds() {
    if (customFrom || customTo) {
      const since = customFrom ? new Date(customFrom + 'T00:00:00').toISOString() : null;
      const until = customTo ? new Date(customTo + 'T23:59:59.999').toISOString() : null;
      return { since, until };
    }
    return { since: getSinceIso(range), until: null };
  }

  function selectRange(k) {
    setRange(k);
    setCustomFrom('');
    setCustomTo('');
  }

  async function fetchData() {
    setLoading(true);
    setStoreVisibleCount(10);
    setOnlineVisibleCount(10);
    const { since: sinceIso, until: untilIso } = getDateBounds();

    const [{ data: locs }, { data: catsData }, { data: products }, { data: stockRows }] = await Promise.all([
      sb.from('locations').select('*').order('id'),
      sb.from('categories').select('*').order('name'),
      sb.from('products').select('id, name, barcode, price, cost_price, category_id, categories(name)'),
      sb.from('stock').select('product_id, location_id, quantity'),
    ]);
    setLocations(locs || []);
    setCats(catsData || []);
    const prodMap = {};
    (products || []).forEach(p => { prodMap[p.id] = { name: p.name, barcode: p.barcode || '', catName: p.categories?.name || 'Ostalo', price: Number(p.price) || 0, cost: p.cost_price != null ? Number(p.cost_price) : null }; });
    // Stanje u Magacinu po proizvodu - prikazuje se pored svakog artikla u tabeli "Najprodavanije"
    const magacinLoc = (locs || []).find(l => l.name === 'Magacin');
    const magacinStockMap = {};
    if (magacinLoc) {
      (stockRows || []).filter(s => s.location_id === magacinLoc.id).forEach(s => { magacinStockMap[s.product_id] = s.quantity; });
    }

    const matchesCat = (pid) => catFilter === 'sve' || prodMap[pid]?.catName === catFilter;
    const selectedLoc = locationFilter !== 'sve' ? (locs || []).find(l => l.name === locationFilter) : null;

    const catAggStore = {};
    const catAggOnline = {};

    let logQuery = sb.from('stock_log').select('product_id, location_id, delta, created_at').in('reason', ['sken', 'proizvodi']).lt('delta', 0);
    if (sinceIso) logQuery = logQuery.gte('created_at', sinceIso);
    if (untilIso) logQuery = logQuery.lte('created_at', untilIso);
    if (selectedLoc) logQuery = logQuery.eq('location_id', selectedLoc.id);
    const { data: logs } = await logQuery;

    const storeAgg = {};
    let storeRevenue = 0, storeCost = 0, storeCostMissing = false;
    (logs || []).forEach(row => {
      const pid = row.product_id;
      if (!matchesCat(pid)) return;
      const qty = Math.abs(row.delta);
      const meta = prodMap[pid];
      if (!storeAgg[pid]) storeAgg[pid] = { product_id: pid, name: meta?.name || `#${pid}`, barcode: meta?.barcode || '', qty: 0, byLocation: {}, unitPrice: meta?.price || 0, unitCost: meta?.cost, magacinStock: magacinStockMap[pid] ?? 0 };
      storeAgg[pid].qty += qty;
      const locName = (locs || []).find(l => l.id === row.location_id)?.name || '?';
      storeAgg[pid].byLocation[locName] = (storeAgg[pid].byLocation[locName] || 0) + qty;
      const catNameS = meta?.catName || 'Ostalo';
      catAggStore[catNameS] = (catAggStore[catNameS] || 0) + qty;
      storeRevenue += qty * (meta?.price || 0);
      if (meta?.cost == null) storeCostMissing = true;
      else storeCost += qty * meta.cost;
    });
    setStoreSales(Object.values(storeAgg).sort((a, b) => b.qty - a.qty));
    setStoreTotals({ revenue: storeRevenue, cost: storeCost, profit: storeRevenue - storeCost, costMissing: storeCostMissing });

    let orderQuery = sb.from('orders').select('id, created_at, source_location_id, order_items(product_id, product_name, quantity, price)').is('source_location_id', null);
    if (sinceIso) orderQuery = orderQuery.gte('created_at', sinceIso);
    if (untilIso) orderQuery = orderQuery.lte('created_at', untilIso);
    const { data: orders } = await orderQuery;

    const onlineAgg = {};
    let onlineRevenue = 0, onlineCost = 0, onlineCostMissing = false;
    (orders || []).forEach(o => {
      (o.order_items || []).forEach(item => {
        if (!matchesCat(item.product_id)) return;
        const key = item.product_name;
        const meta = prodMap[item.product_id];
        if (!onlineAgg[key]) onlineAgg[key] = { product_name: key, barcode: meta?.barcode || '', qty: 0, revenue: 0, unitPrice: item.price, unitCost: meta?.cost };
        onlineAgg[key].qty += item.quantity;
        onlineAgg[key].revenue += item.quantity * item.price;
        const catNameO = meta?.catName || 'Ostalo';
        catAggOnline[catNameO] = (catAggOnline[catNameO] || 0) + item.quantity;
        onlineRevenue += item.quantity * item.price;
        if (meta?.cost == null) onlineCostMissing = true;
        else onlineCost += item.quantity * meta.cost;
      });
    });
    setOnlineSales(Object.values(onlineAgg).sort((a, b) => b.qty - a.qty));
    setOnlineTotals({ revenue: onlineRevenue, cost: onlineCost, profit: onlineRevenue - onlineCost, costMissing: onlineCostMissing });

    setCatTotalsStore(Object.entries(catAggStore).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty));
    setCatTotalsOnline(Object.entries(catAggOnline).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty));

    setLoading(false);
  }

  const btnStyle = (active) => ({
    padding: '0.5rem 1.1rem', borderRadius: '8px', border: active ? '2px solid #1a1a1a' : '1px solid #ddd',
    background: active ? '#1a1a1a' : '#fff', color: active ? '#fff' : '#333',
    cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0,
  });

  const isCustomActive = !!(customFrom || customTo);
  const extraPct = extraCostPercent;

  function applyExtraCost() {
    const v = Number(extraCostInput);
    setExtraCostPercent(isNaN(v) ? 0 : v);
  }

  // Vrednosti za sortiranje po koloni - "Ukupno" i "Nabavna Ukupno" se racunaju u letu
  // (nisu direktno sacuvana polja), pa moraju posebno da se izracunaju ovde.
  function getStoreSortValue(row, key) {
    switch (key) {
      case 'name': return (row.name || '').toLowerCase();
      case 'qty': return row.qty;
      case 'unitCost': return row.unitCost ?? -1;
      case 'unitPrice': return row.unitPrice;
      case 'totalCost': return row.unitCost != null ? row.qty * row.unitCost : -1;
      case 'total': return row.qty * row.unitPrice;
      case 'magacinStock': return row.magacinStock ?? 0;
      default: return 0;
    }
  }
  function getOnlineSortValue(row, key) {
    switch (key) {
      case 'name': return (row.product_name || '').toLowerCase();
      case 'qty': return row.qty;
      case 'unitCost': return row.unitCost ?? -1;
      case 'unitPrice': return row.unitPrice;
      case 'totalCost': return row.unitCost != null ? row.qty * row.unitCost : -1;
      case 'total': return row.revenue;
      default: return 0;
    }
  }
  const onStoreSort = makeSortToggle(storeSortKey, setStoreSortKey, storeSortDir, setStoreSortDir);
  const onOnlineSort = makeSortToggle(onlineSortKey, setOnlineSortKey, onlineSortDir, setOnlineSortDir);
  const searchLower = searchVal.trim().toLowerCase();
  const filteredStoreSales = searchLower
    ? storeSales.filter(r => (r.name || '').toLowerCase().includes(searchLower) || (r.barcode || '').toLowerCase().includes(searchLower))
    : storeSales;
  const filteredOnlineSales = searchLower
    ? onlineSales.filter(r => (r.product_name || '').toLowerCase().includes(searchLower) || (r.barcode || '').toLowerCase().includes(searchLower))
    : onlineSales;
  const sortedStoreSales = sortRows(filteredStoreSales, storeSortKey, storeSortDir, getStoreSortValue);
  const sortedOnlineSales = sortRows(filteredOnlineSales, onlineSortKey, onlineSortDir, getOnlineSortValue);

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5', overflowX: 'hidden', paddingBottom: isMobile ? '65px' : '0' }}>
      <AdminHeader activePath="/admin/statistika" />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.3rem' }}>Statistika prodaje</h1>
        <p style={{ fontSize: '0.78rem', color: '#999', marginBottom: '1.25rem' }}>Napomena: nabavne cene za stakla, punjače, kablove i slušalice su preračunate iz RMB po kursu <strong>1 CNY ≈ 15,27 RSD</strong> (kurs NBS na dan 29.07.2026).</p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 240px', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1.1rem 1.25rem', marginBottom: '1.5rem' }}>
          {!isMobile && (
          <>
          <div style={{ marginBottom: '0.9rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Period</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {Object.keys(RANGES).map(k => (
                <button key={k} onClick={() => selectRange(k)} style={btnStyle(!isCustomActive && range === k)}>{rangeLabels[k]}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>Prilagođeno:</span>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.8rem', maxWidth: '150px', boxSizing: 'border-box' }} />
              <span style={{ color: '#999', fontSize: '0.8rem' }}>do</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.8rem', maxWidth: '150px', boxSizing: 'border-box' }} />
              {isCustomActive && (
                <button onClick={() => { setCustomFrom(''); setCustomTo(''); }} style={{ background: 'none', border: 'none', color: '#ef8a1c', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}>✕ Obriši</button>
              )}
            </div>
          </div>
          <div style={{ marginBottom: '0.9rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lokacija <span style={{ textTransform: 'none', fontWeight: '500', color: '#bbb' }}>(utiče samo na "u radnjama")</span></p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', overflowX: 'auto' }}>
              <button onClick={() => setLocationFilter('sve')} style={btnStyle(locationFilter === 'sve')}>Sve</button>
              {locations.filter(l => l.name !== 'Magacin').map(l => (
                <button key={l.id} onClick={() => setLocationFilter(l.name)} style={btnStyle(locationFilter === l.name)}>{l.name}</button>
              ))}
            </div>
          </div>
          </>
          )}
          <div style={{ marginTop: isMobile ? 0 : '0.9rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pretraga artikla</p>
            <div style={{ position: 'relative', maxWidth: '340px' }}>
              <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="Naziv ili šifra (barkod)..."
                style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              {searchVal && (
                <button onClick={() => setSearchVal('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
              )}
            </div>
          </div>
        </div>

        {loading ? <p>Učitavanje...</p> : (
          <>
            {catFilter === 'sve' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BarChart3 size={17} /> Prodato po kategoriji — u radnjama (skener)</h2>
                  {catTotalsStore.length === 0 ? <p style={{ color: '#999', fontSize: '0.9rem' }}>Nema podataka za izabrani period/filter.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {catTotalsStore.map((c, i) => {
                        const maxS = Math.max(1, ...catTotalsStore.map(x => x.qty));
                        return (
                          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: '100px', fontSize: '0.8rem', fontWeight: '600', color: '#333', flexShrink: 0, textAlign: 'right' }}>{c.name}</span>
                            <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '6px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                              <div style={{
                                width: `${(c.qty / maxS) * 100}%`, height: '100%', background: BAR_COLORS[i % BAR_COLORS.length],
                                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem',
                                minWidth: '30px', transition: 'width 0.4s',
                              }}>
                                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '800' }}>{c.qty}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BarChart3 size={17} /> Poručeno po kategoriji — sa sajta</h2>
                  {catTotalsOnline.length === 0 ? <p style={{ color: '#999', fontSize: '0.9rem' }}>Nema podataka za izabrani period/filter.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {catTotalsOnline.map((c, i) => {
                        const maxO = Math.max(1, ...catTotalsOnline.map(x => x.qty));
                        return (
                          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: '100px', fontSize: '0.8rem', fontWeight: '600', color: '#333', flexShrink: 0, textAlign: 'right' }}>{c.name}</span>
                            <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '6px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                              <div style={{
                                width: `${(c.qty / maxO) * 100}%`, height: '100%', background: BAR_COLORS[i % BAR_COLORS.length],
                                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem',
                                minWidth: '30px', transition: 'width 0.4s',
                              }}>
                                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '800' }}>{c.qty}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Store size={18} /> Najprodavanije (u radnjama - skener)</h2>
                <TotalsCard totals={storeTotals} showInput extraPct={extraPct} extraCostInput={extraCostInput} setExtraCostInput={setExtraCostInput} applyExtraCost={applyExtraCost} />
                {storeSales.length === 0 ? <p style={{ color: '#999', fontSize: '0.9rem' }}>Nema podataka za izabrani period/filter.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '4%' }} /><col style={{ width: '24%' }} /><col style={{ width: '9%' }} />
                      <col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col style={{ width: '17%' }} /><col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#999', borderBottom: '1px solid #eee' }}>
                        <th style={{ padding: '0.4rem 0.3rem' }}>#</th>
                        <SortableTh label="Proizvod" sortKey="name" currentKey={storeSortKey} currentDir={storeSortDir} onSort={onStoreSort} />
                        <SortableTh label="Prodato" sortKey="qty" currentKey={storeSortKey} currentDir={storeSortDir} onSort={onStoreSort} align="right" />
                        <SortableTh label="Nabavna/kom" sortKey="unitCost" currentKey={storeSortKey} currentDir={storeSortDir} onSort={onStoreSort} align="right" />
                        <SortableTh label="Prodajna/kom" sortKey="unitPrice" currentKey={storeSortKey} currentDir={storeSortDir} onSort={onStoreSort} align="right" />
                        <SortableTh label="Nabavna Ukupno" sortKey="totalCost" currentKey={storeSortKey} currentDir={storeSortDir} onSort={onStoreSort} align="right" />
                        <SortableTh label="Ukupno" sortKey="total" currentKey={storeSortKey} currentDir={storeSortDir} onSort={onStoreSort} align="right" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStoreSales.slice(0, storeVisibleCount).map((row, i) => (
                        <tr key={row.product_id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '0.5rem 0.3rem', color: '#999' }}>{i + 1}</td>
                          <td style={{ padding: '0.5rem 0.3rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.name}
                            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.1rem' }}>
                              {locationFilter === 'sve' && Object.entries(row.byLocation).map(([loc, q]) => `${loc}: ${q}`).join(' · ')}
                              {locationFilter === 'sve' && ' · '}
                              <span style={{ fontWeight: '700', color: row.magacinStock === 0 ? '#dc2626' : '#16a34a' }}>Magacin: {row.magacinStock}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>{row.qty}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', color: row.unitCost == null ? '#d97706' : '#666', whiteSpace: 'nowrap' }}>{row.unitCost == null ? 'nema cene' : `${row.unitCost.toLocaleString('sr-RS')} RSD`}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', color: '#666', whiteSpace: 'nowrap' }}>{row.unitPrice.toLocaleString('sr-RS')} RSD</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', color: '#666', whiteSpace: 'nowrap' }}>{row.unitCost == null ? '—' : `${(row.qty * row.unitCost).toLocaleString('sr-RS')} RSD`}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', fontWeight: '700', color: '#ef8a1c', whiteSpace: 'nowrap' }}>{(row.qty * row.unitPrice).toLocaleString('sr-RS')} RSD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {storeVisibleCount < sortedStoreSales.length && (
                    <button onClick={() => setStoreVisibleCount(c => c + 10)}
                      style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', color: '#333' }}>
                      Učitaj još ({sortedStoreSales.length - storeVisibleCount} preostalo)
                    </button>
                  )}
                  </div>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Globe size={17} /> Najporučivanije (sa sajta)</h2>
                <TotalsCard totals={onlineTotals} extraPct={extraPct} />
                {onlineSales.length === 0 ? <p style={{ color: '#999', fontSize: '0.9rem' }}>Nema podataka za izabrani period/filter.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '4%' }} /><col style={{ width: '24%' }} /><col style={{ width: '9%' }} />
                      <col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col style={{ width: '17%' }} /><col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#999', borderBottom: '1px solid #eee' }}>
                        <th style={{ padding: '0.4rem 0.3rem' }}>#</th>
                        <SortableTh label="Proizvod" sortKey="name" currentKey={onlineSortKey} currentDir={onlineSortDir} onSort={onOnlineSort} />
                        <SortableTh label="Kom" sortKey="qty" currentKey={onlineSortKey} currentDir={onlineSortDir} onSort={onOnlineSort} align="right" />
                        <SortableTh label="Nabavna/kom" sortKey="unitCost" currentKey={onlineSortKey} currentDir={onlineSortDir} onSort={onOnlineSort} align="right" />
                        <SortableTh label="Prodajna/kom" sortKey="unitPrice" currentKey={onlineSortKey} currentDir={onlineSortDir} onSort={onOnlineSort} align="right" />
                        <SortableTh label="Nabavna Ukupno" sortKey="totalCost" currentKey={onlineSortKey} currentDir={onlineSortDir} onSort={onOnlineSort} align="right" />
                        <SortableTh label="Ukupno" sortKey="total" currentKey={onlineSortKey} currentDir={onlineSortDir} onSort={onOnlineSort} align="right" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOnlineSales.slice(0, onlineVisibleCount).map((row, i) => (
                        <tr key={row.product_name} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '0.5rem 0.3rem', color: '#999' }}>{i + 1}</td>
                          <td style={{ padding: '0.5rem 0.3rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.product_name}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>{row.qty}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', color: row.unitCost == null ? '#d97706' : '#666', whiteSpace: 'nowrap' }}>{row.unitCost == null ? 'nema cene' : `${row.unitCost.toLocaleString('sr-RS')} RSD`}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', color: '#666', whiteSpace: 'nowrap' }}>{row.unitPrice.toLocaleString('sr-RS')} RSD</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', color: '#666', whiteSpace: 'nowrap' }}>{row.unitCost == null ? '—' : `${(row.qty * row.unitCost).toLocaleString('sr-RS')} RSD`}</td>
                          <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right', fontWeight: '700', color: '#ef8a1c', whiteSpace: 'nowrap' }}>{row.revenue.toLocaleString('sr-RS')} RSD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {onlineVisibleCount < sortedOnlineSales.length && (
                    <button onClick={() => setOnlineVisibleCount(c => c + 10)}
                      style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', color: '#333' }}>
                      Učitaj još ({sortedOnlineSales.length - onlineVisibleCount} preostalo)
                    </button>
                  )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        </div>

        {!isMobile && (
        <aside style={{ position: 'sticky', top: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#1a1a1a', padding: '0.85rem 1rem' }}>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '0.5px' }}>KATEGORIJE</span>
            </div>
            <button onClick={() => setCatFilter('sve')}
              style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: catFilter === 'sve' ? '#ef8a1c' : 'transparent', color: catFilter === 'sve' ? '#fff' : '#333', fontWeight: catFilter === 'sve' ? '700' : '500', fontSize: '0.85rem' }}>
              Sve
            </button>
            {cats.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.name)}
                style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: catFilter === c.name ? '#ef8a1c' : 'transparent', color: catFilter === c.name ? '#fff' : '#333', fontWeight: catFilter === c.name ? '700' : '500', fontSize: '0.85rem' }}>
                {c.name}
              </button>
            ))}
          </div>
        </aside>
        )}
        </div>

        {isMobile && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', background: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', zIndex: 200, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setCatsDrawerOpen(true)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.1rem' }}>⚙️</span>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#ef8a1c' }}>Filteri</span>
            </button>
          </div>
        )}

        {isMobile && catsDrawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
            <div onClick={() => setCatsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>Filteri</h2>
                <button onClick={() => setCatsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #eee' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Period</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.keys(RANGES).map(k => (
                    <button key={k} onClick={() => selectRange(k)} style={btnStyle(!isCustomActive && range === k)}>{rangeLabels[k]}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>Prilagođeno:</span>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.8rem', maxWidth: '150px', boxSizing: 'border-box' }} />
                  <span style={{ color: '#999', fontSize: '0.8rem' }}>do</span>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    style={{ padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.8rem', maxWidth: '150px', boxSizing: 'border-box' }} />
                  {isCustomActive && (
                    <button onClick={() => { setCustomFrom(''); setCustomTo(''); }} style={{ background: 'none', border: 'none', color: '#ef8a1c', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}>✕ Obriši</button>
                  )}
                </div>
              </div>

              <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #eee' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lokacija <span style={{ textTransform: 'none', fontWeight: '500', color: '#bbb' }}>(u radnjama)</span></p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => setLocationFilter('sve')} style={btnStyle(locationFilter === 'sve')}>Sve</button>
                  {locations.filter(l => l.name !== 'Magacin').map(l => (
                    <button key={l.id} onClick={() => setLocationFilter(l.name)} style={btnStyle(locationFilter === l.name)}>{l.name}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '0.5rem 0 1rem' }}>
                <p style={{ margin: '0.6rem 1.25rem 0.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kategorija</p>
                <button onClick={() => setCatFilter('sve')}
                  style={{ width: '100%', padding: '0.9rem 1.25rem', textAlign: 'left', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: catFilter === 'sve' ? '#ef8a1c' : 'transparent', color: catFilter === 'sve' ? '#fff' : '#333', fontWeight: catFilter === 'sve' ? '700' : '500', fontSize: '0.95rem' }}>
                  Sve kategorije
                </button>
                {cats.map(c => (
                  <button key={c.id} onClick={() => setCatFilter(c.name)}
                    style={{ width: '100%', padding: '0.9rem 1.25rem', textAlign: 'left', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: catFilter === c.name ? '#ef8a1c' : 'transparent', color: catFilter === c.name ? '#fff' : '#333', fontWeight: catFilter === c.name ? '700' : '500', fontSize: '0.95rem' }}>
                    {c.name}
                  </button>
                ))}
              </div>

              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                <button onClick={() => setCatsDrawerOpen(false)} style={{ width: '100%', padding: '0.85rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
                  Primeni
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
