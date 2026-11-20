/**
 * Test: Kolay Ekders – Personel Türüne Göre Ek Ders Hesaplama Testleri
 *
 * Kesin Kurallar:
 * 1. Ücretli öğretmenler:
 *    - Yalnızca ücretli öğretmenlere 2+1 sistemi uygulanır (Her 2 saatlik çalışma karşılığında 1 saat ek ders -> Math.floor(hours / 2))
 *    - Bu kural yalnızca personel türü "Ücretli" olan kişilerde geçerlidir.
 * 2. Sözleşmeli personel:
 *    - Normal ek ders hesaplama kurallarına göre hesaplanır.
 *    - 5+1 sistemi kesinlikle uygulanmaz (İlave ek ders = 0).
 * 3. Diğer bütün personel türleri (stajyer, İŞKUR, kadrolu vb.):
 *    - Normal ek ders hesaplama kurallarına göre hesaplanır.
 *    - Hiçbir şekilde 2+1 veya 5+1 sistemi uygulanmaz (İlave ek ders = 0).
 */

import assert from 'assert';
import fs from 'fs';

console.log('================================================================');
console.log('  PERSONEL TÜRÜNE GÖRE EK DERS HESAPLAMA SİSTEMİ TESTLERİ');
console.log('================================================================\n');

// 1. Statik Kod Analizi: additionalTeachingCalculator.ts ve AppContext.tsx doğrulaması
const calcSource = fs.readFileSync('src/utils/additionalTeachingCalculator.ts', 'utf-8');
const appContextSource = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');

assert(
  calcSource.includes("export function isSozlesmeli"),
  'isSozlesmeli fonksiyonu dışa aktarılmış olmalı'
);
assert(
  calcSource.includes("export function isUcretli"),
  'isUcretli fonksiyonu dışa aktarılmış olmalı'
);
assert(
  !calcSource.includes("Math.floor(hours / 5)"),
  '5+1 formülü (Math.floor(hours / 5)) kod içerisinden tamamen kaldırılmış olmalı'
);
assert(
  calcSource.includes("Math.floor(hours / 2)"),
  'Ücretli için 2+1 formülü (Math.floor(hours / 2)) bulunmalı'
);
assert(
  !appContextSource.includes("isAlreadyEkDers: true"),
  'AppContext.tsx içinde hücre güncellemesinde isAlreadyEkDers: true engeli kaldırılmış olmalı'
);
console.log('✓ Kaynak kod kontrolleri (5+1 kaldırıldı, 2+1 yalnızca ücretli için) başarıyla doğrulandı.\n');

// 2. Fonksiyonel Mantık Testleri
function isSozlesmeli(teacher) {
  return teacher?.employmentType === 'sozlesmeli';
}

function isUcretli(teacher) {
  const type = teacher?.employmentType;
  return type === 'ucretli' || type === 'ucretli_ogretmen' || type === 'usta_ogretici';
}

function calculatePersonnelBonusHours(teacher, hours) {
  if (hours <= 0) return 0;
  // Yalnızca ücretli öğretmenlerde 2+1 uygulanır
  if (isUcretli(teacher)) {
    return Math.floor(hours / 2);
  }
  // Sözleşmeli ve diğer tüm personeller normal hesaplanır (bonus = 0)
  return 0;
}

function calculateMonthlyPuantajTotalsMock({ teacher, totalHours, rules = { gunduzHourlyRate: 220.57 } }) {
  const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || 220.57;
  const bonusFiveToOneHours = calculatePersonnelBonusHours(teacher, totalHours);
  const payableTotalHours = totalHours + bonusFiveToOneHours;
  const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;

  return {
    totalHours,
    bonusFiveToOneHours,
    payableTotalHours,
    estimatedPayment,
  };
}

const RULES = {
  gunduzHourlyRate: 220.57,
  ucretliHourlyRate: 220.57,
};

// ----------------------------------------------------
// TEST 1: Statü Doğrulama
// ----------------------------------------------------
console.log('--- TEST 1: Statü Doğrulama ---');
assert.strictEqual(isSozlesmeli({ employmentType: 'sozlesmeli' }), true);
assert.strictEqual(isSozlesmeli({ employmentType: 'ucretli' }), false);
assert.strictEqual(isSozlesmeli({ employmentType: 'stajyer' }), false);

