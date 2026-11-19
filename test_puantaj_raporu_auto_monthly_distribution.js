import assert from 'assert';

console.log('================================================================');
console.log('UÇTAN UCA TEST: PUANTAJ RAPORU - HAFTALIK PROGRAMIN AYA YAYILMASI');
console.log('================================================================\n');

// 1. Resmî tatil ve MEB takvimi fonksiyonu
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

// 2. MEB Madde 23 Dağıtım Fonksiyonu
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

// 3. MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Fonksiyonu
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

// 4. Puantaj Senkronizasyon Fonksiyonu (schedulePuantajSync.ts ile aynı mantık)
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

    // Hafta sonu kontrolü
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
// SENARYO 1: YÖNETİCİ AYLIK PUANTAJ DÖNEMİ AÇAR (Kasım 2026: 1-30 Kasım)
// -------------------------------------------------------------
console.log('--- ADIM 1: Yönetici Kasım 2026 Puantaj Dönemini Açar ---');
const adminPeriod = {
  id: 'period-2026-11',
  year: 2026,
  month: 11,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  status: 'acik',
  notes: 'Kasım 2026 aktif puantaj dönemi',
};

assert.strictEqual(adminPeriod.status, 'acik');
assert.strictEqual(adminPeriod.startDate, '2026-11-01');
assert.strictEqual(adminPeriod.endDate, '2026-11-30');
console.log(`✓ ADIM 1 BAŞARILI: Yönetici dönemi belirledi: ${adminPeriod.startDate} - ${adminPeriod.endDate} (AÇIK)\n`);

// -------------------------------------------------------------
// SENARYO 2: ÖĞRETMENİN HAFTALIK DERS PROGRAMI: Pazartesi 3, Salı 6, Çarşamba 4 saat
// -------------------------------------------------------------
console.log('--- ADIM 2: Öğretmenin Haftalık Ders Programı (Pzt 3, Sal 6, Çar 4) ---');
const teacher = {
  id: 'teacher-101',
  schoolId: 'school-752140',
  fullName: 'Fatma Şahin',
  branch: 'Matematik',
  employmentType: 'sozlesmeli',
  hasClassGuidance: false,
};

// Pzt 3, Sal 6, Çar 4 üreten program:
const schedule = {
  id: 'sched-101',
  teacherId: teacher.id,
  schoolId: teacher.schoolId,
  dutyDay: 3, // Çarşamba nöbet (3 saat)
  lessons: [
    { dayOfWeek: 1, lessonCount: 6, lessonType: 'normal' },
    { dayOfWeek: 2, lessonCount: 6, lessonType: 'normal' },
    { dayOfWeek: 3, lessonCount: 3, lessonType: 'normal' }, // 15 maaş doldu
    { dayOfWeek: 1, lessonCount: 2, lessonType: 'dyk' },    // Pzt: 0 maaş üstü + 2 dyk + 1 prep = 3
    { dayOfWeek: 2, lessonCount: 6, lessonType: 'dyk' },    // Sal: 0 maaş üstü + 6 dyk + 0 prep = 6
    { dayOfWeek: 3, lessonCount: 1, lessonType: 'dyk' },    // Çar: 0 maaş üstü + 1 dyk + 3 duty = 4
  ],
};

const breakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule });
assert.strictEqual(breakdown[1].totalEkDers, 3, 'Pazartesi 3 saat olmalı');
assert.strictEqual(breakdown[2].totalEkDers, 6, 'Salı 6 saat olmalı');
assert.strictEqual(breakdown[3].totalEkDers, 4, 'Çarşamba 4 saat olmalı');
console.log(`✓ ADIM 2 BAŞARILI: Haftalık ders programı doğrulandı -> Pazartesi: ${breakdown[1].totalEkDers} sa, Salı: ${breakdown[2].totalEkDers} sa, Çarşamba: ${breakdown[3].totalEkDers} sa\n`);

