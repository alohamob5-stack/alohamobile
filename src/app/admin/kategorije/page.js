'use client';

import { useEffect, useState } from 'react';
import { sb } from '../../../lib/supabase';
import AdminHeader from '../components/AdminHeader';

export default function Kategorije() {
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [newBrand, setNewBrand] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: c }, { data: b }] = await Promise.all([
      sb.from('categories').select('*').order('name'),
      sb.from('brands').select('*').order('name'),
    ]);
    setCats(c || []);
    setBrands(b || []);
  }

  async function addCat() {
    if (!newCat.trim()) return;
    await sb.from('categories').insert({ name: newCat.trim() });
    setNewCat(''); fetchAll();
  }

  async function deleteCat(id) {
    if (!confirm('Obrisati kategoriju?')) return;
    await sb.from('categories').delete().eq('id', id);
    fetchAll();
  }

  async function addBrand() {
    if (!newBrand.trim()) return;
    await sb.from('brands').insert({ name: newBrand.trim() });
    setNewBrand(''); fetchAll();
  }

  async function deleteBrand(id) {
    if (!confirm('Obrisati brend?')) return;
    await sb.from('brands').delete().eq('id', id);
    fetchAll();
  }

  const navItems = [
    { label: 'Narudžbine', path: '/admin' },
    { label: 'Proizvodi', path: '/admin/proizvodi' },
    { label: 'Kategorije', path: '/admin/kategorije' },
    { label: 'Zalihe', path: '/admin/zalihe' },
    { label: 'Skener', path: '/admin/skener' },
    { label: 'Podešavanja', path: '/admin/podesavanja' },
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin/kategorije" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem' }}>Kategorije i brendovi</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Kategorije ({cats.length})</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()}
                placeholder="Nova kategorija..." style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
              <button onClick={addCat} style={{ padding: '0.6rem 1rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>+</button>
            </div>
            {cats.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: '0.9rem' }}>{c.name}</span>
                <button onClick={() => deleteCat(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem' }}>🗑</button>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Brendovi ({brands.length})</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input value={newBrand} onChange={e => setNewBrand(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBrand()}
                placeholder="Novi brend..." style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
              <button onClick={addBrand} style={{ padding: '0.6rem 1rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>+</button>
            </div>
            {brands.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: '0.9rem' }}>{b.name}</span>
                <button onClick={() => deleteBrand(b.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem' }}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
