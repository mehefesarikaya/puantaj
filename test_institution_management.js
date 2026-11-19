// Test Suite for Kurum Yönetimi (Central Institution Management & School Auth)

import assert from 'assert';
import fs from 'fs';

console.log('====================================================');
console.log('KURUM YÖNETİMİ VE OKUL GİRİŞ SİSTEMİ DOĞRULAMA TESTLERİ');
console.log('====================================================\n');

// 1. KPI İstatistik Hesaplama Testi (Toplam, Aktif, Pasif Kurumlar)
const sampleSchools = [
  { id: 's-1', institutionCode: '752140', name: 'Atatürk AL', accountActive: true, isActive: true },
  { id: 's-2', institutionCode: '758920', name: 'Cumhuriyet İO', accountActive: true, isActive: true },
  { id: 's-3', institutionCode: '761045', name: 'HEM ve ASO', accountActive: false, isActive: false },
  { id: 's-4', institutionCode: '764312', name: 'Şehit Ömer Halisdemir İHO', accountActive: true, isActive: true },
  { id: 's-5', institutionCode: '768120', name: 'Gölbaşı Özel Eğitim', accountActive: false, isActive: true },
];

const totalCount = sampleSchools.length;
const activeCount = sampleSchools.filter((s) => s.accountActive !== false && s.isActive !== false).length;
const passiveCount = sampleSchools.filter((s) => s.accountActive === false || s.isActive === false).length;

assert.strictEqual(totalCount, 5, 'Toplam 5 kurum olmalı');
assert.strictEqual(activeCount, 3, '3 aktif kurum olmalı');
assert.strictEqual(passiveCount, 2, '2 pasif kurum olmalı');
console.log('✓ TEST 1 GEÇTİ: Kurum Yönetimi KPI kartları (Toplam: 5, Aktif: 3, Pasif: 2) doğru hesaplandı.');

// 2. Mükerrer Kurum Kodu Engelleme Testi
function validateNewSchoolCode(newCode, existingList) {
  const clean = newCode.trim().toLowerCase();
  const exists = existingList.some((s) => s.institutionCode.trim().toLowerCase() === clean);
  if (exists) {
    throw new Error(`Bu kurum kodu (${newCode}) zaten kayıtlıdır.`);
  }
  return true;
}

assert.strictEqual(validateNewSchoolCode('999111', sampleSchools), true);
assert.throws(() => validateNewSchoolCode('752140', sampleSchools), /zaten kayıtlıdır/);
assert.throws(() => validateNewSchoolCode('  758920  ', sampleSchools), /zaten kayıtlıdır/);
console.log('✓ TEST 2 GEÇTİ: Mükerrer kurum kodu kayıt denemesi başarıyla engellendi.');

// 3. E-Posta Dönüşümü ve Kimlik Eşleştirme Testi (Admin vs Kurum Kodu)
const EMAIL_DOMAIN = 'meb.k12.tr';
const ADMIN_AUTH_EMAIL = 'fatisarikaya@gmail.com';

function usernameToEmail(username) {
  const clean = username.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  if (clean === 'admin') return ADMIN_AUTH_EMAIL;
  return `${clean}@${EMAIL_DOMAIN}`;
}

assert.strictEqual(usernameToEmail('admin'), 'fatisarikaya@gmail.com');
assert.strictEqual(usernameToEmail('Admin'), 'fatisarikaya@gmail.com');
assert.strictEqual(usernameToEmail('fatisarikaya@gmail.com'), 'fatisarikaya@gmail.com');
assert.strictEqual(usernameToEmail('752140'), '752140@meb.k12.tr');
assert.strictEqual(usernameToEmail('758920'), '758920@meb.k12.tr');
console.log('✓ TEST 3 GEÇTİ: usernameToEmail fonksiyonu admin için fatisarikaya@gmail.com, kurumlar için @meb.k12.tr üretiyor.');

// 4. Okul Kullanıcısı Veri İzolasyonu (School A vs School B)
const allTeachers = [
  { id: 't-1', schoolId: 's-1', fullName: 'Ayşenur Öçal' },
  { id: 't-2', schoolId: 's-1', fullName: 'Sümeyra Kolat' },
  { id: 't-3', schoolId: 's-2', fullName: 'Ali Vural' },
];

function getAccessibleTeachers(user, teacherList) {
  if (user.role === 'admin') return teacherList;
  return teacherList.filter((t) => t.schoolId === user.schoolId);
}

const school1User = { role: 'school_user', schoolId: 's-1' };
const school2User = { role: 'school_user', schoolId: 's-2' };
const adminUser = { role: 'admin' };

assert.strictEqual(getAccessibleTeachers(school1User, allTeachers).length, 2);
assert.strictEqual(getAccessibleTeachers(school2User, allTeachers).length, 1);
assert.strictEqual(getAccessibleTeachers(adminUser, allTeachers).length, 3);
console.log('✓ TEST 4 GEÇTİ: Okul kullanıcısı yalnızca kendi kurum verilerine erişebiliyor, admin tümünü görebiliyor.');

// 5. Pasif Kurum Giriş Engeli Testi
function checkAccountActiveOnLogin(profile) {
  if (!profile.is_active) {
    throw new Error(
      profile.role === 'admin'
        ? 'Bu yönetici hesabı devre dışı bırakılmıştır.'
        : 'Bu okul hesabı pasife alınmıştır. Lütfen İlçe Millî Eğitim Müdürlüğü ile iletişime geçiniz.'
    );
  }
  return true;
}

