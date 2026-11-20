/**
 * Test: Kolay Ekders – "Cannot read properties of undefined (reading 'name')" crash prevention
 * Verifies that all components, views and context methods handle empty schools,
 * undefined sessions, and initial loading states safely.
 */

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('  TEST: NAME UNDEFINED HATASI ÖNLEME VE GÜVENLİ YÜKLEME KONTROLÜ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ GEÇTİ: ${message}`);
    passCount++;
  } else {
    console.error(`✗ BAŞARISIZ: ${message}`);
    failCount++;
  }
}

// 1. AppContext.tsx syncFromRemote length checks
const appContextContent = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');

assert(
  appContextContent.includes('if (remoteSchools && remoteSchools.length > 0) setSchools(remoteSchools);'),
  'AppContext.tsx: remoteSchools boş dizi geldiğinde local okulları sıfırlamıyor (length > 0 kontrolü var).'
);

assert(
  appContextContent.includes('if (remoteTeachers && remoteTeachers.length > 0) setAllTeachers(remoteTeachers);'),
  'AppContext.tsx: remoteTeachers boş dizi geldiğinde local öğretmenleri sıfırlamıyor.'
);

assert(
  appContextContent.includes('if (remoteSubmissions && remoteSubmissions.length > 0) setSubmissions(remoteSubmissions);'),
  'AppContext.tsx: remoteSubmissions boş dizi geldiğinde local teslimatları sıfırlamıyor.'
);

// 2. SchoolDashboardView fallbackSchool and safe optional chaining
const dashboardContent = fs.readFileSync('src/components/SchoolPanel/SchoolDashboardView.tsx', 'utf-8');

assert(
  dashboardContent.includes('fallbackSchool: School = {') &&
  dashboardContent.includes('name: currentUser?.fullName ? currentUser.fullName.replace(\' Yetkilisi\', \'\') : \'Kurum\''),
  'SchoolDashboardView.tsx: fallbackSchool tanımlı ve güvenli okul nesnesi sağlıyor.'
);

assert(
  dashboardContent.includes('{school?.name || \'Kurum\'}'),
  'SchoolDashboardView.tsx: school?.name optional chaining ile korunuyor.'
);

assert(
  !dashboardContent.includes('<h2 className="text-2xl font-bold tracking-tight">{school.name}</h2>'),
  'SchoolDashboardView.tsx: Ham {school.name} çağrısı tamamen kaldırıldı.'
);

// 3. SchoolTeacherListView fallbackSchool
const teacherListContent = fs.readFileSync('src/components/SchoolPanel/SchoolTeacherListView.tsx', 'utf-8');

assert(
  teacherListContent.includes('fallbackSchool: School = {') &&
  teacherListContent.includes('{school?.name || \'Kurum\'} – Görevli Öğretmen ve Personel Listesi'),
  'SchoolTeacherListView.tsx: fallbackSchool ve {school?.name || \'Kurum\'} koruması mevcut.'
);

// 4. SchoolPuantajEntryView fallbackSchool and safe calls
const puantajEntryContent = fs.readFileSync('src/components/SchoolPanel/SchoolPuantajEntryView.tsx', 'utf-8');

assert(
  puantajEntryContent.includes('fallbackSchool: School = {') &&
  puantajEntryContent.includes('exportMonthlyPuantajToExcel(school?.name || \'Kurum\''),
  'SchoolPuantajEntryView.tsx: Excel dışa aktarımında ve başlıkta school?.name koruması var.'
);

// 5. SchoolHistoryView fallbackSchool
const historyContent = fs.readFileSync('src/components/SchoolPanel/SchoolHistoryView.tsx', 'utf-8');

assert(
  historyContent.includes('fallbackSchool: School = {') &&
  historyContent.includes('{school?.name || \'Kurum\'} kurumuna ait geçmiş'),
  'SchoolHistoryView.tsx: fallbackSchool ve {school?.name || \'Kurum\'} koruması mevcut.'
);

// 6. Submissions and SchoolListView safe searching
const submissionsContent = fs.readFileSync('src/components/Submissions/SchoolSubmissionsView.tsx', 'utf-8');
assert(
  submissionsContent.includes('item.school?.name || \'\''),
  'SchoolSubmissionsView.tsx: item.school?.name optional chaining ile aranıyor.'
);

const schoolListContent = fs.readFileSync('src/components/Schools/SchoolListView.tsx', 'utf-8');
assert(
  schoolListContent.includes('s?.name || \'\''),
  'SchoolListView.tsx: s?.name optional chaining ile filtreleniyor.'
);

// 7. MonthlyReviewView
const reviewContent = fs.readFileSync('src/components/Review/MonthlyReviewView.tsx', 'utf-8');
assert(
  reviewContent.includes('currentSchool?.name || \'Seçili okul\''),
  'MonthlyReviewView.tsx: currentSchool?.name onayı sırasında hata fırlatmıyor.'
);

console.log('\n================================================================');
console.log(`SONUÇ: ${passCount} BAŞARILI, ${failCount} BAŞARISIZ`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('TÜM GÜVENLİK VE NAME CRASH ÖNLEME KONTROLLERİ EKSİKSİZ GEÇTİ!');
}

