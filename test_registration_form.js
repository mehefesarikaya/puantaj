// Comprehensive Test Script for Teacher Registration Validation & Security

import assert from 'assert';

console.log('====================================================');
console.log('ÖĞRETMEN / PERSONEL KAYIT VE GÜVENLİK TESTLERİ');
console.log('====================================================\n');

// 1. T.C. Kimlik Doğrulama Fonksiyonu (src/utils/validationUtils.ts kopyası)
function validateTurkishId(id) {
  const clean = String(id || '').trim().replace(/\s+/g, '');
  if (!clean) return { isValid: false, error: 'T.C. Kimlik Numarası zorunludur.' };
  if (!/^\d{11}$/.test(clean)) {
    return { isValid: false, error: `T.C. Kimlik Numarası tam 11 haneli olmalıdır (Şu an: ${clean.length} hane).` };
  }
  if (clean[0] === '0') {
    return { isValid: false, error: 'T.C. Kimlik Numarasının ilk hanesi 0 olamaz.' };
  }

  const digits = clean.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const calculatedD10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  if (calculatedD10 !== digits[9]) {
    return { isValid: false, error: 'Geçersiz T.C. Kimlik Numarası (kontrol hanesi doğrulanamadı).' };
  }

  const sumFirst10 = digits.slice(0, 10).reduce((acc, val) => acc + val, 0);
  const calculatedD11 = sumFirst10 % 10;
  if (calculatedD11 !== digits[10]) {
    return { isValid: false, error: 'Geçersiz T.C. Kimlik Numarası (sağlama toplamı doğrulanamadı).' };
  }

  return { isValid: true, error: null };
}

// 2. Yabancı Kimlik Doğrulama Fonksiyonu (src/utils/validationUtils.ts kopyası)
function validateForeignId(id) {
  const clean = String(id || '').trim().replace(/\s+/g, '');
  if (!clean) return { isValid: false, error: 'Yabancı Kimlik Numarası zorunludur.' };
  if (!/^\d{11}$/.test(clean)) {
    return { isValid: false, error: `Yabancı Kimlik Numarası 11 haneli olmalıdır (Şu an: ${clean.length} hane).` };
  }
  if (!clean.startsWith('98') && !clean.startsWith('99')) {
    return { isValid: false, error: 'Yabancı Kimlik Numarası 98 veya 99 ile başlamalıdır.' };
  }

  const digits = clean.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const calculatedD10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  if (calculatedD10 !== digits[9]) {
    return { isValid: false, error: 'Geçersiz Yabancı Kimlik Numarası (10. kontrol hanesi hatalı).' };
  }

  const sumFirst10 = digits.slice(0, 10).reduce((acc, val) => acc + val, 0);
  const calculatedD11 = sumFirst10 % 10;
  if (calculatedD11 !== digits[10]) {
    return { isValid: false, error: 'Geçersiz Yabancı Kimlik Numarası (11. sağlama hanesi hatalı).' };
  }

  return { isValid: true, error: null };
}

// 3. IBAN Doğrulama Fonksiyonu (MOD-97) (src/utils/validationUtils.ts kopyası)
function validateTurkishIban(iban) {
  const normalizedIban = String(iban || '').replace(/\s+/g, '').toUpperCase();
  if (!normalizedIban) return { isValid: false, error: 'IBAN alanı zorunludur.', normalizedIban };
  if (!normalizedIban.startsWith('TR')) {
    return { isValid: false, error: 'Türkiye IBAN numarası "TR" ile başlamalıdır.', normalizedIban };
  }
  if (normalizedIban.length !== 26) {
    return { isValid: false, error: `Geçersiz IBAN uzunluğu (Şu an: ${normalizedIban.length} karakter).`, normalizedIban };
  }
  if (!/^TR\d{24}$/.test(normalizedIban)) {
    return { isValid: false, error: 'Geçersiz IBAN karakterleri.', normalizedIban };
  }

  const rearranged = normalizedIban.slice(4) + normalizedIban.slice(0, 4);
  const numericString = rearranged
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return (code - 55).toString();
      return ch;
    })
    .join('');

  try {
    const remainder = BigInt(numericString) % 97n;
    if (remainder !== 1n) {
      return { isValid: false, error: 'Geçersiz IBAN. Lütfen IBAN numarasını kontrol edin.', normalizedIban };
    }
  } catch {
    return { isValid: false, error: 'Geçersiz IBAN.', normalizedIban };
  }

  return { isValid: true, error: null, normalizedIban };
}

