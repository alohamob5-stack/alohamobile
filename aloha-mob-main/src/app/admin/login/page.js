'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Login() {
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit() {
    if (!username || !pass) { setError('Unesite korisničko ime i lozinku!'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Pogrešno korisničko ime ili lozinka!');
        setLoading(false);
        return;
      }
      router.push('/admin');
    } catch {
      setError('Greška u komunikaciji sa serverom. Pokušajte ponovo.');
      setLoading(false);
    }
  }
  return (
    <div style={{ minHeight: '100vh', background: '#0f1e3d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>ALOHA<span style={{ color: '#ef8a1c' }}>MOB</span></div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>Admin panel</div>
        </div>
        <div style={{ background: '#141414', borderRadius: '12px', padding: '2rem', border: '1px solid #2a2a2a' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>Prijava</h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Korisničko ime</label>
            <input type="text" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #2a2a2a', outline: 'none', background: '#1a1a1a', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lozinka</label>
            <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #2a2a2a', outline: 'none', background: '#1a1a1a', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ color: '#ef8a1c', fontSize: '0.85rem', margin: '0 0 1rem', fontWeight: '600' }}>⚠️ {error}</p>}
          <button onClick={submit} disabled={loading}
            style={{ width: '100%', padding: '0.85rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>
            {loading ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>
        </div>
      </div>
    </div>
  );
}
