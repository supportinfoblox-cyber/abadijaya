import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta.env as unknown) as Record<string, string | undefined>;
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// Graceful fallback: jika env vars tidak ada (Docker/GCP tanpa config),
// aplikasi tetap berjalan dengan mode offline (localStorage-only)
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    '[TicketOps] Supabase tidak dikonfigurasi — berjalan dalam mode offline (localStorage only). ' +
    'Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.local atau docker-compose.yml untuk mengaktifkan sinkronisasi cloud.'
  );
}

export { supabase };