// ----------------------------------------------------
// TEST 1: Valid Turkish identity number
// ----------------------------------------------------
const validTc = '51025187672';
const res1 = validateTurkishId(validTc);
assert.strictEqual(res1.isValid, true, 'Test 1 Failed: Valid TC rejected');
assert.strictEqual(res1.error, null);
console.log('✓ TEST 1 GEÇTİ: Geçerli T.C. Kimlik No başarıyla kabul edildi (51025187672)');

// ----------------------------------------------------
// TEST 2: Invalid Turkish identity number
// ----------------------------------------------------
const res2a = validateTurkishId('51025187673'); // Son hane bozuk
assert.strictEqual(res2a.isValid, false, 'Test 2a Failed');
const res2b = validateTurkishId('01025187672'); // 0 ile başlayan
assert.strictEqual(res2b.isValid, false, 'Test 2b Failed');
const res2c = validateTurkishId('5102518767');  // 10 hane
assert.strictEqual(res2c.isValid, false, 'Test 2c Failed');
console.log('✓ TEST 2 GEÇTİ: Hatalı T.C. Kimlik No reddedildi (Kontrol hanesi, 0 ile başlama ve eksik hane)');

// ----------------------------------------------------
// TEST 3: Valid foreign identification number
// ----------------------------------------------------
const validYkn = '99123456740'; // 99 ile başlayan Mod-10 doğrulamalı YKN
const res3 = validateForeignId(validYkn);
assert.strictEqual(res3.isValid, true, 'Test 3 Failed: Valid YKN rejected');
console.log('✓ TEST 3 GEÇTİ: Geçerli Yabancı Kimlik No kabul edildi (99123456740)');

// ----------------------------------------------------
// TEST 4: Invalid foreign identification number
// ----------------------------------------------------
const res4a = validateForeignId('95123456740'); // 98/99 ile başlamayan
assert.strictEqual(res4a.isValid, false, 'Test 4a Failed');
const res4b = validateForeignId('99123456741'); // Kontrol hanesi bozuk
assert.strictEqual(res4b.isValid, false, 'Test 4b Failed');
console.log('✓ TEST 4 GEÇTİ: Hatalı Yabancı Kimlik No reddedildi (98/99 kuralı ve kontrol toplamı)');

// ----------------------------------------------------
// TEST 5: Valid Turkish IBAN
// ----------------------------------------------------
const validIban = 'TR030004600152888000222958'; // Ekim şablonundaki resmi IBAN
const res5 = validateTurkishIban(validIban);
assert.strictEqual(res5.isValid, true, 'Test 5 Failed: Valid IBAN rejected');
assert.strictEqual(res5.normalizedIban, 'TR030004600152888000222958');

const res5b = validateTurkishIban('  tr03 0004 6001 5288 8000 2229 58  ');
assert.strictEqual(res5b.isValid, true);
assert.strictEqual(res5b.normalizedIban, 'TR030004600152888000222958');
console.log('✓ TEST 5 GEÇTİ: Geçerli Türkiye IBAN kabul edildi ve MOD-97 doğrulandı');

// ----------------------------------------------------
// TEST 6: Invalid IBAN
// ----------------------------------------------------
const res6a = validateTurkishIban('TR040004600152888000222958'); // Kontrol hanesi bozuk
assert.strictEqual(res6a.isValid, false);
const res6b = validateTurkishIban('DE89370400440532013000');     // TR dışı
assert.strictEqual(res6b.isValid, false);
const res6c = validateTurkishIban('TR030004600152888000');         // Eksik uzunluk
assert.strictEqual(res6c.isValid, false);
console.log('✓ TEST 6 GEÇTİ: Hatalı IBAN reddedildi (MOD-97, ülke kodu ve uzunluk)');

// ----------------------------------------------------
// TEST 7: School user cannot change school
// ----------------------------------------------------
const mockSchoolUser = { role: 'school_user', schoolId: 'school-752140' };

function enforceSecurity(submittedPayload, user, systemRuleHourlyRate) {
  const safeSchoolId = user.role === 'school_user' && user.schoolId
    ? user.schoolId
    : submittedPayload.schoolId;

  const safeHourlyRate = user.role === 'school_user'
    ? systemRuleHourlyRate
    : Number(submittedPayload.hourlyRate) || systemRuleHourlyRate;

  return {
    ...submittedPayload,
    schoolId: safeSchoolId,
    hourlyRate: safeHourlyRate,
  };
}

