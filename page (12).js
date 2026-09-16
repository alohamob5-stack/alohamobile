'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, makeSlug } from '../lib/supabase';
import AuthModal from './components/AuthModal';
import { useCart } from './components/CartContext';
import { CheckCircle2, Truck, Search, History, User, ShoppingCart, Flame, Sparkles, Home as HomeIcon, Package, LogOut, Banknote, CreditCard, ImageOff, Check, Palmtree, Phone } from 'lucide-react';

const FREE_DELIVERY_THRESHOLD = 2000;

function useCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.floor((midnight - now) / 1000);
      setTime({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 });
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
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

export default function Home() {
  const { cart, count, total, mounted, shopSession, addToCart, removeFromCart, changeQty, clearCart, handleAuthSuccess: ctxHandleAuthSuccess, handleLogout: ctxHandleLogout } = useCart();
  const [prods, setProds] = useState([]);
  const [cats, setCats] = useState([]);
  const [banners, setBanners] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catsDrawerOpen, setCatsDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [pay, setPay] = useState('cod');
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [searchVal, setSearchVal] = useState('');
  const router = useRouter();
  const countdown = useCountdown();
  const isMobile = useIsMobile();

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
      const [{ data: products }, { data: categories }, { data: bannersData }] = await Promise.all([
        sb.from('products').select('*, categories(name,slug), brands(name,slug), subcategories(name,slug)').order('name').range(0, 4999),
        sb.from('categories').select('*').order('name'),
        sb.from('banners').select('*').eq('active', true),
      ]);
      setProds(products || []);
      setCats(categories || []);
      setBanners(bannersData || []);
    }
    init();
  }, []);

  useEffect(() => {
    const topB = banners.filter(b => b.type === 'top');
    if (topB.length <= 1) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % topB.length), 4000);
    return () => clearInterval(t);
  }, [banners]);

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);

  async function handleAuthSuccess(session) {
    await ctxHandleAuthSuccess(session);
    setAuthModalOpen(false);
  }

  function handleLogout() {
    ctxHandleLogout();
    setForm({ name: '', phone: '', city: '', address: '', note: '' });
    setLogoutConfirmOpen(false);
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

  const topBanners = banners.filter(b => b.type === 'top');
  const currentBanner = topBanners[bannerIdx] || { bg: 'linear-gradient(135deg, #0f1e3d, #142a52)', title: 'Aloha Mob', subtitle: 'Oprema, servis i prodaja za tvoj telefon', tag: 'ALOHA MOB' };
  const featuredProds = prods.filter(p => p.featured).slice(0, 10);
  const newProds = prods.filter(p => p.is_new).slice(0, 10);
  const pad = n => String(n).padStart(2, '0');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif', paddingBottom: isMobile ? '90px' : '0' }}>
      {success && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', zIndex: 2000, fontWeight: 'bold', boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> Narudžbina je uspešno poslata!
        </div>
      )}

      <div style={{ background: 'var(--lagoon)', color: '#fff', textAlign: 'center', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Truck size={14} /> Besplatna dostava preko {FREE_DELIVERY_THRESHOLD.toLocaleString('sr-RS')} RSD</span>
        {!isMobile && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.9 }}><Phone size={14} /> 064/344-172</span>}
      </div>

      <header style={{ background: '#fff', padding: '0 1rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 16px rgba(15,30,61,0.08)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.9rem', height: '68px' }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px', whiteSpace: 'nowrap', color: 'var(--black)', cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--black), var(--lagoon))', color: '#fff', flexShrink: 0 }}><Palmtree size={20} /></span>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input id="main-search" placeholder="Šta tražiš danas?" value={searchVal} onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchVal.trim()) router.push(`/pretraga?q=${encodeURIComponent(searchVal.trim())}`); }}
              style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.4rem', borderRadius: 'var(--pill)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', background: 'var(--bg3)', color: 'var(--text)' }} />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          </div>
          {!isMobile && (
            <>
              {mounted && (
                shopSession ? (
                  <>
                    <button onClick={() => router.push('/moje-porudzbine')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: '#fff', color: 'var(--black)', border: '1.5px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      <History size={15} /> Istorija
                    </button>
                    <button onClick={() => setLogoutConfirmOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: '#fff', color: 'var(--black)', border: '1.5px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      <User size={15} /> {shopSession.type === 'shop' ? shopSession.locationName : shopSession.name} · Odjava
                    </button>
                  </>
                ) : (
                  <button onClick={() => setAuthModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: '#fff', color: 'var(--black)', border: '1.5px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <User size={15} /> Prijava
                  </button>
                )
              )}
              <button onClick={() => router.push('/korpa')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.3rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(239,138,28,0.35)' }}>
                <ShoppingCart size={16} /> Korpa
                {mounted && count > 0 && <span style={{ background: '#fff', color: 'var(--red)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '900' }}>{count}</span>}
              </button>
            </>
          )}
        </div>
      </header>

      <div onClick={() => currentBanner.link && window.open(currentBanner.link, '_blank')}
        style={{ maxWidth: '1700px', margin: '1.1rem auto 0', padding: '0 1rem' }}>
        <div style={{ background: currentBanner.bg, transition: 'background 0.8s ease', cursor: currentBanner.link ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
          {currentBanner.image_url && <img src={currentBanner.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />}
          <Palmtree size={130} style={{ position: 'absolute', right: '2%', bottom: '-18%', color: 'rgba(255,255,255,0.08)', transform: 'rotate(12deg)' }} />
          <Palmtree size={70} style={{ position: 'absolute', right: '22%', top: '-10%', color: 'rgba(255,255,255,0.07)', transform: 'rotate(-18deg)' }} />
          <div style={{ maxWidth: '1700px', margin: '0 auto', padding: isMobile ? '1.75rem 1.25rem' : '3rem 2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div>
              <span className="aloha-badge-tag">{currentBanner.tag}</span>
              <h1 className="font-head" style={{ fontSize: isMobile ? '1.7rem' : 'clamp(1.5rem, 4vw, 3rem)', fontWeight: '700', color: '#fff', margin: '0.6rem 0 0.3rem', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{currentBanner.title}</h1>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', margin: 0 }}>{currentBanner.subtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              {topBanners.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setBannerIdx(i); }}
                  style={{ width: i === bannerIdx ? '28px' : '8px', height: '8px', borderRadius: '4px', background: i === bannerIdx ? 'var(--red)' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
        </div>
      </div>


      <div style={{ maxWidth: '1700px', margin: '0 auto', padding: '1rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {!isMobile && (
          <aside style={{ position: 'sticky', top: '76px' }}>
            <SidebarKategorije cats={cats} prods={prods} router={router} />
          </aside>
        )}

        <main style={{ minWidth: 0 }}>
          <div style={{ background: 'linear-gradient(120deg, var(--black), var(--lagoon) 130%)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <Palmtree size={90} style={{ position: 'absolute', right: '-10px', bottom: '-24px', color: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Flame size={12} /> Dnevna akcija — ističe za</p>
              <p style={{ color: '#fff', fontSize: '0.82rem', margin: 0, fontFamily: 'var(--font-head)', fontWeight: '600' }}>Posebne cene do ponoći!</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', position: 'relative', zIndex: 1 }}>
              {[['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ background: 'var(--red)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', minWidth: '40px', fontFamily: 'var(--font-head)', boxShadow: '0 4px 14px rgba(239,138,28,0.4)' }}>{pad(val)}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem', marginTop: '0.15rem', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {featuredProds.length > 0 && (
            <section style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <h2 className="font-head" style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}><Flame size={18} color="var(--red)" /> Najprodavanije</h2>
                <button onClick={() => router.push('/pretraga?featured=1')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--black)', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', borderRadius: 'var(--pill)', padding: '0.4rem 0.9rem' }}>Vidi sve →</button>
              </div>
              <HorizontalScroll prods={featuredProds} onAdd={addToCart} router={router} />
            </section>
          )}

          {newProds.length > 0 && (
            <section style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <h2 className="font-head" style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}><Sparkles size={18} color="var(--lagoon)" /> Novo u ponudi</h2>
                <button onClick={() => router.push('/pretraga?new=1')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--black)', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', borderRadius: 'var(--pill)', padding: '0.4rem 0.9rem' }}>Vidi sve →</button>
              </div>
              <HorizontalScroll prods={newProds} onAdd={addToCart} router={router} />
            </section>
          )}

          {cats.map(c => {
            const catProds = prods.filter(p => p.category_id === c.id).slice(0, 8);
            if (catProds.length === 0) return null;
            return (
              <section key={c.id} style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <h2 className="font-head" style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>{c.name}</h2>
                  <button onClick={() => router.push(`/kategorije/${c.slug}`)} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--black)', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', borderRadius: 'var(--pill)', padding: '0.4rem 0.9rem' }}>Vidi sve →</button>
                </div>
                <HorizontalScroll prods={catProds} onAdd={addToCart} router={router} />
              </section>
            );
          })}
        </main>
      </div>

      {/* Bottom Navigation */}
      {isMobile && mounted && (
        <div style={{ position: 'fixed', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', height: '62px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--pill)', display: 'flex', zIndex: 200, boxShadow: 'var(--shadow-md)' }}>
          {[
            { icon: HomeIcon, label: 'Početna', action: () => router.push('/'), active: true },
            { icon: Package, label: 'Kategorije', action: () => setCatsDrawerOpen(true) },
            { icon: Search, label: 'Pretraga', action: () => { document.getElementById('main-search')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
            { icon: User, label: shopSession ? 'Nalog' : 'Prijava', action: () => shopSession ? router.push('/moje-porudzbine') : setAuthModalOpen(true) },
            { icon: ShoppingCart, label: 'Korpa', action: () => router.push('/korpa'), badge: count },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', padding: '0.5rem 0' }}>
              <item.icon size={21} color={item.active ? 'var(--red)' : 'var(--muted)'} strokeWidth={2} />
              <span style={{ fontSize: '0.65rem', fontWeight: '600', color: item.active ? 'var(--red)' : 'var(--muted)' }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '20%', background: 'var(--red)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Kategorije Drawer */}
      {catsDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setCatsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Kategorije</h2>
              <button onClick={() => setCatsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
            </div>
            <div>
              {cats.map(c => {
                const cnt = prods.filter(p => p.category_id === c.id).length;
                return (
                  <button key={c.id} onClick={() => { router.push(`/kategorije/${c.slug}`); setCatsDrawerOpen(false); }}
                    style={{ width: '100%', padding: '1rem 1.25rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text)' }}>{c.name}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{cnt} →</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={() => setCheckoutOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: '800' }}>Narudžbina</h2>
            {shopSession && (
              <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {shopSession.type === 'shop' ? <><Package size={15} /> Interna porudžbina — {shopSession.locationName}</> : <><User size={15} /> Prijavljeni kao {shopSession.name}</>}
              </div>
            )}
            {[['name','Ime i prezime *','text','Marko Marković'],['phone','Telefon *','tel','+381 60...'],['city','Grad *','text','Beograd'],['address','Adresa *','text','Ulica i broj']].map(([key,label,type,ph]) => (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</label>
                <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Napomena</label>
              <textarea placeholder="Posebni zahtevi..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', resize: 'none', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} rows={2} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Način plaćanja</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['cod', Banknote, 'Pouzećem','Pri dostavi'],['card', CreditCard, 'Karticom','Online']].map(([val, Icon, name,desc]) => (
                  <button key={val} onClick={() => setPay(val)}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${pay===val ? 'var(--red)' : 'var(--border)'}`, background: pay===val ? 'var(--red-light)' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
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
                  <span>Dostava</span>
                  <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{total >= FREE_DELIVERY_THRESHOLD ? <><Truck size={14} /> Besplatno</> : 'Po dogovoru'}</span>
                </div>
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting}
              style={{ width: '100%', padding: '0.9rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', boxShadow: '0 6px 18px rgba(239,138,28,0.35)' }}>
              {submitting ? 'Slanje...' : 'Potvrdi narudžbinu'}
            </button>
            <button onClick={() => { setCheckoutOpen(false); router.push('/korpa'); }}
              style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              ← Nazad na korpu
            </button>
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

function SidebarKategorije({ cats, router }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ background: 'linear-gradient(120deg, var(--black), var(--lagoon) 160%)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Palmtree size={16} color="#fff" />
        <span className="font-head" style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.5px' }}>Kategorije</span>
      </div>
      <button onClick={() => router.push('/')}
        style={{ width: '100%', padding: '0.85rem 1.1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontWeight: '600', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><HomeIcon size={16} /> Početna</span> <span style={{ opacity: 0.4 }}>›</span>
      </button>
      {cats.map(c => (
        <button key={c.id} onClick={() => router.push(`/kategorije/${c.slug}`)}
          style={{ width: '100%', padding: '0.85rem 1.1rem', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontWeight: '500', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{c.name}</span>
          <span style={{ opacity: 0.4, color: 'var(--red)' }}>›</span>
        </button>
      ))}
    </div>
  );
}

function HorizontalScroll({ prods, onAdd, router }) {
  const [qtys, setQtys] = useState({});
  const [added, setAdded] = useState({});
  function handleAdd(p) {
    onAdd(p, qtys[p.id] || 1);
    setAdded(a => ({ ...a, [p.id]: true }));
    setTimeout(() => setAdded(a => ({ ...a, [p.id]: false })), 1500);
    setQtys(q => ({ ...q, [p.id]: 1 }));
  }
  return (
    <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
      {prods.map(p => (
        <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', minWidth: '205px', maxWidth: '205px', flexShrink: 0, transition: 'box-shadow 0.2s, transform 0.2s' }}>
          <div onClick={() => router.push(`/proizvod/${makeSlug(p.name, p.id)}`)} style={{ padding: '0.9rem', cursor: 'pointer', flex: 1 }}>
            <div style={{ position: 'relative', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
              {p.image_url
                ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'contain' }} />
                : <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={32} color="var(--faint)" /></div>}
              {p.categories?.slug === 'maske' && (
                <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(15,30,61,0.85)', color: '#fff', fontSize: '0.6rem', fontWeight: '600', padding: '0.15rem 0.4rem', borderRadius: 'var(--pill)', lineHeight: 1.3 }}>Ilustrativna slika</span>
              )}
            </div>
            <p style={{ fontWeight: '600', fontSize: '0.85rem', margin: '0.65rem 0 0.35rem', lineHeight: 1.35, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
            <p style={{ color: 'var(--red)', fontWeight: '800', fontSize: '1.05rem', margin: 0, fontFamily: 'var(--font-head)' }}>{Number(p.price).toLocaleString('sr-RS')} <span style={{ fontSize: '0.7rem' }}>RSD</span></p>
          </div>
          <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button onClick={() => setQtys(q => ({ ...q, [p.id]: Math.max(1, (q[p.id]||1) - 1) }))} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', background: '#fff', fontWeight: 'bold', flexShrink: 0 }}>−</button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{qtys[p.id] || 1}</span>
            <button onClick={() => setQtys(q => ({ ...q, [p.id]: (q[p.id]||1) + 1 }))} style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: 'var(--pill)', cursor: 'pointer', background: '#fff', fontWeight: 'bold', flexShrink: 0 }}>+</button>
            <button onClick={() => handleAdd(p)} style={{ flex: 1, padding: '0.45rem', background: added[p.id] ? '#16a34a' : 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: 'background 0.2s' }}>
              {added[p.id] ? <Check size={16} /> : '+ Dodaj'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
