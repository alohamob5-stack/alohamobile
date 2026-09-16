'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Vraca { username, role } kad se ucita, ili null dok se ceka odgovor.
// Middleware vec stiti stranicu na server nivou - ovaj hook je samo da klijent
// sazna KO je ulogovan (za prikaz imena/uloge), i kao dodatna zastita (defense in depth).
export function useAdminAuth() {
  const [auth, setAuth] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me')
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) { router.push('/admin/login'); return; }
        const data = await r.json();
        setAuth(data);
      })
      .catch(() => { if (!cancelled) router.push('/admin/login'); });
    return () => { cancelled = true; };
  }, []);

  return auth;
}

export async function adminLogout(router) {
  await fetch('/api/admin/logout', { method: 'POST' });
  router.push('/admin/login');
}
