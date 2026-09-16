import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '../../../../lib/sessionToken';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyPassword, hashPassword, isPlaintext } from '../../../../lib/passwordHash';

export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const session = await verifySession(token, process.env.SESSION_SECRET);
  if (!session) {
    return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nevalidan zahtev' }, { status: 400 });
  }
  const { oldPassword, newPassword } = body || {};
  if (!oldPassword || !newPassword || newPassword.length < 4) {
    return NextResponse.json({ error: 'Popunite sva polja (nova lozinka min. 4 karaktera)!' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: user } = await sb.from('users').select('*').eq('username', session.username).maybeSingle();
  if (!user) {
    return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 });
  }

  let ok = await verifyPassword(oldPassword, user.password);
  if (!ok && isPlaintext(user.password) && user.password === oldPassword) ok = true;

  if (!ok) {
    return NextResponse.json({ error: 'Trenutna lozinka nije ispravna!' }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await sb.from('users').update({ password: newHash }).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
