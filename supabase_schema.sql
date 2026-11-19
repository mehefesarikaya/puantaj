-- =====================================================================
-- MEB Ders Ücreti Karşılığında Görevlendirilenler Puantaj Yönetim Sistemi
-- Üretim Düzeyi Supabase & PostgreSQL Veritabanı ve Güvenlik Şeması (RLS + Auth)
-- =====================================================================

-- 1. Eklentiler
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLOLAR (Tables)
-- =====================================================================

-- 2. Okullar Tablosu (Schools)
CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY,                           -- UUID veya 'school-1' gibi mevcut benzersiz kimlik
    institution_code TEXT UNIQUE NOT NULL,         -- MEB Kurum Kodu (örn: 752140)
    name TEXT NOT NULL,                            -- Okul Adı
    district TEXT NOT NULL,                        -- İlçe
    school_type TEXT NOT NULL,                     -- Okul Türü (İlkokul, Lise vb.)
    principal_name TEXT,                           -- Müdür Adı
    contact_phone TEXT,
    contact_email TEXT,
    general_directorate TEXT CHECK (
      general_directorate IN (
        'Temel Eğitim Genel Müdürlüğü',
        'Ortaöğretim Genel Müdürlüğü',
        'Din Öğretimi Genel Müdürlüğü',
        'Özel Eğitim Genel Müdürlüğü',
        'Mesleki ve Teknik Eğitim Genel Müdürlüğü'
      )
    ),
    username TEXT UNIQUE,                          -- Okul girişi için kullanıcı adı
    account_active BOOLEAN DEFAULT true,           -- Okul hesabı açık/kapalı
    is_active BOOLEAN DEFAULT true,                -- Okul faal mi
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Kullanıcı Profilleri Tablosu (User Profiles - Supabase Auth ile Bağlantılı)
-- Şifreler ASLA bu tabloda tutulmaz; auth.users içerisinde bcrypt/Argon2 ile saklanır.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'school_user')),
    school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL, -- Admin için NULL, okul için okul ID
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Öğretmenler Tablosu (Teachers / Usta Öğreticiler)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    nationality TEXT NOT NULL DEFAULT 'TR' CHECK (nationality IN ('TR', 'FOREIGN')),
    tc_no TEXT NOT NULL,
    full_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    branch_category TEXT NOT NULL DEFAULT 'genel_bilgi_ve_brans' 
        CHECK (branch_category IN ('genel_bilgi_ve_brans', 'sinif', 'okul_oncesi', 'atolye_laboratuvar')),
    education_level TEXT NOT NULL DEFAULT 'lisans'
        CHECK (education_level IN ('lisans', 'yuksek_lisans', 'doktora')),
    employment_type TEXT NOT NULL DEFAULT 'sozlesmeli' 
        CHECK (employment_type IN ('sozlesmeli', 'ucretli', 'stajyer', 'iskurlu', 'kadrolu', 'stajer', 'ucretli_ogretmen', 'usta_ogretici')),
    iban TEXT NOT NULL,
    explanation TEXT,                              -- USTAÖĞRETİCİ vb.
    has_guard_duty BOOLEAN DEFAULT false,          -- Nöbet Görevi (Haftada 3 saat ek ders)
    guard_duty_day INT CHECK (guard_duty_day BETWEEN 1 AND 7), -- Nöbet Günü (1: Pazartesi ... 7: Pazar)
    has_class_guidance BOOLEAN DEFAULT false,      -- Sınıf Rehberliği ve Sosyal Etkinlik (Haftada 2 saat ek ders)
    start_date TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    departure_date TEXT,                           -- Ayrılış Tarihi
    has_other_employer BOOLEAN DEFAULT false,      -- Başkaca bir işverende çalışıyor mu?
    other_employer_tax_base NUMERIC(12, 2) DEFAULT 0, -- Başkaca işverende çalışıyorsa aylık vergi matrahı
    hourly_rate NUMERIC(10, 2) DEFAULT 220.57,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_school_teacher_tc UNIQUE (school_id, tc_no)
);

