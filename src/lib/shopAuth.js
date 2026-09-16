// Helper funkcije za login/registraciju na sajtu (alohamobile.rs)
// Dve vrste naloga:
// 1. Prodavnice (Kula/Vrbas/Backa Topola) - koriste postojecu 'users' tabelu
// 2. Obicni kupci - registruju se, cekaju odobrenje, koriste 'customers' tabelu

import { sb } from './supabase';

const SHOP_SESSION_KEY = 'shop_session';

// Vraca trenutnu sesiju sa sajta (ne admin panel sesiju!)
export function getShopSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SHOP_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setShopSession(session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHOP_SESSION_KEY, JSON.stringify(session));
}

export function clearShopSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SHOP_SESSION_KEY);
}

// ============================================================
// KORPA - sinhronizacija preko baze (carts tabela) za ulogovane naloge
// Gost (nije ulogovan) koristi SAMO localStorage - korpa gosta se NIKAD
// ne spaja sa korpom naloga. Nalog ima svoju korpu u bazi, tacka.
// ============================================================

function cartColumnFor(session) {
  if (!session) return null;
  if (session.type === 'shop' && session.locationId) return { column: 'location_id', value: session.locationId };
  if (session.type === 'customer' && session.customerId) return { column: 'customer_id', value: session.customerId };
  return null;
}

// Ucitava korpu iz baze za dati nalog. Vraca [] ako nema sacuvane korpe.
export async function loadCartFromDb(session) {
  const cf = cartColumnFor(session);
  if (!cf) return [];
  try {
    const { data, error } = await sb.from('carts').select('items').eq(cf.column, cf.value).maybeSingle();
    if (error) {
      console.error('loadCartFromDb greška:', error);
      return [];
    }
    return data?.items || [];
  } catch (e) {
    console.error('loadCartFromDb greška:', e);
    return [];
  }
}

// Cuva korpu u bazu za dati nalog. Provjerava da li red postoji (select),
// pa radi update ili insert - ovo je pouzdanije od upsert+onConflict
// kad su unique indeksi partial (WHERE x IS NOT NULL).
export async function saveCartToDb(session, items) {
  const cf = cartColumnFor(session);
  if (!cf) return;
  try {
    const { data: existing, error: selErr } = await sb.from('carts').select('id').eq(cf.column, cf.value).maybeSingle();
    if (selErr) {
      console.error('saveCartToDb (select) greška:', selErr);
      return;
    }
    if (existing) {
      const { error: updErr } = await sb.from('carts').update({ items, updated_at: new Date().toISOString() }).eq('id', existing.id);
      if (updErr) console.error('saveCartToDb (update) greška:', updErr);
    } else {
      const { error: insErr } = await sb.from('carts').insert({ [cf.column]: cf.value, items });
      if (insErr) console.error('saveCartToDb (insert) greška:', insErr);
    }
  } catch (e) {
    console.error('saveCartToDb greška:', e);
  }
}

// Login - poziva sigurnu API rutu (proverava prvo 'users' tabelu kao prodavnica, zatim 'customers' kao kupac)
export async function shopLogin(identifier, password) {
  try {
    const res = await fetch('/api/shop/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Pogrešno korisničko ime/telefon ili lozinka.' };
    }
    setShopSession({ ...data.session, authToken: data.token });
    return { success: true, session: data.session };
  } catch (e) {
    console.error('shopLogin greška:', e);
    return { success: false, error: 'Greška u komunikaciji sa serverom. Pokušajte ponovo.' };
  }
}

// Registracija novog kupca - ide u status 'pending', ceka odobrenje admina
export async function shopRegister({ name, phone, email, password, city, address }) {
  if (!name || !phone || !password) {
    return { success: false, error: 'Ime, telefon i lozinka su obavezni!' };
  }
  try {
    const res = await fetch('/api/shop/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password, city, address }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Greška pri registraciji. Pokušajte ponovo.' };
    }
    return { success: true, customer: data.customer };
  } catch (e) {
    console.error('shopRegister greška:', e);
    return { success: false, error: 'Greška u komunikaciji sa serverom. Pokušajte ponovo.' };
  }
}

export function shopLogout() {
  clearShopSession();
}

// Vraca porudzbine ULOGOVANOG naloga preko sigurne API rute - server proverava potpisan
// token i sam odredjuje ciji su to porudzbine (ne veruje se onome sto pregledac tvrdi).
export async function fetchMyOrders(session) {
  if (!session?.authToken) return [];
  try {
    const res = await fetch('/api/orders/mine', {
      headers: { Authorization: `Bearer ${session.authToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.orders || [];
  } catch (e) {
    console.error('fetchMyOrders greška:', e);
    return [];
  }
}
