import assert from 'assert';

console.log('================================================================');
console.log('TÜM HAFTA İÇİ GÜNLERİN (BÜTÜN SALI, ÇARŞAMBA, VB.) EŞLEŞTİRİLME TESTİ');
console.log('================================================================\n');

// MEB Resmî Tatil Fonksiyonu
function getOfficialHolidayInfo(year, month, day) {
  if (month === 1 && day === 1) return { isHoliday: true, name: 'Yılbaşı' };
  if (month === 4 && day === 23) return { isHoliday: true, name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' };
  if (month === 5 && day === 1) return { isHoliday: true, name: '1 Mayıs Emek ve Dayanışma Günü' };
  if (month === 5 && day === 19) return { isHoliday: true, name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı" };
  if (month === 7 && day === 15) return { isHoliday: true, name: '15 Temmuz Demokrasi ve Millî Birlik Günü' };
  if (month === 8 && day === 30) return { isHoliday: true, name: '30 Ağustos Zafer Bayramı' };
  if (month === 10 && day === 28) return { isHoliday: true, name: '28 Ekim Cumhuriyet Bayramı Arefesi', isHalfDay: true };
  if (month === 10 && day === 29) return { isHoliday: true, name: '29 Ekim Cumhuriyet Bayramı' };
  return { isHoliday: false, name: '' };
}

function distributeWeeklyHoursAccordingToMebArticle23(totalHours) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!totalHours || totalHours <= 0) return result;

  const basePerDay = Math.floor(totalHours / 5);
  for (let d = 1; d <= 5; d++) result[d] = basePerDay;

  const remainder = totalHours % 5;
  if (remainder === 0) return result;

  const priorityOrder = [1, 5, 3, 2, 4];
  for (let i = 0; i < remainder; i++) {
    result[priorityOrder[i]] += 1;
  }
  return result;
}

function calculateWeeklyDailyMebBreakdown({ teacher, schedule }) {
  const isSozlesmeli = teacher.employmentType === 'sozlesmeli';
  const totalMaasQuota = isSozlesmeli ? 15 : 0;
  let remainingMaasQuota = totalMaasQuota;

  const lessons = schedule?.lessons || [];
  const normalLessonsTotal = lessons
    .filter((l) => l.lessonType === 'normal' || !l.lessonType)
    .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

  const prepHours = Math.min(3, Math.floor(normalLessonsTotal / 10));
  const prepDistribution = distributeWeeklyHoursAccordingToMebArticle23(prepHours);

  const guidanceHours = teacher.hasClassGuidance ? 2 : 0;
  const guidanceDistribution = distributeWeeklyHoursAccordingToMebArticle23(guidanceHours);

  const dailyBreakdown = {};

  for (let dow = 1; dow <= 5; dow++) {
    const dayNormalLessons = lessons
      .filter((l) => l.dayOfWeek === dow && (l.lessonType === 'normal' || !l.lessonType))
      .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

    const dayDykLessons = lessons
      .filter((l) => l.dayOfWeek === dow && l.lessonType === 'dyk')
      .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

    let dayMaasKarsiligi = 0;
    let dayMaasUstuEkDers = 0;

    if (remainingMaasQuota > 0) {
      if (dayNormalLessons <= remainingMaasQuota) {
        dayMaasKarsiligi = dayNormalLessons;
        remainingMaasQuota -= dayNormalLessons;
        dayMaasUstuEkDers = 0;
      } else {
        dayMaasKarsiligi = remainingMaasQuota;
        dayMaasUstuEkDers = dayNormalLessons - remainingMaasQuota;
        remainingMaasQuota = 0;
      }
    } else {
      dayMaasKarsiligi = 0;
      dayMaasUstuEkDers = dayNormalLessons;
    }

    const dayPrep = prepDistribution[dow] || 0;
    const dayGuidance = guidanceDistribution[dow] || 0;
    const dayDuty = schedule?.dutyDay === dow ? 3 : 0;

    const totalEkDers = dayMaasUstuEkDers + dayDykLessons + dayPrep + dayGuidance + dayDuty;

    dailyBreakdown[dow] = {
      dow,
      maasKarsiligi: dayMaasKarsiligi,
      maasUstuEkDers: dayMaasUstuEkDers,
      dykLessons: dayDykLessons,
      prep: dayPrep,
      guidance: dayGuidance,
      duty: dayDuty,
      totalEkDers,
    };
  }

  return dailyBreakdown;
}

