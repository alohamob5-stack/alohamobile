'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../../lib/supabase';
import AdminHeader from '../components/AdminHeader';
import { useAdminAuth } from '../useAdminAuth';
import { AlertTriangle, ImageOff, Flame, Printer, Trash2, Zap, ShoppingCart, Wrench, MapPin } from 'lucide-react';

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

function printBarcode(barcode, name) {
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Barkod</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:monospace;text-align:center;padding:4mm;width:58mm;}.name{font-size:10px;font-weight:bold;margin-bottom:2mm;word-break:break-word;}.code{font-size:9px;margin-top:1mm;letter-spacing:1px;}svg{width:100%;}@media print{@page{margin:0;size:58mm auto;}}</style></head><body><div class="name">${name}</div><svg id="bc"></svg><div class="code">${barcode}</div><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script><script>JsBarcode("#bc","${barcode}",{format:"CODE128",width:1.5,height:50,displayValue:false,margin:2});window.print();window.close();</script></body></html>`);
  win.document.close();
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const max = 1200;
        if (w > max || h > max) { if (w > h) { h = h * max / w; w = max; } else { w = w * max / h; h = max; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(new File([blob], 'img.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function PhoneModelsEditor({ models, onChange }) {
  const [input, setInput] = useState('');
  function addModel() {
    const val = input.trim();
    if (!val) return;
    if (models.includes(val)) { setInput(''); return; }
    onChange([...models, val]);
    setInput('');
  }
  function removeModel(m) {
    onChange(models.filter(x => x !== m));
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel(); } }}
          placeholder="npr. Samsung A23"
          style={{ flex: 1, padding: '0.55rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        <button type="button" onClick={addModel}
          style={{ padding: '0.55rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
          + Dodaj
        </button>
      </div>
      {models.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>Nema dodatih modela.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {models.map(m => (
            <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', color: '#2563eb', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600' }}>
              {m}
              <button type="button" onClick={() => removeModel(m)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '900', fontSize: '0.9rem', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Proizvodi() {
  const [prods, setProds] = useState([]);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModal, setTransferModal] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', cost_price: '', category_id: '', brand_id: '', subcategory_id: '', phone_model: '', protection_type: '', phone_models: [], barcode: '', image_url: '', image_url2: '', image_url3: '', description: '', featured: false, is_new: false, online: false, connector1: '', connector2: '', min_stock: 5, shelf_location: '' });
  const [imgFiles, setImgFiles] = useState({ 1: null, 2: null, 3: null });
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [myLocId, setMyLocId] = useState(null);
  const [myLocName, setMyLocName] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [minMagacin, setMinMagacin] = useState(20);
  const [minShops, setMinShops] = useState(5);
  const [adjustingKey, setAdjustingKey] = useState(null);
  const [saleChoice, setSaleChoice] = useState(null);
  const [focusedInputs, setFocusedInputs] = useState(0);
  const router = useRouter();
  const auth = useAdminAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!auth) return;
    const adminFlag = auth.role === 'admin' || auth.username === 'magacin';
    const locName = auth.username === 'kula' ? 'Kula' : auth.username === 'vrbas' ? 'Vrbas' : auth.username === 'backa' ? 'Backa Topola' : null;
    setIsAdmin(adminFlag);
    setMyLocName(locName);
    setAuthChecked(true);
    if (adminFlag && typeof Notification !== 'undefined') {
      try { Notification.requestPermission(); } catch (e) { console.warn('Notification permission request failed:', e); }
    }
    fetchAll(locName);
  }, [auth]);

  useEffect(() => {
    if (!authChecked) return;
    const interval = setInterval(() => {
      if (focusedInputs === 0) refreshStock();
    }, 20000);
    return () => clearInterval(interval);
  }, [authChecked, focusedInputs]);

  async function fetchAll(locNameParam) {
    const [{ data: p }, { data: c }, { data: b }, { data: sc }, { data: l }, { data: s }, { data: settingsRows }] = await Promise.all([
      sb.from('products').select('*, categories(name), brands(name), subcategories(name)').order('name').range(0, 4999),
      sb.from('categories').select('*').order('name'),
      sb.from('brands').select('*').order('name'),
      sb.from('subcategories').select('*').order('name'),
      sb.from('locations').select('*').order('id'),
      sb.from('stock').select('*'),
      sb.from('settings').select('*').in('key', ['min_stock_magacin', 'min_stock_shops']),
    ]);
    setProds(p || []);
    setCats(c || []);
    setBrands(b || []);
    setSubcats(sc || []);
    setLocations(l || []);
    setStock(s || []);
    (settingsRows || []).forEach(row => {
      if (row.key === 'min_stock_magacin') setMinMagacin(Number(row.value));
      if (row.key === 'min_stock_shops') setMinShops(Number(row.value));
    });
    const locName = locNameParam !== undefined ? locNameParam : myLocName;
    if (locName) {
      const myLoc = (l || []).find(loc => loc.name === locName);
      setMyLocId(myLoc ? myLoc.id : null);
    }
    setLoading(false);
  }

  async function refreshStock() {
    const { data: s } = await sb.from('stock').select('*');
    setStock(s || []);
  }

  function getQty(pid, lid) {
    if (!lid) return 0;
    const s = stock.find(x => x.product_id === pid && Number(x.location_id) === Number(lid));
    return s ? s.quantity : 0;
  }

  useEffect(() => {
    try {
      if (!isAdmin || !authChecked || loading || locations.length === 0 || prods.length === 0) return;
      if (sessionStorage.getItem('low_stock_notified') === '1') return;
      const lowItems = [];
      prods.forEach(p => {
        locations.forEach(l => {
          const q = getQty(p.id, l.id);
          const threshold = p.min_stock ?? 5;
          if (q < threshold) lowItems.push(`${p.name} — ${l.name}: ${q}`);
        });
      });
      if (lowItems.length > 0) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`Niska zaliha (${lowItems.length} stavki)`, {
            body: lowItems.slice(0, 5).join('\n') + (lowItems.length > 5 ? `\n...i još ${lowItems.length - 5}` : '')
          });
        }
        sessionStorage.setItem('low_stock_notified', '1');
      }
    } catch (e) {
      console.warn('Low stock notification skipped:', e);
    }
  }, [isAdmin, authChecked, loading, locations, prods, stock]);

  async function requestQtyChange(pid, lid, productName, locationName, newQtyRaw) {
    const newQty = Math.max(0, Math.round(Number(newQtyRaw)));
    if (isNaN(newQty)) return;
    // Ucitaj SVEZE stanje direktno iz baze pre racunanja razlike - ne oslanjaj se na
    // vrednost prikazanu na ekranu, koja moze biti zastarela ako je neko drugi
    // (druga lokacija, isporuka porudzbine...) u medjuvremenu promenio stanje.
    const { data: fresh } = await sb.from('stock').select('quantity').eq('product_id', pid).eq('location_id', lid).maybeSingle();
    const currentQty = fresh?.quantity || 0;
    if (newQty === currentQty) { await refreshStock(); return; }
    const delta = newQty - currentQty;
    if (delta < 0) {
      setSaleChoice({ pid, lid, productName, locationName, delta });
    } else {
      adjStock(pid, lid, delta);
    }
  }

  async function adjStock(pid, lid, dir, reason = 'proizvodi') {
    const key = `${pid}-${lid}`;
    if (adjustingKey === key) return;
    setAdjustingKey(key);
    try {
      const locId = Number(lid);
      // Atomska izmena u bazi (bezbedno i kad vise ljudi istovremeno menjaju isti artikal -
      // ne oslanja se na "staru" kolicinu procitanu u JS-u, koja moze biti zastarela)
      const { data: newQty, error: rpcErr } = await sb.rpc('adjust_stock', {
        p_product_id: pid, p_location_id: locId, p_delta: dir
      });
      if (rpcErr) { console.error('adjust_stock greška:', rpcErr); return; }
      const { error: logErr } = await sb.from('stock_log').insert({ product_id: pid, location_id: locId, delta: dir, performed_by: auth?.username || 'admin', reason });
      if (logErr) console.error('stock_log upis greška:', logErr);
      await refreshStock();
    } finally {
      setAdjustingKey(null);
    }
  }

  async function doTransfer() {
    const qty = Number(transferQty);
    if (!transferTo || !qty || qty <= 0) { alert('Unesite ispravnu količinu!'); return; }
    const from = Number(transferModal.fromLoc);
    const to = Number(transferTo);
    if (from === to) { alert('Odredište mora biti različito od polazne lokacije!'); return; }
    const pid = transferModal.product.id;
    // Atomski transfer - baza sama proverava dovoljnost i premesta u jednoj transakciji,
    // bezbedno cak i kad vise ljudi istovremeno radi sa istim artiklom.
    const { error } = await sb.rpc('transfer_stock', {
      p_product_id: pid, p_from_location: from, p_to_location: to, p_qty: qty
    });
    if (error) { alert('Greška: ' + (error.message || 'Nema dovoljno na zalihama!')); return; }
    await sb.from('stock_log').insert([
      { product_id: pid, location_id: from, delta: -qty, performed_by: auth?.username || 'admin', reason: 'transfer' },
      { product_id: pid, location_id: to, delta: qty, performed_by: auth?.username || 'admin', reason: 'transfer' },
    ]);
    setTransferModal(null);
    setTransferQty(1);
    refreshStock();
  }

  function isStaklaCategory(catId) {
    const cat = cats.find(c => String(c.id) === String(catId));
    return cat?.slug === 'stakla';
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', price: '', cost_price: '', category_id: '', brand_id: '', subcategory_id: '', phone_model: '', protection_type: '', phone_models: [], barcode: '', image_url: '', image_url2: '', image_url3: '', description: '', featured: false, is_new: false, online: false, connector1: '', connector2: '', min_stock: 5, shelf_location: '' });
    setImgFiles({ 1: null, 2: null, 3: null });
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p.id);
    setForm({
      name: p.name, price: p.price, cost_price: p.cost_price ?? '', category_id: p.category_id || '', brand_id: p.brand_id || '', subcategory_id: p.subcategory_id || '',
      phone_model: p.phone_model || '', protection_type: p.protection_type || '', phone_models: p.phone_models || [],
      barcode: p.barcode || '', image_url: p.image_url || '', image_url2: p.image_url2 || '', image_url3: p.image_url3 || '',
      description: p.description || '', featured: p.featured || false, is_new: p.is_new || false, online: p.online || false,
      connector1: p.connector1 || '', connector2: p.connector2 || '', min_stock: p.min_stock ?? 5, shelf_location: p.shelf_location || ''
    });
    setImgFiles({ 1: null, 2: null, 3: null });
    setModalOpen(true);
  }

  function generateBarcode(name, brandName) {
    const modelMatch = name.match(/\b([A-Za-z]{1,3}\d{2,4}[A-Za-z]?)\b/);
    const model = modelMatch ? modelMatch[1].toUpperCase() : '';
    const n = name.toLowerCase();
    let color = '';
    if (n.includes('crna') || n.includes('black')) color = 'B';
    else if (n.includes('bela') || n.includes('bijela') || n.includes('white')) color = 'W';
    else if (n.includes('silver') || n.includes('srebrna')) color = 'S';
    else if (n.includes('crvena') || n.includes('red')) color = 'R';
    else if (n.includes('plava') || n.includes('blue')) color = 'P';
    let brand = '';
    if (brandName) {
      const b = brandName.toLowerCase();
      if (b.includes('foneng')) brand = 'FON';
      else if (b.includes('baseus')) brand = 'BAS';
      else if (b.includes('remax')) brand = 'REM';
      else if (b.includes('hoco')) brand = 'HOC';
      else if (b.includes('joyroom')) brand = 'JOY';
      else if (b.includes('ugreen')) brand = 'UGR';
      else brand = brandName.substring(0, 3).toUpperCase();
    }
    return `${model}${color}${brand}`;
  }

  async function uploadImg(slot, prodId) {
    const file = imgFiles[slot];
    if (!file) return null;
    const compressed = await compressImage(file);
    const key = slot === 1 ? 'image_url' : slot === 2 ? 'image_url2' : 'image_url3';
    const path = `products/${prodId}_${slot}_${Date.now()}.jpg`;
    await sb.storage.from('product-images').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    const { data } = sb.storage.from('product-images').getPublicUrl(path);
    return { key, url: data.publicUrl };
  }

  async function save() {
    if (!form.name || !form.price) { alert('Ime i cena su obavezni!'); return; }
    setSaving(true);
    const isStakla = isStaklaCategory(form.category_id);
    // Ako je Stakla a "Modeli telefona" polje je ostalo prazno, pokusaj da izvuces model
    // direktno iz naziva (deo posle "—"), da se ne izgubi filter ako se zaboravi rucno dodavanje.
    let autoPhoneModels = form.phone_models;
    if (isStakla && (!autoPhoneModels || autoPhoneModels.length === 0) && form.name.includes('—')) {
      const guess = form.name.split('—').pop().trim();
      if (guess) autoPhoneModels = [guess];
    }
    const data = {
      name: form.name, price: Number(form.price),
      cost_price: form.cost_price !== '' ? Number(form.cost_price) : null,
      shelf_location: form.shelf_location || null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      subcategory_id: form.subcategory_id || null,
      phone_model: isStakla ? null : (form.phone_model || null),
      protection_type: isStakla ? (form.protection_type || null) : null,
      phone_models: isStakla ? autoPhoneModels : null,
      barcode: form.barcode || null,
      image_url: form.image_url || null, image_url2: form.image_url2 || null, image_url3: form.image_url3 || null,
      description: form.description || null,
      featured: form.featured, is_new: form.is_new, online: form.online,
      connector1: form.connector1 || null, connector2: form.connector2 || null,
      min_stock: Number(form.min_stock) || 5
    };
    let prodId = editing;
    if (editing) {
      await sb.from('products').update(data).eq('id', editing);
    } else {
      const { data: newProd } = await sb.from('products').insert(data).select().single();
      prodId = newProd.id;
    }
    const updates = {};
    for (const slot of [1, 2, 3]) {
      const result = await uploadImg(slot, prodId);
      if (result) updates[result.key] = result.url;
    }
    if (Object.keys(updates).length > 0) await sb.from('products').update(updates).eq('id', prodId);
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  }

  async function deleteImg(slot) {
    const key = slot === 1 ? 'image_url' : slot === 2 ? 'image_url2' : 'image_url3';
    await sb.from('products').update({ [key]: null }).eq('id', editing);
    setForm(f => ({ ...f, [key]: '' }));
  }

  async function deleteP(id) {
    if (!confirm('Obrisati proizvod?')) return;
    await sb.from('products').delete().eq('id', id);
    fetchAll();
  }

  async function toggleFeatured(p) { await sb.from('products').update({ featured: !p.featured }).eq('id', p.id); fetchAll(); }
  async function toggleNew(p) { await sb.from('products').update({ is_new: !p.is_new }).eq('id', p.id); fetchAll(); }
  async function toggleOnline(p) { await sb.from('products').update({ online: !p.online }).eq('id', p.id); fetchAll(); }

  const filtered = prods.filter(p =>
    (!filterCat || String(p.category_id) === filterCat) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').toLowerCase().includes(search.toLowerCase()) || (Array.isArray(p.phone_models) && p.phone_models.some(m => m.toLowerCase().includes(search.toLowerCase()))))
  );

  const formIsStakla = isStaklaCategory(form.category_id);

  if (loading || !authChecked) return <div style={{ padding: '2rem' }}>Učitavanje...</div>;

  if (!isAdmin) {
    return (
      <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
        <AdminHeader activePath="/admin/proizvodi" />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Proizvodi — {myLocName || ''} ({filtered.length})</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input placeholder="Pretraži po nazivu ili barkodu..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e8e8e8', fontSize: '0.9rem', background: '#fff' }} />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e8e8e8', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' }}>
              <option value="">Sve kategorije</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filtered.map(p => {
              const qty = getQty(p.id, myLocId);
              const busy = adjustingKey === `${p.id}-${myLocId}`;
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {p.image_url ? <img src={p.image_url} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '6px', background: '#f5f5f5', flexShrink: 0 }} /> : <div style={{ width: '44px', height: '44px', background: '#f0f0f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ImageOff size={18} color='#ccc' /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', lineHeight: 1.3 }}>{p.name}</div>
                    {p.barcode && <div style={{ fontSize: '0.72rem', color: '#999' }}>{p.barcode}</div>}
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '1.3rem', minWidth: '36px', textAlign: 'center', color: qty === 0 ? '#dc2626' : '#1a1a1a' }}>{qty}</span>
                  <button onClick={() => adjStock(p.id, myLocId, -1, 'proizvodi')} disabled={qty === 0 || busy}
                    style={{ width: '40px', height: '40px', border: '1px solid #ccc', borderRadius: '8px', cursor: (qty === 0 || busy) ? 'not-allowed' : 'pointer', background: '#fff', fontWeight: 'bold', fontSize: '1.2rem', opacity: (qty === 0 || busy) ? 0.4 : 1, flexShrink: 0 }}>−</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin/proizvodi" />
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Proizvodi ({filtered.length})</h1>
          <button onClick={openNew} style={{ padding: '0.5rem 1rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>+ Novi proizvod</button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input placeholder="Pretraži po nazivu ili barkodu..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e8e8e8', fontSize: '0.9rem', background: '#fff' }} />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e8e8e8', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' }}>
            <option value="">Sve kategorije</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!isMobile && (
        <div style={{ border: '1px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e8e8e8', width: '26%' }}>Naziv</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e8e8e8', width: '10%' }}>Kategorija</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e8e8e8', width: '8%' }}>✅ Online</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e8e8e8', width: '7%' }}><Flame size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Top</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e8e8e8', width: '7%' }}>🆕 Novo</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e8e8e8', width: '9%' }}>Cena</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e8e8e8', width: '20%' }}>Zalihe (po lokaciji)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e8e8e8', width: '13%' }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.image_url ? <img src={p.image_url} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} /> : <div style={{ width: '36px', height: '36px', background: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={15} color='#ccc' /></div>}
                      <div>
                        <div style={{ fontWeight: '600' }}>{p.name}</div>
                        {p.phone_model && <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>{p.phone_model}</div>}
                        {p.phone_models && p.phone_models.length > 0 && <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{p.phone_models.join(', ')}</div>}
                        {p.barcode && <div style={{ fontSize: '0.75rem', color: '#999' }}>{p.barcode}</div>}
                        {p.shelf_location && <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={11} /> {p.shelf_location}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#666', verticalAlign: 'top' }}>
                    <div>{p.categories?.name || '-'}</div>
                    {p.subcategories?.name && <div style={{ fontSize: '0.75rem', color: '#999' }}>{p.subcategories.name}</div>}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                    <button onClick={() => toggleOnline(p)}
                      style={{ padding: '0.2rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: p.online ? '#16a34a' : '#f0f0f0', color: p.online ? '#fff' : '#666', fontWeight: '700', fontSize: '0.8rem' }}>
                      {p.online ? '✅ Da' : 'Ne'}
                    </button>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                    <button onClick={() => toggleFeatured(p)}
                      style={{ padding: '0.2rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: p.featured ? '#ef8a1c' : '#f0f0f0', color: p.featured ? '#fff' : '#666', fontWeight: '700', fontSize: '0.8rem' }}>
                      {p.featured ? <><Flame size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Da</> : 'Ne'}
                    </button>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                    <button onClick={() => toggleNew(p)}
                      style={{ padding: '0.2rem 0.6rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: p.is_new ? '#16a34a' : '#f0f0f0', color: p.is_new ? '#fff' : '#666', fontWeight: '700', fontSize: '0.8rem' }}>
                      {p.is_new ? '🆕 Da' : 'Ne'}
                    </button>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#ef8a1c', verticalAlign: 'top' }}>{Number(p.price).toLocaleString('sr-RS')} RSD</td>
                  <td style={{ padding: '0.75rem', verticalAlign: 'top', width: '260px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}>
                      {locations.map(l => {
                        const q = getQty(p.id, l.id);
                        const threshold = p.min_stock ?? 5;
                        const isLow = q < threshold;
                        const busy = adjustingKey === `${p.id}-${l.id}`;
                        return (
                          <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', fontSize: '0.78rem', padding: '0.15rem 0.3rem', borderRadius: '4px', background: isLow ? '#fef2f2' : 'transparent' }}>
                            <span style={{ color: isLow ? '#dc2626' : '#666', minWidth: '70px', fontWeight: isLow ? '700' : '400' }}>{l.name}:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <button disabled={busy} onClick={() => setSaleChoice({ pid: p.id, lid: l.id, productName: p.name, locationName: l.name })} style={{ width: '22px', height: '22px', border: '1px solid #ccc', borderRadius: '4px', cursor: busy ? 'not-allowed' : 'pointer', background: '#fff', fontWeight: 'bold', fontSize: '0.75rem', lineHeight: 1, flexShrink: 0, opacity: busy ? 0.4 : 1 }}>−</button>
                              <input type="number" key={`${p.id}-${l.id}-${q}`} defaultValue={q} disabled={busy}
                                onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); requestQtyChange(p.id, l.id, p.name, l.name, e.target.value, q); } }}
                                onBlur={e => { setFocusedInputs(n => Math.max(0, n - 1)); requestQtyChange(p.id, l.id, p.name, l.name, e.target.value, q); }}
                                style={{ width: '38px', padding: '0.1rem', fontWeight: '700', textAlign: 'center', color: q === 0 ? '#dc2626' : isLow ? '#d97706' : '#000', border: '1px solid transparent', borderRadius: '4px', background: 'transparent', fontSize: '0.85rem' }}
                                onFocus={e => { setFocusedInputs(n => n + 1); e.target.style.border = '1px solid #ccc'; e.target.style.background = '#fff'; }} />
                              <button disabled={busy} onClick={() => adjStock(p.id, l.id, 1)} style={{ width: '22px', height: '22px', border: '1px solid #ccc', borderRadius: '4px', cursor: busy ? 'not-allowed' : 'pointer', background: '#fff', fontWeight: 'bold', fontSize: '0.75rem', lineHeight: 1, flexShrink: 0, opacity: busy ? 0.4 : 1 }}>+</button>
                              {l.name === 'Magacin' ? (
                                <button onClick={() => { setTransferModal({ product: p, fromLoc: l.id }); setTransferTo(''); setTransferQty(1); }}
                                  style={{ width: '22px', height: '22px', border: '1px solid #ef8a1c', borderRadius: '4px', cursor: 'pointer', background: '#fff', color: '#ef8a1c', fontWeight: 'bold', fontSize: '0.7rem', lineHeight: 1, flexShrink: 0 }}>↗</button>
                              ) : (
                                <div style={{ width: '22px', height: '22px', flexShrink: 0 }} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                    {p.barcode && <button onClick={() => printBarcode(p.barcode, p.name)} style={{ marginRight: '0.4rem', padding: '0.3rem 0.6rem', border: '1px solid #6b7280', color: '#6b7280', borderRadius: '6px', cursor: 'pointer', background: '#fff', display: 'inline-flex', alignItems: 'center' }}><Printer size={14} /></button>}
                    <button onClick={() => openEdit(p)} style={{ marginRight: '0.4rem', padding: '0.3rem 0.6rem', border: '1px solid #2563eb', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}>Izmeni</button>
                    <button onClick={() => deleteP(p.id)} style={{ padding: '0.3rem 0.6rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}>Obriši</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                {p.image_url ? <img src={p.image_url} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', background: '#f5f5f5' }} /> : <div style={{ width: '48px', height: '48px', background: '#f0f0f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={20} color='#ccc' /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', lineHeight: 1.3 }}>{p.name}</div>
                  {p.phone_model && <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>{p.phone_model}</div>}
                  {p.phone_models && p.phone_models.length > 0 && <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{p.phone_models.join(', ')}</div>}
                  {p.barcode && <div style={{ fontSize: '0.75rem', color: '#999' }}>{p.barcode}</div>}
                        {p.shelf_location && <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={11} /> {p.shelf_location}</div>}
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.categories?.name || '-'}{p.subcategories?.name ? ` › ${p.subcategories.name}` : ''}</div>
                </div>
                <div style={{ fontWeight: '800', color: '#ef8a1c', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{Number(p.price).toLocaleString('sr-RS')} RSD</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem', padding: '0.6rem', background: '#f8f9fa', borderRadius: '8px' }}>
                {locations.map(l => {
                  const q = getQty(p.id, l.id);
                  const threshold = p.min_stock ?? 5;
                  const isLow = q < threshold;
                  const busy = adjustingKey === `${p.id}-${l.id}`;
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0.4rem', borderRadius: '5px', background: isLow ? '#fef2f2' : 'transparent' }}>
                      <span style={{ color: isLow ? '#dc2626' : '#666', fontWeight: isLow ? '700' : '600' }}>{l.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button disabled={busy} onClick={() => setSaleChoice({ pid: p.id, lid: l.id, productName: p.name, locationName: l.name })} style={{ width: '26px', height: '26px', border: '1px solid #ccc', borderRadius: '5px', cursor: busy ? 'not-allowed' : 'pointer', background: '#fff', fontWeight: 'bold', opacity: busy ? 0.4 : 1 }}>−</button>
                        <input type="number" key={`${p.id}-${l.id}-${q}-m`} defaultValue={q} disabled={busy}
                          onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); requestQtyChange(p.id, l.id, p.name, l.name, e.target.value, q); } }}
                          onBlur={e => { setFocusedInputs(n => Math.max(0, n - 1)); requestQtyChange(p.id, l.id, p.name, l.name, e.target.value, q); }}
                          style={{ width: '42px', padding: '0.2rem', fontWeight: '700', textAlign: 'center', color: q === 0 ? '#dc2626' : isLow ? '#d97706' : '#000', border: '1px solid transparent', borderRadius: '5px', background: 'transparent', fontSize: '0.9rem' }}
                          onFocus={e => { setFocusedInputs(n => n + 1); e.target.style.border = '1px solid #ccc'; e.target.style.background = '#fff'; }} />
                        <button disabled={busy} onClick={() => adjStock(p.id, l.id, 1)} style={{ width: '26px', height: '26px', border: '1px solid #ccc', borderRadius: '5px', cursor: busy ? 'not-allowed' : 'pointer', background: '#fff', fontWeight: 'bold', opacity: busy ? 0.4 : 1 }}>+</button>
                        {l.name === 'Magacin' && (
                          <button onClick={() => { setTransferModal({ product: p, fromLoc: l.id }); setTransferTo(''); setTransferQty(1); }}
                            style={{ padding: '0 0.5rem', height: '26px', border: '1px solid #ef8a1c', borderRadius: '5px', cursor: 'pointer', background: '#fff', color: '#ef8a1c', fontWeight: 'bold', fontSize: '0.75rem' }}>↗</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <button onClick={() => toggleOnline(p)}
                  style={{ flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: p.online ? '#16a34a' : '#f0f0f0', color: p.online ? '#fff' : '#666', fontWeight: '700', fontSize: '0.8rem' }}>
                  {p.online ? '✅ Online' : 'Offline'}
                </button>
                <button onClick={() => toggleFeatured(p)}
                  style={{ flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: p.featured ? '#ef8a1c' : '#f0f0f0', color: p.featured ? '#fff' : '#666', fontWeight: '700', fontSize: '0.8rem' }}>
                  <Flame size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.2rem' }} /> {p.featured ? 'Top' : 'Nije top'}
                </button>
                <button onClick={() => toggleNew(p)}
                  style={{ flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: p.is_new ? '#16a34a' : '#f0f0f0', color: p.is_new ? '#fff' : '#666', fontWeight: '700', fontSize: '0.8rem' }}>
                  🆕 {p.is_new ? 'Novo' : 'Nije novo'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {p.barcode && <button onClick={() => printBarcode(p.barcode, p.name)} style={{ padding: '0.5rem 0.75rem', border: '1px solid #6b7280', color: '#6b7280', borderRadius: '6px', cursor: 'pointer', background: '#fff', display: 'inline-flex', alignItems: 'center' }}><Printer size={15} /></button>}
                <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '0.5rem', border: '1px solid #2563eb', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>✏️ Izmeni</button>
                <button onClick={() => deleteP(p.id)} style={{ padding: '0.5rem 0.75rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', background: '#fff', display: 'inline-flex', alignItems: 'center' }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1rem' }}>{editing ? 'Izmeni proizvod' : 'Novi proizvod'}</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Naziv *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Cena (RSD) *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Nabavna cena (RSD)</label>
              <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                placeholder="Koliko te kosta ovaj artikal"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#999' }}>Koristi se za obracun profita u Statistici. Nije vidljivo kupcima.</p>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Lokacija u magacinu (polica)</label>
              <input type="text" value={form.shelf_location} onChange={e => setForm(f => ({ ...f, shelf_location: e.target.value.toUpperCase() }))}
                placeholder="npr. A2, C4..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#999' }}>Gde se fizički nalazi na polici u magacinu. Nije vidljivo kupcima.</p>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Barkod</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => {
                  if (!form.name) { alert('Unesite naziv prvo!'); return; }
                  const brandName = brands.find(b => String(b.id) === String(form.brand_id))?.name || '';
                  const generated = generateBarcode(form.name, brandName);
                  if (generated) setForm(f => ({ ...f, barcode: generated }));
                  else alert('Naziv nema prepoznatljiv model broj!');
                }} style={{ padding: '0.6rem 0.75rem', background: '#0f1e3d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: '600' }}>
                  <Zap size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.2rem' }} /> Generiši
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Opis proizvoda</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="Unesite opis proizvoda..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Kategorija</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, subcategory_id: '' }))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                <option value="">— bez kategorije —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Podkategorija (brend telefona)</label>
              <select value={form.subcategory_id} onChange={e => setForm(f => ({ ...f, subcategory_id: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                <option value="">— bez podkategorije —</option>
                {subcats
                  .filter(s => !form.category_id || String(s.category_id) === String(form.category_id))
                  .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {formIsStakla ? (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Tip zaštite</label>
                  <select value={form.protection_type} onChange={e => setForm(f => ({ ...f, protection_type: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                    <option value="">— izaberi tip —</option>
                    {['5D', 'Privacy', 'UV', 'Obično', 'Hidro 1000', 'Hidro 2000'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>Modeli telefona (može više)</label>
                  <PhoneModelsEditor models={form.phone_models} onChange={models => setForm(f => ({ ...f, phone_models: models }))} />
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#999' }}>Dodaj sve modele na koje ovo staklo fizički odgovara (npr. ako A12 staklo odgovara i za A23, dodaj oba). Ako ostaviš prazno, sistem automatski uzima model iz naziva (deo posle "—").</p>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Model telefona</label>
                <input type="text" value={form.phone_model} onChange={e => setForm(f => ({ ...f, phone_model: e.target.value }))}
                  placeholder="npr. Samsung A13, iPhone 15 Pro..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Brend</label>
              <select value={form.brand_id} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                <option value="">— bez brenda —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Minimum zaliha (upozorenje)</label>
              <input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))}
                placeholder="npr. 5"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#999' }}>Kad zaliha na lokaciji padne ispod ovog broja, prikazuje se upozorenje.</p>
            </div>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.online} onChange={e => setForm(f => ({ ...f, online: e.target.checked }))} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>✅ Online</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Flame size={14} /> Najprodavanije</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_new} onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>🆕 Novo</span>
              </label>
            </div>
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Konektor 1 (od)</label>
                <select value={form.connector1} onChange={e => setForm(f => ({ ...f, connector1: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                  <option value="">— bez —</option>
                  {['USB-A','USB-C','Micro USB','Lightning','Jack 3.5mm','Jack 2.5mm','HDMI','Ostalo'].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Konektor 2 (do)</label>
                <select value={form.connector2} onChange={e => setForm(f => ({ ...f, connector2: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                  <option value="">— bez —</option>
                  {['USB-A','USB-C','Micro USB','Lightning','Jack 3.5mm','Jack 2.5mm','HDMI','Ostalo'].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Slike (do 3)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3].map(slot => {
                  const key = slot === 1 ? 'image_url' : slot === 2 ? 'image_url2' : 'image_url3';
                  const url = imgFiles[slot] ? URL.createObjectURL(imgFiles[slot]) : form[key];
                  return (
                    <div key={slot} style={{ position: 'relative' }}>
                      <div onClick={() => document.getElementById(`img-input-${slot}`).click()}
                        style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1.5px dashed #ccc', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageOff size={22} color='#ccc' />}
                      </div>
                      {url && editing && (
                        <button onClick={() => deleteImg(slot)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                      )}
                      <input id={`img-input-${slot}`} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files[0]; if (f) setImgFiles(prev => ({ ...prev, [slot]: f })); }} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}>Odustani</button>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {saving ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {saleChoice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setSaleChoice(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#999' }}>{saleChoice.locationName}</p>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: '800' }}>{saleChoice.productName}</h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#ef8a1c', fontWeight: '700' }}>Smanjuje se za {Math.abs(saleChoice.delta ?? 1)} kom</p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#666' }}>Zašto?</p>
            <button onClick={async () => { await adjStock(saleChoice.pid, saleChoice.lid, saleChoice.delta ?? -1, 'proizvodi'); setSaleChoice(null); }}
              style={{ width: '100%', padding: '0.85rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <ShoppingCart size={16} /> Prodaja (broji se u Statistici)
            </button>
            <button onClick={async () => { await adjStock(saleChoice.pid, saleChoice.lid, saleChoice.delta ?? -1, 'korekcija'); setSaleChoice(null); }}
              style={{ width: '100%', padding: '0.85rem', background: '#fff', color: '#666', border: '1.5px solid #ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Wrench size={16} /> Ispravka stanja (ne broji se)
            </button>
            <button onClick={() => setSaleChoice(null)} style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '0.85rem' }}>
              Otkaži
            </button>
          </div>
        </div>
      )}

      {transferModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setTransferModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '380px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '800' }}>Prebaci robu</h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#666' }}>{transferModal.product.name}</p>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>Dostupno u magacinu: {getQty(transferModal.product.id, transferModal.fromLoc)} kom</p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: '#666' }}>Odredište</label>
              <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                <option value="">— Izaberi lokaciju —</option>
                {locations.filter(l => l.id !== transferModal.fromLoc).map(l => (
                  <option key={l.id} value={l.id}>{l.name} (trenutno: {getQty(transferModal.product.id, l.id)})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: '#666' }}>Količina</label>
              <input type="number" min={1} max={getQty(transferModal.product.id, transferModal.fromLoc)} value={transferQty} onChange={e => setTransferQty(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setTransferModal(null)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}>Odustani</button>
              <button onClick={doTransfer} style={{ flex: 1, padding: '0.75rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>Prebaci ↗</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
