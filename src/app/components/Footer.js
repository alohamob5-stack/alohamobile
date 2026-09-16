'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';

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

export default function Footer() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--black)', color: '#fff', marginTop: '2rem', paddingBottom: isMobile ? '65px' : '0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '2rem' }}>

        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.75rem' }}>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.6, margin: 0 }}>
            Prodavnica GSM opreme i pribora — zaštitna stakla, futrole, punjači, kablovi, slušalice i još mnogo toga, po najboljim cenama.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.9rem', color: '#fff' }}>Kontakt</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <a href="tel:0631701217" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', textDecoration: 'none', fontSize: '0.88rem' }}>
              <Phone size={15} /> 063/1701-217
            </a>
            <a href="mailto:info@alohamobile.rs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', textDecoration: 'none', fontSize: '0.88rem' }}>
              <Mail size={15} /> info@alohamobile.rs
            </a>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.9rem', color: '#fff' }}>Saradnje</h3>
          <p style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.6, margin: '0 0 0.6rem' }}>
            Sarađujemo sa proverenim dobavljačima kako bismo vam obezbedili kvalitetnu opremu.
          </p>
          <span onClick={() => router.push('/saradnje')} style={{ display: 'inline-block', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
            Pogledaj naše saradnje →
          </span>
        </div>

        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.9rem', color: '#fff' }}>Kupovina</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <span onClick={() => router.push('/pretraga')} style={{ color: '#ccc', fontSize: '0.85rem', cursor: 'pointer' }}>Svi proizvodi</span>
            <span onClick={() => router.push('/moje-porudzbine')} style={{ color: '#ccc', fontSize: '0.85rem', cursor: 'pointer' }}>Moje porudžbine</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ccc', fontSize: '0.85rem' }}>
              <ShieldCheck size={14} /> Plaćanje pouzećem ili karticom
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', padding: '1rem 1.5rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>
          © {year} Aloha Mob. Sva prava zadržana.
        </p>
      </div>
    </footer>
  );
}