-- Var olan tablolar için güvenli kolon göçü
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS general_directorate TEXT CHECK (
  general_directorate IN (
    'Temel Eğitim Genel Müdürlüğü',
    'Ortaöğretim Genel Müdürlüğü',
    'Din Öğretimi Genel Müdürlüğü',
    'Özel Eğitim Genel Müdürlüğü',
    'Mesleki ve Teknik Eğitim Genel Müdürlüğü'
  )
);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS nationality TEXT NOT NULL DEFAULT 'TR';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS branch_category TEXT NOT NULL DEFAULT 'genel_bilgi_ve_brans';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS education_level TEXT NOT NULL DEFAULT 'lisans';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS has_guard_duty BOOLEAN DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS guard_duty_day INT CHECK (guard_duty_day BETWEEN 1 AND 7);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS has_class_guidance BOOLEAN DEFAULT false;

-- 4.1. Haftalık Ders Programı Tablosu (Teacher Weekly Schedules)
CREATE TABLE IF NOT EXISTS public.teacher_weekly_schedules (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    effective_start_date TEXT NOT NULL,
    effective_end_date TEXT,
    lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_weekly_hours INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2. Yönetici Tarafından Yönetilen Branşlar Tablosu (Branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('genel_bilgi_ve_brans', 'sinif', 'okul_oncesi', 'atolye_laboratuvar')),
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3. Ek Ders Ücret ve Hesaplama Kuralları Tablosu (Payment Calculation Rules)
CREATE TABLE IF NOT EXISTS public.payment_calculation_rules (
    id TEXT PRIMARY KEY,
    effective_date TEXT NOT NULL,
    gunduz_hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 220.57,
    gece_haftasonu_hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 236.33,
    yuksek_lisans_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 7.00,
    doktora_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    ozel_egitim_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
    dyk_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    nobet_hours_per_week INT NOT NULL DEFAULT 3,
    sinif_rehberlik_hours_per_week INT NOT NULL DEFAULT 2,
    income_tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1500,
    stamp_tax_rate NUMERIC(6, 5) NOT NULL DEFAULT 0.00759,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Okul Aylık Puantaj Gönderim ve Onay Durumu Tablosu (Monthly Submissions)
CREATE TABLE IF NOT EXISTS public.school_monthly_submissions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    status TEXT NOT NULL DEFAULT 'taslak' 
        CHECK (status IN ('taslak', 'gonderildi', 'incelemede', 'onaylandi', 'duzeltme_istendi', 'reddedildi')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    correction_requested_at TIMESTAMPTZ,
    correction_notes TEXT,
    rejection_reason TEXT,
    notes TEXT,
    total_teachers_count INT DEFAULT 0,
    total_lesson_hours NUMERIC(10, 2) DEFAULT 0,
    total_payable_amount NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_school_year_month UNIQUE (school_id, year, month)
);

-- 6. Öğretmen Aylık Günlük Ders Saatleri Tablosu (Monthly Puantaj Rows)
CREATE TABLE IF NOT EXISTS public.teacher_monthly_puantaj (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    daily_hours JSONB NOT NULL DEFAULT '{}'::jsonb, -- Günlük saatler: {"1": 6, "2": 0, "3": 6, ...}
    daily_statuses JSONB NOT NULL DEFAULT '{}'::jsonb, -- Günlük hücre durumları: {"1": "planned", "2": "confirmed", ...}
    total_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    bonus_five_to_one_hours NUMERIC(8, 2) NOT NULL DEFAULT 0, -- 5'e 1 İlavesi (floor(total/5))
    payable_total_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    estimated_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_teacher_puantaj_period UNIQUE (teacher_id, year, month)
);

ALTER TABLE public.teacher_monthly_puantaj ADD COLUMN IF NOT EXISTS daily_statuses JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.teacher_monthly_puantaj ADD COLUMN IF NOT EXISTS duty_daily_hours JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.teacher_monthly_puantaj ADD COLUMN IF NOT EXISTS duty_daily_statuses JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.teacher_monthly_puantaj ADD COLUMN IF NOT EXISTS duty_total_hours NUMERIC(8, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.teacher_monthly_puantaj ADD COLUMN IF NOT EXISTS duty_estimated_payment NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 7. Mevzuat ve Ödeme Parametreleri (MEB Payment Rules)
CREATE TABLE IF NOT EXISTS public.meb_payment_rules (
    id TEXT PRIMARY KEY DEFAULT 'default_rules',
    ucretli_hourly_rate NUMERIC(10, 2) DEFAULT 140.00,
    bonus_five_to_one BOOLEAN DEFAULT true,
    income_tax_rate NUMERIC(6, 4) DEFAULT 0.1500,
    stamp_tax_rate NUMERIC(8, 6) DEFAULT 0.007590,
    sgk_employer_share_rate NUMERIC(6, 4) DEFAULT 0.2050,
    sgk_employee_share_rate NUMERIC(6, 4) DEFAULT 0.1400,
    unemployment_employee_rate NUMERIC(6, 4) DEFAULT 0.0100,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Denetim İzi Kayıtları Tablosu (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT NOT NULL,
    school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- RLS GÜVENLİK YARDIMCI FONKSİYONLARI (Security Definer Helpers)
-- =====================================================================

-- Oturum açmış kullanıcının rolünü ('admin' veya 'school_user') döndürür
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Oturum açmış kullanıcının bağlı olduğu okul ID'sini döndürür
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT school_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Kullanıcı adına göre e-posta adresini sorgulayan güvenli yardımcı fonksiyon (Giriş için)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email 
  FROM public.user_profiles 
  WHERE LOWER(username) = LOWER(TRIM(p_username)) 
    AND is_active = true 
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

-- Anonim kullanıcı adı taraması ve hesap keşif saldırılarını (account enumeration) engellemek için yetki sınırlandırması
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- =====================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_monthly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_monthly_puantaj ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meb_payment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1) user_profiles RLS Politikaları
-- SADECE SELECT: Her kullanıcı yalnızca kendi profil kaydını okuyabilir.
-- Doğrudan `id = auth.uid()` kullanıldığı için hiçbir fonksiyon çağrılmaz; %0 recursion riski.
-- INSERT / UPDATE / DELETE için hiçbir politika tanımlanmamıştır.
-- PostgreSQL RLS varsayılanı gereği istemci üzerinden profil değiştirme (yetki yükseltme - privilege escalation) tamamen engellenir.
CREATE POLICY "user_view_own_profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

-- 2) schools RLS Politikaları
CREATE POLICY "admin_all_schools" ON public.schools
    FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "school_view_own_school" ON public.schools
    FOR SELECT USING (id = public.current_user_school_id());

-- 3) teachers RLS Politikaları
CREATE POLICY "admin_all_teachers" ON public.teachers
    FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "school_view_own_teachers" ON public.teachers
    FOR SELECT USING (school_id = public.current_user_school_id());

CREATE POLICY "school_insert_own_teachers" ON public.teachers
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    );

CREATE POLICY "school_update_own_teachers" ON public.teachers
    FOR UPDATE USING (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    ) WITH CHECK (school_id = public.current_user_school_id());

CREATE POLICY "school_delete_own_teachers" ON public.teachers
    FOR DELETE USING (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    );

-- 4) school_monthly_submissions RLS Politikaları
CREATE POLICY "admin_all_submissions" ON public.school_monthly_submissions
    FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "school_view_own_submissions" ON public.school_monthly_submissions
    FOR SELECT USING (school_id = public.current_user_school_id());

