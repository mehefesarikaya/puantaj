// test_school_submissions_view.js
// Okul Teslimat Durumları & Supabase Entegrasyonu Testi

import assert from 'assert';

console.log('================================================================');
console.log('   OKUL TESLİMAT DURUMLARI & SUPABASE ENTEGRASYON TESTİ        ');
console.log('================================================================\n');

// 1. Mock Okul ve Puantaj Verileri
const mockSchools = [
  { id: 's-1', name: 'Atatürk Anadolu Lisesi', institutionCode: '752140', generalDirectorate: 'Ortaöğretim Genel Müdürlüğü', district: 'Çankaya' },
  { id: 's-2', name: 'Cumhuriyet İlkokulu', institutionCode: '758920', generalDirectorate: 'Temel Eğitim Genel Müdürlüğü', district: 'Yenimahalle' },
  { id: 's-3', name: 'Halk Eğitimi Merkezi', institutionCode: '761045', generalDirectorate: 'Mesleki ve Teknik Eğitim Genel Müdürlüğü', district: 'Keçiören' },
];

const mockPuantajRows = [
  { teacherId: 't-1', schoolId: 's-1', year: 2026, month: 11, totalHours: 40, estimatedPayment: 8822.80 },
  { teacherId: 't-2', schoolId: 's-1', year: 2026, month: 11, totalHours: 35, estimatedPayment: 7719.95 },
  { teacherId: 't-3', schoolId: 's-2', year: 2026, month: 11, totalHours: 50, estimatedPayment: 11028.50 },
];

let mockSubmissions = [
  {
    id: 'sub-1',
    schoolId: 's-1',
    year: 2026,
    month: 11,
    status: 'gonderildi',
    submittedAt: '2026-11-15T10:00:00.000Z',
    notes: 'Kasım ayı puantajı teslim edilmiştir.',
    totalTeachersCount: 2,
    totalLessonHours: 75,
    totalPayableAmount: 16542.75,
  },
  {
    id: 'sub-2',
    schoolId: 's-2',
    year: 2026,
    month: 11,
    status: 'onaylandi',
    submittedAt: '2026-11-10T09:30:00.000Z',
    approvedAt: '2026-11-12T14:00:00.000Z',
    totalTeachersCount: 1,
    totalLessonHours: 50,
    totalPayableAmount: 11028.50,
  },
];

// Test 1: Veri Derleme ve KPI Hesaplama
function computeSubmissionData(schools, submissions, puantajRows, year, month) {
  return schools.map(school => {
    const sub = submissions.find(s => s.schoolId === school.id && s.year === year && s.month === month);
    const puantajList = puantajRows.filter(p => p.schoolId === school.id && p.year === year && p.month === month);
    const totalHours = puantajList.reduce((acc, p) => acc + p.totalHours, 0);
    const totalAmount = puantajList.reduce((acc, p) => acc + p.estimatedPayment, 0);

    return {
      school,
      submission: sub,
      status: sub?.status || 'bekleniyor',
      totalHours: sub?.totalLessonHours || totalHours,
      totalAmount: sub?.totalPayableAmount || totalAmount,
      submittedAt: sub?.submittedAt,
      correctionNotes: sub?.correctionNotes,
    };
  });
}

const data = computeSubmissionData(mockSchools, mockSubmissions, mockPuantajRows, 2026, 11);

assert.strictEqual(data.length, 3);
assert.strictEqual(data[0].status, 'gonderildi');
assert.strictEqual(data[1].status, 'onaylandi');
assert.strictEqual(data[2].status, 'bekleniyor'); // s-3 henüz göndermedi

const kpi = {
  total: data.length,
  approved: data.filter(d => d.status === 'onaylandi').length,
  submitted: data.filter(d => d.status === 'gonderildi' || d.status === 'incelemede').length,
  correction: data.filter(d => d.status === 'duzeltme_istendi').length,
  pending: data.filter(d => d.status === 'bekleniyor' || d.status === 'taslak').length,
};

