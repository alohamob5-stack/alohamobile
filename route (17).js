import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { hashPassword } from '../../../../lib/passwordHash';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nevalidan zahtev' }, { status: 400 });
  }
  const { name, phone, email, password, city, address } = body || {};
  if (!name || !phone || !password) {
    return NextResponse.json({ error: 'Ime, telefon i lozinka su obavezni!' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { data: existing } = await sb.from('customers').select('id').eq('phone', phone.trim()).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Nalog sa ovim brojem telefona već postoji.' }, { status: 409 });
  }

  const hashedPassword = await hashPassword(password);
  const { data, error } = await sb.from('customers').insert({
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    password: hashedPassword,
    city: city?.trim() || null,
    address: address?.trim() || null,
    status: 'pending',
  }).select().single();

  if (error) {
    return NextResponse.json({ error: 'Greška pri registraciji. Pokušajte ponovo.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, customer: data });
}
