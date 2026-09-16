'use client';

import { useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { useAdminAuth } from '../useAdminAuth';

export default function Lozinka() {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const auth = useAdminAuth();

  async function changePass() {
    setError('');
    if (!oldPass || !newPass || !newPass2) { setError('Popunite sva polja!'); return; }
    if (newPass !== newPass2) { setError('Nove lozinke se ne poklapaju!'); return; }
    if (newPass.length < 4) { setError('Lozinka mora imati najmanje 4 karaktera!'); return; }

    setSaving(true);
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Greška pri promeni lozinke.');
      return;
    }
    setSuccess(true);
    setOldPass(''); setNewPass(''); setNewPass2('');
    setTimeout(() => setSuccess(false), 3000);
  }

  const username = auth?.username || '';

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin/lozinka" />

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem' }}>Promeni lozinku</h1>
        <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Prijavljeni kao: <strong>{username}</strong></p>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {[
            ['Trenutna lozinka', oldPass, setOldPass],
            ['Nova lozinka', newPass, setNewPass],
            ['Ponovi novu lozinku', newPass2, setNewPass2],
          ].map(([label, val, setter]) => (
            <div key={label} style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: '#666' }}>{label}</label>
              <input type="password" value={val} onChange={e => setter(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          {error && <p style={{ color: '#ef8a1c', fontSize: '0.85rem', margin: '0 0 1rem', fontWeight: '600' }}>⚠️ {error}</p>}
          {success && <p style={{ color: '#16a34a', fontSize: '0.85rem', margin: '0 0 1rem', fontWeight: '600' }}>✓ Lozinka uspešno promenjena!</p>}

          <button onClick={changePass} disabled={saving}
            style={{ width: '100%', padding: '0.85rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>
            {saving ? 'Čuvanje...' : 'Promeni lozinku'}
          </button>
        </div>
      </div>
    </div>
  );
}
