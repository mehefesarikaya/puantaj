import { supabase } from '../lib/supabaseClient';
import { UserAccount, UserRole } from '../types';

/**
 * Standard MEB institutional email domain for Supabase Auth accounts
 * GoTrue requires valid MX/DNS records; official meb.k12.tr is accepted.
 */
const EMAIL_DOMAIN = 'meb.k12.tr';

/**
 * Primary administrator email configured in Supabase Auth
 */
export const ADMIN_AUTH_EMAIL = 'fatisarikaya@gmail.com';

export const usernameToEmail = (username: string): string => {
  const clean = username.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  if (clean === 'admin') return ADMIN_AUTH_EMAIL;
  return `${clean}@${EMAIL_DOMAIN}`;
};

export const supabaseAuthService = {
  /**
   * Log in securely using Supabase Auth
   */
  async signIn(username: string, password: string): Promise<UserAccount | null> {
    if (!supabase) return null;

    let targetEmail = usernameToEmail(username);

    // Call Supabase Auth signInWithPassword
    let authData: any = null;
    let authError: any = null;

    try {
      const res = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
      authData = res.data;
      authError = res.error;
    } catch (networkErr: any) {
      const msg = networkErr?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
        throw new Error(
          'Supabase sunucusuna bağlanılamadı (Failed to fetch). .env.local dosyasındaki VITE_SUPABASE_URL adresini ve internet bağlantınızı kontrol ediniz.'
        );
      }
      throw networkErr;
    }

    if (authError || !authData.user) {
      const rawError = authError?.message || '';
      const errorCode = (authError as any)?.code || (authError as any)?.status || 'AUTH_ERROR';
      console.warn(`[Supabase Auth Hatası] Hedef E-posta: ${targetEmail}, Kod: ${errorCode}, Mesaj: ${rawError}`);

      if (rawError.includes('Invalid login credentials')) {
        throw new Error(`Kullanıcı adı veya şifre hatalı. [Auth Kodu: ${errorCode}]`);
      }
      if (rawError.includes('Email not confirmed')) {
        throw new Error(
          `E-posta adresi henüz doğrulanmamış. Supabase Auth panelinden e-posta onayını yapınız. [Auth Kodu: ${errorCode}]`
        );
      }
      throw new Error(`${rawError} [Auth Kodu: ${errorCode}]`);
    }

    // Retrieve user profile with assigned role and schoolId
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Kullanıcı profil sorgu hatası:', profileError?.message || 'Profil bulunamadı');
      if (profileError?.code === '42P17' || profileError?.message?.includes('recursion')) {
        throw new Error(
          'Veritabanı RLS yetki hatası: user_profiles tablosunda döngüsel erişim (infinite recursion) hatası tespit edildi. SQL politikasını güncelleyiniz.'
        );
      }
      if (profileError?.code === 'PGRST116') {
        await supabase.auth.signOut();
        throw new Error(
          `Kimlik doğrulandı fakat bu okul hesabı için yetki profili henüz oluşturulmamış. Lütfen admin panelinden kurum şifresini güncelleyiniz veya veritabanı migrasyonunu çalıştırınız.`
        );
      }
      throw new Error(
        profileError?.message
          ? `Kullanıcı yetki profili okunamadı: ${profileError.message} [Kod: ${profileError.code || 'UNKNOWN'}]`
          : 'Kullanıcı yetki profili bulunamadı. Lütfen yöneticinizle iletişime geçiniz.'
      );
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      throw new Error(
        profile.role === 'admin'
          ? 'Bu yönetici hesabı devre dışı bırakılmıştır. Lütfen sistem yöneticisiyle iletişime geçiniz.'
          : 'Bu okul hesabı pasife alınmıştır. Lütfen İlçe Millî Eğitim Müdürlüğü ile iletişime geçiniz.'
      );
    }

    if (profile.role === 'school_user' && profile.school_id) {
      const { data: schoolRecord } = await supabase
        .from('schools')
        .select('account_active, is_active')
        .eq('id', profile.school_id)
        .maybeSingle();

      if (schoolRecord && (schoolRecord.account_active === false || schoolRecord.is_active === false)) {
        await supabase.auth.signOut();
        throw new Error('Bu okul hesabı pasife alınmıştır. Lütfen İlçe Millî Eğitim Müdürlüğü ile iletişime geçiniz.');
      }
    }

    return {
      id: profile.id,
      username: profile.username,
      passwordHash: 'PROTECTED_BY_SUPABASE_AUTH',
      role: profile.role as UserRole,
      schoolId: profile.school_id || undefined,
      fullName: profile.full_name,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      lastLoginAt: new Date().toISOString(),
    };
  },

  /**
   * Log out from Supabase Auth
   */
  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  /**
   * Check currently active Supabase Auth session
   */
  async getActiveSessionUser(): Promise<UserAccount | null> {
    if (!supabase) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_active) {
      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
      }
      return null;
    }

    if (profile.role === 'school_user' && profile.school_id) {
      const { data: schoolRecord } = await supabase
        .from('schools')
        .select('account_active, is_active')
        .eq('id', profile.school_id)
        .maybeSingle();

      if (schoolRecord && (schoolRecord.account_active === false || schoolRecord.is_active === false)) {
        await supabase.auth.signOut();
        return null;
      }
    }

    return {
      id: profile.id,
      username: profile.username,
      passwordHash: 'PROTECTED_BY_SUPABASE_AUTH',
      role: profile.role as UserRole,
      schoolId: profile.school_id || undefined,
      fullName: profile.full_name,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      lastLoginAt: new Date().toISOString(),
    };
  },
};