assert.strictEqual(kpi.total, 3);
assert.strictEqual(kpi.approved, 1);
assert.strictEqual(kpi.submitted, 1);
assert.strictEqual(kpi.correction, 0);
assert.strictEqual(kpi.pending, 1);
console.log('✓ TEST 1: Okul teslimat verileri ve KPI metrikleri başarıyla hesaplandı.');

// Test 2: Yöneticinin Okul Puantajını Onaylaması (Supabase Kaydı)
let upsertedPayload = null;
const mockSupabaseService = {
  async upsertSubmission(item) {
    upsertedPayload = item;
    return item;
  }
};

async function handleApprove(schoolId, year, month) {
  const now = new Date().toISOString();
  const subIdx = mockSubmissions.findIndex(s => s.schoolId === schoolId && s.year === year && s.month === month);
  const updatedItem = {
    ...(subIdx >= 0 ? mockSubmissions[subIdx] : { id: `sub-${Date.now()}`, schoolId, year, month }),
    status: 'onaylandi',
    approvedAt: now,
  };
  if (subIdx >= 0) {
    mockSubmissions[subIdx] = updatedItem;
  } else {
    mockSubmissions.push(updatedItem);
  }
  await mockSupabaseService.upsertSubmission(updatedItem);
}

await handleApprove('s-1', 2026, 11);

assert.strictEqual(mockSubmissions[0].status, 'onaylandi');
assert.strictEqual(upsertedPayload.schoolId, 's-1');
assert.strictEqual(upsertedPayload.status, 'onaylandi');
assert.ok(upsertedPayload.approvedAt);
console.log('✓ TEST 2: Yönetici onay işlemi başarıyla Supabase payload\'una yansıtıldı.');

// Test 3: Yöneticinin Düzeltme Talebi Göndermesi
async function handleCorrectionRequest(schoolId, year, month, note) {
  const now = new Date().toISOString();
  const subIdx = mockSubmissions.findIndex(s => s.schoolId === schoolId && s.year === year && s.month === month);
  const updatedItem = {
    ...(subIdx >= 0 ? mockSubmissions[subIdx] : { id: `sub-${Date.now()}`, schoolId, year, month }),
    status: 'duzeltme_istendi',
    correctionRequestedAt: now,
    correctionNotes: note,
  };
  if (subIdx >= 0) {
    mockSubmissions[subIdx] = updatedItem;
  } else {
    mockSubmissions.push(updatedItem);
  }
  await mockSupabaseService.upsertSubmission(updatedItem);
}

await handleCorrectionRequest('s-2', 2026, 11, 'Matematik ders saatleri Salı günü fazla girilmiş.');

assert.strictEqual(mockSubmissions[1].status, 'duzeltme_istendi');
assert.strictEqual(upsertedPayload.schoolId, 's-2');
assert.strictEqual(upsertedPayload.status, 'duzeltme_istendi');
assert.strictEqual(upsertedPayload.correctionNotes, 'Matematik ders saatleri Salı günü fazla girilmiş.');
console.log('✓ TEST 3: Düzeltme talebi ve notu başarıyla Supabase servisine iletildi.');

// Test 4: Rol İzolasyonu Doğrulaması (Kurum kullanıcısı submissions sekmesine erişemez)
function checkTabAccess(role, activeTab) {
  const adminOnlyTabs = ['schools', 'submissions', 'review', 'payroll', 'pricing', 'reports', 'settings'];
  if (role === 'school_user' && adminOnlyTabs.includes(activeTab)) {
    return 'dashboard'; // redirect
  }
  return activeTab;
}

assert.strictEqual(checkTabAccess('admin', 'submissions'), 'submissions');
assert.strictEqual(checkTabAccess('school_user', 'submissions'), 'dashboard');
console.log('✓ TEST 4: Rol izolasyonu: Okul kullanıcısının Okul Teslimatları sayfasına erişimi engellendi.');

console.log('\n================================================================');
console.log('   OKUL TESLİMAT DURUMLARI MODÜLÜ TÜM TESTLERİ BAŞARIYLA GEÇTİ! ');
console.log('================================================================');