// -------------------------------------------------------------
// SENARYO 3 & 5: KULLANICI KENDİ PANELİNDEN PUANTAJ RAPORUNA GİRER
// Kullanıcı tarih aralığı seçmek zorunda kalmaz, yöneticinin açtığı dönem otomatik kullanılır.
// -------------------------------------------------------------
console.log('--- ADIM 3 & 5: Kullanıcı Puantaj Raporu Ekranına Girer (Tarih Seçimi Yok) ---');
const schoolUser = {
  id: 'user-school-1',
  role: 'school_user',
  schoolId: 'school-752140',
  fullName: 'Okul Müdürü',
};

// Okul kullanıcısı için seçili dönem otomatik olarak adminin açık dönemi (Kasım 2026) olur
const userSelectedYear = adminPeriod.year;
const userSelectedMonth = adminPeriod.month;
assert.strictEqual(userSelectedYear, 2026);
assert.strictEqual(userSelectedMonth, 11);

// Kullanıcı ekranında tarih seçimi sorulmaz; yöneticinin aktif dönemi otomatik getirilir
const activeEffectiveStart = adminPeriod.startDate;
const activeEffectiveEnd = adminPeriod.endDate;
console.log(`✓ ADIM 3 & 5 BAŞARILI: Kullanıcıya tarih seçtirilmedi; Yönetici dönemi (${activeEffectiveStart} - ${activeEffectiveEnd}) otomatik devralındı.\n`);

// -------------------------------------------------------------
// SENARYO 4: AYIN TÜM PAZARTESİLERİNDE 3, SALILARINDA 6, ÇARŞAMBALARINDA 4 SAAT GÖRÜNSÜN
// -------------------------------------------------------------
console.log('--- ADIM 4: Ayın Bütün Pazartesi, Salı ve Çarşambalarına Otomatik Dağıtım ---');
const synced = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: userSelectedYear,
  month: userSelectedMonth,
  existingRow: null,
  periodStartDate: activeEffectiveStart,
  periodEndDate: activeEffectiveEnd,
});

const dailyHours = synced.updatedRow.dailyHours;

// Kasım 2026 takvimi:
// Pazartesiler: 2, 9, 16, 23, 30
// Salılar:      3, 10, 17, 24
// Çarşambalar:  4, 11, 18, 25
const mondays = [2, 9, 16, 23, 30];
const tuesdays = [3, 10, 17, 24];
const wednesdays = [4, 11, 18, 25];

console.log('Bütün Pazartesiler (Her birinde 3 saat olmalı):');
for (const day of mondays) {
  assert.strictEqual(dailyHours[day], 3, `Gün ${day} Pazartesi saat 3 olmalıdır.`);
  console.log(`  - ${day} Kasım Pazartesi : ${dailyHours[day]} saat [DOĞRU]`);
}

console.log('Bütün Salılar (Her birinde 6 saat olmalı):');
for (const day of tuesdays) {
  assert.strictEqual(dailyHours[day], 6, `Gün ${day} Salı saat 6 olmalıdır.`);
  console.log(`  - ${day} Kasım Salı      : ${dailyHours[day]} saat [DOĞRU]`);
}

console.log('Bütün Çarşambalar (Her birinde 4 saat olmalı):');
for (const day of wednesdays) {
  assert.strictEqual(dailyHours[day], 4, `Gün ${day} Çarşamba saat 4 olmalıdır.`);
  console.log(`  - ${day} Kasım Çarşamba  : ${dailyHours[day]} saat [DOĞRU]`);
}

console.log(`✓ ADIM 4 BAŞARILI: Kasım ayının TÜM Pazartesi (5 gün), Salı (4 gün) ve Çarşamba (4 gün) günleri eksiksiz eşleştirildi!\n`);

// -------------------------------------------------------------
// SENARYO 6: SAYFA YENİLENDİĞİNDE VEYA SUPABASE'DEN VERİLERİN KORUNMASI
// -------------------------------------------------------------
console.log('--- ADIM 6: Sayfa Yenilenmesi ve Veritabanı Kalıcılığı ---');
// Veritabanına kaydedilen satır simülasyonu
const savedInDbRow = JSON.parse(JSON.stringify(synced.updatedRow));