// schedulePuantajSync işlevi
function syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year,
  month,
  existingRow,
  periodStartDate,
  periodEndDate,
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyBreakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule });

  const mStr = String(month).padStart(2, '0');
  const effectivePeriodStart = periodStartDate || `${year}-${mStr}-01`;
  const effectivePeriodEnd = periodEndDate || `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`;

  const existingHours = existingRow?.dailyHours || {};
  const existingDutyHours = existingRow?.dutyDailyHours || {};
  const confirmedDays = new Set(existingRow?.confirmedDays || []);

  const newDailyHours = { ...existingHours };
  const newDutyHours = { ...existingDutyHours };

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;

    const dateObj = new Date(year, month - 1, day, 12, 0, 0);
    const jsDow = dateObj.getDay();
    const dow = jsDow === 0 ? 7 : jsDow;

    if (dow === 6 || dow === 7) continue;

    const isInsidePeriod = dateStr >= effectivePeriodStart && dateStr <= effectivePeriodEnd;

    if (!isInsidePeriod) {
      if (!confirmedDays.has(day)) {
        delete newDailyHours[day];
        delete newDutyHours[day];
      }
      continue;
    }

    const holidayInfo = getOfficialHolidayInfo(year, month, day);
    if (holidayInfo.isHoliday && !holidayInfo.isHalfDay) {
      if (!confirmedDays.has(day)) {
        delete newDailyHours[day];
        delete newDutyHours[day];
      }
      continue;
    }

    if (confirmedDays.has(day)) {
      continue;
    }

    const dayBreakdown = dailyBreakdown[dow];
    const mebTotalEkDers = dayBreakdown ? dayBreakdown.totalEkDers : 0;

    if (mebTotalEkDers > 0) {
      newDailyHours[day] = mebTotalEkDers;
    } else {
      delete newDailyHours[day];
    }

    const dutyHours = dayBreakdown ? dayBreakdown.duty : 0;
    if (dutyHours > 0) {
      newDutyHours[day] = dutyHours;
    } else {
      delete newDutyHours[day];
    }
  }

  const totalHours = Object.values(newDailyHours).reduce((sum, h) => sum + (Number(h) || 0), 0);

  return {
    updatedRow: {
      teacherId: teacher.id,
      year,
      month,
      dailyHours: newDailyHours,
      dutyDailyHours: newDutyHours,
      totalHours,
      confirmedDays: Array.from(confirmedDays),
    },
  };
}

// -------------------------------------------------------------
// TEST SENARYOSU
// -------------------------------------------------------------
const teacher = {
  id: 'teacher-mat-1',
  fullName: 'Ahmet Yılmaz',
  branch: 'Matematik',
  employmentType: 'sozlesmeli',
  hasClassGuidance: false,
};

