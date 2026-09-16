// SAMO za koriscenje u API rutama (server-side)! Nikad ne uvoziti ovaj fajl u 'use client' komponente
// - service_role kljuc zaobilazi Row Level Security i ne sme nikad da dospe u browser.

import { createClient } from '@supabase/supabase-js';

// TODO: isti novi Aloha Mob Supabase URL kao u supabase.js
const SB_URL = 'https://REPLACE-ME.supabase.co';

export function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY nije podesen u environment varijablama (Vercel Settings -> Environment Variables)');
  }
  return createClient(SB_URL, key, { auth: { persistSession: false } });
}
