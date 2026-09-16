'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sb, makeSlug } from '../../lib/supabase';
import { useCart } from '../components/CartContext';
import AuthModal from '../components/AuthModal';
import { CheckCircle2, Truck, Search, User, ShoppingCart, Home as HomeIcon, Package, Trash2, Banknote, CreditCard, LogOut, ImageOff, Flame, Sparkles } from 'lucide-react';

const FREE_DELIVERY_THRESHOLD = 2000;

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

const synonyms = {
  'staklo': ['zastitno staklo', 'tempered', 'glass', '5d', '9d', 'screen protector', 'zastita', 'folija', 'glas', 'gl'],
  'futrola': ['case', 'maska', 'cover', 'torbica'],
  'punjac': ['charger', 'adapter', 'brzi punjac', 'fast charge'],
  'kabl': ['cable', 'usb', 'type-c', 'lightning', 'micro usb', 'kabal', 'kabel'],
  'slusalice': ['earphones', 'headphones', 'airpods', 'earbud'],
};

function normalize(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[čć]/g,'c').replace(/[šđ]/g,'s').replace(/ž/g,'z'); }

function wordMatches(hay, word) {
  if (hay.includes(word)) return true;
  for (const [key, syns] of Object.entries(synonyms)) {
    const keyN = normalize(key);
    if (word === keyN || syns.some(s => normalize(s) === word)) {
      if (hay.includes(keyN) || syns.some(s => hay.includes(normalize(s)))) return true;
    }
  }
  return false;
}

function matchesSearch(p, q) {
  if (!q) return true;
  const n = normalize(q);
  const phoneModelsText = Array.isArray(p.phone_models) ? p.phone_models.join(' ') : '';
  const hay = normalize([p.name, p.barcode||'', p.categories?.name||'', p.brands?.name||'', phoneModelsText, p.phone_model||''].join(' '));
  if (hay.includes(n)) return true;
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  return words.every(w => wordMatches(hay, w));
}

