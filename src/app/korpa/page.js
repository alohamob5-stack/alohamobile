'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sb, makeSlug } from '../../lib/supabase';
import { useCart } from '../components/CartContext';
import AuthModal from '../components/AuthModal';
import { User, ShoppingCart, ImageOff, Trash2, Truck, Home as HomeIcon, Package, Search, Banknote, CreditCard, LogOut } from 'lucide-react';

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

function KorpaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { cart, total, mounted, shopSession, removeFromCart, changeQty, clearCart, handleAuthSuccess: ctxHandleAuthSuccess, handleLogout: ctxHandleLogout } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pay, setPay] = useState('cod');
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [productMeta, setProductMeta] = useState({});
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

  // Popuni formu podacima naloga cim je sesija poznata (korpa se ucitava centralno u CartContext-u)
  useEffect(() => {
    if (!shopSession) return;
    if (shopSession.type === 'shop') {
      setForm(f => ({ ...f, name: shopSession.locationName, city: shopSession.locationName, address: shopSession.locationName, phone: f.phone || '000' }));
    } else if (shopSession.type === 'customer') {
      setForm(f => ({ ...f, name: shopSession.name, phone: shopSession.phone, city: shopSession.city || '', address: shopSession.address || '' }));
    }
  }, [shopSession]);

  useEffect(() => {
    if (searchParams.get('checkout') === '1') {
      setCheckoutOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadMeta() {
      if (cart.length === 0) return;
      const ids = cart.map(x => x.id);
      const { data } = await sb.from('products').select('id, barcode, categories(name)').in('id', ids);
      const map = {};
      (data || []).forEach(p => { map[p.id] = { barcode: p.barcode, categoryName: p.categories?.name || 'Ostalo' }; });
      setProductMeta(map);
    }
    loadMeta();
  }, [cart.length]);

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);

  const groupedByCategory = cart.reduce((acc, item) => {
    const catName = productMeta[item.id]?.categoryName || 'Ostalo';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {});
  const categoryOrder = Object.keys(groupedByCategory).sort();

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
    setCheckoutOpen(false); setSubmitting(false);
    setSuccess(true); setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif', paddingBottom: isMobile ? '65px' : '0' }}>
      {success && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', zIndex: 2000, fontWeight: 'bold', boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}>
          ✅ Narudžbina je uspešno poslata!
        </div>
      )}

      <header style={{ background: 'var(--black)', padding: '0 1rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem', height: '56px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', flexShrink: 0 }}>← Nazad</button>
          <div onClick={() => router.push('/')} style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px', whiteSpace: 'nowrap', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <div style={{ flex: 1 }} />
          {mounted && (
            shopSession ? (
              <button onClick={() => setLogoutConfirmOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <User size={15} /> {!isMobile && (shopSession.type === 'shop' ? shopSession.locationName : shopSession.name)} · Odjava
              </button>
            ) : (
              <button onClick={() => setAuthModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <User size={15} /> Prijava
              </button>
            )
          )}
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.25rem 1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingCart size={22} /> Korpa {cart.length > 0 && `(${cart.length})`}</h1>

        {mounted && cart.length > 0 && (
          <div style={{ padding: '0.85rem 1rem', background: remaining === 0 ? '#f0fdf4' : '#fff8f0', border: `1px solid ${remaining === 0 ? '#86efac' : '#fde68a'}`, borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
            {remaining === 0 ? (
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#16a34a', fontWeight: '700' }}>✅ Ostvarili ste besplatnu dostavu!</p>
            ) : (
              <>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>Još <strong style={{ color: 'var(--red)' }}>{remaining.toLocaleString('sr-RS')} RSD</strong> do besplatne dostave</p>
                <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100)}%`, background: 'var(--red)', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </>
            )}
          </div>
        )}

        {!mounted ? null : cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><ShoppingCart size={56} color="var(--faint)" /></div>
            <p style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Korpa je prazna</p>
            <button onClick={() => router.push('/')} style={{ padding: '0.75rem 2rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}>
              Nastavi kupovinu
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              {categoryOrder.map(catName => (
                <div key={catName} style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.6rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                    {catName} <span style={{ fontWeight: '400', opacity: 0.6 }}>({groupedByCategory[catName].length})</span>
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {groupedByCategory[catName].map(x => {
                      const meta = productMeta[x.id];
                      return (
                        <div key={x.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                          <div onClick={() => router.push(`/proizvod/${makeSlug(x.name, x.id)}`)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                            {x.image_url
                              ? <img src={x.image_url} alt="" style={{ width: '72px', height: '72px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg3)', padding: '6px' }} />
                              : <div style={{ width: '72px', height: '72px', borderRadius: '8px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={24} color="var(--faint)" /></div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p onClick={() => router.push(`/proizvod/${makeSlug(x.name, x.id)}`)} style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)', cursor: 'pointer', lineHeight: 1.35 }}>{x.name}</p>
                            {meta?.barcode && <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'monospace' }}>{meta.barcode}</p>}
                            <p style={{ margin: '0.3rem 0 0.6rem', color: 'var(--red)', fontWeight: '800', fontSize: '1rem' }}>{Number(x.price).toLocaleString('sr-RS')} RSD</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button onClick={() => changeQty(x.id, -1)} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>−</button>
                              <span style={{ fontWeight: '700', minWidth: '28px', textAlign: 'center' }}>{x.qty}</span>
                              <button onClick={() => changeQty(x.id, 1)} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontWeight: 'bold' }}>+</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                            <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>{Number(x.price * x.qty).toLocaleString('sr-RS')} RSD</span>
                            <button onClick={() => removeFromCart(x.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={19} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.3rem', marginBottom: total >= FREE_DELIVERY_THRESHOLD ? '0.5rem' : '1rem' }}>
                <span>Ukupno</span>
                <span style={{ color: 'var(--red)' }}>{total.toLocaleString('sr-RS')} RSD</span>
              </div>
              {total >= FREE_DELIVERY_THRESHOLD && <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Truck size={15} /> Besplatna dostava uključena!</p>}
              <button onClick={() => setCheckoutOpen(true)}
                style={{ width: '100%', padding: '0.9rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1.05rem' }}>
                Nastavi na plaćanje →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation (mobile) */}
      {isMobile && mounted && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '65px', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 200, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          {[
            { icon: HomeIcon, label: 'Početna', action: () => router.push('/') },
            { icon: Package, label: 'Kategorije', action: () => router.push('/') },
            { icon: Search, label: 'Pretraga', action: () => router.push('/pretraga') },
            { icon: User, label: shopSession ? 'Nalog' : 'Prijava', action: () => shopSession ? router.push('/moje-porudzbine') : setAuthModalOpen(true) },
            { icon: ShoppingCart, label: 'Korpa', action: () => {}, active: true },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.5rem 0' }}>
              <item.icon size={21} color={item.active ? 'var(--red)' : 'var(--muted)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: '600', color: item.active ? 'var(--red)' : 'var(--muted)' }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* CHECKOUT */}
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
              style={{ width: '100%', padding: '0.9rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>
              {submitting ? 'Slanje...' : 'Potvrdi narudžbinu'}
            </button>
            <button onClick={() => setCheckoutOpen(false)}
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

export default function KorpaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Učitavanje...</div>}>
      <KorpaContent />
    </Suspense>
  );
}
