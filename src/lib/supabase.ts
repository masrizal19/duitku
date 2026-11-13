import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const hasValidUrl =
  Boolean(supabaseUrl) &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('placeholder');

const hasValidKey =
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('your-anon-key') &&
  !supabaseAnonKey.includes('placeholder');

// Validasi apakah environment variable Supabase telah dikonfigurasi dengan benar
export const isSupabaseConfigured = hasValidUrl && hasValidKey;

export const supabaseConfigError: string | null = isSupabaseConfigured
  ? null
  : 'Konfigurasi Supabase tidak valid atau belum diisi. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah diatur di environment / GitHub Secrets.';

// Inisialisasi Supabase Client hanya jika konfigurasi valid (tanpa placeholder)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      supabaseConfigError ||
        'Supabase belum dikonfigurasi. Tidak dapat melakukan autentikasi atau akses database.'
    );
  }
  return supabase;
}

// Helper untuk menguji konektivitas langsung ke Supabase
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message:
        supabaseConfigError ||
        'Kredensial VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi.',
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
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