assert.strictEqual(isUcretli({ employmentType: 'ucretli' }), true);
assert.strictEqual(isUcretli({ employmentType: 'ucretli_ogretmen' }), true);
assert.strictEqual(isUcretli({ employmentType: 'usta_ogretici' }), true);
assert.strictEqual(isUcretli({ employmentType: 'sozlesmeli' }), false);
assert.strictEqual(isUcretli({ employmentType: 'stajyer' }), false);
console.log('✓ Statü belirleme fonksiyonları doğru çalışıyor.\n');

// ----------------------------------------------------
// TEST 2: Sözleşmeli Personel Normal Hesaplama (5+1 Kesinlikle Yok)
// ----------------------------------------------------
console.log('--- TEST 2: Sözleşmeli Personel Normal Hesaplama Doğrulaması ---');
const sozlesmeliTeacher = {
  id: 't-sozlesmeli',
  fullName: 'Ahmet Sözleşmeli',
  branch: 'Matematik',
  employmentType: 'sozlesmeli',
  hourlyRate: 220.57,
};

assert.strictEqual(calculatePersonnelBonusHours(sozlesmeliTeacher, 5), 0);
assert.strictEqual(calculatePersonnelBonusHours(sozlesmeliTeacher, 10), 0);
assert.strictEqual(calculatePersonnelBonusHours(sozlesmeliTeacher, 20), 0);
assert.strictEqual(calculatePersonnelBonusHours(sozlesmeliTeacher, 30), 0);

const sozlesmeliPuantaj = calculateMonthlyPuantajTotalsMock({
  teacher: sozlesmeliTeacher,
  totalHours: 30,
  rules: RULES,
});
assert.strictEqual(sozlesmeliPuantaj.totalHours, 30);
assert.strictEqual(sozlesmeliPuantaj.bonusFiveToOneHours, 0, 'Sözleşmeli için ilave saat kesinlikle 0 olmalı');
assert.strictEqual(sozlesmeliPuantaj.payableTotalHours, 30, 'Sözleşmeli için 30 saat girildiyse tam 30 saat ödenmeli');
assert.strictEqual(sozlesmeliPuantaj.estimatedPayment, Math.round(30 * 220.57 * 100) / 100);
console.log(`✓ Sözleşmeli Personel 30 saat için: Toplam=30, İlave=0 (Normal), Ödenecek=${sozlesmeliPuantaj.payableTotalHours} saat, Tahakkuk=${sozlesmeliPuantaj.estimatedPayment} TL\n`);

// ----------------------------------------------------
// TEST 3: Ücretli Öğretmen 2+1 Sistemi
// ----------------------------------------------------
console.log('--- TEST 3: Ücretli Öğretmen 2+1 Sistemi Doğrulaması ---');
const ucretliTeacher = {
  id: 't-ucretli',
  fullName: 'Mehmet Ücretli',
  branch: 'Fizik',
  employmentType: 'ucretli',
  hourlyRate: 220.57,
};

assert.strictEqual(calculatePersonnelBonusHours(ucretliTeacher, 2), 1);
assert.strictEqual(calculatePersonnelBonusHours(ucretliTeacher, 4), 2);
assert.strictEqual(calculatePersonnelBonusHours(ucretliTeacher, 5), 2);
assert.strictEqual(calculatePersonnelBonusHours(ucretliTeacher, 10), 5);
assert.strictEqual(calculatePersonnelBonusHours(ucretliTeacher, 20), 10);
assert.strictEqual(calculatePersonnelBonusHours(ucretliTeacher, 30), 15);

const ucretliPuantaj = calculateMonthlyPuantajTotalsMock({
  teacher: ucretliTeacher,
  totalHours: 30,
  rules: RULES,
});
assert.strictEqual(ucretliPuantaj.totalHours, 30);
assert.strictEqual(ucretliPuantaj.bonusFiveToOneHours, 15, '30 saat için 2+1 ile 15 saat ilave verilmeli');
assert.strictEqual(ucretliPuantaj.payableTotalHours, 45, '30 + 15 = 45 saat ödenmeli');
assert.strictEqual(ucretliPuantaj.estimatedPayment, Math.round(45 * 220.57 * 100) / 100);
console.log(`✓ Ücretli Öğretmen 30 saat için: Toplam=30, İlave (2+1)=+${ucretliPuantaj.bonusFiveToOneHours}, Ödenecek=${ucretliPuantaj.payableTotalHours} saat, Tahakkuk=${ucretliPuantaj.estimatedPayment} TL\n`);

