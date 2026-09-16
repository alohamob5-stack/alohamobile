'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { sb, makeSlug } from '../../../lib/supabase';
import Reviews from '../../components/Reviews';
import AuthModal from '../../components/AuthModal';
import StockBar from '../../components/StockBar';
import { useCart } from '../../components/CartContext';
import { CheckCircle2, Truck, Search, History, User, ShoppingCart, Home as HomeIcon, Package, Trash2, LogOut, ImageOff, Link2, ClipboardList, Zap, Check } from 'lucide-react';

const FREE_DELIVERY_THRESHOLD = 2000;

function normalize(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[čć]/g,'c').replace(/[šđ]/g,'s').replace(/ž/g,'z'); }

function getDisplayName(p, modelQuery) {
  if (!modelQuery || !Array.isArray(p.phone_models) || p.phone_models.length <= 1) return p.name;
  const nq = normalize(modelQuery);
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

function ProizvodClientInner() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelQuery = searchParams.get('model') || '';
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { cart, count, total, mounted, shopSession, addToCart: ctxAddToCart, removeFromCart, changeQty, handleAuthSuccess: ctxHandleAuthSuccess, handleLogout: ctxHandleLogout } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catsDrawerOpen, setCatsDrawerOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  const isMobile = useIsMobile();
  const [searchVal, setSearchVal] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const id = slug.split('-').pop();
      const [{ data }, { data: catsData }, { data: prodsData }] = await Promise.all([
        sb.from('products').select('*, categories(name,slug), subcategories(name), brands(name)').eq('id', id).single(),
        sb.from('categories').select('*').order('name'),
        sb.from('products').select('*, brands(name,slug), subcategories(name,slug)').order('name'),
      ]);
      setP(data);
      setCats(catsData || []);
      setProds(prodsData || []);
      if (data?.category_id) {
        const { data: rel } = await sb.from('products').select('*, brands(name)').eq('category_id', data.category_id).neq('id', id).limit(6);
        setRelated(rel || []);
      }
    }
    load();
  }, [slug]);

  function addToCart() {
    if (!p) return;
    ctxAddToCart({ id: p.id, name: p.name, price: p.price, image_url: p.image_url }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);

  async function handleAuthSuccess(session) {
    await ctxHandleAuthSuccess(session);
    setAuthModalOpen(false);
  }

  function handleLogout() {
    ctxHandleLogout();
    setLogoutConfirmOpen(false);
  }

  if (!p) return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Učitavanje...</div>;

  const images = [p.image_url, p.image_url2, p.image_url3].filter(Boolean);
  const isMaske = p.categories?.slug === 'maske';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif', paddingBottom: isMobile ? '65px' : '0' }}>
      <header style={{ background: 'var(--black)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div className="prod-header-inner">
          <button onClick={() => router.back()} className="prod-back-btn">← Nazad</button>
          <div onClick={() => router.push('/')} className="prod-header-logo">
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <div className="prod-header-search">
            <input
              placeholder="Pretraži..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchVal.trim()) router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`); }}
              style={{ width: '100%', padding: '0.5rem 2.5rem 0.5rem 2.2rem', borderRadius: '6px', border: 'none', outline: 'none', fontSize: '0.9rem', background: '#1a1a1a', color: '#fff', boxSizing: 'border-box' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            {searchVal && (
              <button onClick={() => router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`)}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--red)', border: 'none', color: '#fff', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}>
                Traži
              </button>
            )}
          </div>
          {!isMobile && mounted && (
            shopSession ? (
              <>
                <button onClick={() => router.push('/moje-porudzbine')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <History size={15} /> Istorija
                </button>
                <button onClick={() => setLogoutConfirmOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <User size={15} /> {shopSession.type === 'shop' ? shopSession.locationName : shopSession.name} · Odjava
                </button>
              </>
            ) : (
              <button onClick={() => setAuthModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <User size={15} /> Prijava
              </button>
            )
          )}
          <button onClick={() => setDrawerOpen(true)} className="prod-cart-btn">
            <ShoppingCart size={16} /> <span className="cart-label">Korpa</span>
            {mounted && count > 0 && (
              <span style={{ background: '#fff', color: 'var(--red)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '900' }}>
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: 'var(--red)' }}>Početna</span>
          {p.categories?.name && <>
            <span>›</span>
            <span onClick={() => router.push(`/kategorije/${p.categories.slug}`)} style={{ cursor: 'pointer', color: 'var(--red)' }}>{p.categories.name}</span>
          </>}
          <span>›</span>
          <span style={{ color: 'var(--text)', fontWeight: '600' }}>{getDisplayName(p, modelQuery)}</span>
        </div>

        <div className="prod-layout">
          <Slideshow images={images} name={p.name} isMaske={isMaske} />
          <div>
            {p.categories?.name && (
              <span style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.2rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                {p.categories.name}
              </span>
            )}
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0.75rem 0 0.5rem', color: 'var(--text)', lineHeight: 1.3 }}>{getDisplayName(p, modelQuery)}</h1>
            {p.brands?.name && <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{p.brands.name}</p>}
            {p.barcode && <p style={{ color: 'var(--faint)', fontSize: '0.8rem', margin: '0 0 1rem' }}>Barkod: {p.barcode}</p>}
            <p style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--red)', margin: '0 0 1.5rem' }}>
              {Number(p.price).toLocaleString('sr-RS')} <span style={{ fontSize: '1rem', fontWeight: '600' }}>RSD</span>
            </p>
                            <StockBar productId={p.id} minStock={p.min_stock} size="normal" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: '40px', height: '40px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>−</button>
              <span style={{ fontWeight: '800', fontSize: '1.2rem', minWidth: '30px', textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ width: '40px', height: '40px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>+</button>
            </div>
            <button onClick={addToCart}
              style={{ width: '100%', padding: '0.9rem', background: added ? '#16a34a' : 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {added ? <><Check size={18} /> Dodato u korpu!</> : '+ Dodaj u korpu'}
            </button>
            <button onClick={() => { addToCart(); router.push('/korpa'); }}
              style={{ width: '100%', padding: '0.9rem', background: '#fff', color: 'var(--red)', border: '2px solid var(--red)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <ShoppingCart size={17} /> Dodaj i naruči
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => alert('Link kopiran!')); }}
              style={{ width: '100%', padding: '0.6rem', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Link2 size={15} /> Kopiraj link
            </button>
            {p.description && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>Opis proizvoda</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{p.description}</p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text)' }}>Slični artikli</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {related.map(r => (
                <div key={r.id} onClick={() => router.push(`/proizvod/${makeSlug(r.name, r.id)}`)}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
                  <div style={{ position: 'relative' }}>
                    {r.image_url
                      ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '90px', objectFit: 'contain' }} />
                      : <div style={{ height: '90px', background: 'var(--bg3)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={22} color="var(--faint)" /></div>}
                    {isMaske && (
                      <span style={{ position: 'absolute', top: '2px', left: '2px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.52rem', fontWeight: '600', padding: '0.1rem 0.3rem', borderRadius: '3px', lineHeight: 1.2 }}>Telefon na slici je ilustrativan</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', fontWeight: '600', margin: '0.4rem 0 0.25rem', color: 'var(--text)', lineHeight: 1.3 }}>{r.name}</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: '800', margin: 0 }}>{Number(r.price).toLocaleString('sr-RS')} RSD</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Reviews productId={p.id} />
      </div>

      {isMobile && mounted && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '65px', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 200, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          {[
            { icon: HomeIcon, label: 'Početna', action: () => router.push('/') },
            { icon: Package, label: 'Kategorije', action: () => setCatsDrawerOpen(true) },
            { icon: Search, label: 'Pretraga', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => document.querySelector('.prod-header-search input')?.focus(), 300); } },
            { icon: User, label: shopSession ? 'Nalog' : 'Prijava', action: () => shopSession ? router.push('/moje-porudzbine') : setAuthModalOpen(true) },
            { icon: ShoppingCart, label: 'Korpa', action: () => router.push('/korpa'), badge: count },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', padding: '0.5rem 0' }}>
              <item.icon size={21} color="var(--muted)" />
              <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--muted)' }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '20%', background: 'var(--red)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>{item.badge}</span>
              )}
            </button>
          ))}
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
                {remaining === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={15} /> Ostvarili ste besplatnu dostavu!</p>
                ) : (
                  <>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: 'var(--muted)' }}>Još <strong style={{ color: 'var(--red)' }}>{remaining.toLocaleString('sr-RS')} RSD</strong> do besplatne dostave</p>
                    <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100)}%`, background: 'var(--red)', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                  </>
                )}
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
                  <span>Ukupno</span>
                  <span style={{ color: 'var(--red)' }}>{total.toLocaleString('sr-RS')} RSD</span>
                </div>
                {total >= FREE_DELIVERY_THRESHOLD && <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Truck size={14} /> Besplatna dostava uključena!</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setDrawerOpen(false); router.push('/korpa'); }}
                    style={{ flex: 1, padding: '0.85rem', background: '#fff', color: 'var(--red)', border: '2px solid var(--red)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <ClipboardList size={16} /> Detalji
                  </button>
                  <button onClick={() => { setDrawerOpen(false); router.push('/korpa?checkout=1'); }}
                    style={{ flex: 1, padding: '0.85rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <Zap size={16} /> Poruči odmah
                  </button>
                </div>
              </div>
            )}
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

function CatsDrawerAccordion({ cats, prods, router, onClose }) {
  const [openCat, setOpenCat] = useState(null);

  return (
    <div>
      {cats.map(c => {
        const catProds = prods.filter(p => p.category_id === c.id);
        const subcats = [...new Map(
          catProds.filter(p => p.subcategory_id && p.subcategories?.name)
            .map(p => [p.subcategory_id, { ...p.subcategories, id: p.subcategory_id }])
        ).values()];
        const isOpen = openCat === c.id;

        return (
          <div key={c.id}>
            <button onClick={() => setOpenCat(isOpen ? null : c.id)}
              style={{ width: '100%', padding: '0.9rem 1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isOpen ? 'var(--red)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isOpen ? '#fff' : 'var(--text)' }}>
                {c.name} <span style={{ fontWeight: '400', fontSize: '0.8rem', opacity: 0.6 }}>({catProds.length})</span>
              </span>
              <span style={{ color: isOpen ? '#fff' : 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
            </button>
            {isOpen && (
              <div style={{ background: 'var(--bg3)' }}>
                <button onClick={() => { router.push(`/kategorije/${c.slug}`); onClose(); }}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 1.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>Svi {c.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{catProds.length} →</span>
                </button>
                {subcats.map(s => {
                  const cnt = catProds.filter(p => p.subcategory_id === s.id).length;
                  return (
                    <button key={s.id || s.name}
                      onClick={() => { router.push(`/kategorije/${c.slug}?tip=${s.slug || s.name.toLowerCase().replace(/\s+/g, '-')}`); onClose(); }}
                      style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 1.5rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>· {s.name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--faint)' }}>{cnt}</span>
                    </button>
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

function Slideshow({ images, name, isMaske }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return (
    <div style={{ height: '300px', background: 'var(--bg3)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={48} color="var(--faint)" /></div>
  );
      let touchStartX = 0;
  function handleTouchStart(e) { touchStartX = e.touches[0].clientX; }
  function handleTouchEnd(e) {
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) < 40 || images.length < 2) return;
              if (diff < 0) setIdx(i => (i + 1) % images.length);
                    else setIdx(i => (i - 1 + images.length) % images.length);
  }
    return (
    <div>
      <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#fff', border: '1px solid var(--border)', aspectRatio: '1' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <img src={images[idx]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {isMaske && (
          <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: '600', padding: '0.3rem 0.6rem', borderRadius: '5px', lineHeight: 1.3, zIndex: 2 }}>Telefon na slici je ilustrativan</span>
        )}
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem' }}>‹</button>
            <button onClick={() => setIdx(i => (i + 1) % images.length)}
              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem' }}>›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {images.map((img, i) => (
            <img key={i} src={img} alt="" onClick={() => setIdx(i)}
              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: `2px solid ${i === idx ? 'var(--red)' : 'transparent'}`, opacity: i === idx ? 1 : 0.6 }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProizvodClient() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Učitavanje...</div>}>
      <ProizvodClientInner />
    </Suspense>
  );
}
