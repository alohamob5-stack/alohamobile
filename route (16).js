
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
  const { username, password } = body || {};
  if (!username || !password) {
    return NextResponse.json({ error: 'Unesite korisničko ime i lozinku!' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: user } = await sb.from('users').select('*').ilike('username', username.trim()).maybeSingle();
  if (!user) {
    return NextResponse.json({ error: 'Pogrešno korisničko ime ili lozinka!' }, { status: 401 });
  }

  let ok = await verifyPassword(password, user.password);

  // Jednokratna automatska migracija: ako je lozinka jos u bazi kao obican tekst,
  // uporedi direktno i ODMAH je zameni hesovanom verzijom - korisnik ne primeti nista.
  if (!ok && isPlaintext(user.password) && user.password === password) {
    ok = true;
    const newHash = await hashPassword(password);
    await sb.from('users').update({ password: newHash }).eq('id', user.id);
  }

  if (!ok) {
    return NextResponse.json({ error: 'Pogrešno korisničko ime ili lozinka!' }, { status: 401 });
  }

  const token = await signSession({ username: user.username, role: user.role }, process.env.SESSION_SECRET);
  const res = NextResponse.json({ username: user.username, role: user.role });
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
