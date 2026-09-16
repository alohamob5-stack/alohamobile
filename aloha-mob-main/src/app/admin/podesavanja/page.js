'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../../lib/supabase';
import AdminHeader from '../components/AdminHeader';
import { adminLogout } from '../useAdminAuth';

export default function Podesavanja() {
  const [minMagacin, setMinMagacin] = useState(20);
  const [minShops, setMinShops] = useState(5);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await sb.from('settings').select('*').in('key', ['min_stock_magacin', 'min_stock_shops']);
    (data || []).forEach(row => {
      if (row.key === 'min_stock_magacin') setMinMagacin(Number(row.value));
      if (row.key === 'min_stock_shops') setMinShops(Number(row.value));
    });
    setLoading(false);
  }

  async function saveMin() {
    await Promise.all([
      sb.from('settings').upsert({ key: 'min_stock_magacin', value: String(minMagacin) }),
      sb.from('settings').upsert({ key: 'min_stock_shops', value: String(minShops) }),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin/podesavanja" />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem' }}>Podešavanja</h1>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e8e8e8', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Minimum zaliha</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Upozorenje (crveno + notifikacija) kada zaliha na lokaciji padne ispod ovih brojeva.</p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#444' }}>Minimum za Magacin</label>
            <input type="number" value={minMagacin} onChange={e => setMinMagacin(Number(e.target.value))} min={0}
              style={{ width: '140px', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', fontSize: '1rem' }} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#444' }}>Minimum za prodavnice (Kula / Vrbas / Bačka Topola)</label>
            <input type="number" value={minShops} onChange={e => setMinShops(Number(e.target.value))} min={0}
              style={{ width: '140px', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', fontSize: '1rem' }} />
          </div>

          <button onClick={saveMin} disabled={loading} style={{ padding: '0.6rem 1.5rem', background: saved ? '#16a34a' : '#ef8a1c', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', transition: 'background 0.2s', opacity: loading ? 0.6 : 1 }}>
            {saved ? '✓ Sačuvano!' : loading ? 'Učitavanje...' : 'Sačuvaj'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div>
            <p style={{ margin: 0, fontWeight: '600' }}>Promeni lozinku</p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#999' }}>Promeni svoju lozinku</p>
          </div>
          <button onClick={() => router.push('/admin/lozinka')}
            style={{ padding: '0.5rem 1.25rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
            Promeni
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Nalog</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600' }}>Odjavi se</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#999' }}>Završi admin sesiju</p>
            </div>
            <button onClick={() => adminLogout(router)}
              style={{ padding: '0.5rem 1.25rem', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
              Odjavi se
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
