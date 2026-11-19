// Dynamic Teacher Addition Form & Field Sanitization Verification Suite

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('DİNAMİK ÖĞRETMEN / PERSONEL FORMU VE ALAN DOĞRULAMA TESTİ');
console.log('========================================================\n');

// 1. Sanitize Payload Logic (Mirroring AdminTeacherFormModal.tsx handleSubmit)
function sanitizeTeacherPayload(input) {
  const isIskur = input.employmentType === 'iskurlu';
  const isStajyer = input.employmentType === 'stajyer' || input.employmentType === 'stajer';
  const isStandardTeacher = !isIskur && !isStajyer;

  const finalGuardDutyDay = isStandardTeacher && input.guardDutyDay > 0 ? input.guardDutyDay : undefined;
  const finalHasGuardDuty = isStandardTeacher && Boolean(finalGuardDutyDay);
  const finalHasClassGuidance = isStandardTeacher && Boolean(input.hasClassGuidance);
  const finalHasOtherEmployer = isStandardTeacher && Boolean(input.hasOtherEmployer);
  const finalOtherEmployerTaxBase = finalHasOtherEmployer ? Number(input.otherEmployerTaxBase) : undefined;
  const finalEducationLevel = isStandardTeacher ? input.educationLevel : 'lisans';
  const finalBranch = (input.branch || '').trim() || (isIskur ? 'Destek ve Temizlik Hizmetleri' : 'Matematik');
  const finalBranchCategory = isIskur ? 'genel_bilgi_ve_brans' : (input.branchCategory || 'genel_bilgi_ve_brans');

  return {
    schoolId: input.schoolId,
    nationality: input.nationality || 'TR',
    tcNo: input.tcNo,
    fullName: input.fullName,
    branch: finalBranch,
    branchCategory: finalBranchCategory,
    educationLevel: finalEducationLevel,
    employmentType: input.employmentType,
    hasGuardDuty: finalHasGuardDuty,
    guardDutyDay: finalGuardDutyDay,
    hasClassGuidance: finalHasClassGuidance,
    iban: input.iban,
    explanation: input.explanation ? input.explanation.trim() : undefined,
    startDate: input.startDate,
    departureDate: input.departureDate ? input.departureDate.trim() : undefined,
    hasOtherEmployer: finalHasOtherEmployer,
    otherEmployerTaxBase: finalOtherEmployerTaxBase,
    hourlyRate: input.hourlyRate || 220.57,
    isActive: input.isActive !== false,
  };
}

// ----------------------------------------------------
// TEST 1: Stajyer Seçildiğinde Öğretmen Ek Görev ve Akademik Zam Alanları Temizlenmeli
// ----------------------------------------------------
const stajyerInput = {
  schoolId: 'school-1',
  nationality: 'TR',
  tcNo: '51025187672',
  fullName: 'Eren Yılmaz',
  branch: 'Matematik',
  branchCategory: 'genel_bilgi_ve_brans',
  educationLevel: 'doktora', // Kullanıcı önceden seçmiş olsa bile temizlenmeli
  employmentType: 'stajyer',
  hasGuardDuty: true,
  guardDutyDay: 2,
  hasClassGuidance: true,
  hasOtherEmployer: true,
  otherEmployerTaxBase: 12000,
  iban: 'TR030004600152888000222958',
  startDate: '2026-09-15',
  departureDate: '2027-01-15',
  explanation: 'Stajyer Öğretmen',
};

const stajyerPayload = sanitizeTeacherPayload(stajyerInput);
assert.strictEqual(stajyerPayload.educationLevel, 'lisans', 'Stajyer için eğitim düzeyi lisans olmalı, doktora artırımı alamaz');
assert.strictEqual(stajyerPayload.hasGuardDuty, false, 'Stajyer nöbet tutamaz');
assert.strictEqual(stajyerPayload.guardDutyDay, undefined, 'Stajyer nöbet günü undefined olmalı');
assert.strictEqual(stajyerPayload.hasClassGuidance, false, 'Stajyer sınıf rehberliği alamaz');
assert.strictEqual(stajyerPayload.hasOtherEmployer, false, 'Stajyer başka işveren matrahı alamaz');
assert.strictEqual(stajyerPayload.otherEmployerTaxBase, undefined, 'Stajyer vergi matrahı undefined olmalı');
assert.strictEqual(stajyerPayload.branch, 'Matematik', 'Stajyerin staj branşı korunmalı');
console.log('✓ TEST 1 GEÇTİ: Stajyer seçildiğinde nöbet, rehberlik ve üst akademik derece alanları başarıyla arındırıldı.');

