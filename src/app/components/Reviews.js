'use client';

import { useEffect, useState } from 'react';
import { sb } from '../../lib/supabase';

export default function Reviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ name: '', text: '', rating: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  async function fetchReviews() {
    const { data } = await sb.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
    setReviews(data || []);
  }

  async function submitReview() {
    if (!form.rating) { alert('Izaberite ocenu!'); return; }
    setSubmitting(true);
    setError('');
    const { error: insertError } = await sb.from('reviews').insert({ product_id: productId, name: form.name || 'Anonimno', text: form.text, rating: form.rating });
    setSubmitting(false);
    if (insertError) {
      console.error('Greška pri slanju recenzije:', insertError);
      setError(`Greška: ${insertError.message || 'Recenzija nije poslata. Pokušajte ponovo.'}`);
      return;
    }
    setForm({ name: '', text: '', rating: 0 });
    fetchReviews();
  }

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Recenzije {avg && <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>— ⭐ {avg} ({reviews.length})</span>}
      </h2>

      {reviews.length === 0 && <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Još nema recenzija.</p>}

      {reviews.map(r => (
        <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{r.name}</span>
            <span>{'⭐'.repeat(r.rating)}</span>
          </div>
          {r.text && <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{r.text}</p>}
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Ostavite recenziju</h3>
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
          {[1,2,3,4,5].map(s => (
            <span key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setForm(f => ({ ...f, rating: s }))}
              style={{ fontSize: '1.5rem', cursor: 'pointer', opacity: s <= (hover || form.rating) ? 1 : 0.3 }}>⭐</span>
          ))}
        </div>
        <input placeholder="Vaše ime" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginBottom: '0.5rem', outline: 'none' }} />
        <textarea placeholder="Vaše iskustvo..." value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', resize: 'none', outline: 'none', marginBottom: '0.75rem' }} rows={3} />
        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem', fontWeight: '600' }}>⚠️ {error}</p>}
        <button onClick={submitReview} disabled={submitting}
          style={{ padding: '0.65rem 1.5rem', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold' }}>
          {submitting ? 'Slanje...' : 'Pošalji recenziju'}
        </button>
      </div>
    </div>
  );
}
