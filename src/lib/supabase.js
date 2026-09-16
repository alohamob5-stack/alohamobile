import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://yzvoenrejqzxgbpkwkvk.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dm9lbnJlanF6eGdicGt3a3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Mzg3NjcsImV4cCI6MjEwNTExNDc2N30.6obmS_puzgd9szDWJdxj-5ZBKQTKFVDkN3na9pYZrDg';

export const sb = createClient(SB_URL, SB_KEY);

export function makeSlug(name, id) {
  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[čć]/g, 'c').replace(/[šđ]/g, 's').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${id}`;
}