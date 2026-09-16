'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { sb, makeSlug } from '../../../lib/supabase';
import { useCart } from '../../components/CartContext';
import AuthModal from '../../components/AuthModal';
import { CheckCircle2, Truck, Search, User, ShoppingCart, Home as HomeIcon, Package, Trash2, Banknote, CreditCard, LogOut, ImageOff } from 'lucide-react';

const FREE_DELIVERY_THRESHOLD = 2000;
const KONEKTORI = ['USB-A', 'USB-C', 'Micro USB', 'Lightning', 'Jack 3.5mm', 'Jack 2.5mm', 'HDMI', 'Ostalo'];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 1024); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function KategorijaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Učitavanje...</div>}>
      <KategorijaInner />
    </Suspense>
  );
}

function FilterSection({ title, children, hasActive, onClear }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>{title}</span>
        {hasActive && <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>Obriši</button>}
      </div>
      {children}
    </div>
  );
}

function CheckboxItem({ label, count, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.45rem 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '3px', border: `2px solid ${selected ? 'var(--red)' : '#ccc'}`, background: selected ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {selected && <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '900' }}>✓</span>}
        </div>
        <span style={{ fontSize: '0.9rem', color: selected ? 'var(--red)' : 'var(--text)', fontWeight: selected ? '600' : '400' }}>{label}</span>
      </div>
      {count !== undefined && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{count}</span>}
    </button>
  );
}

function DualSlider({ min, max, valueMin, valueMax, onChange }) {
  const trackRef = useRef(null);
  function posToVal(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + pct * (max - min));
  }
  function startDrag(e, which) {
    e.preventDefault();
    function move(ev) {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const v = posToVal(clientX);
      if (which === 'min') onChange(Math.min(v, valueMax - 1), valueMax);
      else onChange(valueMin, Math.max(v, valueMin + 1));
    }
    function up() {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up);
    }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
  }
  const range = max - min || 1;
  const pMin = ((valueMin - min) / range) * 100;
  const pMax = ((valueMax - min) / range) * 100;
  const minZ = pMin > pMax - 5 ? 4 : 2;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
        <input type="number" value={valueMin} min={min} max={valueMax - 1}
          onChange={e => { const v = Number(e.target.value); if (!isNaN(v) && v >= min && v < valueMax) onChange(v, valueMax); }}
          style={{ flex: 1, padding: '0.4rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.88rem', outline: 'none', textAlign: 'center', width: 0 }} />
        <span style={{ color: 'var(--muted)', flexShrink: 0 }}>—</span>
        <input type="number" value={valueMax} min={valueMin + 1} max={max}
          onChange={e => { const v = Number(e.target.value); if (!isNaN(v) && v > valueMin && v <= max) onChange(valueMin, v); }}
          style={{ flex: 1, padding: '0.4rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.88rem', outline: 'none', textAlign: 'center', width: 0 }} />
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: '#e0e0e0', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', left: `${pMin}%`, width: `${pMax - pMin}%`, height: '4px', background: 'var(--red)', borderRadius: '2px' }} />
        <div onMouseDown={e => startDrag(e, 'min')} onTouchStart={e => startDrag(e, 'min')}
          style={{ position: 'absolute', left: `${pMin}%`, transform: 'translateX(-50%)', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--red)', border: '3px solid #fff', boxShadow: '0 1px 5px rgba(0,0,0,0.3)', cursor: 'grab', zIndex: minZ, touchAction: 'none' }} />
        <div onMouseDown={e => startDrag(e, 'max')} onTouchStart={e => startDrag(e, 'max')}
          style={{ position: 'absolute', left: `${pMax}%`, transform: 'translateX(-50%)', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--red)', border: '3px solid #fff', boxShadow: '0 1px 5px rgba(0,0,0,0.3)', cursor: 'grab', zIndex: 3, touchAction: 'none' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
        <span>{min.toLocaleString('sr-RS')} RSD</span>
        <span>{max.toLocaleString('sr-RS')} RSD</span>
      </div>
    </div>
  );
}

function KonektorSelectFilter({ title, value, onChange, prods, field }) {
  const available = KONEKTORI.filter(k => prods.some(p => p[field] === k));
  if (available.length === 0) return null;
  return (
    <FilterSection title={title} hasActive={!!value} onClear={() => onChange(null)}>
      <select value={value || ''} onChange={e => onChange(e.target.value || null)}
        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: '#fff', cursor: 'pointer', color: value ? 'var(--red)' : 'var(--text)', fontWeight: value ? '600' : '400' }}>
        <option value="">— Svi —</option>
        {available.map(k => {
          const cnt = prods.filter(p => p[field] === k).length;
          return <option key={k} value={k}>{k} ({cnt})</option>;
        })}
      </select>
    </FilterSection>
  );
}

