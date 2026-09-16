import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyPassword, hashPassword, isPlaintext } from '../../../../lib/passwordHash';
import { signSession } from '../../../../lib/sessionToken';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nevalidan zahtev' }, { status: 400 });
  }
  const { identifier, password } = body || {};
  if (!identifier || !password) {
    return NextResponse.json({ error: 'Unesite korisničko ime/telefon i lozinku!' }, { status: 400 });
  }
  const trimmed = identifier.trim();
  const sb = getSupabaseAdmin();

  // 1. Pokusaj kao prodavnica/osoblje (username login) - 'users' tabela
  const { data: userData } = await sb.from('users').select('*').ilike('username', trimmed).maybeSingle();
  if (userData) {
    let ok = await verifyPassword(password, userData.password);
    if (!ok && isPlaintext(userData.password) && userData.password === password) {
      ok = true;
      const newHash = await hashPassword(password);
      await sb.from('users').update({ password: newHash }).eq('id', userData.id);
    }
    if (ok) {
      const locationMap = { kula: 'Kula', vrbas: 'Vrbas', backa: 'Backa Topola' };
      const locationName = locationMap[userData.username.toLowerCase()];
      if (!locationName) {
        return NextResponse.json({ error: 'Ovaj nalog se prijavljuje kroz admin panel.' }, { status: 403 });
      }
      const { data: loc } = await sb.from('locations').select('*').eq('name', locationName).maybeSingle();
      const session = {
        type: 'shop',
        username: userData.username,
        locationId: loc?.id || null,
        locationName,
      };
      // Potpisan token - dokaz identiteta koji server moze da proveri kasnije (npr. za "moje porudzbine"),
      // umesto da samo veruje onome sto pregledac kaze da je locationId.
      const token = await signSession({ type: 'shop', locationId: loc?.id || null }, process.env.SESSION_SECRET);
      return NextResponse.json({ success: true, session, token });
    }
  }

  // 2. Pokusaj kao registrovan kupac (telefon login) - 'customers' tabela
  const { data: customerData } = await sb.from('customers').select('*').eq('phone', trimmed).maybeSingle();
  if (customerData) {
    let ok = await verifyPassword(password, customerData.password);
    if (!ok && isPlaintext(customerData.password) && customerData.password === password) {
      ok = true;
      const newHash = await hashPassword(password);
      await sb.from('customers').update({ password: newHash }).eq('id', customerData.id);
    }
    if (ok) {
      if (customerData.status === 'pending') {
        return NextResponse.json({ error: 'Vaš nalog čeka odobrenje administratora.' }, { status: 403 });
      }
      if (customerData.status === 'rejected') {
        return NextResponse.json({ error: 'Vaš zahtev za nalog je odbijen. Kontaktirajte nas za više informacija.' }, { status: 403 });
      }
      const session = {
        type: 'customer',
        customerId: customerData.id,
        name: customerData.name,
        phone: customerData.phone,
        city: customerData.city,
        address: customerData.address,
      };
      const token = await signSession({ type: 'customer', customerId: customerData.id }, process.env.SESSION_SECRET);
      return NextResponse.json({ success: true, session, token });
    }
  }

  return NextResponse.json({ error: 'Pogrešno korisničko ime/telefon ili lozinka.' }, { status: 401 });
}