CREATE POLICY "school_insert_own_submissions" ON public.school_monthly_submissions
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    );

CREATE POLICY "school_update_own_submissions" ON public.school_monthly_submissions
    FOR UPDATE USING (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
        -- Onaylanan aylar okul personeli tarafından değiştirilemez
        AND status != 'onaylandi'
    ) WITH CHECK (
        school_id = public.current_user_school_id()
        AND status != 'onaylandi'
    );

-- 5) teacher_monthly_puantaj RLS Politikaları
CREATE POLICY "admin_all_puantaj" ON public.teacher_monthly_puantaj
    FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "school_view_own_puantaj" ON public.teacher_monthly_puantaj
    FOR SELECT USING (school_id = public.current_user_school_id());

CREATE POLICY "school_insert_own_puantaj" ON public.teacher_monthly_puantaj
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
        -- Eğer ilgili ay onaylandıysa yeni puantaj satırı eklenemez
        AND NOT EXISTS (
            SELECT 1 FROM public.school_monthly_submissions s 
            WHERE s.school_id = teacher_monthly_puantaj.school_id 
              AND s.year = teacher_monthly_puantaj.year 
              AND s.month = teacher_monthly_puantaj.month 
              AND s.status = 'onaylandi'
        )
    );

CREATE POLICY "school_update_own_puantaj" ON public.teacher_monthly_puantaj
    FOR UPDATE USING (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
        -- Eğer ilgili ay onaylandıysa mevcut puantaj güncellenemez (Kilit Kuralı)
        AND NOT EXISTS (
            SELECT 1 FROM public.school_monthly_submissions s 
            WHERE s.school_id = teacher_monthly_puantaj.school_id 
              AND s.year = teacher_monthly_puantaj.year 
              AND s.month = teacher_monthly_puantaj.month 
              AND s.status = 'onaylandi'
        )
    ) WITH CHECK (
        school_id = public.current_user_school_id()
        AND NOT EXISTS (
            SELECT 1 FROM public.school_monthly_submissions s 
            WHERE s.school_id = teacher_monthly_puantaj.school_id 
              AND s.year = teacher_monthly_puantaj.year 
              AND s.month = teacher_monthly_puantaj.month 
              AND s.status = 'onaylandi'
        )
    );

