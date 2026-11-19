// Supabase Edge Function: manage-school
// Güvenli, sunucu tarafı Kurum ve Okul Auth Hesabı Yönetimi.
// service_role anahtarı Deno sunucu ortamında güvenle kullanılır, ASLA istemciye sızmaz.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MEB resmi ve Supabase Auth tarafından geçerli/doğrulanan alan adı
const MEB_EMAIL_DOMAIN = 'meb.k12.tr';

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase ortam değişkenleri (URL / SERVICE_ROLE_KEY) eksik.');
    }

    // 1. İstek yapan kullanıcının JWT kimliğini doğrula
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Yetkilendirme başlığı (Authorization header) eksik.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: userError,
    } = await clientWithAuth.auth.getUser();

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz veya süresi dolmuş oturum anahtarı.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. İstek yapan kullanıcının 'admin' rolünü doğrula
    const { data: callerProfile, error: profileError } = await clientWithAuth
      .from('user_profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Yetkisiz işlem: Yalnızca yöneticiler (admin) bu servisi çağırabilir.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Admin yetkisi onaylandı. Sunucu tarafı admin istemcisini başlat
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // --- İŞLEM A: TEKİL YENİ KURUM VE AUTH HESABI OLUŞTURMA ---
    if (action === 'create_school') {
      const {
        institutionCode,
        name,
        district,
        schoolType,
        generalDirectorate,
        initialPassword,
        province = 'Ankara',
        principalName = '',
        contactPhone = '',
        contactEmail = '',
      } = body;

      const cleanCode = String(institutionCode).trim();
      const cleanPass = String(initialPassword || '').trim();

      if (!cleanPass || cleanPass.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Kurum şifresi zorunludur ve en az 6 karakter olmalıdır.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const email = `${cleanCode}@${MEB_EMAIL_DOMAIN}`;
      let targetSchoolId = `school-${cleanCode}`;

      // 1. Mükerrer kontrolü
      const { data: existingSchool } = await supabaseAdmin
        .from('schools')
        .select('id, name')
        .eq('institution_code', cleanCode)
        .maybeSingle();

      if (existingSchool) {
        // Okul schools tablosunda kayıtlı, acaba Auth hesabı var mı?
        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('school_id', existingSchool.id)
          .maybeSingle();

        if (existingProfile) {
          return new Response(
            JSON.stringify({ error: `Bu kurum kodu (${cleanCode}) ve giriş hesabı zaten sistemde kayıtlıdır.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // schools tablosunda var ama Auth hesabı henüz yok, mevcut ID'yi bağla
        targetSchoolId = existingSchool.id;
      } else {
        // 2. Okulu public.schools tablosuna ekle
        const { error: schoolInsertError } = await supabaseAdmin.from('schools').insert({
          id: targetSchoolId,
          institution_code: cleanCode,
          name: name.trim(),
          province: province.trim(),
          district: district.trim(),
          school_type: schoolType.trim(),
          general_directorate: generalDirectorate,
          principal_name: principalName.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          username: cleanCode,
          account_active: true,
          is_active: true,
        });

        if (schoolInsertError) {
          throw new Error(`Okul tablosu kaydı başarısız: ${schoolInsertError.message}`);
        }
      }

      // 3. Supabase Auth kullanıcısını resmi admin API'si ile oluştur
      let createdAuthUserId: string | null = null;
      try {
        const { data: authCreated, error: authCreateError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: cleanPass,
            email_confirm: true,
            user_metadata: {
              username: cleanCode,
              role: 'school_user',
              school_id: targetSchoolId,
            },
          });

        if (authCreateError || !authCreated.user) {
          throw new Error(`Auth hesabı oluşturulamadı: ${authCreateError?.message}`);
        }

        createdAuthUserId = authCreated.user.id;

        // 4. public.user_profiles kaydını kontrol et ve bağla (Trigger ile çakışmayı önle)
        const { data: profileCheck } = await supabaseAdmin
          .from('user_profiles')
          .select('id, school_id')
          .eq('id', createdAuthUserId)
          .maybeSingle();

        if (!profileCheck) {
          const { error: profileInsertError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: createdAuthUserId,
              username: cleanCode,
              role: 'school_user',
              school_id: targetSchoolId,
              full_name: `${name.trim()} Yetkilisi`,
              email,
              is_active: true,
            });

          if (profileInsertError) {
            throw new Error(`Profil kaydı başarısız: ${profileInsertError.message}`);
          }
        } else if (profileCheck.school_id !== targetSchoolId) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ school_id: targetSchoolId, username: cleanCode, role: 'school_user' })
            .eq('id', createdAuthUserId);
        }

        // 5. Audit Log Kaydet (Şifre ASLA loglanmaz)
        await supabaseAdmin.from('audit_logs').insert({
          id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          school_id: targetSchoolId,
          action: 'Yeni Kurum ve Hesap Açıldı',
          details: `Kurum: ${name} (${cleanCode}) sisteme eklendi ve Auth hesabı oluşturuldu.`,
          user_id: callerUser.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            schoolId: targetSchoolId,
            userId: createdAuthUserId,
            institutionCode: cleanCode,
            email,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (innerError: any) {
        // TELAFİ / ROLLBACK: Profil veya Auth başarısız olduysa oluşturulan okul kaydını ve auth kullanıcısını sil
        if (createdAuthUserId) {
          try {
            await supabaseAdmin.from('user_profiles').delete().eq('id', createdAuthUserId);
            await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          } catch (cleanupErr) {
            console.error('Kullanıcı rollback hatası:', cleanupErr);
          }
        }
        if (!existingSchool) {
          try {
            await supabaseAdmin.from('schools').delete().eq('id', targetSchoolId);
          } catch (cleanupErr) {
            console.error('Okul rollback hatası:', cleanupErr);
          }
        }
        throw innerError;
      }
    }

    // --- İŞLEM B: TOPLU KURUM VE AYRI ŞİFRELİ HESAP OLUŞTURMA (96 Okul İçin) ---
    if (action === 'batch_create_schools') {
      const { schools } = body;
      if (!Array.isArray(schools)) {
        return new Response(
          JSON.stringify({ error: 'schools dizisi bekleniyor.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let createdCount = 0;
      let skippedCount = 0;
      const errors: Array<{ code: string; reason: string }> = [];

      for (const item of schools) {
        const cleanCode = String(item.institutionCode || '').trim();
        const name = String(item.name || '').trim();
        const initialPassword = String(item.initialPassword || '').trim();
        const schoolId = `school-${cleanCode}`;
        const email = `${cleanCode}@${MEB_EMAIL_DOMAIN}`;

        if (!cleanCode || !name || !initialPassword) {
          skippedCount++;
          errors.push({ code: cleanCode, reason: 'Kurum kodu, adı veya şifresi eksik' });
          continue;
        }

        // Mükerrer kontrolü
        const { data: existing } = await supabaseAdmin
          .from('schools')
          .select('id')
          .eq('institution_code', cleanCode)
          .maybeSingle();

        if (existing) {
          skippedCount++;
          errors.push({ code: cleanCode, reason: 'Bu kurum kodu zaten kayıtlı (atlandı)' });
          continue;
        }

        // Tekil okul işlemi (Hata olursa izole et, diğer okulları durdurma)
        let createdUserId: string | null = null;
        try {
          // 1. Okulu ekle
          const { error: schoolError } = await supabaseAdmin.from('schools').insert({
            id: schoolId,
            institution_code: cleanCode,
            name,
            province: item.province || 'Ankara',
            district: item.district || 'Çankaya',
            school_type: item.schoolType || 'Okul',
            general_directorate: item.generalDirectorate || 'Temel Eğitim Genel Müdürlüğü',
            principal_name: item.principalName || '',
            contact_phone: item.contactPhone || '',
            contact_email: item.contactEmail || email,
            username: cleanCode,
            account_active: true,
            is_active: true,
          });

          if (schoolError) throw schoolError;

          // 2. Auth kullanıcısı oluştur
          const { data: authCreated, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password: initialPassword,
              email_confirm: true,
              user_metadata: {
                username: cleanCode,
                role: 'school_user',
                school_id: schoolId,
              },
            });

          if (authError || !authCreated.user) throw authError;
          createdUserId = authCreated.user.id;

          // 3. Profil bağla
          const { error: profileError } = await supabaseAdmin.from('user_profiles').upsert({
            id: createdUserId,
            username: cleanCode,
            role: 'school_user',
            school_id: schoolId,
            full_name: `${name} Yetkilisi`,
            email,
            is_active: true,
          });

          if (profileError) throw profileError;

          createdCount++;
        } catch (itemErr: any) {
          // Rollback tekil kurum
          if (createdUserId) {
            await supabaseAdmin.auth.admin.deleteUser(createdUserId);
          }
          await supabaseAdmin.from('schools').delete().eq('id', schoolId);
          errors.push({ code: cleanCode, reason: itemErr.message || 'Bilinmeyen hata' });
        }
      }

      // Toplu işlem tamamlandı
      await supabaseAdmin.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'Toplu Kurum İçe Aktarma',
        details: `Toplu aktarım: ${createdCount} kurum başarıyla oluşturuldu, ${skippedCount} atlandı/hata aldı.`,
        user_id: callerUser.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          total: schools.length,
          createdCount,
          skippedCount,
          errors,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- İŞLEM C: ŞİFRE SIFIRLAMA / HESAP BAĞLAMA ---
    if (action === 'reset_password') {
      const { schoolId, newPassword } = body;
      const cleanPass = String(newPassword || '').trim();

      if (!cleanPass || cleanPass.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Yeni şifre zorunludur ve en az 6 karakter olmalıdır.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, username')
        .eq('school_id', schoolId)
        .maybeSingle();

      // Eğer okulun henüz profili/auth hesabı yoksa, sıfırlama yerine otomatik oluştur
      if (!profile) {
        const { data: schoolRecord } = await supabaseAdmin
          .from('schools')
          .select('id, institution_code, name')
          .eq('id', schoolId)
          .single();

        if (!schoolRecord) {
          return new Response(
            JSON.stringify({ error: 'Kurum veritabanında bulunamadı.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const cleanCode = schoolRecord.institution_code.trim();
        const email = `${cleanCode}@${MEB_EMAIL_DOMAIN}`;

        const { data: authCreated, error: createAuthError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: cleanPass,
            email_confirm: true,
            user_metadata: {
              username: cleanCode,
              role: 'school_user',
              school_id: schoolRecord.id,
            },
          });

        if (createAuthError || !authCreated.user) {
          throw new Error(`Auth hesabı oluşturulamadı: ${createAuthError?.message}`);
        }

        await supabaseAdmin.from('user_profiles').upsert({
          id: authCreated.user.id,
          username: cleanCode,
          role: 'school_user',
          school_id: schoolRecord.id,
          full_name: `${schoolRecord.name} Yetkilisi`,
          email,
          is_active: true,
        });

        await supabaseAdmin.from('audit_logs').insert({
          id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          school_id: schoolId,
          action: 'Okul Hesabı Açıldı ve Şifre Belirlendi',
          details: `${schoolRecord.name} (${cleanCode}) için Auth hesabı oluşturuldu ve ilk şifre atandı.`,
          user_id: callerUser.id,
        });

        return new Response(
          JSON.stringify({ success: true, schoolId, message: 'Hesap başarıyla oluşturuldu ve şifre atandı.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Profil mevcut ise Auth şifresini güncelle
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        { password: cleanPass }
      );

      if (updateAuthError) {
        throw new Error(`Şifre güncellenemedi: ${updateAuthError.message}`);
      }

      await supabaseAdmin.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        school_id: schoolId,
        action: 'Okul Şifresi Sıfırlandı',
        details: `${profile.full_name} (${profile.username}) okulunun giriş şifresi güncellendi.`,
        user_id: callerUser.id,
      });

      return new Response(
        JSON.stringify({ success: true, schoolId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- İŞLEM D: HESAP AKTİF/PASİF YAPMA ---
    if (action === 'toggle_active') {
      const { schoolId, isActive } = body;

      await supabaseAdmin
        .from('schools')
        .update({ account_active: isActive, is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', schoolId);

      await supabaseAdmin
        .from('user_profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('school_id', schoolId);

      return new Response(
        JSON.stringify({ success: true, schoolId, isActive }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- İŞLEM E: MEVCUT PİLOT OKULLARIN EKSİK AUTH HESAPLARINI OLUŞTURMA ---
    if (action === 'setup_pilot_schools') {
      const { data: allSchools } = await supabaseAdmin.from('schools').select('*');
      const { data: allProfiles } = await supabaseAdmin.from('user_profiles').select('school_id');

      const existingSchoolIdsWithProfile = new Set((allProfiles || []).map((p) => p.school_id));
      const createdSchools: Array<{ code: string; name: string }> = [];

      for (const sch of allSchools || []) {
        if (!existingSchoolIdsWithProfile.has(sch.id)) {
          const cleanCode = sch.institution_code.trim();
          const email = `${cleanCode}@${MEB_EMAIL_DOMAIN}`;
          const defaultPassword = 'okul123';

          const { data: authCreated, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              username: cleanCode,
              role: 'school_user',
              school_id: sch.id,
            },
          });

          if (!createError && authCreated?.user) {
            await supabaseAdmin.from('user_profiles').upsert({
              id: authCreated.user.id,
              username: cleanCode,
              role: 'school_user',
              school_id: sch.id,
              full_name: `${sch.name} Yetkilisi`,
              email,
              is_active: true,
            });
            createdSchools.push({ code: cleanCode, name: sch.name });
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, count: createdSchools.length, createdSchools }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Bilinmeyen işlem: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Sunucu hatası oluştu.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
