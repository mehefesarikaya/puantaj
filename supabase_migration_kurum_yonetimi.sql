-- =====================================================================
-- PUANTAJ SİSTEMİ - MERKEZİ KURUM YÖNETİMİ MİGRASYONU (GÜVENLİK STANDARDI V5)
--
-- Bu migrasyon dosyası:
-- 1. auth.users veya auth.identities tablolarına ASLA doğrudan INSERT/UPDATE YAPMAZ.
-- 2. schools tablosuna 'province' (İl) kolonunu ekler.
-- 3. Eski doğrudan auth RPC fonksiyonlarını tamamen kaldırır (DROP).
-- 4. Okul kullanıcılarının (school_user) kendi role veya school_id değerlerini
--    değiştirmesini engelleyen güvenli tetikleyiciyi kurar.
-- 5. Pasife alınan kurumların açık oturumlarını PostgreSQL RLS seviyesinde
--    engellemek için current_user_school_id fonksiyonunu günceller.
-- 6. Yalnızca YENİ Auth kullanıcısı oluştuğunda (AFTER INSERT) otomatik olarak
--    public.user_profiles kaydı açan ve schools.id ile bağlayan tetikleyiciyi kurar.
--    (UPDATE işlemlerinde asla tetiklenmez, yetki veya okul bağlantısını ezmez).
-- 7. Kullanıcı metadata'sından asla admin rolü türetmez; okul hesapları DAİMA school_user olur.
-- 8. Backfill sorgusu mevcut admin profilini ve mevcut okul bağlantılarını bozmaz.
-- 9. Mevcut pasif kurumları veya pasif profilleri kesinlikle otomatik aktifleştirmez.
-- 10. Mevcut 5 pilot okulu ve admin hesabını %100 korur.
-- =====================================================================

-- 1. schools tablosuna 'province' (İl) kolonunu ekle (varsa dokunmaz)
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'Ankara';

-- =====================================================================
-- 2. ESKİ DOĞRUDAN AUTH MÜDAHALESİ YAPAN RPC FONKSİYONLARINI KALDIR
-- =====================================================================
DROP FUNCTION IF EXISTS public.admin_create_school_with_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_school_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_batch_create_schools(JSONB);

-- =====================================================================
-- 3. YETKİ YÜKSELTME VE SCHOOL_ID MANİPÜLASYONUNU ENGELLEME TETİKLEYİCİSİ
-- =====================================================================
CREATE OR REPLACE FUNCTION public.prevent_user_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Service role (Edge Function) çağrılarında tetikleyici engeli koyma
    IF COALESCE(auth.role(), '') = 'service_role' OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL OR COALESCE(public.current_user_role(), '') != 'admin' THEN
        IF NEW.role != OLD.role OR NEW.school_id IS DISTINCT FROM OLD.school_id OR NEW.id != OLD.id THEN
            RAISE EXCEPTION 'Güvenlik İhlali: Kullanıcı yetki rolü veya kurum bağlantısı değiştirilemez.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_profile_privilege_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profile_privilege_escalation
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_user_profile_privilege_escalation();

-- =====================================================================
-- 4. PASİF KURUMLARIN MEVCUT OTURUMLARINI DA RLS DÜZEYİNDE ENGELLEME
-- =====================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.school_id 
  FROM public.user_profiles p
  JOIN public.schools s ON p.school_id = s.id
  WHERE p.id = auth.uid() 
    AND p.is_active = true 
    AND COALESCE(s.account_active, true) = true
    AND COALESCE(s.is_active, true) = true;
$$;

-- =====================================================================
-- 5. YALNIZCA YENİ KULLANICIDA ÇALIŞAN OTOMATİK PROFİL TETİKLEYİCİSİ
-- =====================================================================
-- Yalnızca AFTER INSERT çalışır.
-- UPDATE işlemlerinde çalışmaz; rolü, okulu veya aktiflik durumunu ezmez.
-- Metadata'dan asla admin rolü verilmez; okul hesapları daima 'school_user' olur.
-- Mevcut admin profiline dokunmaz.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_school_id TEXT;
  v_full_name TEXT;
  v_is_admin BOOLEAN;
  v_school_active BOOLEAN;
