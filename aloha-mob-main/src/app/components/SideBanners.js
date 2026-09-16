'use client';

import { useEffect, useState } from 'react';
import { sb } from '../../lib/supabase';

export default function SideBanners({ children }) {
  const [leftBanner, setLeftBanner] = useState(null);
  const [rightBanner, setRightBanner] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      const { data } = await sb.from('banners').select('*').eq('active', true);
      setLeftBanner((data || []).find(b => b.type === 'left'));
      setRightBanner((data || []).find(b => b.type === 'right'));
    }
    load();
  }, []);

  const Banner = ({ banner }) => (
    <div
      onClick={() => banner?.link && window.open(banner.link, '_blank')}
      style={{
        width: '120px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        cursor: banner?.link ? 'pointer' : 'default',
        background: banner?.bg || 'linear-gradient(160deg, #1a0000, #3d0000)',
        overflow: 'hidden',
      }}
    >
      {banner?.image_url ? (
        <img src={banner.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem' }}>📱</div>
          <div style={{ color: 'var(--red)', fontWeight: '900', fontSize: '0.85rem' }}>ALOHA<span style={{ color: '#fff' }}>MOB</span></div>
          <div style={{ width: '24px', height: '2px', background: 'var(--red)', borderRadius: '1px' }} />
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.75rem', lineHeight: 1.4 }}>{banner?.title || 'Premium oprema'}</div>
          <div style={{ background: 'var(--red)', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.72rem' }}>🔥 -30%</div>
        </div>
      )}
    </div>
  );

  // Na manjim ekranima ne prikazuj banere
  if (!mounted) return <>{children}</>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch' }}>
      {/* Levi baner — samo na velikim ekranima */}
      <div style={{ display: 'none' }} className="side-banner-left">
        <Banner banner={leftBanner} />
      </div>

      {/* Sadržaj */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>

      {/* Desni baner — samo na velikim ekranima */}
      <div style={{ display: 'none' }} className="side-banner-right">
        <Banner banner={rightBanner} />
      </div>

      <style>{`
        @media (min-width: 1500px) {
          .side-banner-left { display: block !important; }
          .side-banner-right { display: block !important; }
        }
      `}</style>
    </div>
  );
}