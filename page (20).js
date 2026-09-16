import { sb } from '../../../../lib/supabase';
import BrandClient from './BrandClient';

export async function generateMetadata({ params }) {
  const { slug, brand } = await params;
  const { data: cat } = await sb.from('categories').select('*').eq('slug', slug).single();
  if (!cat) return { title: 'Kategorija — Aloha Mob' };

  const isSpecialMode = slug === 'maske' || slug === 'stakla';

  // Za Maske/Stakla je 'brand' zapravo brend telefona (subkategorija), za ostale kategorije pravi brend proizvoda
  let labelName = brand;
  if (isSpecialMode) {
    const { data: subcat } = await sb.from('subcategories').select('name').or(`slug.eq.${brand},name.ilike.${brand}`).limit(1).maybeSingle();
    labelName = subcat?.name || brand;
  } else {
    const { data: brandObj } = await sb.from('brands').select('name').or(`slug.eq.${brand},name.ilike.${brand}`).limit(1).maybeSingle();
    labelName = brandObj?.name || brand;
  }

  const title = isSpecialMode
    ? `${cat.name} za ${labelName} — Aloha Mob`
    : `${cat.name} — ${labelName} — Aloha Mob`;
  const description = isSpecialMode
    ? `Kupite ${cat.name.toLowerCase()} za ${labelName} telefone po najboljim cenama. Veliki izbor modela, brza dostava, plaćanje pouzećem. Aloha Mob — poverenje kupaca širom Srbije.`
    : `Kupite ${cat.name.toLowerCase()} brenda ${labelName} po najboljim cenama u Srbiji. Brza dostava, plaćanje pouzećem.`;

  return {
    title,
    description,
    keywords: [cat.name, labelName, `${labelName} ${cat.name.toLowerCase()}`, 'alohamob', 'gsm oprema srbija'].join(', '),
    alternates: { canonical: `https://alohamobile.rs/kategorije/${slug}/${brand}` },
    openGraph: {
      title,
      description,
      url: `https://alohamobile.rs/kategorije/${slug}/${brand}`,
      siteName: 'Aloha Mob',
      locale: 'sr_RS',
      type: 'website',
    },
  };
}

export default function KategorijaBrandPage() {
  return <BrandClient />;
}
