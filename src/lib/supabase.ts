import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validasi apakah environment variable Supabase telah dikonfigurasi dengan benar
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Inisialisasi Supabase Client tunggal dengan penyimpanan sesi auth bawaan
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-duitku.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key-duitku',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Helper untuk menguji konektivitas langsung ke Supabase
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Kredensial VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi di file .env',
    };
  }

  try {
    // Ping sederhana ke endpoint API Supabase melalui query ringan
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // Jika error terkait permission/empty data, koneksi tetap terhubung
      if (error.code === 'PGRST116' || error.message.includes('permission denied') || error.code === '42501') {
        return { ok: true, message: 'Terhubung ke Supabase (RLS aktif)' };
      }
      return { ok: false, message: `Gagal query Supabase: ${error.message}` };
    }

    return { ok: true, message: 'Koneksi Supabase PostgreSQL aktif dan terhubung' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Koneksi ke Supabase gagal' };
  }
}
