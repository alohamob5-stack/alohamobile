'use client';

import { useState, useEffect } from 'react';

export default function CookieBaner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setShow(true);
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a1a', color: '#fff', padding: '1rem 1.5rem', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
      <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', maxWidth: '700px' }}>
        🍪 Koristimo kolačiće za analitiku i poboljšanje korisničkog iskustva. 
        <a href="#" style={{ color: '#ef8a1c', marginLeft: '0.25rem' }}>Saznaj više</a>
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button onClick={decline} style={{ padding: '0.5rem 1.25rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', background: 'transparent', color: '#fff', fontSize: '0.88rem' }}>
          Odbij
        </button>
        <button onClick={accept} style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#ef8a1c', color: '#fff', fontSize: '0.88rem', fontWeight: '700' }}>
          Prihvati
        </button>
      </div>
    </div>
  );
}
