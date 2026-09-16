'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Mail, MapPin, ShieldCheck, Palmtree } from 'lucide-react';

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
    <footer style={{ background: 'linear-gradient(160deg, var(--black), #14294f)', color: '#fff', marginTop: '2.5rem', paddingBottom: isMobile ? '90px' : '0', position: 'relative', overflow: 'hidden' }}>
      <Palmtree size={220} style={{ position: 'absolute', right: '-2%', top: '-8%', color: 'rgba(255,255,255,0.04)' }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.75rem 1.5rem 1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '2rem', position: 'relative', zIndex: 1 }}>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(239,138,28,0.18)', color: 'var(--red)' }}><Palmtree size={17} /></span>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#9aa4bd', lineHeight: 1.6, margin: 0 }}>
            Prodavnica GSM opreme i pribora — zaštitna stakla, futrole, punjači, kablovi, slušalice i još mnogo toga, po najboljim cenama.
          </p>
        </div>

        <div>
          <h3 className="font-head" style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.9rem', color: '#fff' }}>Kontakt</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <a href="tel:064344172" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c3cae0', textDecoration: 'none', fontSize: '0.88rem' }}>
              <Phone size={15} color="var(--lagoon)" /> 064/344-172
            </a>
            <a href="tel:0654441413" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c3cae0', textDecoration: 'none', fontSize: '0.88rem' }}>
              <Phone size={15} color="var(--lagoon)" /> 065/444-1413
            </a>
            <a href="mailto:info@alohamobile.rs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c3cae0', textDecoration: 'none', fontSize: '0.88rem' }}>
              <Mail size={15} color="var(--lagoon)" /> info@alohamobile.rs
            </a>
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#c3cae0', fontSize: '0.88rem' }}>
              <MapPin size={15} color="var(--lagoon)" style={{ flexShrink: 0, marginTop: '0.15rem' }} /> Kralja Aleksandra Karađorđevića I 49, 23000 Zrenjanin
            </span>
          </div>
        </div>

        <div>
          <h3 className="font-head" style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.9rem', color: '#fff' }}>Saradnje</h3>
          <p style={{ fontSize: '0.85rem', color: '#9aa4bd', lineHeight: 1.6, margin: '0 0 0.6rem' }}>
            Sarađujemo sa proverenim dobavljačima kako bismo vam obezbedili kvalitetnu opremu.
          </p>
          <span onClick={() => router.push('/saradnje')} style={{ display: 'inline-block', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
            Pogledaj naše saradnje →
          </span>
        </div>

        <div>
          <h3 className="font-head" style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.9rem', color: '#fff' }}>Kupovina</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <span onClick={() => router.push('/pretraga')} style={{ color: '#c3cae0', fontSize: '0.85rem', cursor: 'pointer' }}>Svi proizvodi</span>
            <span onClick={() => router.push('/moje-porudzbine')} style={{ color: '#c3cae0', fontSize: '0.85rem', cursor: 'pointer' }}>Moje porudžbine</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c3cae0', fontSize: '0.85rem' }}>
              <ShieldCheck size={14} color="var(--lagoon)" /> Plaćanje pouzećem ili karticom
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.5rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#7c86a3' }}>
          © {year} Aloha Mob. Sva prava zadržana.
        </p>
      </div>
    </footer>
  );
}