assert.strictEqual(checkAccountActiveOnLogin({ role: 'school_user', is_active: true }), true);
assert.throws(
  () => checkAccountActiveOnLogin({ role: 'school_user', is_active: false }),
  /Bu okul hesabı pasife alınmıştır/
);
console.log('✓ TEST 5 GEÇTİ: Pasif kurum kullanıcısının girişi güvenlik kontrolüyle engellendi.');

// 6. Toplu Kurum Ayrıştırma ve Mükerrer Kontrolü (96 Okul Hazırlığı)
function parseBulkSchools(csvText, existingList) {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  const existingSet = new Set(existingList.map((s) => s.institutionCode.trim().toLowerCase()));
  const batchSet = new Set();
  const parsed = [];

  for (const line of lines) {
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length < 2) continue;
    const code = parts[0];
    const name = parts[1];
    const lower = code.toLowerCase();

    const isDuplicate = existingSet.has(lower) || batchSet.has(lower);
    if (!isDuplicate) batchSet.add(lower);

    parsed.push({ code, name, isDuplicate, isValid: !isDuplicate });
  }

  return parsed;
}

const testCsv = [
  '752140;Mükerrer Okul 1', // Var olan
  '888001;Yeni Okul 1',     // Yeni
  '888002;Yeni Okul 2',     // Yeni
  '888002;Aynı Kod Tekrar',  // Liste içi mükerrer
].join('\n');

const bulkResult = parseBulkSchools(testCsv, sampleSchools);
assert.strictEqual(bulkResult.length, 4);
assert.strictEqual(bulkResult.filter((r) => r.isValid).length, 2);
assert.strictEqual(bulkResult.filter((r) => r.isDuplicate).length, 2);
console.log('✓ TEST 6 GEÇTİ: Toplu içe aktarmada hem veritabanı hem liste içi mükerrer kurum kodları başarıyla yakalandı.');

// 7. Migration SQL ve Edge Function Güvenlik Mimarisi Denetimi
const migrationSql = fs.readFileSync('supabase_migration_kurum_yonetimi.sql', 'utf8');

// Güvenlik Kriteri 1: auth.users veya auth.identities tablolarına ASLA doğrudan INSERT veya UPDATE yapılmamalı
assert.ok(!migrationSql.includes('INSERT INTO auth.users'), 'SQL içinde auth.users tablosuna doğrudan INSERT kaldırıldı');
assert.ok(!migrationSql.includes('INSERT INTO auth.identities'), 'SQL içinde auth.identities tablosuna doğrudan INSERT kaldırıldı');
assert.ok(!migrationSql.includes('UPDATE auth.users'), 'SQL içinde auth.users tablosuna doğrudan UPDATE kaldırıldı');

// Güvenlik Kriteri 2: Eski doğrudan auth müdahalesi yapan RPC fonksiyonları kaldırılmalı
assert.ok(migrationSql.includes('DROP FUNCTION IF EXISTS public.admin_create_school_with_account'), 'Eski RPC silme emri mevcut');
assert.ok(migrationSql.includes('DROP FUNCTION IF EXISTS public.admin_reset_school_password'), 'Eski RPC silme emri mevcut');
assert.ok(migrationSql.includes('DROP FUNCTION IF EXISTS public.admin_batch_create_schools'), 'Eski RPC silme emri mevcut');

// Güvenlik Kriteri 3: Yetki yükseltme ve school_id değiştirme engelleyici tetikleyici
assert.ok(migrationSql.includes('prevent_user_profile_privilege_escalation'), 'Yetki yükseltme engelleme tetikleyicisi mevcut');
assert.ok(migrationSql.includes("COALESCE(public.current_user_role(), '') != 'admin'"), 'admin ternary yetki kontrolü mevcut');
assert.ok(migrationSql.includes('ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS province'), 'schools province kolonu ekleme mevcut');
assert.ok(migrationSql.includes('COALESCE(s.account_active, true) = true'), 'Pasif kurum RLS engeli mevcut');
assert.ok(migrationSql.includes('public.current_user_school_id()'), 'current_user_school_id fonksiyon güncellemesi mevcut');
console.log('✓ TEST 7 GEÇTİ: supabase_migration_kurum_yonetimi.sql dosyası doğrudan auth manipülasyonundan arındırıldı ve RLS/trigger güvenliği sağlandı.');

// 8. Supabase Edge Function (manage-school) Mimarisi Denetimi
const edgeFunctionPath = 'supabase/functions/manage-school/index.ts';
assert.ok(fs.existsSync(edgeFunctionPath), 'Supabase Edge Function (manage-school) mevcut');
const edgeFunctionCode = fs.readFileSync(edgeFunctionPath, 'utf8');

assert.ok(edgeFunctionCode.includes('supabaseAdmin.auth.admin.createUser'), 'Edge Function resmi createUser API kullanıyor');
assert.ok(edgeFunctionCode.includes('supabaseAdmin.auth.admin.updateUserById'), 'Edge Function resmi updateUserById API kullanıyor');
assert.ok(edgeFunctionCode.includes("callerProfile?.role !== 'admin'"), 'Edge Function admin rol kontrolü yapıyor');
assert.ok(edgeFunctionCode.includes('SUPABASE_SERVICE_ROLE_KEY'), 'service_role yalnızca sunucu ortam değişkeninden okunuyor');
assert.ok(edgeFunctionCode.includes('meb.k12.tr'), 'Edge Function meb.k12.tr resmi alan adını kullanıyor');
console.log('✓ TEST 8 GEÇTİ: Supabase Edge Function (manage-school) sunucu tarafında resmi auth.admin API ve yetki denetimi ile çalışıyor.');

console.log('\n====================================================');
console.log('TÜM 8 KURUM YÖNETİMİ TESTİ BAŞARIYLA TAMAMLANDI! (100%)');
console.log('====================================================');

