import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://ozrbinmqhtbpqoehotjc.supabase.co';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl).trim();
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '').trim();

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY. Supabase requests will fail until the GitHub Pages secret is configured.');
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'missing-supabase-public-key');
