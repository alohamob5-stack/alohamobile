import { NextResponse } from 'next/server';
import { verifySession } from './src/lib/sessionToken';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Login stranica i sve /api/admin rute ostaju dostupne (login ruta sama proverava kredencijale)
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_session')?.value;
  const session = await verifySession(token, process.env.SESSION_SECRET);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
