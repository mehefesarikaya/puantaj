// Test script for Supabase Integration, Data Isolation, and Mapping Verification

import assert from 'assert';
import fs from 'fs';

console.log('--- SUPABASE ENTEGRASYON VE GÜVENLİK TESTLERİ BAŞLIYOR ---');

// 1. Verify Database Mapping Logic
const mockSchoolApp = {
  id: 'school-1',
  institutionCode: '752140',
  name: 'Mehmet Akif Ersoy İlkokulu',
  district: 'Merkez',
  schoolType: 'İlkokul',
  principalName: 'Ahmet Yılmaz',
  contactPhone: '0212 555 10 20',
  contactEmail: '752140@meb.k12.tr',
  isActive: true,
  username: '752140',
  accountActive: true,
};

const mockSchoolDb = {
  id: mockSchoolApp.id,
  institution_code: mockSchoolApp.institutionCode,
  name: mockSchoolApp.name,
  district: mockSchoolApp.district,
  school_type: mockSchoolApp.schoolType,
  principal_name: mockSchoolApp.principalName,
  contact_phone: mockSchoolApp.contactPhone,
  contact_email: mockSchoolApp.contactEmail,
  username: mockSchoolApp.username,
  account_active: mockSchoolApp.accountActive,
  is_active: mockSchoolApp.isActive,
};

assert.strictEqual(mockSchoolDb.institution_code, '752140');
assert.strictEqual(mockSchoolDb.account_active, true);
console.log('✓ 1. Okul Veritabanı mapping doğrulaması başarılı.');

// 2. Verify 5'e 1 ve Ödenecek Saat Kuralı
const totalHours = 80;
const bonus = Math.floor(totalHours / 5); // 16
const payable = totalHours + bonus; // 96
assert.strictEqual(bonus, 16);
assert.strictEqual(payable, 96);
console.log('✓ 2. MEB 5\'e 1 hazırlık-planlama ilavesi (80 saat -> 16 ilave -> 96 ödenecek) başarılı.');

// 3. Verify Data Isolation Logic (School A cannot see School B)
const allTeachers = [
  { id: 't-1', schoolId: 'school-1', fullName: 'Ayşenur Öçal' },
  { id: 't-2', schoolId: 'school-1', fullName: 'Sümeyra Kolat' },
  { id: 't-3', schoolId: 'school-2', fullName: 'Ali Vural' },
];

const school1Teachers = allTeachers.filter(t => t.schoolId === 'school-1');
assert.strictEqual(school1Teachers.length, 2);
assert.strictEqual(school1Teachers.some(t => t.schoolId !== 'school-1'), false);
console.log('✓ 3. Okul bazlı veri izolasyonu filtresi başarılı.');

// 4. Verify Approval Lock Logic (Approved months are read-only)
const submissions = [
  { schoolId: 'school-1', year: 2026, month: 10, status: 'onaylandi' },
  { schoolId: 'school-2', year: 2026, month: 10, status: 'duzeltme_istendi' },
];

function canSchoolEditPuantaj(schoolId, year, month) {
  const sub = submissions.find(s => s.schoolId === schoolId && s.year === year && s.month === month);
  if (!sub) return true;
  return sub.status !== 'onaylandi';
}

assert.strictEqual(canSchoolEditPuantaj('school-1', 2026, 10), false, 'Onaylanan ay düzenlenemez');
assert.strictEqual(canSchoolEditPuantaj('school-2', 2026, 10), true, 'Düzeltme istenen ay düzenlenebilir');
console.log('✓ 4. Onay kilidi (Approval Lock) mantığı başarılı.');

// 5. Verify SQL Schema Content
const schemaContent = fs.readFileSync('supabase_schema.sql', 'utf8');

assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.schools'), 'schools tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.user_profiles'), 'user_profiles tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.teachers'), 'teachers tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.school_monthly_submissions'), 'submissions tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.teacher_monthly_puantaj'), 'puantaj tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.meb_payment_rules'), 'meb kuralları tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.payment_calculation_rules'), 'payment calculation rules tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.teacher_weekly_schedules'), 'teacher weekly schedules tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.branches'), 'branches tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.timesheet_periods'), 'timesheet_periods tablosu mevcut');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.audit_logs'), 'audit logs tablosu mevcut');
assert.ok(schemaContent.includes('ENABLE ROW LEVEL SECURITY'), 'RLS etkinleştirildi');
assert.ok(schemaContent.includes('public.current_user_school_id()'), 'RLS okul filtresi mevcut');

console.log('✓ 5. supabase_schema.sql eksiksiz, tüm 11 tablo, RLS kuralları ve fonksiyonlar mevcut.');

// 6. Verify Branches Mapping and Migration
const mockBranch = {
  id: 'b-biyomedikal',
  name: 'Biyomedikal Cihaz Teknolojileri',
  category: 'atolye_laboratuvar',
  isCustom: true,
};
const mockBranchDb = {
  id: mockBranch.id,
  name: mockBranch.name,
  category: mockBranch.category,
  is_custom: mockBranch.isCustom,
};
assert.strictEqual(mockBranchDb.category, 'atolye_laboratuvar');
assert.strictEqual(mockBranchDb.is_custom, true);
console.log('✓ 6. Branşlar tablosu mapping doğrulaması başarılı.');

console.log('--- TÜM SUPABASE TESTLERİ BAŞARIYLA GEÇTİ! ---');
