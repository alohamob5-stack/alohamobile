import { cache } from 'react';
import { sb, makeSlug } from '../../../lib/supabase';
import ProizvodClient from './ProizvodClient';

const getProduct = cache(async (id) => {
  const { data } = await sb.from('products').select('*, categories(name), brands(name)').eq('id', id).single();
  return data;
});

const getReviewStats = cache(async (id) => {
  const { data } = await sb.from('reviews').select('rating').eq('product_id', id);
  if (!data || data.length === 0) return null;
  const count = data.length;
  const avg = data.reduce((s, r) => s + r.rating, 0) / count;
  return { count, avg: Math.round(avg * 10) / 10 };
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const id = slug.split('-').pop();
  const p = await getProduct(id);
  if (!p) return { title: 'Proizvod — Aloha Mob' };

  const title = `${p.name} — Aloha Mob`;
  const description = `Kupite ${p.name}${p.brands?.name ? ` od brenda ${p.brands.name}` : ''} za ${Number(p.price).toLocaleString('sr-RS')} RSD. ${p.description || 'Premium GSM oprema. Dostava po celoj Srbiji. Plaćanje pouzećem.'}`;

  return {
    title,
    description,
    keywords: [p.name, p.brands?.name, p.categories?.name, 'alohamob', 'srbija', 'dostava'].filter(Boolean).join(', '),
    alternates: { canonical: `https://alohamobile.rs/proizvod/${makeSlug(p.name, p.id)}` },
    openGraph: {
      title,
      description,
      url: `https://alohamobile.rs/proizvod/${makeSlug(p.name, p.id)}`,
      images: p.image_url ? [{ url: p.image_url }] : [],
    },
  };
}

export default async function ProizvodPage({ params }) {
  const { slug } = await params;
  const id = slug.split('-').pop();
  const [p, reviewStats] = await Promise.all([getProduct(id), getReviewStats(id)]);

  const jsonLd = p ? {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    ...(p.image_url ? { image: [p.image_url] } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.brands?.name ? { brand: { '@type': 'Brand', name: p.brands.name } } : {}),
    ...(p.categories?.name ? { category: p.categories.name } : {}),
    ...(reviewStats ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewStats.avg,
        reviewCount: reviewStats.count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    offers: {
      '@type': 'Offer',
      url: `https://alohamobile.rs/proizvod/${makeSlug(p.name, p.id)}`,
      priceCurrency: 'RSD',
      price: p.price,
      availability: 'https://schema.org/InStock',
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProizvodClient params={params} />
    </>
  );
}