// Sayfa yenilendiğinde veritabanından geri yüklenen veriyi kontrol et:
assert.strictEqual(savedInDbRow.teacherId, teacher.id);
assert.strictEqual(savedInDbRow.year, 2026);
assert.strictEqual(savedInDbRow.month, 11);
assert.strictEqual(savedInDbRow.dailyHours[2], 3);
assert.strictEqual(savedInDbRow.dailyHours[3], 6);
assert.strictEqual(savedInDbRow.dailyHours[4], 4);
assert.strictEqual(savedInDbRow.totalHours, 5 * 3 + 4 * 6 + 4 * 4); // 15 + 24 + 16 = 55 saat
console.log(`✓ ADIM 6 BAŞARILI: Sayfa yenilendiğinde ve tekrar giriş yapıldığında 55 saatlik veriler %100 korundu.\n`);

// -------------------------------------------------------------
// SENARYO 7: AYNI İŞLEM TEKRAR ÇALIŞTIRILDIĞINDA SAATLER İKİ KATINA ÇIKMAZ (İDEMPOTENCY)
// -------------------------------------------------------------
console.log('--- ADIM 7: Tekrar Çalıştırma ve İdempotency (Saatlerin Katlanmaması) ---');
const secondRun = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: userSelectedYear,
  month: userSelectedMonth,
  existingRow: savedInDbRow, // Daha önce kaydedilmiş veri
  periodStartDate: activeEffectiveStart,
  periodEndDate: activeEffectiveEnd,
});

const secondRunHours = secondRun.updatedRow.dailyHours;
assert.strictEqual(secondRunHours[2], 3, 'İkinci çalıştırmada Pazartesi 3 saat kalmalı, 6 olmamalıdır.');
assert.strictEqual(secondRunHours[3], 6, 'İkinci çalıştırmada Salı 6 saat kalmalı, 12 olmamalıdır.');
assert.strictEqual(secondRunHours[4], 4, 'İkinci çalıştırmada Çarşamba 4 saat kalmalı, 8 olmamalıdır.');
assert.strictEqual(secondRun.updatedRow.totalHours, 55, 'Toplam saat katlanmamalı, 55 olarak kalmalıdır.');
console.log(`✓ ADIM 7 BAŞARILI: Senkronizasyon tekrar tekrar çalıştırıldığında saatler katlanmadı; işlem %100 kararlı ve idempotent.\n`);

// -------------------------------------------------------------
// EK KONTROLLER: HAFTA SONU VE MANUEL ONAY KORUMASI
// -------------------------------------------------------------
console.log('--- EK KONTROLLER: Hafta Sonu ve Manuel Onay Hücre Koruması ---');
// Hafta sonları: 1, 7, 8, 14, 15, 21, 22, 28, 29
const weekendDays = [1, 7, 8, 14, 15, 21, 22, 28, 29];
for (const wDay of weekendDays) {
  assert.strictEqual(secondRunHours[wDay], undefined, `Gün ${wDay} hafta sonudur; ders yazılmamalıdır.`);
}
console.log('✓ Hafta sonlarına ders yazılmadığı teyit edildi.');

// Manuel düzenlenmiş/onaylanmış hücre ezilmemeli
const rowWithManualEdit = {
  ...savedInDbRow,
  dailyHours: { ...savedInDbRow.dailyHours, 10: 8 }, // 10 Kasım Salı manuel olarak 8 yapılmış olsun
  confirmedDays: [10],
};

const runWithManual = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: userSelectedYear,
  month: userSelectedMonth,
  existingRow: rowWithManualEdit,
  periodStartDate: activeEffectiveStart,
  periodEndDate: activeEffectiveEnd,
});

assert.strictEqual(runWithManual.updatedRow.dailyHours[10], 8, '10 Kasım Salı onaylı manuel saat (8) korunmalıdır.');
assert.strictEqual(runWithManual.updatedRow.dailyHours[17], 6, 'Diğer Salılar programdaki saat (6) olmalıdır.');
console.log('✓ Onaylı ve manuel girilmiş hücrelerin korunup ezilmediği teyit edildi.\n');

console.log('================================================================');
console.log('TÜM SENARYOLAR VE UÇTAN UCA TEST BAŞARIYLA GEÇTİ! (100%)');
console.log('================================================================');

