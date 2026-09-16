'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Palmtree } from 'lucide-react';

const partners = [
  {
    name: 'Foneng',
    description: 'Zvanični uvoznik Foneng proizvoda za Srbiju — punjači, kablovi, držači, slušalice i zvučnici. Kao ekskluzivni distributer, garantujemo originalnost i najbolje cene na tržištu.',
  },
];

export default function SaradnjePage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#fff', padding: '0 1rem', borderBottom: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(15,30,61,0.08)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem', height: '56px' }}>
          <button onClick={() => router.back()} style={{ background: '#fff', border: '1.5px solid var(--border)', color: 'var(--black)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '700', borderRadius: 'var(--pill)', padding: '0.5rem 1rem' }}>
            <ArrowLeft size={16} /> Nazad
          </button>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: '700', color: 'var(--black)', cursor: 'pointer', marginLeft: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--black), var(--lagoon))', color: '#fff', flexShrink: 0 }}><Palmtree size={16} /></span>
            ALOHA<span style={{ color: 'var(--red)' }}>MOB</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 0.5rem' }}>Naše saradnje</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', margin: '0 0 2rem', maxWidth: '600px' }}>
          Sarađujemo sa proverenim dobavljačima kako bismo vam obezbedili kvalitetnu opremu po pristupačnim cenama.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {partners.map(p => (
            <div key={p.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--red)', margin: '0 0 0.5rem' }}>{p.name}</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{p.description}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
            Za poslovne upite ili predloge saradnje, javite nam se na{' '}
            <a href="mailto:info@alohamobile.rs" style={{ color: 'var(--red)', fontWeight: '700', textDecoration: 'none' }}>info@alohamobile.rs</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