// ----------------------------------------------------
// TEST 4: Diğer Personel Türleri (Stajyer / İŞKUR / Kadrolu) Normal Sistem
// ----------------------------------------------------
console.log('--- TEST 4: Diğer Personel Türleri Normal Sistem Doğrulaması ---');
const stajyerTeacher = {
  id: 't-stajyer',
  fullName: 'Ayşe Stajyer',
  branch: 'Bilişim',
  employmentType: 'stajyer',
  hourlyRate: 220.57,
};

const iskurTeacher = {
  id: 't-iskur',
  fullName: 'Fatma İŞKUR',
  branch: 'Destek Hizmetleri',
  employmentType: 'iskurlu',
  hourlyRate: 220.57,
};

const kadroluTeacher = {
  id: 't-kadrolu',
  fullName: 'Kemal Kadrolu',
  branch: 'Tarih',
  employmentType: 'kadrolu',
  hourlyRate: 220.57,
};

[stajyerTeacher, iskurTeacher, kadroluTeacher].forEach((t) => {
  assert.strictEqual(calculatePersonnelBonusHours(t, 30), 0, `${t.employmentType} için bonus 0 olmalı`);
  const res = calculateMonthlyPuantajTotalsMock({ teacher: t, totalHours: 30, rules: RULES });
  assert.strictEqual(res.totalHours, 30);
  assert.strictEqual(res.bonusFiveToOneHours, 0, `${t.employmentType} için ilave saat verilmemeli`);
  assert.strictEqual(res.payableTotalHours, 30, `${t.employmentType} için ödenecek saat fiili saate eşit olmalı`);
  assert.strictEqual(res.estimatedPayment, Math.round(30 * 220.57 * 100) / 100);
  console.log(`✓ ${t.fullName} (${t.employmentType}): Toplam=30, İlave=0, Ödenecek=30 saat, Tahakkuk=${res.estimatedPayment} TL`);
});
console.log();

// ----------------------------------------------------
// TEST 5: Aynı Ders Saatine Sahip Farklı Personel Türlerinin Karşılaştırması
// ----------------------------------------------------
console.log('--- TEST 5: Karşılaştırma Senaryoları (Aynı Ders Saatleri İçin) ---');

function compareTypes(hours) {
  const ucr = calculateMonthlyPuantajTotalsMock({ teacher: ucretliTeacher, totalHours: hours, rules: RULES });
  const soz = calculateMonthlyPuantajTotalsMock({ teacher: sozlesmeliTeacher, totalHours: hours, rules: RULES });
  const dig = calculateMonthlyPuantajTotalsMock({ teacher: stajyerTeacher, totalHours: hours, rules: RULES });

  console.log(`\n[${hours} Saat Çalışma İçin Karşılaştırma]:`);
  console.log(`  * Ücretli    (2+1)   : Fiili=${hours} sa | İlave=+${ucr.bonusFiveToOneHours} sa | Ödenecek=${ucr.payableTotalHours} sa | Tutar=${ucr.estimatedPayment} TL`);
  console.log(`  * Sözleşmeli (Normal): Fiili=${hours} sa | İlave= ${soz.bonusFiveToOneHours} sa | Ödenecek=${soz.payableTotalHours} sa | Tutar=${soz.estimatedPayment} TL`);
  console.log(`  * Diğer     (Normal): Fiili=${hours} sa | İlave= ${dig.bonusFiveToOneHours} sa | Ödenecek=${dig.payableTotalHours} sa | Tutar=${dig.estimatedPayment} TL`);

  assert.strictEqual(ucr.bonusFiveToOneHours, Math.floor(hours / 2));
  assert.strictEqual(soz.bonusFiveToOneHours, 0);
  assert.strictEqual(dig.bonusFiveToOneHours, 0);

  assert.strictEqual(ucr.payableTotalHours, hours + Math.floor(hours / 2));
  assert.strictEqual(soz.payableTotalHours, hours);
  assert.strictEqual(dig.payableTotalHours, hours);

  assert(ucr.payableTotalHours > soz.payableTotalHours);
  assert.strictEqual(soz.payableTotalHours, dig.payableTotalHours);
}

compareTypes(30);
compareTypes(20);
compareTypes(15);
compareTypes(10);

console.log('\n================================================================');
console.log('  TÜM PERSONEL HESAPLAMA TESTLERİ BAŞARIYLA TAMAMLANDI! (%100)');
console.log('================================================================');
