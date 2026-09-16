import { sb, makeSlug } from '../lib/supabase';

export default async function sitemap() {
  const baseUrl = 'https://alohamobile.rs';

  const [{ data: products }, { data: cats }, { data: subcats }] = await Promise.all([
    sb.from('products').select('id, name, created_at').eq('online', true).range(0, 4999),
    sb.from('categories').select('slug'),
    sb.from('subcategories').select('slug, categories(slug)'),
  ]);

  const productUrls = (products || []).map(p => ({
    url: `${baseUrl}/proizvod/${makeSlug(p.name, p.id)}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const catUrls = (cats || []).map(c => ({
    url: `${baseUrl}/kategorije/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const subcatUrls = (subcats || [])
    .filter(s => s.categories?.slug)
    .map(s => ({
      url: `${baseUrl}/kategorije/${s.categories.slug}/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/pretraga`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
    { url: `${baseUrl}/saradnje`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ...catUrls,
    ...subcatUrls,
    ...productUrls,
  ];
}