-- 6) meb_payment_rules RLS Politikaları
CREATE POLICY "authenticated_view_rules" ON public.meb_payment_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_modify_rules" ON public.meb_payment_rules
    FOR ALL USING (public.current_user_role() = 'admin');

-- 7) audit_logs RLS Politikaları
CREATE POLICY "admin_view_all_logs" ON public.audit_logs
    FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "school_view_own_logs" ON public.audit_logs
    FOR SELECT USING (school_id = public.current_user_school_id());

CREATE POLICY "authenticated_insert_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8) teacher_weekly_schedules RLS Politikaları
ALTER TABLE public.teacher_weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_weekly_schedules" ON public.teacher_weekly_schedules
    FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "school_view_own_schedules" ON public.teacher_weekly_schedules
    FOR SELECT USING (school_id = public.current_user_school_id());

CREATE POLICY "school_insert_own_schedules" ON public.teacher_weekly_schedules
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    );

CREATE POLICY "school_update_own_schedules" ON public.teacher_weekly_schedules
    FOR UPDATE USING (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    ) WITH CHECK (
        school_id = public.current_user_school_id()
    );

CREATE POLICY "school_delete_own_schedules" ON public.teacher_weekly_schedules
    FOR DELETE USING (
        public.current_user_role() = 'school_user' 
        AND school_id = public.current_user_school_id()
    );

-- 9) branches RLS Politikaları
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_branches" ON public.branches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_modify_branches" ON public.branches
    FOR ALL USING (public.current_user_role() = 'admin');

-- 10) payment_calculation_rules RLS Politikaları
ALTER TABLE public.payment_calculation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_calc_rules" ON public.payment_calculation_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_modify_calc_rules" ON public.payment_calculation_rules
    FOR ALL USING (public.current_user_role() = 'admin');

