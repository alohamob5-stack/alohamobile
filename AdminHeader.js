'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth, adminLogout } from '../useAdminAuth';
import { Palmtree } from 'lucide-react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 900); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function AdminHeader({ activePath }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const auth = useAdminAuth();
  const isMobile = useIsMobile();

  const isAdmin = auth?.role === 'admin' || auth?.username === 'magacin';

  const navItems = isAdmin ? [
    { label: 'Narudžbine', path: '/admin' },
    { label: 'Statistika', path: '/admin/statistika' },
    { label: 'Proizvodi', path: '/admin/proizvodi' },
    { label: 'Kategorije', path: '/admin/kategorije' },
    { label: 'Skener', path: '/admin/skener' },
    { label: 'Podešavanja', path: '/admin/podesavanja' },
    { label: 'Baneri', path: '/admin/baneri' },
  ] : [
    { label: 'Proizvodi', path: '/admin/proizvodi' },
    { label: 'Skener', path: '/admin/skener' },
  ];

  return (
    <header style={{ background: 'var(--black)', padding: '0 1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: '700', color: '#fff' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(18,179,168,0.25)', color: 'var(--lagoon)', flexShrink: 0 }}><Palmtree size={16} /></span>
          ALOHA<span style={{ color: 'var(--red)' }}>MOB</span> <span style={{ fontSize: '0.8rem', color: '#8a93ab', fontWeight: '400' }}>Admin</span>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {navItems.map(b => (
              <button key={b.path} onClick={() => router.push(b.path)}
                style={{ padding: '0.4rem 0.9rem', background: activePath === b.path ? 'var(--red)' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
                {b.label}
              </button>
            ))}
            <button onClick={() => adminLogout(router)}
              style={{ padding: '0.4rem 0.9rem', background: 'transparent', color: '#8a93ab', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--pill)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Odjavi se
            </button>
          </div>
        )}

        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {isMobile && menuOpen && (
        <div style={{ background: '#1a1a1a', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(b => (
            <button key={b.path} onClick={() => { router.push(b.path); setMenuOpen(false); }}
              style={{ padding: '0.6rem 1rem', background: activePath === b.path ? 'var(--red)' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: 'var(--pill)', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', textAlign: 'left' }}>
              {b.label}
            </button>
          ))}
          <button onClick={() => adminLogout(router)}
            style={{ padding: '0.6rem 1rem', background: 'transparent', color: '#999', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--pill)', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}>
            Odjavi se
          </button>
        </div>
      )}
    </header>
  );
}