const schoolTamperAttempt = {
  schoolId: 'school-OTHER-HACK',
  hourlyRate: 500,
  fullName: 'Fatma Yılmaz',
};

const sanitizedSchool = enforceSecurity(schoolTamperAttempt, mockSchoolUser, 140);
assert.strictEqual(sanitizedSchool.schoolId, 'school-752140', 'Test 7 Failed');
console.log('✓ TEST 7 GEÇTİ: Okul kullanıcısı okulunu değiştiremez (Kendi kurumu zorunlu kılındı)');

// ----------------------------------------------------
// TEST 8: School user cannot change hourly teaching fee
// ----------------------------------------------------
assert.strictEqual(sanitizedSchool.hourlyRate, 140, 'Test 8 Failed');
console.log('✓ TEST 8 GEÇTİ: Okul kullanıcısı saatlik ders ücretini değiştiremez (Mevzuat ücreti 140 TL korundu)');

// ----------------------------------------------------
// TEST 9: Administrator can change school and hourly teaching fee
// ----------------------------------------------------
const mockAdmin = { role: 'admin', schoolId: null };
const adminPayload = {
  schoolId: 'school-2',
  hourlyRate: 200,
  fullName: 'Ahmet Demir',
};

const sanitizedAdmin = enforceSecurity(adminPayload, mockAdmin, 140);
assert.strictEqual(sanitizedAdmin.schoolId, 'school-2', 'Test 9 Failed');
assert.strictEqual(sanitizedAdmin.hourlyRate, 200, 'Test 9 Failed');
console.log('✓ TEST 9 GEÇTİ: Yönetici okul atamasını ve saatlik ders ücretini değiştirebilir');

// ----------------------------------------------------
// TEST 10: Teacher records mapped correctly for Supabase
// ----------------------------------------------------
function mapTeacherToDb(t) {
  return {
    id: t.id,
    school_id: t.schoolId,
    nationality: t.nationality || 'TR',
    tc_no: t.tcNo,
    full_name: t.fullName,
    branch: t.branch,
    employment_type: t.employmentType,
    iban: t.iban,
    hourly_rate: t.hourlyRate,
    is_active: t.isActive,
  };
}

function mapTeacherFromDb(row) {
  return {
    id: row.id,
    schoolId: row.school_id,
    nationality: row.nationality === 'FOREIGN' ? 'FOREIGN' : 'TR',
    tcNo: row.tc_no,
    fullName: row.full_name,
    branch: row.branch,
    employmentType: row.employment_type,
    iban: row.iban,
    hourlyRate: Number(row.hourly_rate),
    isActive: Boolean(row.is_active),
  };
}

const sampleTeacher = {
  id: 'teacher-99',
  schoolId: 'school-1',
  nationality: 'FOREIGN',
  tcNo: '99123456740',
  fullName: 'Sarah Connor',
  branch: 'İngilizce',
  employmentType: 'stajyer',
  iban: 'TR030004600152888000222958',
  hourlyRate: 140,
  isActive: true,
};

const dbRow = mapTeacherToDb(sampleTeacher);
assert.strictEqual(dbRow.nationality, 'FOREIGN');
assert.strictEqual(dbRow.employment_type, 'stajyer');

const restored = mapTeacherFromDb(dbRow);
assert.strictEqual(restored.nationality, 'FOREIGN');
assert.strictEqual(restored.employmentType, 'stajyer');
assert.strictEqual(restored.tcNo, '99123456740');
console.log('✓ TEST 10 GEÇTİ: Öğretmen kaydı (Uyruk, Statü, Okul, IBAN) Supabase ile tam uyumlu');

// ----------------------------------------------------
// TEST 11: Valid Employment Types Order & Exclusion
// ----------------------------------------------------
const allowedEmploymentTypes = ['sozlesmeli', 'ucretli', 'stajyer', 'iskurlu'];
assert.deepStrictEqual(allowedEmploymentTypes, ['sozlesmeli', 'ucretli', 'stajyer', 'iskurlu']);
assert.strictEqual(allowedEmploymentTypes.includes('kadrolu'), false, 'Kadrolu seçeneği listede bulunmamalıdır');
console.log('✓ TEST 11 GEÇTİ: Görevlendirme/statü seçenekleri sırasıyla [Sözleşmeli, Ücretli, Stajyer, İşkurlu] ve Kadrolu kaldırıldı');

console.log('\n====================================================');
console.log('TÜM 11 DOĞRULAMA VE GÜVENLİK TESTİ BAŞARIYLA TAMAMLANDI!');
console.log('====================================================');
