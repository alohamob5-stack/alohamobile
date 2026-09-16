'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../../lib/supabase';
import AdminHeader from '../components/AdminHeader';
import { useAdminAuth } from '../useAdminAuth';

export default function Skener() {
  const [result, setResult] = useState(null);
  const [product, setProduct] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [qty, setQty] = useState(1);
  const [transferTo, setTransferTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);
  const router = useRouter();
  const auth = useAdminAuth();

  const role = auth?.role || '';
  const username = auth?.username || '';
  const isAdmin = role === 'admin' || username === 'magacin';
  const userLocName = username === 'kula' ? 'Kula' : username === 'vrbas' ? 'Vrbas' : username === 'backa' ? 'Backa Topola' : null;

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    const { data: l } = await sb.from('locations').select('*').order('id');
    setLocations(l || []);
  }

  async function fetchStock(pid) {
    const { data: s } = await sb.from('stock').select('*').eq('product_id', pid);
    setStock(s || []);
  }

  const myLoc = !isAdmin && userLocName ? locations.find(l => l.name === userLocName) : null;

  function getQty(locId) {
    const s = stock.find(x => Number(x.location_id) === Number(locId));
    return s ? s.quantity : 0;
  }

  async function handleCode(code) {
    setResult(code);
    const { data } = await sb.from('products').select('*').eq('barcode', code).single();
    setProduct(data || null);
    setQty(1);
    setTransferTo('');
    if (data) await fetchStock(data.id);
  }

  async function startScanner() {
    const { Html5Qrcode } = await import('html5-qrcode');
    setScanning(true);
    setResult(null);
    setProduct(null);
    setError('');
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (code) => {
          await scanner.stop();
          setScanning(false);
          await handleCode(code);
        },
        () => {}
      );
    } catch (e) {
      setError('Kamera nije dostupna.');
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) { try { await scannerRef.current.stop(); } catch {} }
    setScanning(false);
  }

  useEffect(() => {
    return () => { if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} } };
  }, []);

  // Atomska izmena u bazi (adjust_stock RPC) - bezbedno cak i kad se vise ljudi/uredjaja
  // istovremeno menja isto stanje (ranija verzija je citala pa upisivala u dva koraka,
  // sto je moglo da izgubi izmenu ako se desi u istom trenutku kao neka druga akcija).
  async function adjMyStock(dir, reason = 'sken') {
    if (!myLoc || !product) return;
    setSaving(true);
    const locId = Number(myLoc.id);
    const { error: rpcErr } = await sb.rpc('adjust_stock', {
      p_product_id: product.id, p_location_id: locId, p_delta: dir
    });
    if (rpcErr) console.error('adjust_stock greška:', rpcErr);
    const { error: logError } = await sb.from('stock_log').insert({ product_id: product.id, location_id: locId, delta: dir, performed_by: username, reason });
    if (logError) console.error('stock_log upis greška:', logError);
    await fetchStock(product.id);
    setSaving(false);
  }

  // Atomski transfer (transfer_stock RPC) - baza sama proverava dovoljnost i premesta
  // u jednoj transakciji, bez rizika da neko drugi u medjuvremenu izmeni isto stanje.
  async function doTransfer() {
    const transferQty = Number(qty);
    if (!transferTo || !transferQty || transferQty <= 0) { alert('Izaberite lokaciju i unesite količinu!'); return; }
    const magacin = locations.find(l => l.name === 'Magacin');
    if (!magacin) { alert('Magacin lokacija nije pronađena!'); return; }
    const from = Number(magacin.id);
    const to = Number(transferTo);
    if (from === to) { alert('Odredište mora biti različito od magacina!'); return; }
    setSaving(true);
    const { error } = await sb.rpc('transfer_stock', {
      p_product_id: product.id, p_from_location: from, p_to_location: to, p_qty: transferQty
    });
    if (error) { alert('Greška: ' + (error.message || 'Nema dovoljno na zalihama!')); setSaving(false); return; }
    await sb.from('stock_log').insert([
      { product_id: product.id, location_id: from, delta: -transferQty, performed_by: username, reason: 'transfer' },
      { product_id: product.id, location_id: to, delta: transferQty, performed_by: username, reason: 'transfer' },
    ]);
    await fetchStock(product.id);
    setQty(1);
    setTransferTo('');
    setSaving(false);
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <AdminHeader activePath="/admin/skener" />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem' }}>Barkod skener</h1>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e8e8e8', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div id="reader" style={{ width: '100%', marginBottom: '1rem' }} />
          {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}
          {!scanning
            ? <button onClick={startScanner} style={{ width: '100%', padding: '0.85rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>📷 Pokreni skener</button>
            : <button onClick={stopScanner} style={{ width: '100%', padding: '0.85rem', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>⏹ Zaustavi</button>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1rem 0 0.25rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#eee' }} />
            <span style={{ fontSize: '0.75rem', color: '#999', fontWeight: '600' }}>ILI UPIŠI RUČNO</span>
            <div style={{ flex: 1, height: '1px', background: '#eee' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="text" value={manualCode} onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) handleCode(manualCode.trim()); }}
              placeholder="Unesi barkod..."
              style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '0.95rem' }} />
            <button onClick={() => manualCode.trim() && handleCode(manualCode.trim())}
              style={{ padding: '0.7rem 1.1rem', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
              Traži
            </button>
          </div>
        </div>

        {result && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e8e8e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 0.25rem' }}>Skeniran barkod:</p>
            <p style={{ fontWeight: '700', fontSize: '1.1rem', margin: '0 0 1rem', fontFamily: 'monospace' }}>{result}</p>

            {product ? (
              <div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '8px' }}>
                  {product.image_url && <img src={product.image_url} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />}
                  <div>
                    <p style={{ fontWeight: '700', margin: 0 }}>{product.name}</p>
                    <p style={{ color: '#ef8a1c', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{Number(product.price).toLocaleString('sr-RS')} RSD</p>
                  </div>
                </div>

                {!isAdmin && myLoc && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#666' }}>Stanje u {myLoc.name}:</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                      <button onClick={() => adjMyStock(-1, 'sken')} disabled={saving} style={{ width: '44px', height: '44px', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: '1.3rem' }}>−</button>
                      <span style={{ fontWeight: '800', fontSize: '1.6rem', minWidth: '50px', textAlign: 'center' }}>{getQty(myLoc.id)}</span>
                      <button onClick={() => adjMyStock(1)} disabled={saving} style={{ width: '44px', height: '44px', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: '1.3rem' }}>+</button>
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#666' }}>
                      Dostupno u magacinu: {getQty(locations.find(l => l.name === 'Magacin')?.id)} kom
                    </p>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: '#666' }}>Prebaci u</label>
                      <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}>
                        <option value="">— Izaberi lokaciju —</option>
                        {locations.filter(l => l.name !== 'Magacin').map(l => (
                          <option key={l.id} value={l.id}>{l.name} (trenutno: {getQty(l.id)})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem', color: '#666' }}>Količina</label>
                      <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
                    </div>
                    <button onClick={doTransfer} disabled={saving} style={{ width: '100%', padding: '0.75rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                      {saving ? 'Prebacujem...' : 'Prebaci ↗'}
                    </button>
                  </div>
                )}

                {isAdmin && <button onClick={() => router.push('/admin/proizvodi')} style={{ width: '100%', padding: '0.75rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>Izmeni proizvod</button>}
              </div>
            ) : (
              <div>
                <p style={{ color: '#dc2626', marginBottom: '1rem', fontWeight: '600' }}>⚠️ Proizvod nije pronađen!</p>
                {isAdmin && <button onClick={() => router.push('/admin/proizvodi')} style={{ width: '100%', padding: '0.75rem', background: '#ef8a1c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>+ Dodaj novi proizvod</button>}
              </div>
            )}

            <button onClick={() => { setResult(null); setProduct(null); startScanner(); }} style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', marginTop: '0.5rem' }}>
              Skeniraj ponovo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