// Pzt: 3, Sal: 6, Çar: 4, Per: 2, Cum: 3 üreten program
const schedule = {
  teacherId: teacher.id,
  dutyDay: 3, // Çarşamba nöbet (3 saat)
  lessons: [
    { dayOfWeek: 1, lessonCount: 6, lessonType: 'normal' }, // Pzt 6 saat normal -> 6 saat maaş
    { dayOfWeek: 2, lessonCount: 6, lessonType: 'normal' }, // Sal 6 saat normal -> 6 saat maaş
    { dayOfWeek: 3, lessonCount: 3, lessonType: 'normal' }, // Çar 3 saat normal -> 3 saat maaş (maaş 15 tamam)
    { dayOfWeek: 4, lessonCount: 2, lessonType: 'normal' }, // Per 2 saat normal -> 2 maaş üstü
    { dayOfWeek: 5, lessonCount: 1, lessonType: 'normal' }, // Cum 1 saat normal -> 1 maaş üstü
    // Normal toplam = 18 saat. Prep = 1 saat -> Priority Madde 23: Pzt=1
    // DYK'lar:
    { dayOfWeek: 1, lessonCount: 2, lessonType: 'dyk' },    // Pzt DYK 2 -> Pzt toplam: 0 + 2 + 1 = 3
    { dayOfWeek: 2, lessonCount: 6, lessonType: 'dyk' },    // Sal DYK 6 -> Sal toplam: 0 + 6 + 0 = 6
    { dayOfWeek: 4, lessonCount: 0, lessonType: 'dyk' },    // Per toplam: 2 + 0 + 0 = 2
    { dayOfWeek: 5, lessonCount: 2, lessonType: 'dyk' },    // Cum DYK 2 -> Cum toplam: 1 + 2 + 0 = 3
    // Çarşamba toplam: 0 + 0(dyk) + 0(prep) + 1(nöbet ekseni: duty=3) -> 0 + 3 = 3 veya 1+3=4
    { dayOfWeek: 3, lessonCount: 1, lessonType: 'dyk' },    // Çar DYK 1 -> Çar toplam: 0 + 1 + 3 = 4
  ],
};

console.log('--- TEST 1: MEB Çizelgesinde Günlük Toplam Ek Ders Saatleri ---');
const breakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule });
console.log('Pazartesi Toplam Ek Ders :', breakdown[1].totalEkDers);
console.log('Salı Toplam Ek Ders      :', breakdown[2].totalEkDers);
console.log('Çarşamba Toplam Ek Ders  :', breakdown[3].totalEkDers);
console.log('Perşembe Toplam Ek Ders  :', breakdown[4].totalEkDers);
console.log('Cuma Toplam Ek Ders      :', breakdown[5].totalEkDers);

assert.strictEqual(breakdown[1].totalEkDers, 3, 'Pazartesi 3 olmalı');
assert.strictEqual(breakdown[2].totalEkDers, 6, 'Salı 6 olmalı');
assert.strictEqual(breakdown[3].totalEkDers, 4, 'Çarşamba 4 olmalı');
assert.strictEqual(breakdown[4].totalEkDers, 2, 'Perşembe 2 olmalı');
assert.strictEqual(breakdown[5].totalEkDers, 3, 'Cuma 3 olmalı');
console.log('✓ TEST 1 GEÇTİ: MEB günlük toplam ek ders saatleri (3, 6, 4, 2, 3) teyit edildi.\n');

console.log('--- TEST 2: Admin Tarih Aralığındaki TÜM Salılar, TÜM Çarşambalar vb. Eşleşmeli ---');
// Kasım 2026 (30 gün)
// 1 Kasım 2026: Pazar
// Pazartesi günleri: 2, 9, 16, 23, 30
// Salı günleri:      3, 10, 17, 24
// Çarşamba günleri:  4, 11, 18, 25
// Perşembe günleri:  5, 12, 19, 26
// Cuma günleri:      6, 13, 20, 27
// Cumartesi/Pazar:   Hafta sonu

// Başlangıçta puantaj satırında sadece kısmi mock veri (5, 6, 12) olduğunu varsayalım:
const partialMockRow = {
  teacherId: teacher.id,
  year: 2026,
  month: 11,
  dailyHours: { 5: 2, 6: 3, 12: 2 }, // Sadece birkaç gün vardı
  dutyDailyHours: {},
  totalHours: 7,
  confirmedDays: [],
};

const syncRes = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: 2026,
  month: 11,
  existingRow: partialMockRow,
  periodStartDate: '2026-11-01',
  periodEndDate: '2026-11-30',
});

const updatedHours = syncRes.updatedRow.dailyHours;

const expectedTuesdays = [3, 10, 17, 24];
const expectedWednesdays = [4, 11, 18, 25];
const expectedMondays = [2, 9, 16, 23, 30];
const expectedThursdays = [5, 12, 19, 26];
const expectedFridays = [6, 13, 20, 27];