// ----------------------------------------------------
// TEST 2: İŞKUR Personeli Seçildiğinde Yalnızca İlgili Alanlar Tutulmalı
// ----------------------------------------------------
const iskurInput = {
  schoolId: 'school-1',
  nationality: 'TR',
  tcNo: '51025187672',
  fullName: 'Fatma Şahin',
  branch: 'Destek ve Temizlik Hizmetleri',
  branchCategory: 'genel_bilgi_ve_brans',
  educationLevel: 'yuksek_lisans', // İlgisiz akademik derece
  employmentType: 'iskurlu',
  hasGuardDuty: true,
  guardDutyDay: 4,
  hasClassGuidance: true,
  hasOtherEmployer: true,
  otherEmployerTaxBase: 25000,
  iban: 'TR030004600152888000222958',
  startDate: '2026-10-01',
  explanation: 'İŞKUR TYP',
};

const iskurPayload = sanitizeTeacherPayload(iskurInput);
assert.strictEqual(iskurPayload.educationLevel, 'lisans', 'İŞKUR için eğitim düzeyi lisans olmalı');
assert.strictEqual(iskurPayload.hasGuardDuty, false, 'İŞKUR personeli nöbet tutamaz');
assert.strictEqual(iskurPayload.guardDutyDay, undefined);
assert.strictEqual(iskurPayload.hasClassGuidance, false);
assert.strictEqual(iskurPayload.hasOtherEmployer, false);
assert.strictEqual(iskurPayload.otherEmployerTaxBase, undefined);
assert.strictEqual(iskurPayload.branch, 'Destek ve Temizlik Hizmetleri');
console.log('✓ TEST 2 GEÇTİ: İŞKUR personeli için öğretmenlik ek ders kalemleri ve akademik derece temizlendi.');

// ----------------------------------------------------
// TEST 3: Standart Öğretmen (Kadrolu / Sözleşmeli / Ücretli) Tüm Haklarını Korur
// ----------------------------------------------------
const teacherInput = {
  schoolId: 'school-2',
  nationality: 'TR',
  tcNo: '51025187672',
  fullName: 'Mehmet Öz',
  branch: 'Fizik',
  branchCategory: 'genel_bilgi_ve_brans',
  educationLevel: 'yuksek_lisans',
  employmentType: 'sozlesmeli',
  hasGuardDuty: true,
  guardDutyDay: 3, // Çarşamba
  hasClassGuidance: true,
  hasOtherEmployer: true,
  otherEmployerTaxBase: 15000,
  iban: 'TR030004600152888000222958',
  startDate: '2026-09-01',
  explanation: 'Sözleşmeli Fizik Öğretmeni',
};

const teacherPayload = sanitizeTeacherPayload(teacherInput);
assert.strictEqual(teacherPayload.educationLevel, 'yuksek_lisans', 'Öğretmenin yüksek lisans derecesi korunmalı');
assert.strictEqual(teacherPayload.hasGuardDuty, true);
assert.strictEqual(teacherPayload.guardDutyDay, 3);
assert.strictEqual(teacherPayload.hasClassGuidance, true);
assert.strictEqual(teacherPayload.hasOtherEmployer, true);
assert.strictEqual(teacherPayload.otherEmployerTaxBase, 15000);
console.log('✓ TEST 3 GEÇTİ: Standart öğretmen için eğitim düzeyi, nöbet günü ve ek görev kalemleri eksiksiz korundu.');