BEGIN
  -- 1. Profil zaten var mı kontrol et (Edge Function veya başka işlem tarafından önceden oluşturulmuşsa çakışmayı önle)
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- E-posta veya UID üzerinden mevcut admin kontrolü
  v_is_admin := (NEW.email = 'fatisarikaya@gmail.com' OR NEW.id = 'ab242f0d-8ec5-452e-835f-83210d628176'::uuid);

  IF v_is_admin THEN
    -- Admin profili: role daima 'admin', school_id NULL
    INSERT INTO public.user_profiles (id, username, role, school_id, full_name, email, is_active)
    VALUES (
      NEW.id,
      'admin',
      'admin',
      NULL,
      'Merkezi Sistem Yöneticisi',
      NEW.email,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Okul hesapları: Rol DAİMA 'school_user' (metadata'dan admin rolü türetilmez)
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    
    -- Okul ID'sini DOĞRUDAN schools tablosundaki institution_code üzerinden belirle (metadata'dan doğrulanmamış school_id alma)
    SELECT id, COALESCE(is_active, true) AND COALESCE(account_active, true)
    INTO v_school_id, v_school_active
    FROM public.schools 
    WHERE institution_code = v_username 
    LIMIT 1;

    -- Okul kaydı bulunamıyorsa hatalı veya school_id değeri NULL olan profil oluşturma
    IF v_school_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Okul adını al
    SELECT COALESCE(name || ' Yetkilisi', v_username || ' Yetkilisi') INTO v_full_name 
    FROM public.schools WHERE id = v_school_id LIMIT 1;
    IF v_full_name IS NULL THEN
      v_full_name := v_username || ' Yetkilisi';
    END IF;

    -- Eğer okul zaten pasifse, profil de pasif olarak açılır; pasif okul otomatik aktifleştirilmez
    INSERT INTO public.user_profiles (id, username, role, school_id, full_name, email, is_active)
    VALUES (
      NEW.id,
      v_username,
      'school_user', -- DAİMA school_user
      v_school_id,   -- Doğrulanmış schools.id
      v_full_name,
      NEW.email,
      COALESCE(v_school_active, true)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =====================================================================
-- 6. MEVCUT AUTH KULLANICILARINI user_profiles İLE EŞLEŞTİR (GÜVENLİ BACKFILL)
-- =====================================================================
-- Yalnızca user_profiles kaydı HİÇ OLMAYAN auth kullanıcıları için çalışır.
-- Mevcut admin profilini veya var olan okul profillerini (ve onların is_active durumunu) ASLA DEĞİŞTİRMEZ.
-- Okul hesabı bulunamazsa (s.id IS NULL) okul profili oluşturmaz (school_id NULL profil engellenir).
-- Pasif okulların hesaplarını otomatik aktifleştirmez.
-- =====================================================================

INSERT INTO public.user_profiles (id, username, role, school_id, full_name, email, is_active)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'fatisarikaya@gmail.com' OR u.id = 'ab242f0d-8ec5-452e-835f-83210d628176'::uuid THEN 'admin'
    ELSE COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
  END AS username,
  CASE 
    WHEN u.email = 'fatisarikaya@gmail.com' OR u.id = 'ab242f0d-8ec5-452e-835f-83210d628176'::uuid THEN 'admin'
    ELSE 'school_user' -- DAİMA school_user
  END AS role,
  CASE 
    WHEN u.email = 'fatisarikaya@gmail.com' OR u.id = 'ab242f0d-8ec5-452e-835f-83210d628176'::uuid THEN NULL
    ELSE s.id -- Gerçek schools.id üzerinden bağlanır
  END AS school_id,
  CASE 
    WHEN u.email = 'fatisarikaya@gmail.com' OR u.id = 'ab242f0d-8ec5-452e-835f-83210d628176'::uuid THEN 'Merkezi Sistem Yöneticisi'
    ELSE COALESCE(s.name || ' Yetkilisi', split_part(u.email, '@', 1) || ' Yetkilisi')
  END AS full_name,
  u.email,
  COALESCE(s.is_active, true) AND COALESCE(s.account_active, true) AS is_active
FROM auth.users u
LEFT JOIN public.schools s ON s.institution_code = COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
)
AND (
  u.email = 'fatisarikaya@gmail.com' 
  OR u.id = 'ab242f0d-8ec5-452e-835f-83210d628176'::uuid 
  OR s.id IS NOT NULL
);
