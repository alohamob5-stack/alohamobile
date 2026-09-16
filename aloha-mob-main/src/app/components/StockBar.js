'use client';

import { useEffect, useState } from 'react';
import { sb } from '../../lib/supabase';

// Lokacije koje se racunaju u "ukupnu zalihu" prikazanu kupcima.
// Namerno NABROJANE poimenicno (ne "sve lokacije iz baze") - ako se doda
// nova prodavnica/lokacija u buducnosti, NECE automatski uci u ovaj zbir
// dok je svesno ne dodamo ovde.
const STOCK_LOCATION_NAMES = ['Magacin', 'Kula', 'Vrbas', 'Backa Topola'];

// Cache da ne pozivamo bazu za isti proizvod vise puta na istoj stranici
const stockCache = new Map();

async function fetchStockLevel(productId) {
    if (stockCache.has(productId)) return stockCache.get(productId);

  const { data: locations } = await sb.from('locations').select('id, name').in('name', STOCK_LOCATION_NAMES);
    const locationIds = (locations || []).map(l => l.id);
    if (locationIds.length === 0) { stockCache.set(productId, 0); return 0; }

  const { data: stockRows } = await sb.from('stock').select('quantity').eq('product_id', productId).in('location_id', locationIds);
    const total = (stockRows || []).reduce((s, r) => s + (r.quantity || 0), 0);
    stockCache.set(productId, total);
    return total;
}

// level: 'high' (zeleno, dosta), 'medium' (zuto, blizu praga), 'low' (crveno, ispod praga)
function getStockLevel(qty, minStock) {
    const threshold = minStock || 5;
    if (qty <= threshold) return 'low';
    if (qty <= threshold * 2) return 'medium';
    return 'high';
}

const LEVEL_COLORS = {
    low: '#dc2626',
    medium: '#d97706',
    high: '#16a34a',
};
const LEVEL_LABELS = {
    low: 'Malo na stanju',
    medium: 'Ima na stanju',
    high: 'Dostupno',
};
// Sirina trake (popunjenost) - cisto vizuelna, ne odgovara tacnom broju komada
const LEVEL_FILL = {
    low: '30%',
    medium: '65%',
    high: '100%',
};

// size: 'small' (diskretno, npr na pocetnoj) ili 'normal' (stranica artikla, kartice)
export default function StockBar({ productId, minStock, size = 'normal' }) {
    const [level, setLevel] = useState(null);

  useEffect(() => {
        let active = true;
        if (!productId) return;
        fetchStockLevel(productId).then(qty => {
                if (active) setLevel(getStockLevel(qty, minStock));
        });
        return () => { active = false; };
  }, [productId, minStock]);

  if (!level) return null;

  const color = LEVEL_COLORS[level];
    const fill = LEVEL_FILL[level];
    const barHeight = size === 'small' ? '4px' : '6px';

  if (size === 'small') {
        // Diskretna verzija: samo tanka traka, bez teksta
      return (
              <div style={{ width: '100%', height: barHeight, background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden', marginTop: '0.35rem' }}>
          <div style={{ height: '100%', width: fill, background: color, borderRadius: '3px' }} />
  </div>
    );
}

  // Verzija normal: traka + tekstualni opis nivoa (BEZ tacnog broja komada)
  return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
      <div style={{ flex: 1, maxWidth: '90px', height: barHeight, background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: fill, background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
    </div>
      <span style={{ fontSize: '0.75rem', color, fontWeight: '600' }}>{LEVEL_LABELS[level]}</span>
    </div>
  );
}