-- 11) timesheet_periods (Aylık Puantaj Giriş Dönemleri ve Tarih Aralıkları)
CREATE TABLE IF NOT EXISTS public.timesheet_periods (
    id TEXT PRIMARY KEY,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'acik' CHECK (status IN ('acik', 'kapali')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_period_year_month UNIQUE (year, month)
);

ALTER TABLE public.timesheet_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_periods" ON public.timesheet_periods
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_modify_periods" ON public.timesheet_periods
    FOR ALL USING (public.current_user_role() = 'admin');

-- =====================================================================
-- BAŞLANGIÇ VERİLERİ (Seed Data)
-- =====================================================================

-- Varsayılan 2026 Temmuz-Aralık Ek Ders Katsayı Kuralları
INSERT INTO public.payment_calculation_rules (
    id, effective_date, gunduz_hourly_rate, gece_haftasonu_hourly_rate, 
    yuksek_lisans_bonus_percent, doktora_bonus_percent, ozel_egitim_bonus_percent, 
    dyk_bonus_percent, nobet_hours_per_week, sinif_rehberlik_hours_per_week, 
    income_tax_rate, stamp_tax_rate
) VALUES (
    'rules_2026_h2', '2026-07-01', 220.57, 236.33, 7.00, 20.00, 25.00, 100.00, 3, 2, 0.1500, 0.00759
) ON CONFLICT (id) DO NOTHING;

-- Varsayılan MEB Mevzuat Kuralları
INSERT INTO public.meb_payment_rules (
    id, ucretli_hourly_rate, bonus_five_to_one, income_tax_rate, 
    stamp_tax_rate, sgk_employer_share_rate, sgk_employee_share_rate, unemployment_employee_rate
) VALUES (
    'default_rules', 140.00, true, 0.1500, 0.007590, 0.2050, 0.1400, 0.0100
) ON CONFLICT (id) DO NOTHING;

-- Örnek Kurumlar (Seed Schools - Ankara 5 Pilot Kurumu)
INSERT INTO public.schools (
    id, institution_code, name, district, school_type, principal_name, 
    contact_phone, contact_email, username, account_active, is_active, general_directorate
) VALUES 
  ('school-1', '752140', 'Atatürk Anadolu Lisesi', 'Çankaya / Ankara', 'Anadolu Lisesi', 'Mustafa Yıldırım', '0312 419 2030', 'ataturkal@meb.k12.tr', '752140', true, true, 'Ortaöğretim Genel Müdürlüğü'),
  ('school-2', '758920', 'Cumhuriyet İlkokulu', 'Yenimahalle / Ankara', 'İlkokul', 'Zehra Demir', '0312 344 1122', 'cumhuriyetio@meb.k12.tr', '758920', true, true, 'Temel Eğitim Genel Müdürlüğü'),
  ('school-3', '761045', 'Halk Eğitimi Merkezi ve ASO', 'Keçiören / Ankara', 'Yaygın Eğitim / HEM', 'İbrahim Koç', '0312 381 5566', 'keciorenhem@meb.k12.tr', '761045', true, true, 'Mesleki ve Teknik Eğitim Genel Müdürlüğü'),
  ('school-4', '764312', 'Şehit Ömer Halisdemir İmam Hatip Ortaokulu', 'Etimesgut / Ankara', 'İmam Hatip Ortaokulu', 'Emine Aksoy', '0312 244 8899', 'omerhalisdemiriho@meb.k12.tr', '764312', true, true, 'Din Öğretimi Genel Müdürlüğü'),
  ('school-5', '768910', 'Gölbaşı Özel Eğitim Uygulama Okulu', 'Gölbaşı / Ankara', 'Özel Eğitim Uygulama Okulu', 'Hakan Çetin', '0312 484 1020', 'golbasiozel@meb.k12.tr', '768910', true, true, 'Özel Eğitim Genel Müdürlüğü')
ON CONFLICT (id) DO UPDATE SET
  institution_code = EXCLUDED.institution_code,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  school_type = EXCLUDED.school_type,
  principal_name = EXCLUDED.principal_name,
  contact_phone = EXCLUDED.contact_phone,
  contact_email = EXCLUDED.contact_email,
  username = EXCLUDED.username,
  account_active = EXCLUDED.account_active,
  is_active = EXCLUDED.is_active,
  general_directorate = EXCLUDED.general_directorate;