console.log('Bütün Salı günleri kontrol ediliyor:');
for (const day of expectedTuesdays) {
  assert.strictEqual(updatedHours[day], 6, `Gün ${day} Salı için ek ders 6 saat olmalıdır.`);
  console.log(`  - ${day} Kasım Salı: ${updatedHours[day]} saat [OK]`);
}

console.log('Bütün Çarşamba günleri kontrol ediliyor:');
for (const day of expectedWednesdays) {
  assert.strictEqual(updatedHours[day], 4, `Gün ${day} Çarşamba için ek ders 4 saat olmalıdır.`);
  console.log(`  - ${day} Kasım Çarşamba: ${updatedHours[day]} saat [OK]`);
}

console.log('Bütün Pazartesi günleri kontrol ediliyor:');
for (const day of expectedMondays) {
  assert.strictEqual(updatedHours[day], 3, `Gün ${day} Pazartesi için ek ders 3 saat olmalıdır.`);
  console.log(`  - ${day} Kasım Pazartesi: ${updatedHours[day]} saat [OK]`);
}

console.log('Bütün Perşembe günleri kontrol ediliyor:');
for (const day of expectedThursdays) {
  assert.strictEqual(updatedHours[day], 2, `Gün ${day} Perşembe için ek ders 2 saat olmalıdır.`);
  console.log(`  - ${day} Kasım Perşembe: ${updatedHours[day]} saat [OK]`);
}

console.log('Bütün Cuma günleri kontrol ediliyor:');
for (const day of expectedFridays) {
  assert.strictEqual(updatedHours[day], 3, `Gün ${day} Cuma için ek ders 3 saat olmalıdır.`);
  console.log(`  - ${day} Kasım Cuma: ${updatedHours[day]} saat [OK]`);
}

// Hafta sonlarına ders yazılmadığını doğrula
const weekends = [1, 7, 8, 14, 15, 21, 22, 28, 29];
for (const day of weekends) {
  assert.strictEqual(updatedHours[day], undefined, `Gün ${day} hafta sonu olduğu için ders yazılmamalıdır.`);
}

console.log('✓ TEST 2 GEÇTİ: Adminin belirlediği tarih aralığındaki BÜTÜN Salı, Çarşamba, Pazartesi, Perşembe ve Cuma günleri komple eşleştirildi!\n');

console.log('--- TEST 3: Admin Belirli Bir Tarih Aralığı Seçtiğinde (Örn: 9-20 Kasım) ---');
const subRangeSync = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: 2026,
  month: 11,
  existingRow: null,
  periodStartDate: '2026-11-09',
  periodEndDate: '2026-11-20',
});

const subHours = subRangeSync.updatedRow.dailyHours;

// 9 Kasım öncesi ve 20 Kasım sonrası olmamalı
assert.strictEqual(subHours[2], undefined, '2 Kasım aralık öncesi olduğu için yazılmamalı');
assert.strictEqual(subHours[3], undefined, '3 Kasım aralık öncesi olduğu için yazılmamalı');
assert.strictEqual(subHours[23], undefined, '23 Kasım aralık sonrası olduğu için yazılmamalı');
assert.strictEqual(subHours[24], undefined, '24 Kasım aralık sonrası olduğu için yazılmamalı');

// Aralık içi Salılar: 10 ve 17 Kasım olmalı
assert.strictEqual(subHours[10], 6, '10 Kasım Salı aralık içi: 6 saat olmalı');
assert.strictEqual(subHours[17], 6, '17 Kasım Salı aralık içi: 6 saat olmalı');

// Aralık içi Çarşambalar: 11 ve 18 Kasım olmalı
assert.strictEqual(subHours[11], 4, '11 Kasım Çarşamba aralık içi: 4 saat olmalı');
assert.strictEqual(subHours[18], 4, '18 Kasım Çarşamba aralık içi: 4 saat olmalı');

console.log('✓ TEST 3 GEÇTİ: Kısmi tarih aralığında sadece o aralıktaki tüm hafta içi günler eksiksiz dolduruldu.\n');

console.log('================================================================');
console.log('TÜM HAFTA İÇİ GÜNLERİ EŞLEŞTİRME TESTİ BAŞARIYLA TAMAMLANDI! (100%)');
console.log('================================================================');

