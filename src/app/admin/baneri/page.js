'use client';

import { useEffect, useState } from 'react';
import { sb } from '../../../lib/supabase';
import AdminHeader from '../components/AdminHeader';

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 1400;
          let w = img.width, h = img.height;
          if (w > maxW) { h = h * maxW / w; w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => {
            if (blob) resolve(new File([blob], 'banner.jpg', { type: 'image/jpeg' }));
            else resolve(file);
          }, 'image/jpeg', 0.85);
        } catch (err) { resolve(file); }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function Baneri() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [form, setForm] = useState({ title: '', subtitle: '', tag: '', bg: '', active: true, image_url: '', type: 'top', link: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const { data } = await sb.from('banners').select('*').order('id');
    setBanners(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setImgFile(null);
    setUploadProgress('');
    setForm({ title: '', subtitle: '', tag: '', bg: 'linear-gradient(135deg, #0f1e3d 0%, #2a1400 50%, #3d1f00 100%)', active: true, image_url: '', type: 'top', link: '' });
    setModalOpen(true);
  }

  function openEdit(b) {
    setEditing(b.id);
    setImgFile(null);
    setUploadProgress('');
    setForm({ title: b.title, subtitle: b.subtitle, tag: b.tag, bg: b.bg, active: b.active, image_url: b.image_url || '', type: b.type || 'top', link: b.link || '' });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title) { alert('Unesite naslov!'); return; }
    setSaving(true);
    setUploadProgress('');

    let image_url = form.image_url;
    if (imgFile) {
      try {
        setUploadProgress('Kompresovanje slike...');
        const compressed = await compressImage(imgFile);
        setUploadProgress('Uploadovanje...');
        const path = `banners/banner_${editing || Date.now()}.jpg`;
        const { error: uploadError } = await sb.storage.from('product-images').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data } = sb.storage.from('product-images').getPublicUrl(path);
        image_url = data.publicUrl;
        setUploadProgress('Slika uploadovana!');
      } catch (err) {
        alert('Greška pri uploadu slike: ' + err.message);
        setSaving(false);
        setUploadProgress('');
        return;
      }
    }

    const data = { title: form.title, subtitle: form.subtitle, tag: form.tag, bg: form.bg, active: form.active, image_url, type: form.type, link: form.link || null };
    if (editing) {
      await sb.from('banners').update(data).eq('id', editing);
    } else {
      await sb.from('banners').insert(data);
    }
    setSaving(false);
    setUploadProgress('');
    setModalOpen(false);
    fetchAll();
  }

  async function deleteB(id) {
    if (!confirm('Obrisati baner?')) return;
    await sb.from('banners').delete().eq('id', id);
    fetchAll();
  }

  async function toggleActive(id, active) {
    await sb.from('banners').update({ active: !active }).eq('id', id);
    fetchAll();
  }

  const BG_PRESETS = [
    'linear-gradient(135deg, #0f1e3d 0%, #2a1400 50%, #3d1f00 100%)',
    'linear-gradient(135deg, #0f1e3d 0%, #1a1a2e 50%, #16213e 100%)',
    'linear-gradient(135deg, #0f1e3d 0%, #1a0a00 50%, #2d1500 100%)',
    'linear-gradient(135deg, #0f1e3d 0%, #001a0d 50%, #002d1a 100%)',
    'linear-gradient(135deg, #0f1e3d 0%, #1a001a 50%, #2d002d 100%)',
  ];

  if (loading) return <div style={{ padding: '2rem' }}>Učitavanje...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin/baneri" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Baneri</h1>
          <button onClick={openNew} style={{ padding: '0.5rem 1rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>+ Novi baner</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {banners.map(b => (
            <div key={b.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ background: b.bg, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '120px', position: 'relative', overflow: 'hidden' }}>
                {b.image_url && <img src={b.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <span style={{ background: '#ef8a1c', color: '#fff', padding: '0.2rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>{b.tag}</span>
                  <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '900', margin: '0.5rem 0 0.25rem' }}>{b.title}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>{b.subtitle}</p>
                  {b.link && <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0', fontSize: '0.75rem' }}>🔗 {b.link}</p>}
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <span style={{ background: b.active ? '#16a34a' : '#dc2626', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {b.active ? 'Aktivan' : 'Neaktivan'}
                  </span>
                  <span style={{ background: '#666', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {b.type === 'right' ? 'Desni' : 'Gornji'}
                  </span>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => toggleActive(b.id, b.active)}
                  style={{ padding: '0.4rem 0.8rem', border: `1px solid ${b.active ? '#dc2626' : '#16a34a'}`, color: b.active ? '#dc2626' : '#16a34a', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '0.85rem' }}>
                  {b.active ? 'Deaktiviraj' : 'Aktiviraj'}
                </button>
                <button onClick={() => openEdit(b)}
                  style={{ padding: '0.4rem 0.8rem', border: '1px solid #2563eb', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '0.85rem' }}>
                  Izmeni
                </button>
                <button onClick={() => deleteB(b.id)}
                  style={{ padding: '0.4rem 0.8rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '0.85rem' }}>
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1rem' }}>{editing ? 'Izmeni baner' : 'Novi baner'}</h2>

            {[['title', 'Naslov *'], ['subtitle', 'Podnaslov'], ['tag', 'Tag (npr. 📱 Sve za mobitel)']].map(([key, label]) => (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>{label}</label>
                <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Link (opciono)</label>
              <input type="text" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>Tip banera</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                <option value="top">Gornji (slideshow)</option>
                <option value="right">Desni (sidebar)</option>
              </select>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Slika pozadine (opciono)</label>
              <label htmlFor="banner-img" style={{ display: 'flex', width: '100%', height: '100px', borderRadius: '8px', border: '1.5px dashed #ccc', background: '#f8f9fa', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                {imgFile ? (
                  <img src={URL.createObjectURL(imgFile)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : form.image_url ? (
                  <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>📷 Klikni za upload slike</span>
                )}
              </label>
              <input id="banner-img" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) setImgFile(f); }} />
              {(imgFile || form.image_url) && (
                <button onClick={() => { setImgFile(null); setForm(f => ({ ...f, image_url: '' })); }}
                  style={{ marginTop: '0.4rem', padding: '0.3rem 0.75rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', background: '#fff', fontSize: '0.82rem' }}>
                  Ukloni sliku
                </button>
              )}
              {imgFile && <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#666' }}>Izabrana: {imgFile.name}</p>}
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Pozadinska boja</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {BG_PRESETS.map((bg, i) => (
                  <div key={i} onClick={() => setForm(f => ({ ...f, bg }))}
                    style={{ width: '40px', height: '40px', borderRadius: '8px', background: bg, cursor: 'pointer', border: form.bg === bg ? '3px solid #ef8a1c' : '2px solid transparent' }} />
                ))}
              </div>
              <input type="text" value={form.bg} onChange={e => setForm(f => ({ ...f, bg: e.target.value }))}
                placeholder="ili unesite custom gradient..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.82rem' }} />
              <div style={{ marginTop: '0.5rem', height: '40px', borderRadius: '6px', background: form.bg }} />
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <label htmlFor="active" style={{ fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>Aktivan</label>
            </div>

            {uploadProgress && <p style={{ color: '#2563eb', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: '600' }}>⏳ {uploadProgress}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}>Odustani</button>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {saving ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