function getDisplayName(p, q) {
  if (!q || !Array.isArray(p.phone_models) || p.phone_models.length <= 1) return p.name;
  const nq = normalize(q);
  let matched = p.phone_models.find(m => normalize(m) === nq);
  if (!matched) matched = p.phone_models.find(m => {
    const nm = normalize(m);
    return nm.includes(nq) || nq.includes(nm) || nq.split(/\s+/).some(w => w.length > 1 && nm.includes(w));
  });
  if (!matched) return p.name;
  const nm = normalize(matched);
  const nameHasModelWord = new RegExp(`(^|[^a-z0-9])${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(normalize(p.name));
  if (nameHasModelWord) return p.name;
  const parts = p.name.split('—');
  if (parts.length < 2) return p.name;
  return `${parts[0].trim()} — ${matched}`;
}

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

function CatsDrawerAccordion({ cats, prods, router, onClose }) {
  const [openCat, setOpenCat] = useState(null);
  const [openBrand, setOpenBrand] = useState(null);
  return (
    <div>
      {cats.map(c => {
        const catProds = prods.filter(p => p.category_id === c.id);
        const brands = [...new Map(catProds.filter(p => p.brand_id && p.brands?.name).map(p => [p.brand_id, { ...p.brands, id: p.brand_id }])).values()];
        const isOpen = openCat === c.id;
        return (
          <div key={c.id}>
            <button onClick={() => { setOpenCat(isOpen ? null : c.id); setOpenBrand(null); }}
              style={{ width: '100%', padding: '0.9rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isOpen ? 'var(--red)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isOpen ? '#fff' : 'var(--text)' }}>{c.name} <span style={{ fontWeight: '400', fontSize: '0.8rem', opacity: 0.6 }}>({catProds.length})</span></span>
              <span style={{ color: isOpen ? '#fff' : 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
            </button>
            {isOpen && brands.length > 0 && (
              <div style={{ background: 'var(--bg3)' }}>
                {brands.map(b => {
                  const brandProds = catProds.filter(p => p.brands?.name === b.name);
                  const subcats = [...new Map(brandProds.filter(p => p.subcategory_id && p.subcategories?.name).map(p => [p.subcategory_id, { ...p.subcategories, id: p.subcategory_id }])).values()];
                  const isBrandOpen = openBrand === `${c.id}-${b.id}`;
                  return (
                    <div key={b.id}>
                      <button onClick={() => setOpenBrand(isBrandOpen ? null : `${c.id}-${b.id}`)}
                        style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 1.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isBrandOpen ? 'var(--red-light)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: isBrandOpen ? '700' : '500', color: isBrandOpen ? 'var(--red)' : 'var(--muted)' }}>— {b.name} <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({brandProds.length})</span></span>
                        {subcats.length > 0 && <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: isBrandOpen ? 'rotate(90deg)' : 'none', fontSize: '0.8rem', color: 'var(--muted)' }}>›</span>}
                      </button>
                      {isBrandOpen && subcats.length > 0 && (
                        <div style={{ background: '#e8e8e8' }}>
                          {subcats.map(s => {
                            const cnt = brandProds.filter(p => p.subcategories?.name === s.name).length;
                            return (
                              <button key={s.id || s.name}
                                onClick={() => { router.push(`/kategorije/${c.slug}?brand=${b.slug || b.name.toLowerCase()}&tip=${s.slug || s.name.toLowerCase()}`); onClose(); }}
                                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid #ddd', cursor: 'pointer', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>· {s.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>{cnt}</span>
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
          </div>
        );
      })}
    </div>
  );
}

function PretragaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const catSlug = searchParams.get('cat') || null;
  const featuredOnly = searchParams.get('featured') === '1';
  const newOnly = searchParams.get('new') === '1';
  const isMobile = useIsMobile();
  const searchInputRef = useRef(null);

  const [prods, setProds] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pay, setPay] = useState('cod');
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchVal, setSearchVal] = useState(q);
  const [sort, setSort] = useState('name');
  const [qtys, setQtys] = useState({});
  const [added, setAdded] = useState({});
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedProtection, setSelectedProtection] = useState(null);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(999999);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [tempBrand, setTempBrand] = useState(null);
  const [tempProtection, setTempProtection] = useState(null);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(999999);

  useEffect(() => {
    if (!shopSession) return;
    if (shopSession.type === 'shop') {
      setForm(f => ({ ...f, name: shopSession.locationName, city: shopSession.locationName, address: shopSession.locationName, phone: f.phone || '000' }));
    } else if (shopSession.type === 'customer') {
      setForm(f => ({ ...f, name: shopSession.name, phone: shopSession.phone, city: shopSession.city || '', address: shopSession.address || '' }));
    }
  }, [shopSession]);

  useEffect(() => {
    async function init() {
      const [{ data: products }, { data: categories }] = await Promise.all([
        sb.from('products').select('*, categories(name,slug), brands(name,slug), subcategories(name,slug)').order('name').range(0, 4999),
        sb.from('categories').select('*').order('name'),
      ]);
      setProds(products || []);
      setCats(categories || []);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!q && !featuredOnly && !newOnly && !catSlug) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, []);

  useEffect(() => { setSearchVal(q); }, [q]);

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);

  function handleAddBtn(p) {
    addToCart(p, qtys[p.id] || 1);
    setAdded(a => ({ ...a, [p.id]: true }));
    setTimeout(() => setAdded(a => ({ ...a, [p.id]: false })), 1500);
    setQtys(qq => ({ ...qq, [p.id]: 1 }));
  }

  async function submitOrder() {
    if (!form.name || !form.phone || !form.city || !form.address) { alert('Popunite sva obavezna polja!'); return; }
    setSubmitting(true);
    const orderData = {
      name: form.name, phone: form.phone, city: form.city, address: form.address,
      note: form.note, payment: pay, total, status: 'nova'
    };
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

  const activeCat = cats.find(c => c.slug === catSlug) || null;
  const hasQuery = !!(q || featuredOnly || newOnly || activeCat);

  const queryFiltered = !hasQuery ? [] : prods.filter(p => {
    if (featuredOnly && !p.featured) return false;
    if (newOnly && !p.is_new) return false;
    if (activeCat && p.category_id !== activeCat.id) return false;
    if (q && !matchesSearch(p, q)) return false;
    return true;
  });

  const availableBrands = [...new Map(queryFiltered.filter(p => p.brand_id && p.brands?.name).map(p => [p.brand_id, { ...p.brands, id: p.brand_id }])).values()];
  const availableProtections = [...new Set(queryFiltered.filter(p => p.protection_type).map(p => p.protection_type))];
  const minPrice = queryFiltered.length ? Math.floor(Math.min(...queryFiltered.map(p => p.price))) : 0;
  const maxPrice = queryFiltered.length ? Math.ceil(Math.max(...queryFiltered.map(p => p.price))) : 999999;
  const activeFiltersCount = (selectedBrand ? 1 : 0) + (selectedProtection ? 1 : 0) + (priceMin > minPrice || priceMax < maxPrice ? 1 : 0);

  function clearAllFilters() { setSelectedBrand(null); setSelectedProtection(null); setPriceMin(minPrice); setPriceMax(maxPrice); }

  useEffect(() => {
    setPriceMin(minPrice); setPriceMax(maxPrice);
    setSelectedBrand(b => (b && availableBrands.some(ab => ab.id === b)) ? b : null);
    setSelectedProtection(t => (t && availableProtections.includes(t)) ? t : null);
  }, [q, catSlug, featuredOnly, newOnly, prods.length]);

  const filtered = queryFiltered
    .filter(p => !selectedBrand || p.brand_id === selectedBrand)
    .filter(p => !selectedProtection || p.protection_type === selectedProtection)
    .filter(p => p.price >= priceMin && p.price <= priceMax)
    .sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

  const title = featuredOnly ? <><Flame size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '0.3rem' }} />Najprodavanije</> : newOnly ? <><Sparkles size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '0.3rem' }} />Novo u ponudi</> : activeCat ? activeCat.name : q ? `Rezultati za "${q}"` : 'Pretraga';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif', paddingBottom: isMobile ? '65px' : '0' }}>
      {success && <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', zIndex: 2000, fontWeight: 'bold', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Narudžbina je uspešno poslata!</div>}

      <div style={{ background: 'var(--black)', color: '#fff', textAlign: 'center', padding: '0.4rem 1rem', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
        <Truck size={15} /> Besplatna dostava za porudžbine preko {FREE_DELIVERY_THRESHOLD.toLocaleString('sr-RS')} RSD
      </div>

      <header style={{ background: 'var(--black)', padding: '0 1rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: '1700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem', height: '56px' }}>
          <div onClick={() => router.push('/')} style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input ref={searchInputRef} placeholder="Pretraži proizvode..." value={searchVal} onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchVal.trim()) router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`); }}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '6px', border: 'none', outline: 'none', fontSize: '0.9rem', background: '#1a1a1a', color: '#fff' }} />
            <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            {searchVal && (
              <button onClick={() => router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`)}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>
                Traži
              </button>
            )}
          </div>
          {!isMobile && mounted && (
            shopSession ? (
              <button onClick={() => setLogoutConfirmOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <User size={15} /> {shopSession.type === 'shop' ? shopSession.locationName : shopSession.name} · Odjava
              </button>
            ) : (
              <button onClick={() => setAuthModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <User size={15} /> Prijava
              </button>
            )
          )}
          {!isMobile && (
            <button onClick={() => setDrawerOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              <ShoppingCart size={16} /> Korpa
              {mounted && count > 0 && <span style={{ background: '#fff', color: 'var(--red)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '900' }}>{count}</span>}
            </button>
          )}
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
              <button onClick={() => router.push('/pretraga')}
                style={{ width: '100%', padding: '0.85rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: !catSlug && !featuredOnly && !newOnly ? 'var(--red)' : 'transparent', color: !catSlug && !featuredOnly && !newOnly ? '#fff' : 'var(--text)', fontWeight: !catSlug && !featuredOnly && !newOnly ? '700' : '500', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Sve kategorije
              </button>
              {cats.map(c => (
                <button key={c.id} onClick={() => router.push(`/kategorije/${c.slug}`)}
                  style={{ width: '100%', padding: '0.85rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: catSlug === c.slug ? 'var(--red)' : 'transparent', color: catSlug === c.slug ? '#fff' : 'var(--text)', fontWeight: catSlug === c.slug ? '700' : '500', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{c.name}</span><span style={{ opacity: 0.4 }}>›</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <main style={{ minWidth: 0 }}>
        {!hasQuery ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Search size={44} color="var(--faint)" /></div>
            <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>Ukucajte šta tražite</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--faint)' }}>npr. "kabl", "foneng", "staklo"...</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>{title}</h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0.2rem 0 0' }}>{loading ? 'Učitavanje...' : `${filtered.length} proizvoda`}</p>
              </div>
              {!isMobile && (
                <select value={sort} onChange={e => setSort(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}>
                  <option value="name">Naziv A-Z</option>
                  <option value="price_asc">Cena ↑</option>
                  <option value="price_desc">Cena ↓</option>
                </select>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {selectedBrand && <span onClick={() => setSelectedBrand(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{availableBrands.find(b => b.id === selectedBrand)?.name} ✕</span>}
                {selectedProtection && <span onClick={() => setSelectedProtection(null)} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{selectedProtection} ✕</span>}
                {(priceMin > minPrice || priceMax < maxPrice) && <span onClick={() => { setPriceMin(minPrice); setPriceMax(maxPrice); }} style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>{priceMin.toLocaleString('sr-RS')}–{priceMax.toLocaleString('sr-RS')} RSD ✕</span>}
              </div>
            )}

            {isMobile && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button onClick={() => { setTempBrand(selectedBrand); setTempProtection(selectedProtection); setTempPriceMin(priceMin); setTempPriceMax(priceMax); setFilterDrawerOpen(true); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.7rem', borderRadius: '8px', border: `1.5px solid ${activeFiltersCount > 0 ? 'var(--red)' : 'var(--border)'}`, background: activeFiltersCount > 0 ? 'var(--red-light)' : '#fff', color: activeFiltersCount > 0 ? 'var(--red)' : 'var(--text)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}>
                  Filteri {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''} ▾
                </button>
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.95rem', background: '#fff', cursor: 'pointer', fontWeight: '600', color: 'var(--text)' }}>
                  <option value="name">Naziv A-Z</option>
                  <option value="price_asc">Cena ↑</option>
                  <option value="price_desc">Cena ↓</option>
                </select>
              </div>
            )}

            {!loading && filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Search size={44} color="var(--faint)" /></div>
                <p style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nema rezultata{q ? ` za "${q}"` : ''}</p>
                <p style={{ fontSize: '0.9rem' }}>Pokušajte sa drugim pojmom</p>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Ukloni filtere</button>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.85rem' }}>
                {filtered.map(p => (
                  <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
                    <div onClick={() => router.push(`/proizvod/${makeSlug(p.name, p.id)}${q ? `?model=${encodeURIComponent(q)}` : ''}`)} style={{ padding: '0.75rem', flex: 1, cursor: 'pointer' }}>
                      {p.is_new && <span style={{ background: '#16a34a', color: '#fff', fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '3px', marginBottom: '0.4rem', display: 'inline-block' }}>NOVO</span>}
                      {p.featured && <span style={{ background: 'var(--red)', color: '#fff', fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '3px', marginBottom: '0.4rem', display: 'inline-flex', alignItems: 'center', marginLeft: p.is_new ? '0.25rem' : 0 }}><Flame size={11} /></span>}
                      <div style={{ position: 'relative' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '170px', objectFit: 'contain' }} />
                          : <div style={{ height: '170px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={32} color="var(--faint)" /></div>}
                        {p.categories?.slug === 'maske' && (
                          <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.6rem', fontWeight: '600', padding: '0.15rem 0.4rem', borderRadius: '4px', lineHeight: 1.3 }}>Telefon na slici je ilustrativan</span>
                        )}
                      </div>
                      <p style={{ fontWeight: '600', fontSize: '0.82rem', margin: '0.5rem 0 0.2rem', lineHeight: 1.35, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{getDisplayName(p, q)}</p>
                      {p.brands?.name && <p style={{ fontSize: '0.72rem', color: 'var(--faint)', margin: '0 0 0.3rem' }}>{p.brands.name}</p>}
                      <p style={{ color: 'var(--red)', fontWeight: '800', fontSize: '1rem', margin: 0 }}>{Number(p.price).toLocaleString('sr-RS')} <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>RSD</span></p>
                    </div>
                    <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg3)' }}>
                      <button onClick={() => setQtys(qq => ({ ...qq, [p.id]: Math.max(1, (qq[p.id]||1) - 1) }))} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 'bold', flexShrink: 0 }}>−</button>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{qtys[p.id] || 1}</span>
                      <button onClick={() => setQtys(qq => ({ ...qq, [p.id]: (qq[p.id]||1) + 1 }))} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 'bold', flexShrink: 0 }}>+</button>
                      <button onClick={() => handleAddBtn(p)} style={{ flex: 1, padding: '0.4rem', background: added[p.id] ? '#16a34a' : 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: 'background 0.2s' }}>
                        {added[p.id] ? '✓' : '+ Dodaj'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </main>

        {!isMobile && hasQuery && (
          <aside style={{ position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>Filteri</span>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Ukloni sve</button>}
              </div>
              {availableBrands.length > 0 && (
                <FilterSection title="Brend" hasActive={!!selectedBrand} onClear={() => setSelectedBrand(null)}>
                  {availableBrands.map(b => <CheckboxItem key={b.id} label={b.name} count={queryFiltered.filter(p => p.brand_id === b.id).length} selected={selectedBrand === b.id} onClick={() => setSelectedBrand(selectedBrand === b.id ? null : b.id)} />)}
                </FilterSection>
              )}
              {availableProtections.length > 0 && (
                <FilterSection title="Zaštita" hasActive={!!selectedProtection} onClear={() => setSelectedProtection(null)}>
                  {availableProtections.map(t => <CheckboxItem key={t} label={t} count={queryFiltered.filter(p => p.protection_type === t).length} selected={selectedProtection === t} onClick={() => setSelectedProtection(selectedProtection === t ? null : t)} />)}
                </FilterSection>
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
          {[
            { icon: HomeIcon, label: 'Početna', action: () => router.push('/') },
            { icon: Package, label: 'Kategorije', action: () => setCatsDrawerOpen(true) },
            { icon: Search, label: 'Pretraga', action: () => { router.push('/pretraga'); }, active: true },
            { icon: User, label: shopSession ? 'Nalog' : 'Prijava', action: () => shopSession ? router.push('/moje-porudzbine') : setAuthModalOpen(true) },
            { icon: ShoppingCart, label: 'Korpa', action: () => setDrawerOpen(true), badge: count },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', padding: '0.5rem 0' }}>
              <item.icon size={21} color={item.active ? 'var(--red)' : 'var(--muted)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: '600', color: item.active ? 'var(--red)' : 'var(--muted)' }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '20%', background: 'var(--red)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>{item.badge}</span>
              )}
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
              {availableBrands.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Brend</p>
                    {tempBrand && <button onClick={() => setTempBrand(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {availableBrands.map(b => { const cnt = queryFiltered.filter(p => p.brand_id === b.id).length; const isSelected = tempBrand === b.id; return (
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
              {availableProtections.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Zaštita</p>
                    {tempProtection && <button onClick={() => setTempProtection(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                  </div>
                  {availableProtections.map(t => { const cnt = queryFiltered.filter(p => p.protection_type === t).length; const isSelected = tempProtection === t; return (
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Cena</p>
                  {(tempPriceMin > minPrice || tempPriceMax < maxPrice) && <button onClick={() => { setTempPriceMin(minPrice); setTempPriceMax(maxPrice); }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Obriši</button>}
                </div>
                <DualSlider min={minPrice} max={maxPrice} valueMin={tempPriceMin} valueMax={tempPriceMax} onChange={(mn, mx) => { setTempPriceMin(mn); setTempPriceMax(mx); }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setTempBrand(null); setTempProtection(null); setTempPriceMin(minPrice); setTempPriceMax(maxPrice); }} style={{ flex: 1, padding: '0.85rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Izbriši</button>
              <button onClick={() => { setSelectedBrand(tempBrand); setSelectedProtection(tempProtection); setPriceMin(tempPriceMin); setPriceMax(tempPriceMax); setFilterDrawerOpen(false); }} style={{ flex: 2, padding: '0.85rem', borderRadius: '8px', border: 'none', background: 'var(--red)', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Primeni</button>
            </div>
          </div>
        </div>
      )}

      {catsDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setCatsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Kategorije</h2>
              <button onClick={() => setCatsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
            </div>
            <CatsDrawerAccordion cats={cats} prods={prods} router={router} onClose={() => setCatsDrawerOpen(false)} />
          </div>
        </div>
      )}

      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 'min(380px, 100vw)', height: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black)' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShoppingCart size={17} /> Korpa</h2>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff', lineHeight: 1 }}>×</button>
            </div>
            {mounted && (
              <div style={{ padding: '0.75rem 1.25rem', background: remaining === 0 ? '#f0fdf4' : '#fff8f0', borderBottom: '1px solid var(--border)' }}>
                {remaining === 0 ? <p style={{ margin: 0, fontSize: '0.82rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={15} /> Ostvarili ste besplatnu dostavu!</p>
                  : <><p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: 'var(--muted)' }}>Još <strong style={{ color: 'var(--red)' }}>{remaining.toLocaleString('sr-RS')} RSD</strong> do besplatne dostave</p>
                    <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100)}%`, background: 'var(--red)', borderRadius: '3px', transition: 'width 0.3s' }} /></div></>}
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {cart.length === 0
                ? <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><ShoppingCart size={40} color="var(--faint)" /></div>Korpa je prazna</div>
                : cart.map(x => (
                  <div key={x.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    {x.image_url && <img src={x.image_url} alt="" style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg3)', padding: '4px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</p>
                      <p style={{ margin: '0.2rem 0 0.4rem', color: 'var(--red)', fontWeight: '800', fontSize: '0.9rem' }}>{Number(x.price).toLocaleString('sr-RS')} RSD</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button onClick={() => changeQty(x.id, -1)} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>−</button>
                        <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>{x.qty}</span>
                        <button onClick={() => changeQty(x.id, 1)} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>+</button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(x.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Trash2 size={18} /></button>
                  </div>
                ))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.1rem' }}>
                  <span>Ukupno</span><span style={{ color: 'var(--red)' }}>{total.toLocaleString('sr-RS')} RSD</span>
                </div>
                {total >= FREE_DELIVERY_THRESHOLD && <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Truck size={14} /> Besplatna dostava uključena!</p>}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem' }}>
                  <span>Ukupno</span><span style={{ color: 'var(--red)' }}>{total.toLocaleString('sr-RS')} RSD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '0.25rem', color: total >= FREE_DELIVERY_THRESHOLD ? '#16a34a' : 'var(--muted)' }}>
                  <span>Dostava</span><span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{total >= FREE_DELIVERY_THRESHOLD ? <><Truck size={14} /> Besplatno</> : 'Po dogovoru'}</span>
                </div>
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting} style={{ width: '100%', padding: '0.9rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>
              {submitting ? 'Slanje...' : 'Potvrdi narudžbinu'}
            </button>
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

export default function PretragaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Učitavanje...</div>}>
      <PretragaContent />
    </Suspense>
  );
}
