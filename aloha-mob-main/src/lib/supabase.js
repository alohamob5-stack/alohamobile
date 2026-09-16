import { createClient } from '@supabase/supabase-js';

// TODO: zameni ovo URL-om i anon/public ključem NOVOG, praznog Supabase projekta za Aloha Mob
// (Project Settings -> API u Supabase dashboard-u). Ovo NIKAD ne treba da bude ista baza kao gsmmaster.rs!
const SB_URL = 'https://REPLACE-ME.supabase.co';
const SB_KEY = 'REPLACE-ME-anon-public-key';

export const sb = createClient(SB_URL, SB_KEY);

export function makeSlug(name, id) {
  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[čć]/g, 'c').replace(/[šđ]/g, 's').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${id}`;
}