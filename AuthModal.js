'use client';

import { useState } from 'react';
import { shopLogin, shopRegister } from '../../lib/shopAuth';

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', password: '', city: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleLogin() {
    if (!identifier || !password) { setError('Popunite sva polja!'); return; }
    setError('');
    setLoading(true);
    const result = await shopLogin(identifier, password);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    onSuccess(result.session);
  }

  async function handleRegister() {
    if (!regForm.name || !regForm.phone || !regForm.password) { setError('Ime, telefon i lozinka su obavezni!'); return; }
    setError('');
    setLoading(true);
    const result = await shopRegister(regForm);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setRegistered(true);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>

        {registered ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.75rem' }}>Zahtev poslat!</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Vaš nalog čeka odobrenje administratora. Bićete obavešteni kada bude aktivan.
            </p>
            <button onClick={onClose} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '700' }}>
              U redu
            </button>
          </div>
        ) : mode === 'login' ? (
          <div>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: '800' }}>Prijava</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Korisničko ime ili telefon</label>
              <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="npr. 0601234567"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Lozinka</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: '0 0 1rem', fontWeight: '600' }}>⚠️ {error}</p>}
            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '0.85rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', marginBottom: '0.75rem' }}>
              {loading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Nemate nalog?{' '}
              <span onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--red)', fontWeight: '700', cursor: 'pointer' }}>Registrujte se</span>
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: '800' }}>Registracija</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem' }}>Nalog mora biti odobren od administratora pre prve prijave.</p>
            {[['name', 'Ime i prezime *', 'text', 'Marko Marković'], ['phone', 'Telefon *', 'tel', '+381 60...'], ['email', 'Email', 'email', 'opciono'], ['city', 'Grad', 'text', 'Beograd'], ['address', 'Adresa', 'text', 'Ulica i broj']].map(([key, label, type, ph]) => (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</label>
                <input type={type} placeholder={ph} value={regForm[key]} onChange={e => setRegForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Lozinka *</label>
              <input type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: '0 0 1rem', fontWeight: '600' }}>⚠️ {error}</p>}
            <button onClick={handleRegister} disabled={loading}
              style={{ width: '100%', padding: '0.85rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', marginBottom: '0.75rem' }}>
              {loading ? 'Slanje...' : 'Registruj se'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Imate nalog?{' '}
              <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--red)', fontWeight: '700', cursor: 'pointer' }}>Prijavite se</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