function KategorijaInner() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cat, setCat] = useState(null);
  const [allProds, setAllProds] = useState([]);
  const [prods, setProds] = useState([]);
  const [allCats, setAllCats] = useState([]);
  const { cart, count, total, mounted, shopSession, addToCart, removeFromCart, changeQty, clearCart, handleAuthSuccess: ctxHandleAuthSuccess, handleLogout: ctxHandleLogout } = useCart();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  async function handleAuthSuccess(session) {
    await ctxHandleAuthSuccess(session);
    setAuthModalOpen(false);
  }
  function handleLogout() {
    ctxHandleLogout();
    setLogoutConfirmOpen(false);
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catsDrawerOpen, setCatsDrawerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pay, setPay] = useState('cod');
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [selectedConn1, setSelectedConn1] = useState(null);
  const [selectedConn2, setSelectedConn2] = useState(null);
  const [selectedProtection, setSelectedProtection] = useState(null);
  const [selectedMaskType, setSelectedMaskType] = useState(null);
  const [selectedWatt, setSelectedWatt] = useState(null);
  const [wattExpanded, setWattExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [tempModel, setTempModel] = useState(null);
  const [expandedTipId, setExpandedTipId] = useState(null);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(999999);
  const [sort, setSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const isMobile = useIsMobile();
  const [tempBrand, setTempBrand] = useState(null);
  const [tempSubcat, setTempSubcat] = useState(null);
  const [tempConn1, setTempConn1] = useState(null);
  const [tempConn2, setTempConn2] = useState(null);
  const [tempProtection, setTempProtection] = useState(null);
  const [tempMaskType, setTempMaskType] = useState(null);
  const [tempWatt, setTempWatt] = useState(null);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(999999);
  const [sidebarOpenCat, setSidebarOpenCat] = useState(null);

  const specialSlugs = ['maske', 'stakla'];
  const isSpecialCategory = specialSlugs.includes(slug);
  const isStaklaMode = slug === 'stakla';
  const isMaskeMode = slug === 'maske';

  // Modeli telefona za dati "Tip" (brend) - za Stakla gleda phone_models (moze ih odgovarati
  // vise brendova unakrsno), za Maske gleda phone_model pojedinacno vezano za taj tip.
  // Napomena: Xiaomi telefoni u bazi cesto pocinju sa "Redmi" (ne "Xiaomi"), pa se to
  // tretira kao alias iste porodice brenda.
  function getModelsForSubcat(s) {
    if (isMaskeMode) {
      return [...new Set(prods.filter(p => p.subcategory_id === s.id).map(p => p.phone_model).filter(Boolean))].sort();
    }
    if (isStaklaMode) {
      const brandLower = (s.name || '').toLowerCase();
      const aliasi = brandLower === 'xiaomi' ? ['xiaomi', 'redmi'] : [brandLower];
      return [...new Set(prods.flatMap(p => p.phone_models || []).filter(Boolean).filter(m => aliasi.some(a => m.toLowerCase().startsWith(a))))].sort();
    }
    return [];
  }
  function productMatchesModel(p, model) {
    if (!model) return true;
    if (isMaskeMode) return p.phone_model === model;
    if (isStaklaMode) return (p.phone_models || []).includes(model);
    return true;
  }

  // Vatnost trenutno ne postoji kao posebno polje u bazi - izvlaci se direktno iz naziva
  // artikla (npr. "...25W..." -> 25). Neki modeli (EU76, EU46) u nazivu imaju samo amperazu
  // (2.1A/3A), ne i "W" tekst, pa za njih vazi fiksna, poznata vrednost umesto racunanja iz teksta.
  // Regex (ne obican includes) da pogodi i "EU76" i "EU 76" (sa/bez razmaka izmedju slova i broja).
  const POZNATE_VATNOSTI_PO_KODU = [
    { regex: /EU\s*76/i, w: 10.5 },
    { regex: /EU\s*46/i, w: 18 },
  ];
  function getWatt(p) {
    const name = p.name || '';
    for (const { regex, w } of POZNATE_VATNOSTI_PO_KODU) {
      if (regex.test(name)) return w;
    }
    const match = name.match(/(\d+)\s*W\b/i);
    return match ? Number(match[1]) : null;
  }

  useEffect(() => {
    if (!shopSession) return;
    if (shopSession.type === 'shop') {
      setForm(f => ({ ...f, name: shopSession.locationName, city: shopSession.locationName, address: shopSession.locationName, phone: f.phone || '000' }));
    } else if (shopSession.type === 'customer') {
      setForm(f => ({ ...f, name: shopSession.name, phone: shopSession.phone, city: shopSession.city || '', address: shopSession.address || '' }));
    }
  }, [shopSession]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSelectedBrand(null); setSelectedSubcat(null); setSelectedConn1(null); setSelectedConn2(null); setSelectedProtection(null); setSelectedMaskType(null); setSelectedWatt(null);
      const [{ data: categories }, { data: allBrands }, { data: allSubcats }, { data: products }] = await Promise.all([
        sb.from('categories').select('*').order('name'),
        sb.from('brands').select('*').order('name'),
        sb.from('subcategories').select('*').order('name'),
        sb.from('products').select('*, categories(name,slug), brands(name,slug), subcategories(name,slug)').order('name').range(0, 4999),
      ]);
      setAllCats(categories || []);
      setAllProds(products || []);
      const currentCat = (categories || []).find(c => c.slug === slug);
      setCat(currentCat);
      if (currentCat) setSidebarOpenCat(currentCat.id);
      const catProds = currentCat ? (products || []).filter(p => p.category_id === currentCat.id) : [];
      setProds(catProds);
      const prices = catProds.map(p => p.price);
      const minP = prices.length ? Math.floor(Math.min(...prices)) : 0;
      const maxP = prices.length ? Math.ceil(Math.max(...prices)) : 999999;
      setPriceMin(minP); setPriceMax(maxP); setTempPriceMin(minP); setTempPriceMax(maxP);
      const brandSlug = searchParams.get('brand');
      const tipSlug = searchParams.get('tip');
      if (brandSlug) { const brand = (allBrands || []).find(b => b.slug === brandSlug || b.name.toLowerCase() === brandSlug); if (brand) { setSelectedBrand(brand.id); setTempBrand(brand.id); } }
      if (tipSlug) { const subcat = (allSubcats || []).find(s => s.slug === tipSlug || s.name.toLowerCase().replace(/\s+/g, '-') === tipSlug); if (subcat) { setSelectedSubcat(subcat.id); setTempSubcat(subcat.id); } }
      setLoading(false);
    }
    load();
  }, [slug, searchParams]);

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);

  async function submitOrder() {
    if (!form.name || !form.phone || !form.city || !form.address) { alert('Popunite sva obavezna polja!'); return; }
    setSubmitting(true);
    const orderData = { name: form.name, phone: form.phone, city: form.city, address: form.address, note: form.note, payment: pay, total, status: 'nova' };
    if (shopSession?.type === 'shop') orderData.source_location_id = shopSession.locationId;
    if (shopSession?.type === 'customer') orderData.customer_id = shopSession.customerId;
    const { data: order, error } = await sb.from('orders').insert(orderData).select().single();
    if (error) { alert('Greška pri slanju!'); setSubmitting(false); return; }
    await sb.from('order_items').insert(cart.map(x => ({ order_id: order.id, product_id: x.id, product_name: x.name, quantity: x.qty, price: x.price })));
    clearCart();
    if (!shopSession) setForm({ name: '', phone: '', city: '', address: '', note: '' });
    setCheckoutOpen(false); setDrawerOpen(false); setSubmitting(false);
    setSuccess(true); setTimeout(() => setSuccess(false), 3000);
  }

  function matchesConnectors(p, c1, c2) {
    if (!c1 && !c2) return true;
    if (c1 && !c2) return p.connector1 === c1 || p.connector2 === c1;
    if (!c1 && c2) return p.connector1 === c2 || p.connector2 === c2;
    return (p.connector1 === c1 && p.connector2 === c2) || (p.connector1 === c2 && p.connector2 === c1);
  }

  const filtered = prods
    .filter(p => isSpecialCategory || !selectedBrand || p.brand_id === selectedBrand)
    .filter(p => !selectedSubcat || p.subcategory_id === selectedSubcat)
    .filter(p => productMatchesModel(p, selectedModel))
    .filter(p => matchesConnectors(p, selectedConn1, selectedConn2))
    .filter(p => !selectedProtection || p.protection_type === selectedProtection)
    .filter(p => !selectedMaskType || p.mask_type === selectedMaskType)
    .filter(p => !selectedWatt || getWatt(p) === selectedWatt)
    .filter(p => p.price >= priceMin && p.price <= priceMax)
    .sort((a, b) => sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : a.name.localeCompare(b.name));

  // Za Stakla/Maske, "Tip" (podkategorija) VEC sluzi kao izbor brenda (Honor/Samsung/iPhone/Xiaomi) -
  // filter "Brend" (iz brand_id polja) bi tu bio zbunjujuc duplikat, pa ga potpuno iskljucujemo.
  const catBrands = isSpecialCategory ? [] : [...new Map(prods.filter(p => p.brand_id && p.brands?.name).map(p => [p.brand_id, { ...p.brands, id: p.brand_id }])).values()];
  const catSubcats = [...new Map(prods.filter(p => p.subcategory_id && p.subcategories?.name).map(p => [p.subcategory_id, { ...p.subcategories, id: p.subcategory_id }])).values()];
  const hasConnectors = prods.some(p => p.connector1 || p.connector2);
  const availableProtections = [...new Set(prods.filter(p => p.protection_type).map(p => p.protection_type))];
  const availableMaskTypes = isMaskeMode ? [...new Set(prods.filter(p => p.mask_type).map(p => p.mask_type))].sort() : [];
  const availableWatts = [...new Set(prods.map(p => getWatt(p)).filter(w => w !== null))].sort((a, b) => a - b);
  const minPrice = prods.length ? Math.floor(Math.min(...prods.map(p => p.price))) : 0;
  const maxPrice = prods.length ? Math.ceil(Math.max(...prods.map(p => p.price))) : 999999;
  const activeFiltersCount = (selectedBrand ? 1 : 0) + (selectedSubcat ? 1 : 0) + (selectedModel ? 1 : 0) + (selectedConn1 ? 1 : 0) + (selectedConn2 ? 1 : 0) + (selectedProtection ? 1 : 0) + (selectedMaskType ? 1 : 0) + (selectedWatt ? 1 : 0) + (priceMin > minPrice || priceMax < maxPrice ? 1 : 0);
  const tempFiltered = prods.filter(p => (isSpecialCategory || !tempBrand || p.brand_id === tempBrand) && (!tempSubcat || p.subcategory_id === tempSubcat) && productMatchesModel(p, tempModel) && matchesConnectors(p, tempConn1, tempConn2) && (!tempProtection || p.protection_type === tempProtection) && (!tempMaskType || p.mask_type === tempMaskType) && (!tempWatt || getWatt(p) === tempWatt) && p.price >= tempPriceMin && p.price <= tempPriceMax);
  function clearAllFilters() { setSelectedBrand(null); setSelectedSubcat(null); setSelectedModel(null); setSelectedConn1(null); setSelectedConn2(null); setSelectedProtection(null); setSelectedMaskType(null); setSelectedWatt(null); setPriceMin(minPrice); setPriceMax(maxPrice); }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif', paddingBottom: isMobile ? '65px' : '0' }}>
      {success && <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', zIndex: 2000, fontWeight: 'bold', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Narudžbina poslata!</div>}
      <div style={{ background: 'var(--black)', color: '#fff', textAlign: 'center', padding: '0.4rem 1rem', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Truck size={15} /> Besplatna dostava za porudžbine preko 2.000 RSD</div>
      <header style={{ background: 'var(--black)', padding: '0 1rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: '1700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem', height: '60px' }}>
          <div onClick={() => router.push('/')} style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>ALOHA<span style={{ color: 'var(--red)' }}>MOB</span></div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input placeholder="Pretraži proizvode..." value={searchVal} onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchVal.trim()) router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`); }}
              style={{ width: '100%', padding: '0.55rem 2.5rem 0.55rem 2.5rem', borderRadius: '6px', border: 'none', outline: 'none', fontSize: '0.9rem', background: '#1a1a1a', color: '#fff' }} />
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            {searchVal && <button onClick={() => router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>Traži</button>}
          </div>
          {!isMobile && mounted && (
            shopSession ? (
              <button onClick={() => setLogoutConfirmOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <User size={15} /> {shopSession.type === 'shop' ? shopSession.locationName : shopSession.name} · Odjava
              </button>
            ) : (
              <button onClick={() => setAuthModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <User size={15} /> Prijava
              </button>
            )
          )}
          <button onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.2rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            <ShoppingCart size={16} /> {!isMobile && 'Korpa'}
            {mounted && count > 0 && <span style={{ background: '#fff', color: 'var(--red)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '900' }}>{count}</span>}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1700px', margin: '0 auto', padding: '1rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr 260px', gap: '1.25rem', alignItems: 'start' }}>
        {!isMobile && (
          <aside style={{ position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ background: 'var(--black)', padding: '0.85rem 1rem' }}><span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>KATEGORIJE</span></div>
              <button onClick={() => router.push('/')} style={{ width: '100%', padding: '0.85rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontWeight: '600', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><HomeIcon size={16} /> Početna</span> <span style={{ opacity: 0.4 }}>›</span>
              </button>
              {allCats.map(c => {
                const isCurrent = c.slug === slug;
                const cnt = allProds.filter(p => p.category_id === c.id).length;
                const isOpen = sidebarOpenCat === c.id;
                const subcats = [...new Map(allProds.filter(p => p.category_id === c.id && p.subcategory_id && p.subcategories?.name).map(p => [p.subcategory_id, { id: p.subcategory_id, name: p.subcategories.name, slug: p.subcategories.slug }])).values()];
                return (
                  <div key={c.id}>
                    <button onClick={() => { router.push(`/kategorije/${c.slug}`); setSidebarOpenCat(isOpen && isCurrent ? null : c.id); }}
                      style={{ width: '100%', padding: '0.85rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isCurrent ? 'var(--red)' : 'transparent', color: isCurrent ? '#fff' : 'var(--text)', fontWeight: isCurrent ? '700' : '500', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: '0.82rem', opacity: 0.7, transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {isOpen && subcats.length > 0 && (
                      <div style={{ background: 'var(--bg3)' }}>
                        <button onClick={() => setSelectedSubcat(null)} style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 1.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: !selectedSubcat ? 'var(--red-light)' : 'transparent', color: !selectedSubcat ? 'var(--red)' : 'var(--muted)', fontWeight: !selectedSubcat ? '700' : '400', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Sve {c.name}</span><span style={{ fontSize: '0.78rem' }}>{cnt}</span>
                        </button>
                        {subcats.map(s => {
                          const scnt = allProds.filter(p => p.category_id === c.id && p.subcategory_id === s.id).length;
                          const isSelected = selectedSubcat === s.id;
                          return (
                            <button key={s.id} onClick={() => {
                                if (specialSlugs.includes(slug)) {
                                  router.push(`/kategorije/${slug}/${s.slug}`);
                                } else {
                                  setSelectedSubcat(isSelected ? null : s.id);
                                }
                              }}
                              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 1.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--red-light)' : 'transparent', color: isSelected ? 'var(--red)' : 'var(--muted)', fontWeight: isSelected ? '700' : '400', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>· {s.name}</span><span style={{ fontSize: '0.78rem' }}>{scnt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        <main style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: 'var(--red)' }}>Početna</span>
            <span>›</span>
            <span style={{ fontWeight: '600', color: 'var(--text)' }}>{cat?.name}</span>
            {selectedSubcat && <><span>›</span><span style={{ color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setSelectedSubcat(null)}>{allProds.find(p => p.subcategory_id === selectedSubcat)?.subcategories?.name} ✕</span></>}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 0.25rem' }}>{loading ? 'Učitavanje...' : cat?.name}</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: '0 0 1rem' }}>{filtered.length} proizvoda</p>
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {selectedBrand && <span onClick={() => setSelectedBrand(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{allProds.find(p => p.brand_id === selectedBrand)?.brands?.name} ✕</span>}
              {selectedSubcat && <span onClick={() => setSelectedSubcat(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{allProds.find(p => p.subcategory_id === selectedSubcat)?.subcategories?.name} ✕</span>}
              {selectedModel && <span onClick={() => setSelectedModel(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedModel} ✕</span>}
              {selectedConn1 && <span onClick={() => setSelectedConn1(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>K1: {selectedConn1} ✕</span>}
              {selectedConn2 && <span onClick={() => setSelectedConn2(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>K2: {selectedConn2} ✕</span>}
              {selectedProtection && <span onClick={() => setSelectedProtection(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedProtection} ✕</span>}
              {selectedMaskType && <span onClick={() => setSelectedMaskType(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedMaskType} ✕</span>}
              {selectedWatt && <span onClick={() => setSelectedWatt(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedWatt}W ✕</span>}
            </div>
          )}
          {isMobile ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => { setTempBrand(selectedBrand); setTempSubcat(selectedSubcat); setTempModel(selectedModel); setTempConn1(selectedConn1); setTempConn2(selectedConn2); setTempProtection(selectedProtection); setTempMaskType(selectedMaskType); setTempWatt(selectedWatt); setTempPriceMin(priceMin); setTempPriceMax(priceMax); setFilterDrawerOpen(true); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.7rem', borderRadius: '8px', border: `1.5px solid ${activeFiltersCount > 0 ? 'var(--red)' : 'var(--border)'}`, background: activeFiltersCount > 0 ? 'var(--red-light)' : '#fff', color: activeFiltersCount > 0 ? 'var(--red)' : 'var(--text)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}>
                Filteri {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''} ▾
              </button>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.95rem', background: '#fff', cursor: 'pointer', fontWeight: '600', color: 'var(--text)' }}>
                <option value="name">Sortiranje ▾</option>
                <option value="name">Naziv A-Z</option>
                <option value="price_asc">Cena ↑</option>
                <option value="price_desc">Cena ↓</option>
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' }}>
                <option value="name">Naziv A-Z</option>
                <option value="price_asc">Cena ↑</option>
                <option value="price_desc">Cena ↓</option>
              </select>
            </div>
          )}
          {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Učitavanje...</div>
            : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Package size={44} color="var(--faint)" /></div>
                <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>Nema proizvoda</p>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Ukloni filtere</button>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.85rem' }}>
                {filtered.map(p => <ProductCard key={p.id} p={p} onAdd={addToCart} router={router} isMobile={isMobile} />)}
              </div>
            )}
        </main>

        {!isMobile && (
          <aside style={{ position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>Filteri</span>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Ukloni sve</button>}
              </div>
              {catBrands.length > 0 && (
                <FilterSection title="Brend" hasActive={!!selectedBrand} onClear={() => setSelectedBrand(null)}>
                  {catBrands.map(b => <CheckboxItem key={b.id} label={b.name} count={prods.filter(p => p.brand_id === b.id).length} selected={selectedBrand === b.id} onClick={() => setSelectedBrand(selectedBrand === b.id ? null : b.id)} />)}
                </FilterSection>
              )}
              {catSubcats.length > 0 && (
                <FilterSection title="Tip" hasActive={!!selectedSubcat || !!selectedModel} onClear={() => { setSelectedSubcat(null); setSelectedModel(null); }}>
                  {catSubcats.map(s => {
                    const subModels = isSpecialCategory ? getModelsForSubcat(s) : [];
                    const isExpanded = expandedTipId === s.id;
                    const isSelected = selectedSubcat === s.id;
                    return (
                      <div key={s.id}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <CheckboxItem label={s.name} count={prods.filter(p => p.subcategory_id === s.id).length} selected={isSelected}
                              onClick={() => {
                                if (isSelected && subModels.length > 0) {
                                  // Drugi klik na vec izabran brend otvara/zatvara podmeni modela
                                  // (umesto da se gadja mala strelica pored)
                                  setExpandedTipId(isExpanded ? null : s.id);
                                } else {
                                  setSelectedSubcat(isSelected ? null : s.id);
                                }
                              }} />
                          </div>
                          {subModels.length > 0 && (
                            <button onClick={() => setExpandedTipId(isExpanded ? null : s.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.3rem', display: 'flex', alignItems: 'center', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</button>
                          )}
                        </div>
                        {isExpanded && subModels.length > 0 && (
                          <div style={{ paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                            {subModels.map(m => (
                              <CheckboxItem key={m} label={m} selected={selectedModel === m}
                                onClick={() => { setSelectedModel(selectedModel === m ? null : m); setSelectedSubcat(s.id); }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </FilterSection>
              )}
              {hasConnectors && <>
                <KonektorSelectFilter title="Konektor 1" value={selectedConn1} onChange={setSelectedConn1} prods={prods} field="connector1" />
                <KonektorSelectFilter title="Konektor 2" value={selectedConn2} onChange={setSelectedConn2} prods={prods} field="connector2" />
              </>}
              {availableProtections.length > 0 && (
                <FilterSection title="Zaštita" hasActive={!!selectedProtection} onClear={() => setSelectedProtection(null)}>
                  {availableProtections.map(t => <CheckboxItem key={t} label={t} count={prods.filter(p => p.protection_type === t).length} selected={selectedProtection === t} onClick={() => setSelectedProtection(selectedProtection === t ? null : t)} />)}
                </FilterSection>
              )}
              {availableMaskTypes.length > 0 && (
                <FilterSection title="Tip maske" hasActive={!!selectedMaskType} onClear={() => setSelectedMaskType(null)}>
                  {availableMaskTypes.map(t => <CheckboxItem key={t} label={t} count={prods.filter(p => p.mask_type === t).length} selected={selectedMaskType === t} onClick={() => setSelectedMaskType(selectedMaskType === t ? null : t)} />)}
                </FilterSection>
              )}
              {availableWatts.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div onClick={() => setWattExpanded(e => !e)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>Snaga (W) {selectedWatt ? `— ${selectedWatt}W` : ''}</span>
                    <span style={{ color: 'var(--muted)', transform: wattExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
                  </div>
                  {wattExpanded && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {availableWatts.map(w => <CheckboxItem key={w} label={`${w}W`} count={prods.filter(p => getWatt(p) === w).length} selected={selectedWatt === w} onClick={() => setSelectedWatt(selectedWatt === w ? null : w)} />)}
                    </div>
                  )}
                </div>
              )}
              <FilterSection title="Cena" hasActive={priceMin > minPrice || priceMax < maxPrice} onClear={() => { setPriceMin(minPrice); setPriceMax(maxPrice); }}>
                <DualSlider min={minPrice} max={maxPrice} valueMin={priceMin} valueMax={priceMax} onChange={(mn, mx) => { setPriceMin(mn); setPriceMax(mx); }} />
              </FilterSection>
            </div>
          </aside>
        )}
      </div>

      {isMobile && mounted && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '65px', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 200, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          {[{ icon: HomeIcon, label: 'Početna', action: () => router.push('/') }, { icon: Package, label: 'Kategorije', action: () => setCatsDrawerOpen(true), active: true }, { icon: Search, label: 'Pretraga', action: () => router.push('/pretraga') }, { icon: User, label: shopSession ? 'Nalog' : 'Prijava', action: () => shopSession ? router.push('/moje-porudzbine') : setAuthModalOpen(true) }, { icon: ShoppingCart, label: 'Korpa', action: () => setDrawerOpen(true), badge: count }].map(item => (
            <button key={item.label} onClick={item.action} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', padding: '0.5rem 0' }}>
              <item.icon size={21} color={item.active ? 'var(--red)' : 'var(--muted)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: '600', color: item.active ? 'var(--red)' : 'var(--muted)' }}>{item.label}</span>
              {item.badge > 0 && <span style={{ position: 'absolute', top: '4px', right: '20%', background: 'var(--red)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>{item.badge}</span>}
            </button>
          ))}
        </div>
      )}

      {filterDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setFilterDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Filteri</h2>
              <button onClick={() => setFilterDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {catBrands.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Brend</p>
                    {tempBrand && <button onClick={() => setTempBrand(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {catBrands.map(b => { const cnt = prods.filter(p => p.brand_id === b.id).length; const isSelected = tempBrand === b.id; return (
                    <button key={b.id} onClick={() => setTempBrand(isSelected ? null : b.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.65rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--red)' : '#ccc'}`, background: isSelected ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSelected && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                        <span style={{ fontSize: '1rem', color: isSelected ? 'var(--red)' : 'var(--text)', fontWeight: isSelected ? '700' : '400' }}>{b.name}</span>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{cnt}</span>
                    </button>
                  ); })}
                </div>
              )}
              {catSubcats.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Tip</p>
                    {(tempSubcat || tempModel) && <button onClick={() => { setTempSubcat(null); setTempModel(null); }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {catSubcats.map(s => {
                    const cnt = prods.filter(p => p.subcategory_id === s.id).length;
                    const isSelected = tempSubcat === s.id;
                    const subModels = isSpecialCategory ? getModelsForSubcat(s) : [];
                    const isExpanded = expandedTipId === s.id;
                    return (
                      <div key={s.id}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button onClick={() => {
                              if (isSelected && subModels.length > 0) {
                                setExpandedTipId(isExpanded ? null : s.id);
                              } else {
                                setTempSubcat(isSelected ? null : s.id);
                              }
                            }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--red)' : '#ccc'}`, background: isSelected ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSelected && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                              <span style={{ fontSize: '1rem', color: isSelected ? 'var(--red)' : 'var(--text)', fontWeight: isSelected ? '700' : '400' }}>{s.name}</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{cnt}</span>
                          </button>
                          {subModels.length > 0 && (
                            <button onClick={() => setExpandedTipId(isExpanded ? null : s.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.5rem', display: 'flex', alignItems: 'center', flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: '1.2rem' }}>›</button>
                          )}
                        </div>
                        {isExpanded && subModels.length > 0 && (
                          <div style={{ paddingLeft: '2rem', background: '#f8f8f8' }}>
                            {subModels.map(m => {
                              const isModelSel = tempModel === m;
                              return (
                                <button key={m} onClick={() => { setTempModel(isModelSel ? null : m); setTempSubcat(s.id); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.55rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isModelSel ? 'var(--red)' : '#ccc'}`, background: isModelSel ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isModelSel && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: '900' }}>✓</span>}</div>
                                  <span style={{ fontSize: '0.9rem', color: isModelSel ? 'var(--red)' : 'var(--muted)', fontWeight: isModelSel ? '700' : '400' }}>{m}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {hasConnectors && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 0.75rem' }}>Konektori</p>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--muted)' }}>Konektor 1</label>
                      {tempConn1 && <button onClick={() => setTempConn1(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>Obriši</button>}
                    </div>
                    <select value={tempConn1 || ''} onChange={e => setTempConn1(e.target.value || null)}
                      style={{ width: '100%', padding: '0.65rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '1rem', outline: 'none', background: '#fff', color: tempConn1 ? 'var(--red)' : 'var(--text)', fontWeight: tempConn1 ? '700' : '400' }}>
                      <option value="">— Svi —</option>
                      {KONEKTORI.filter(k => prods.some(p => p.connector1 === k)).map(k => {
                        const cnt = prods.filter(p => p.connector1 === k).length;
                        return <option key={k} value={k}>{k} ({cnt})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--muted)' }}>Konektor 2</label>
                      {tempConn2 && <button onClick={() => setTempConn2(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>Obriši</button>}
                    </div>
                    <select value={tempConn2 || ''} onChange={e => setTempConn2(e.target.value || null)}
                      style={{ width: '100%', padding: '0.65rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '1rem', outline: 'none', background: '#fff', color: tempConn2 ? 'var(--red)' : 'var(--text)', fontWeight: tempConn2 ? '700' : '400' }}>
                      <option value="">— Svi —</option>
                      {KONEKTORI.filter(k => prods.some(p => p.connector2 === k)).map(k => {
                        const cnt = prods.filter(p => p.connector2 === k).length;
                        return <option key={k} value={k}>{k} ({cnt})</option>;
                      })}
                    </select>
                  </div>
                </div>
              )}
              {availableProtections.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Zaštita</p>
                    {tempProtection && <button onClick={() => setTempProtection(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {availableProtections.map(t => { const cnt = prods.filter(p => p.protection_type === t).length; const isSelected = tempProtection === t; return (
                    <button key={t} onClick={() => setTempProtection(isSelected ? null : t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.65rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--red)' : '#ccc'}`, background: isSelected ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSelected && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                        <span style={{ fontSize: '1rem', color: isSelected ? 'var(--red)' : 'var(--text)', fontWeight: isSelected ? '700' : '400' }}>{t}</span>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{cnt}</span>
                    </button>
                  ); })}
                </div>
              )}
              {availableMaskTypes.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Tip maske</p>
                    {tempMaskType && <button onClick={() => setTempMaskType(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {availableMaskTypes.map(t => { const cnt = prods.filter(p => p.mask_type === t).length; const isSelected = tempMaskType === t; return (
                    <button key={t} onClick={() => setTempMaskType(isSelected ? null : t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.65rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--red)' : '#ccc'}`, background: isSelected ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSelected && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                        <span style={{ fontSize: '1rem', color: isSelected ? 'var(--red)' : 'var(--text)', fontWeight: isSelected ? '700' : '400' }}>{t}</span>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{cnt}</span>
                    </button>
                  ); })}
                </div>
              )}
              {availableWatts.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div onClick={() => setWattExpanded(e => !e)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Snaga (W) {tempWatt ? `— ${tempWatt}W` : ''}</p>
                    <span style={{ color: 'var(--muted)', transform: wattExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block', fontSize: '1.2rem' }}>›</span>
                  </div>
                  {wattExpanded && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {availableWatts.map(w => { const cnt = prods.filter(p => getWatt(p) === w).length; const isSelected = tempWatt === w; return (
                        <button key={w} onClick={() => setTempWatt(isSelected ? null : w)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.65rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--red)' : '#ccc'}`, background: isSelected ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSelected && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                            <span style={{ fontSize: '1rem', color: isSelected ? 'var(--red)' : 'var(--text)', fontWeight: isSelected ? '700' : '400' }}>{w}W</span>
                          </div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{cnt}</span>
                        </button>
                      ); })}
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Cena</p>
                  {(tempPriceMin > minPrice || tempPriceMax < maxPrice) && <button onClick={() => { setTempPriceMin(minPrice); setTempPriceMax(maxPrice); }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                </div>
                <DualSlider min={minPrice} max={maxPrice} valueMin={tempPriceMin} valueMax={tempPriceMax} onChange={(mn, mx) => { setTempPriceMin(mn); setTempPriceMax(mx); }} />
              </div>
            </div>
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setTempBrand(null); setTempSubcat(null); setTempModel(null); setTempConn1(null); setTempConn2(null); setTempProtection(null); setTempMaskType(null); setTempWatt(null); setTempPriceMin(minPrice); setTempPriceMax(maxPrice); }} style={{ flex: 1, padding: '0.85rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Izbriši</button>
              <button onClick={() => { setSelectedBrand(tempBrand); setSelectedSubcat(tempSubcat); setSelectedModel(tempModel); setSelectedConn1(tempConn1); setSelectedConn2(tempConn2); setSelectedProtection(tempProtection); setSelectedMaskType(tempMaskType); setSelectedWatt(tempWatt); setPriceMin(tempPriceMin); setPriceMax(tempPriceMax); setFilterDrawerOpen(false); }} style={{ flex: 2, padding: '0.85rem', borderRadius: '8px', border: 'none', background: 'var(--red)', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Prikaži ({tempFiltered.length})</button>
            </div>
          </div>
        </div>
      )}

      {catsDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setCatsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Kategorije</h2>
              <button onClick={() => setCatsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
            </div>
            <div>
              {allCats.map(c => {
                const cnt = allProds.filter(p => p.category_id === c.id).length;
                const isCurrent = c.slug === slug;
                const subcats = [...new Map(allProds.filter(p => p.category_id === c.id && p.subcategory_id && p.subcategories?.name).map(p => [p.subcategory_id, { ...p.subcategories, id: p.subcategory_id }])).values()];
                return (
                  <div key={c.id}>
                    <button onClick={() => { router.push(`/kategorije/${c.slug}`); setCatsDrawerOpen(false); }} style={{ width: '100%', padding: '1rem 1.25rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isCurrent ? 'var(--red)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: isCurrent ? '#fff' : 'var(--text)' }}>{c.name}</span>
                      <span style={{ fontSize: '0.9rem', color: isCurrent ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>{cnt} →</span>
                    </button>
                    {isCurrent && subcats.length > 0 && (
                      <div style={{ background: 'var(--bg3)' }}>
                        {subcats.map(s => { const scnt = allProds.filter(p => p.category_id === c.id && p.subcategory_id === s.id).length; const isSelected = selectedSubcat === s.id; return (
                          <button key={s.id} onClick={() => {
                              if (specialSlugs.includes(slug)) {
                                router.push(`/kategorije/${slug}/${s.slug}`);
                                setCatsDrawerOpen(false);
                              } else {
                                setSelectedSubcat(isSelected ? null : s.id);
                                setCatsDrawerOpen(false);
                              }
                            }} style={{ width: '100%', padding: '0.75rem 1.25rem 0.75rem 2rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--red-light)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.95rem', color: isSelected ? 'var(--red)' : 'var(--muted)', fontWeight: isSelected ? '700' : '400' }}>· {s.name}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{scnt}</span>
                          </button>
                        ); })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 'min(380px, 100vw)', height: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black)' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShoppingCart size={17} /> Korpa</h2>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>×</button>
            </div>
            {mounted && (
              <div style={{ padding: '0.75rem 1.25rem', background: remaining === 0 ? '#f0fdf4' : '#fff8f0', borderBottom: '1px solid var(--border)' }}>
                {remaining === 0 ? <p style={{ margin: 0, fontSize: '0.82rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={15} /> Ostvarili ste besplatnu dostavu!</p>
                  : <><p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: 'var(--muted)' }}>Još <strong style={{ color: 'var(--red)' }}>{remaining.toLocaleString('sr-RS')} RSD</strong> do besplatne dostave</p><div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100)}%`, background: 'var(--red)', borderRadius: '3px', transition: 'width 0.3s' }} /></div></>}
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {cart.length === 0 ? <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><ShoppingCart size={40} color="var(--faint)" /></div>Korpa je prazna</div>
                : cart.map(x => (
                  <div key={x.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    {x.image_url && <img src={x.image_url} alt="" style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg3)', padding: '4px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</p>
                      <p style={{ margin: '0.2rem 0 0.4rem', color: 'var(--red)', fontWeight: '800', fontSize: '0.9rem' }}>{Number(x.price).toLocaleString('sr-RS')} RSD</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button onClick={() => changeQty(x.id, -1)} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>−</button>
                        <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>{x.qty}</span>
                        <button onClick={() => changeQty(x.id, 1)} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>+</button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(x.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={18} /></button>
                  </div>
                ))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.1rem' }}><span>Ukupno</span><span style={{ color: 'var(--red)' }}>{total.toLocaleString('sr-RS')} RSD</span></div>
                <button onClick={() => { setDrawerOpen(false); setCheckoutOpen(true); }} style={{ width: '100%', padding: '0.85rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>Nastavi →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={() => setCheckoutOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: '800' }}>Narudžbina</h2>
            {[['name','Ime i prezime *','text','Marko Marković'],['phone','Telefon *','tel','+381 60...'],['city','Grad *','text','Beograd'],['address','Adresa *','text','Ulica i broj']].map(([key,label,type,ph]) => (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</label>
                <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Napomena</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', resize: 'none', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} rows={2} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Način plaćanja</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['cod', Banknote, 'Pouzećem','Pri dostavi'],['card', CreditCard, 'Karticom','Online']].map(([val, Icon, name,desc]) => (
                  <button key={val} onClick={() => setPay(val)} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${pay===val ? 'var(--red)' : 'var(--border)'}`, background: pay===val ? 'var(--red-light)' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><Icon size={24} color={pay===val ? 'var(--red)' : 'var(--muted)'} /></div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: pay===val ? 'var(--red)' : 'var(--text)' }}>{name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem' }}>
              {cart.map(x => (
                <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                  <span style={{ flex: 1, marginRight: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name} × {x.qty}</span>
                  <span style={{ fontWeight: '600', flexShrink: 0 }}>{Number(x.price * x.qty).toLocaleString('sr-RS')} RSD</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem' }}><span>Ukupno</span><span style={{ color: 'var(--red)' }}>{total.toLocaleString('sr-RS')} RSD</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '0.25rem', color: total >= FREE_DELIVERY_THRESHOLD ? '#16a34a' : 'var(--muted)' }}><span>Dostava</span><span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{total >= FREE_DELIVERY_THRESHOLD ? <><Truck size={14} /> Besplatno</> : 'Po dogovoru'}</span></div>
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting} style={{ width: '100%', padding: '0.9rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>{submitting ? 'Slanje...' : 'Potvrdi narudžbinu'}</button>
            <button onClick={() => { setCheckoutOpen(false); setDrawerOpen(true); }} style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>← Nazad na korpu</button>
          </div>
        </div>
      )}

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onSuccess={handleAuthSuccess} />}

      {logoutConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={() => setLogoutConfirmOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '340px', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}><LogOut size={40} color="var(--red)" /></div>
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

function ProductCard({ p, onAdd, router, isMobile }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const btnSize = isMobile ? '30px' : '34px';
  const btnFont = isMobile ? '0.9rem' : '1rem';
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
      <div onClick={() => router.push(`/proizvod/${makeSlug(p.name, p.id)}`)} style={{ padding: '0.75rem', cursor: 'pointer', flex: 1 }}>
        <div style={{ position: 'relative' }}>
          {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: isMobile ? '140px' : '170px', objectFit: 'contain' }} />
            : <div style={{ height: isMobile ? '140px' : '170px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={32} color="var(--faint)" /></div>}
          {p.categories?.slug === 'maske' && (
            <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.6rem', fontWeight: '600', padding: '0.15rem 0.4rem', borderRadius: '4px', lineHeight: 1.3 }}>Telefon na slici je ilustrativan</span>
          )}
        </div>
        <p style={{ fontWeight: '600', fontSize: isMobile ? '0.82rem' : '0.9rem', margin: '0.5rem 0 0.2rem', lineHeight: 1.35, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
        {p.brands?.name && <p style={{ fontSize: '0.72rem', color: 'var(--faint)', margin: '0 0 0.1rem' }}>{p.brands.name}</p>}
        {(p.connector1 || p.connector2) && (
          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 0.1rem' }}>
            {p.connector1}{p.connector1 && p.connector2 ? ' → ' : ''}{p.connector2}
          </p>
        )}
        <p style={{ color: 'var(--red)', fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.05rem', margin: 0 }}>{Number(p.price).toLocaleString('sr-RS')} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>RSD</span></p>
      </div>
      <div style={{ padding: '0.5rem 0.6rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg3)' }}>
        <button onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q-1)); }}
          style={{ width: btnSize, height: btnSize, border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: btnFont, flexShrink: 0 }}>−</button>
        <span style={{ fontWeight: '700', fontSize: btnFont, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
        <button onClick={e => { e.stopPropagation(); setQty(q => q+1); }}
          style={{ width: btnSize, height: btnSize, border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: btnFont, flexShrink: 0 }}>+</button>
        <button onClick={e => { e.stopPropagation(); onAdd(p, qty); setAdded(true); setTimeout(() => setAdded(false), 1500); setQty(1); }}
          style={{ flex: 1, height: btnSize, background: added ? '#16a34a' : 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {added ? '✓' : '+ Dodaj'}
        </button>
      </div>
    </div>
  );
}
