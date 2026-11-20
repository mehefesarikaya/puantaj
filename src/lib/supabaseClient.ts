import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase (Anon Key is safe for public client usage)
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabaseAnonKey = typeof rawKey === 'string' ? rawKey.trim() : '';

// Verify if valid URL and Key are provided (not empty and not default placeholders)
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const isHttpUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
  const isPlaceholderUrl =
    supabaseUrl.includes('your-project') ||
    supabaseUrl.includes('xyz.supabase.co') ||
    supabaseUrl.includes('placeholder');

  const isMinLength = supabaseAnonKey.length > 20;
  const isPlaceholderKey =
    supabaseAnonKey.includes('your-anon-key') ||
    supabaseAnonKey.includes('placeholder');

  return isHttpUrl && !isPlaceholderUrl && isMinLength && !isPlaceholderKey;
};

// Create client instance safely only if valid configuration exists
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Health check helper to test if Supabase backend is reachable
 */
export const checkSupabaseHealth = async (): Promise<{
  ok: boolean;
  message: string;
}> => {
  if (!supabase) {
    return {
      ok: false,
      message: 'Supabase URL veya Anon Key ayarlanmamış (.env dosyasını kontrol ediniz).',
    };
  }

  try {
    const { error } = await supabase
      .from('meb_payment_rules')
      .select('id')
      .limit(1);

    if (error) {
      return {
        ok: false,
        message: `Supabase bağlantı hatası: ${error.message}`,
      };
    }

    return {
      ok: true,
      message: 'Supabase veritabanına başarıyla bağlanıldı.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen bağlantı hatası';
    return { ok: false, message };
  }
};
