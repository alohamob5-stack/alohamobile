import { sb } from '../../../lib/supabase';
import KategorijaClient from './KategorijaClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: cat } = await sb.from('categories').select('*').eq('slug', slug).single();
  if (!cat) return { title: 'Kategorija — Aloha Mob' };

  const { count } = await sb.from('products').select('*', { count: 'exact', head: true }).eq('category_id', cat.id);

  const title = `${cat.name} — Aloha Mob | Premium GSM oprema`;
  const description = `Kupite ${cat.name.toLowerCase()} po najboljim cenama u Srbiji${count ? ` — ${count} proizvoda u ponudi` : ''}. Brza dostava, plaćanje pouzećem. Aloha Mob — poverenje kupaca širom Srbije.`;

  return {
    title,
    description,
    keywords: [cat.name, `${cat.name} cena`, `kupovina ${cat.name.toLowerCase()}`, 'alohamob', 'gsm oprema srbija', 'dostava srbija'].join(', '),
    alternates: { canonical: `https://alohamobile.rs/kategorije/${cat.slug}` },
    openGraph: {
      title,
      description,
      url: `https://alohamobile.rs/kategorije/${cat.slug}`,
      siteName: 'Aloha Mob',
      locale: 'sr_RS',
      type: 'website',
    },
  };
}

export default function KategorijaPage() {
  return <KategorijaClient />;
}
