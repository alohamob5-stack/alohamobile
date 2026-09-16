'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { sb, makeSlug } from '../../../../lib/supabase';
import AuthModal from '../../../components/AuthModal';
import { CheckCircle2, Truck, Search, User, ShoppingCart, Home as HomeIcon, Package, Trash2, Banknote, CreditCard, LogOut, ImageOff, Palmtree } from 'lucide-react';
import StockBar from '../../../components/StockBar';
import { useCart } from '../../../components/CartContext';

const FREE_DELIVERY_THRESHOLD = 2000;

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

export default function KategorijaBrandPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Učitavanje...</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { slug, brand } = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [cat, setCat] = useState(null);
  const [brandObj, setBrandObj] = useState(null);
  const [subcat, setSubcat] = useState(null);
  const [allCats, setAllCats] = useState([]);
  const [allSubcats, setAllSubcats] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const [prods, setProds] = useState([]);
  const { cart, count, total, mounted, shopSession, addToCart, removeFromCart, changeQty, clearCart, handleAuthSuccess: ctxHandleAuthSuccess, handleLogout: ctxHandleLogout } = useCart();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catsDrawerOpen, setCatsDrawerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pay, setPay] = useState('cod');
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(null);
  const [tempModel, setTempModel] = useState(null);
  const [tempTypeFilter, setTempTypeFilter] = useState(null);
  const [sort, setSort] = useState('name');
  const [searchVal, setSearchVal] = useState('');
  const [sidebarOpenCat, setSidebarOpenCat] = useState(null);
  const [sidebarOpenSubcat, setSidebarOpenSubcat] = useState(null);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(999999);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(999999);

  const isMaskeMode = slug === 'maske';
  const isStaklaMode = slug === 'stakla';
  const isSpecialMode = isMaskeMode || isStaklaMode;

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
      setSelectedModel(null);
      setSelectedTypeFilter(null);
      setSelectedSubcat(null);

      const [{ data: categories }, { data: brands }, { data: allSubcatsData }, { data: products }] = await Promise.all([
        sb.from('categories').select('*').order('name'),
        sb.from('brands').select('*').order('name'),
        sb.from('subcategories').select('*').order('name'),
        sb.from('products')
          .select('*, categories(name,slug), brands(name,slug), subcategories(name,slug)')
          .order('name')
          .range(0, 4999),
      ]);

      setAllCats(categories || []);
      setAllBrands(brands || []);
      setAllSubcats(allSubcatsData || []);

      const currentCat = (categories || []).find(c => c.slug === slug);
      setCat(currentCat);
      setSidebarOpenCat(currentCat?.id || null);

      if (isSpecialMode) {
        const currentSubcat = (allSubcatsData || []).find(s => s.slug === brand);
        setSubcat(currentSubcat);
        setSidebarOpenSubcat(currentSubcat?.id || null);

        const brandNameLower = (currentSubcat?.name || '').toLowerCase();
        const catProds = currentCat && currentSubcat
          ? (products || []).filter(p =>
              p.category_id === currentCat.id &&
              p.online === true &&
              (
                p.subcategory_id === currentSubcat.id ||
                (isStaklaMode && Array.isArray(p.phone_models) && p.phone_models.some(m => m.toLowerCase().startsWith(brandNameLower)))
              )
            )
          : [];
        setProds(catProds);

        const prices = catProds.map(p => p.price);
        const minP = prices.length ? Math.floor(Math.min(...prices)) : 0;
        const maxP = prices.length ? Math.ceil(Math.max(...prices)) : 999999;
        setPriceMin(minP); setPriceMax(maxP);
        setTempPriceMin(minP); setTempPriceMax(maxP);
      } else {
        const currentBrand = (brands || []).find(b => b.slug === brand);
        setBrandObj(currentBrand);

        if (currentCat && currentBrand) {
          const catBrandProds = (products || []).filter(p =>
            p.category_id === currentCat.id && p.brand_id === currentBrand.id && p.online === true
          );
          setProds(catBrandProds);
          const subcatIds = [...new Set(catBrandProds.filter(p => p.subcategory_id).map(p => p.subcategory_id))];
          setSubcats((allSubcatsData || []).filter(s => subcatIds.includes(s.id)));
        }
      }

      setLoading(false);
    }
    load();
  }, [slug, brand]);

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

  function getModelsOf(p) {
    if (isStaklaMode) return p.phone_models || [];
    if (isMaskeMode) return p.phone_model ? [p.phone_model] : [];
    return [];
  }
  function getTypeOf(p) {
    if (isStaklaMode) return p.protection_type;
    if (isMaskeMode) return p.mask_type;
    return null;
  }
  function productMatchesModel(p, model) {
    if (!model) return true;
    return getModelsOf(p).includes(model);
  }

  // Napomena: Xiaomi telefoni u bazi cesto pocinju sa "Redmi" (ne "Xiaomi"), pa se to
  // tretira kao alias iste porodice brenda.
  const currentBrandNameLower = (subcat?.name || '').toLowerCase();
  const brandAliasi = currentBrandNameLower === 'xiaomi' ? ['xiaomi', 'redmi'] : [currentBrandNameLower];
  const models = isSpecialMode
    ? [...new Set(prods.flatMap(p => getModelsOf(p)).filter(Boolean).filter(m => !isStaklaMode || brandAliasi.some(a => m.toLowerCase().startsWith(a))))].sort()
    : [];
  const typeOptions = isSpecialMode
    ? [...new Set(prods.map(p => getTypeOf(p)).filter(Boolean))].sort()
    : [];
  const minPrice = prods.length ? Math.floor(Math.min(...prods.map(p => p.price))) : 0;
  const maxPrice = prods.length ? Math.ceil(Math.max(...prods.map(p => p.price))) : 999999;

  const filtered = isSpecialMode
    ? prods
        .filter(p => productMatchesModel(p, selectedModel))
        .filter(p => !selectedTypeFilter || getTypeOf(p) === selectedTypeFilter)
        .filter(p => p.price >= priceMin && p.price <= priceMax)
        .sort((a, b) => sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : a.name.localeCompare(b.name))
    : prods.filter(p => !selectedSubcat || p.subcategory_id === selectedSubcat)
        .sort((a, b) => sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : a.name.localeCompare(b.name));

  const tempFiltered = prods
    .filter(p => productMatchesModel(p, tempModel))
    .filter(p => !tempTypeFilter || getTypeOf(p) === tempTypeFilter)
    .filter(p => p.price >= tempPriceMin && p.price <= tempPriceMax);

  const activeFiltersCount = isSpecialMode
    ? (selectedModel ? 1 : 0) + (selectedTypeFilter ? 1 : 0) + (priceMin > minPrice || priceMax < maxPrice ? 1 : 0)
    : (selectedSubcat ? 1 : 0);

  const gridCols = isMobile ? '1fr' : isSpecialMode ? '220px 1fr 260px' : '220px 1fr';
  const typeFilterLabel = isStaklaMode ? 'Tip zaštite' : 'Tip maske';
  const categoryLabel = isStaklaMode ? 'Stakla' : 'Maske';

    async function handleAuthSuccess(session) {
          await ctxHandleAuthSuccess(session);
          setAuthModalOpen(false);
  }
    function handleLogout() {
          ctxHandleLogout();
          setLogoutConfirmOpen(false);
    }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif', paddingBottom: isMobile ? '65px' : '0' }}>
      {success && <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', zIndex: 2000, fontWeight: 'bold', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Narudžbina poslata!</div>}

      <div style={{ background: 'var(--lagoon)', color: '#fff', textAlign: 'center', padding: '0.4rem 1rem', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Truck size={15} /> Besplatna dostava za porudžbine preko 2.000 RSD</div>

      <header style={{ background: '#fff', padding: '0 1rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 16px rgba(15,30,61,0.08)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem', height: '60px' }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--black)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--black), var(--lagoon))', color: '#fff', flexShrink: 0 }}><Palmtree size={20} /></span>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input placeholder="Pretraži proizvode..." value={searchVal} onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchVal.trim()) router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`); }}
              style={{ width: '100%', padding: '0.55rem 2.5rem 0.55rem 2.5rem', borderRadius: 'var(--pill)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', background: 'var(--bg3)', color: 'var(--text)' }} />
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            {searchVal && <button onClick={() => router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: 'var(--pill)', padding: '0.2rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>Traži</button>}
          </div>
{!isMobile && mounted && (
            shopSession ? (
                          <>
                <button onClick={() => router.push('/moje-porudzbine')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#fff', color: 'var(--black)', border: '1.5px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Istorija</button>
                <button onClick={() => setLogoutConfirmOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#fff', color: 'var(--black)', border: '1.5px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{shopSession.type === 'shop' ? shopSession.locationName : shopSession.name} Odjava</button>
  </>
            ) : (
                          <button onClick={() => setAuthModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#fff', color: 'var(--black)', border: '1.5px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Prijava</button>
                        )
                                  )}
          <button onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.2rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(239,138,28,0.35)' }}>
            <ShoppingCart size={16} /> {!isMobile && 'Korpa'}
            {mounted && count > 0 && <span style={{ background: '#fff', color: 'var(--red)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '900' }}>{count}</span>}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1700px', margin: '0 auto', padding: '1rem', display: 'grid', gridTemplateColumns: gridCols, gap: '1.25rem', alignItems: 'start' }}>

        {!isMobile && (
          <aside style={{ position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ background: 'linear-gradient(120deg, var(--black), var(--lagoon) 160%)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Palmtree size={15} color="#fff" /><span className="font-head" style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>KATEGORIJE</span></div>
              <button onClick={() => router.push('/')} style={{ width: '100%', padding: '0.85rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontWeight: '600', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><HomeIcon size={16} /> Početna</span> <span style={{ opacity: 0.4 }}>›</span>
              </button>
              {allCats.map(c => {
                const isCurrent = c.slug === slug;
                const isOpen = sidebarOpenCat === c.id;
                const catSubcats = allSubcats.filter(s => s.category_id === c.id);
                return (
                  <div key={c.id}>
                    <button onClick={() => { router.push(`/kategorije/${c.slug}`); setSidebarOpenCat(isOpen && isCurrent ? null : c.id); }}
                      style={{ width: '100%', padding: '0.85rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isCurrent && !subcat && !brandObj ? 'var(--red)' : 'transparent', color: isCurrent && !subcat && !brandObj ? '#fff' : 'var(--text)', fontWeight: isCurrent ? '700' : '500', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{c.name}</span>
                      {catSubcats.length > 0 && <span style={{ fontSize: '0.82rem', opacity: 0.7, transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>}
                    </button>
                    {isOpen && catSubcats.length > 0 && (
                      <div style={{ background: 'var(--bg3)' }}>
                        {catSubcats.map(s => {
                          const isCurrentSub = (c.slug === slug && isSpecialMode) ? s.slug === brand : false;
                          return (
                            <button key={s.id} onClick={() => router.push(`/kategorije/${c.slug}/${s.slug}`)}
                              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 1.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isCurrentSub ? 'var(--red)' : 'transparent', color: isCurrentSub ? '#fff' : 'var(--muted)', fontWeight: isCurrentSub ? '700' : '400', fontSize: '0.88rem' }}>
                              · {s.name}
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
            <span onClick={() => router.push(`/kategorije/${slug}`)} style={{ cursor: 'pointer', color: 'var(--red)' }}>{cat?.name}</span>
            <span>›</span>
            <span style={{ fontWeight: '600', color: 'var(--text)' }}>{isSpecialMode ? subcat?.name : brandObj?.name}</span>
            {isSpecialMode && selectedModel && <><span>›</span><span style={{ color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setSelectedModel(null)}>{selectedModel} ✕</span></>}
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 0.25rem' }}>
            {loading ? 'Učitavanje...' : isSpecialMode ? `${categoryLabel} za ${subcat?.name}` : `${cat?.name} — ${brandObj?.name}`}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: '0 0 1rem' }}>{filtered.length} proizvoda</p>

          {isSpecialMode && (selectedModel || selectedTypeFilter) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {selectedModel && <span onClick={() => setSelectedModel(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: 'var(--pill)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedModel} ✕</span>}
              {selectedTypeFilter && <span onClick={() => setSelectedTypeFilter(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: 'var(--pill)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedTypeFilter} ✕</span>}
            </div>
          )}
          {!isSpecialMode && selectedSubcat && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span onClick={() => setSelectedSubcat(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: 'var(--pill)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{subcats.find(s => s.id === selectedSubcat)?.name} ✕</span>
            </div>
          )}

          {!isSpecialMode && subcats.length > 0 && !selectedSubcat && (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {subcats.map(s => (
                <div key={s.id} onClick={() => setSelectedSubcat(s.id)}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', boxShadow: 'var(--shadow)' }}>
                  {s.name} <span style={{ fontSize: '0.75rem', color: 'var(--faint)', fontWeight: '400' }}>{prods.filter(p => p.subcategory_id === s.id).length}</span>
                </div>
              ))}
            </div>
          )}

          {isMobile ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {isSpecialMode && (
                <button onClick={() => { setTempModel(selectedModel); setTempTypeFilter(selectedTypeFilter); setTempPriceMin(priceMin); setTempPriceMax(priceMax); setFilterDrawerOpen(true); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.7rem', borderRadius: 'var(--pill)', border: `1.5px solid ${activeFiltersCount > 0 ? 'var(--red)' : 'var(--border)'}`, background: activeFiltersCount > 0 ? 'var(--red-light)' : '#fff', color: activeFiltersCount > 0 ? 'var(--red)' : 'var(--text)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}>
                  Filteri {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''} ▾
                </button>
              )}
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.95rem', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>
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
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.85rem' }}>
                {filtered.map(p => <ProductCard key={p.id} p={p} onAdd={addToCart} router={router} isMobile={isMobile} isStaklaMode={isStaklaMode} selectedModel={selectedModel} />)}
              </div>
            )}
        </main>

        {!isMobile && isSpecialMode && (
          <aside style={{ position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>Filteri</span>
                {activeFiltersCount > 0 && (
                  <button onClick={() => { setSelectedTypeFilter(null); setSelectedModel(null); setPriceMin(minPrice); setPriceMax(maxPrice); }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Ukloni sve</button>
                )}
              </div>
              {models.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>Model telefona</span>
                    {selectedModel && <button onClick={() => setSelectedModel(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    <CheckboxItem label="Svi modeli" count={prods.length} selected={!selectedModel} onClick={() => setSelectedModel(null)} />
                    {models.map(m => (
                      <CheckboxItem key={m} label={m} count={prods.filter(p => productMatchesModel(p, m)).length} selected={selectedModel === m} onClick={() => setSelectedModel(selectedModel === m ? null : m)} />
                    ))}
                  </div>
                </div>
              )}
              {typeOptions.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>{typeFilterLabel}</span>
                    {selectedTypeFilter && <button onClick={() => setSelectedTypeFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  <CheckboxItem label="Sve" count={prods.length} selected={!selectedTypeFilter} onClick={() => setSelectedTypeFilter(null)} />
                  {typeOptions.map(t => (
                    <CheckboxItem key={t} label={t} count={prods.filter(p => getTypeOf(p) === t).length} selected={selectedTypeFilter === t} onClick={() => setSelectedTypeFilter(selectedTypeFilter === t ? null : t)} />
                  ))}
                </div>
              )}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>Cena</span>
                  {(priceMin > minPrice || priceMax < maxPrice) && (
                    <button onClick={() => { setPriceMin(minPrice); setPriceMax(maxPrice); }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>Obriši</button>
                  )}
                </div>
                <DualSlider min={minPrice} max={maxPrice} valueMin={priceMin} valueMax={priceMax} onChange={(mn, mx) => { setPriceMin(mn); setPriceMax(mx); }} />
              </div>
            </div>
          </aside>
        )}
      </div>

      {filterDrawerOpen && isSpecialMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setFilterDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Filteri</h2>
              <button onClick={() => setFilterDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {typeOptions.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>{typeFilterLabel}</p>
                    {tempTypeFilter && <button onClick={() => setTempTypeFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {typeOptions.map(t => {
                    const isSel = tempTypeFilter === t;
                    return (
                      <button key={t} onClick={() => setTempTypeFilter(isSel ? null : t)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSel ? 'var(--red)' : '#ccc'}`, background: isSel ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSel && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                        <span style={{ fontSize: '1rem', fontWeight: isSel ? '700' : '400', color: isSel ? 'var(--red)' : 'var(--text)', flex: 1, textAlign: 'left' }}>{t}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{prods.filter(p => getTypeOf(p) === t).length}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {models.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Model telefona</p>
                    {tempModel && <button onClick={() => setTempModel(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {models.map(m => {
                    const isSel = tempModel === m;
                    return (
                      <button key={m} onClick={() => setTempModel(isSel ? null : m)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 0', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: `2px solid ${isSel ? 'var(--red)' : '#ccc'}`, background: isSel ? 'var(--red)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSel && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>✓</span>}</div>
                        <span style={{ fontSize: '1rem', fontWeight: isSel ? '700' : '400', color: isSel ? 'var(--red)' : 'var(--text)' }}>{m}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div>
                <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 0.75rem' }}>Cena</p>
                <DualSlider min={minPrice} max={maxPrice} valueMin={tempPriceMin} valueMax={tempPriceMax} onChange={(mn, mx) => { setTempPriceMin(mn); setTempPriceMax(mx); }} />
              </div>
            </div>
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setTempModel(null); setTempTypeFilter(null); setTempPriceMin(minPrice); setTempPriceMax(maxPrice); }} style={{ flex: 1, padding: '0.85rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Izbriši</button>
              <button onClick={() => { setSelectedModel(tempModel); setSelectedTypeFilter(tempTypeFilter); setPriceMin(tempPriceMin); setPriceMax(tempPriceMax); setFilterDrawerOpen(false); }} style={{ flex: 2, padding: '0.85rem', borderRadius: '8px', border: 'none', background: 'var(--red)', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Prikaži ({tempFiltered.length})</button>
            </div>
          </div>
        </div>
      )}

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

      {catsDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setCatsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Kategorije</h2>
              <button onClick={() => setCatsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            </div>
            {allCats.map(c => {
              const isCurrent = c.slug === slug;
              const catSubcats = allSubcats.filter(s => s.category_id === c.id);
              return (
                <div key={c.id}>
                  <button onClick={() => { router.push(`/kategorije/${c.slug}`); setCatsDrawerOpen(false); }}
                    style={{ width: '100%', padding: '1rem 1.25rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isCurrent ? 'var(--red)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: isCurrent ? '#fff' : 'var(--text)' }}>{c.name}</span>
                    <span style={{ fontSize: '0.9rem', color: isCurrent ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>{catSubcats.length > 0 ? `${catSubcats.length} →` : '→'}</span>
                  </button>
                  {isCurrent && catSubcats.length > 0 && (
                    <div style={{ background: 'var(--bg3)' }}>
                      {catSubcats.map(s => {
                        const isCurrentSub = s.slug === brand;
                        return (
                          <button key={s.id} onClick={() => { router.push(`/kategorije/${c.slug}/${s.slug}`); setCatsDrawerOpen(false); }}
                            style={{ width: '100%', padding: '0.75rem 1.25rem 0.75rem 2rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isCurrentSub ? 'var(--red-light)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.95rem', color: isCurrentSub ? 'var(--red)' : 'var(--muted)', fontWeight: isCurrentSub ? '700' : '400' }}>· {s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
                        <button onClick={() => changeQty(x.id, -1)} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>−</button>
                        <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>{x.qty}</span>
                        <button onClick={() => changeQty(x.id, 1)} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>+</button>
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
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting} style={{ width: '100%', padding: '0.9rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>{submitting ? 'Slanje...' : 'Potvrdi narudžbinu'}</button>
            <button onClick={() => { setCheckoutOpen(false); setDrawerOpen(true); }} style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>← Nazad na korpu</button>
          </div>
        </div>
      )}
{authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onSuccess={handleAuthSuccess} />}
    
{logoutConfirmOpen && (<div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
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

function getDisplayNameForModel(p, selectedModel, isStaklaMode) {
  if (!isStaklaMode || !selectedModel) return p.name;
  const models = p.phone_models || [];
  if (!models.includes(selectedModel)) return p.name;
  const nameHasModelWord = new RegExp(`(^|[^a-z0-9])${selectedModel.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(p.name);
  if (nameHasModelWord) return p.name;
  const parts = p.name.split('—');
  if (parts.length < 2) return p.name;
  return `${parts[0].trim()} — ${selectedModel}`;
}

function ProductCard({ p, onAdd, router, isMobile, isStaklaMode, selectedModel }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const btnSize = isMobile ? '30px' : '34px';
  const btnFont = isMobile ? '0.9rem' : '1rem';
  const typeLabel = isStaklaMode ? p.protection_type : p.mask_type;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
      <div onClick={() => router.push(`/proizvod/${makeSlug(p.name, p.id)}${selectedModel ? `?model=${encodeURIComponent(selectedModel)}` : ''}`)} style={{ padding: '0.75rem', cursor: 'pointer', flex: 1 }}>
        <div style={{ position: 'relative' }}>
          {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: isMobile ? '140px' : '170px', objectFit: 'contain' }} />
            : <div style={{ height: isMobile ? '140px' : '170px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={32} color="var(--faint)" /></div>}
          {!isStaklaMode && p.categories?.slug === 'maske' && (
            <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.6rem', fontWeight: '600', padding: '0.15rem 0.4rem', borderRadius: 'var(--pill)', lineHeight: 1.3 }}>Telefon na slici je ilustrativan</span>
          )}
        </div>
        <p style={{ fontWeight: '600', fontSize: isMobile ? '0.82rem' : '0.9rem', margin: '0.5rem 0 0.2rem', lineHeight: 1.35, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{getDisplayNameForModel(p, selectedModel, isStaklaMode)}</p>
        {typeLabel && <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '0 0 0.1rem' }}>{typeLabel}</p>}
        <p style={{ color: 'var(--red)', fontWeight: '800', fontSize: isMobile ? '0.95rem' : '1.05rem', margin: 0 }}>{Number(p.price).toLocaleString('sr-RS')} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>RSD</span></p>
      </div>
      <div style={{ padding: '0.5rem 0.6rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg3)' }}>
        <button onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }} style={{ width: btnSize, height: btnSize, border: '1px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: btnFont, flexShrink: 0 }}>−</button>
        <span style={{ fontWeight: '700', fontSize: btnFont, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
        <button onClick={e => { e.stopPropagation(); setQty(q => q + 1); }} style={{ width: btnSize, height: btnSize, border: '1px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: btnFont, flexShrink: 0 }}>+</button>
        <button onClick={e => { e.stopPropagation(); onAdd(p, qty); setAdded(true); setTimeout(() => setAdded(false), 1500); setQty(1); }}
          style={{ flex: 1, height: btnSize, background: added ? '#16a34a' : 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {added ? '✓' : '+ Dodaj'}
        </button>
      </div>
    </div>
  );
}
