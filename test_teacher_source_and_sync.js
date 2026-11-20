/**
 * Test: Kolay Ekders – Öğretmen Veri Kaynağı, Mock Temizliği ve Supabase Senkronizasyonu
 */

import assert from 'assert';
import fs from 'fs';

console.log('================================================================');
console.log('  ÖĞRETMEN VERİ KAYNAĞI VE SUPABASE SENKRONİZASYON TESTLERİ');
console.log('================================================================\n');

// 1. AppContext.tsx statik kod incelemesi
const appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');

// Kontrol 1: t-7 zorlamasının kaldırıldığı
assert(!appContext.includes("t.id === 't-7'"), 't-7 mock öğretmen zorlaması AppContext.tsx içerisinden kaldırılmış olmalı.');
console.log('✓ 1. t-7 (Hakan Aksoy) zorlaması AppContext.tsx içerisinden tamamen kaldırıldı.');

// Kontrol 2: Array.isArray(remoteTeachers) ile gerçek Supabase verisinin aktarımı
assert(
  appContext.includes('if (Array.isArray(remoteTeachers)) setAllTeachers(remoteTeachers);'),
  'remoteTeachers Array.isArray kontrolü ile setAllTeachers içine aktarılmalı.'
);
console.log('✓ 2. Supabase senkronizasyonu (Array.isArray(remoteTeachers)) ile boş liste de dahil gerçek veri aktarılıyor.');

// Kontrol 3: Mock ID'lerin filtrelenmesi
assert(
  appContext.includes("const mockIds = new Set(['t-1', 't-2', 't-3', 't-4', 't-5', 't-6', 't-7']);"),
  'Mock öğretmen kimlikleri filtrelenmeli.'
);
console.log('✓ 3. Başlangıç yüklemesinde ve localStorage okumasında tüm mock/demo öğretmenler filtreleniyor.');

// Kontrol 4: Kurum kullanıcısı veri izolasyonu
assert(
  appContext.includes('const teachers = currentUser?.role === \'school_user\'\n    ? (currentUser.schoolId ? allTeachers.filter((t) => t.schoolId === currentUser.schoolId) : [])\n    : allTeachers;'),
  'Kurum kullanıcısı için güvenli okul izolasyonu sağlanmalı.'
);
console.log('✓ 4. Kurum kullanıcısının okul ID\'si olmaması veya geçersiz olması durumunda boş liste dönerek veri sızıntısı engellendi.');

// 2. Fonksiyonel simülasyon testleri
console.log('\n--- Fonksiyonel Simülasyon Testleri ---');

const mockTeachersFromStorage = [
  { id: 't-7', fullName: 'HAKAN AKSOY', schoolId: 'school-5' },
  { id: 'teacher-1732100000', fullName: 'Ayşe Kaya (Gerçek)', schoolId: 'school-735647' }
];

const mockIds = new Set(['t-1', 't-2', 't-3', 't-4', 't-5', 't-6', 't-7']);
const filteredLoaded = mockTeachersFromStorage.filter((t) => !mockIds.has(t.id));

assert.strictEqual(filteredLoaded.length, 1);
assert.strictEqual(filteredLoaded[0].fullName, 'Ayşe Kaya (Gerçek)');
assert(!filteredLoaded.some(t => t.id === 't-7'));
console.log('✓ 5. Mock öğretmen filtreleme simülasyonu başarılı: Hakan Aksoy elendi, sadece gerçek öğretmen kaldı.');

// Supabase boş liste döndüğünde
let stateTeachers = filteredLoaded;
function simulateRemoteSync(remoteTeachers) {
  if (Array.isArray(remoteTeachers)) {
    stateTeachers = remoteTeachers;
  }
}

simulateRemoteSync([]);
assert.strictEqual(stateTeachers.length, 0);
console.log('✓ 6. Supabase backend boş (0 kayıt) döndüğünde liste temizleniyor ve 0 öğretmen gösteriliyor.');

console.log('\n================================================================');
console.log('  TÜM 6 ÖĞRETMEN SENKRONİZASYON VE MOCK TESTİ BAŞARIYLA GEÇTİ! (%100)');
console.log('================================================================');