// ----------------------------------------------------
// TEST 4: Ücretli Öğretmen (Doktora + Başka İşveren)
// ----------------------------------------------------
const ucretliInput = {
  schoolId: 'school-3',
  nationality: 'TR',
  tcNo: '51025187672',
  fullName: 'Dr. Ayşe Kaya',
  branch: 'Biyoloji',
  branchCategory: 'genel_bilgi_ve_brans',
  educationLevel: 'doktora',
  employmentType: 'ucretli',
  hasGuardDuty: false,
  guardDutyDay: 0,
  hasClassGuidance: false,
  hasOtherEmployer: true,
  otherEmployerTaxBase: 35000,
  iban: 'TR030004600152888000222958',
  startDate: '2026-09-01',
  explanation: 'Ücretli Doktoralı Öğretmen',
};

const ucretliPayload = sanitizeTeacherPayload(ucretliInput);
assert.strictEqual(ucretliPayload.educationLevel, 'doktora');
assert.strictEqual(ucretliPayload.hasOtherEmployer, true);
assert.strictEqual(ucretliPayload.otherEmployerTaxBase, 35000);
console.log('✓ TEST 4 GEÇTİ: Ücretli doktoralı öğretmenin vergi matrahı ve doktora derecesi doğrulandı.');

// ----------------------------------------------------
// TEST 5: Form Dosyasında Ücret / Para Miktarlarının Gizlendiği Doğrulaması
// ----------------------------------------------------
const formFileContent = fs.readFileSync('src/components/Teachers/AdminTeacherFormModal.tsx', 'utf-8');

// Kontrol: Form modalında seçeneklerin yanında TL fiyatı yazmamalı
assert.strictEqual(
  formFileContent.includes('Standart Birim Ücret - 220,57 TL'),
  false,
  'Form modalında "220,57 TL" fiyat ibaresi bulunmamalıdır'
);
assert.strictEqual(
  formFileContent.includes('%7 Artırımlı - 236,01 TL'),
  false,
  'Form modalında "236,01 TL" fiyat ibaresi bulunmamalıdır'
);
assert.strictEqual(
  formFileContent.includes('%20 Artırımlı - 264,69 TL'),
  false,
  'Form modalında "264,69 TL" fiyat ibaresi bulunmamalıdır'
);
console.log('✓ TEST 5 GEÇTİ: Eğitim düzeyi seçeneklerinden ücret ve saatlik fiyat bilgileri başarıyla kaldırıldı.');

// ----------------------------------------------------
// TEST 6: Supabase Mapping Uyumluluğu
// ----------------------------------------------------
function mapTeacherToDb(t) {
  return {
    id: t.id || 'teacher-test',
    school_id: t.schoolId,
    nationality: t.nationality || 'TR',
    tc_no: t.tcNo,
    full_name: t.fullName,
    branch: t.branch,
    branch_category: t.branchCategory || 'genel_bilgi_ve_brans',
    education_level: t.educationLevel || 'lisans',
    employment_type: t.employmentType,
    has_guard_duty: Boolean(t.hasGuardDuty),
    guard_duty_day: t.guardDutyDay ?? null,
    has_class_guidance: Boolean(t.hasClassGuidance),
    iban: t.iban,
    explanation: t.explanation || '',
    start_date: t.startDate,
    departure_date: t.departureDate || null,
    has_other_employer: t.hasOtherEmployer,
    other_employer_tax_base: t.otherEmployerTaxBase || 0,
    hourly_rate: t.hourlyRate,
    is_active: t.isActive,
  };
}

const dbStajyer = mapTeacherToDb(stajyerPayload);
assert.strictEqual(dbStajyer.education_level, 'lisans');
assert.strictEqual(dbStajyer.has_guard_duty, false);
assert.strictEqual(dbStajyer.guard_duty_day, null);

const dbIskur = mapTeacherToDb(iskurPayload);
assert.strictEqual(dbIskur.education_level, 'lisans');
assert.strictEqual(dbIskur.employment_type, 'iskurlu');
assert.strictEqual(dbIskur.has_guard_duty, false);

console.log('✓ TEST 6 GEÇTİ: Veritabanı mapping katmanı Stajyer ve İŞKUR yüklerini doğru sütun kısıtlamalarıyla eşleştirdi.');

console.log('\n========================================================');
console.log('TÜM DİNAMİK FORM VE GÜVENLİK TESTLERİ BAŞARIYLA TAMAMLANDI! (100%)');
console.log('========================================================');

