import assert from 'assert';

console.log('================================================================');
console.log('ADMİN TARİH ARALIĞI VE TÜM AY BOYUNCA EK DERS DAĞILIMI TESTİ');
console.log('================================================================\n');

// 1. Resmî Tatil Fonksiyonu
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

function calculateWeeklyDailyMebBreakdown({ teacher, schedule, rules }) {
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

  const dayNames = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi',
    7: 'Pazar',
  };

  const dailyBreakdown = {};

  for (let d = 1; d <= 7; d++) {
    const dayLessons = lessons.filter((l) => l.dayOfWeek === d);
    const normalLessons = dayLessons
      .filter((l) => l.lessonType === 'normal' || !l.lessonType)
      .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);
    const specialLessons = dayLessons
      .filter((l) => l.lessonType && l.lessonType !== 'normal')
      .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

    let maasForDay = 0;
    let excessForDay = normalLessons;

    if (isSozlesmeli && normalLessons > 0 && remainingMaasQuota > 0) {
      maasForDay = Math.min(normalLessons, remainingMaasQuota);
      remainingMaasQuota -= maasForDay;
      excessForDay = normalLessons - maasForDay;
    } else if (isSozlesmeli && remainingMaasQuota === 0) {
      maasForDay = 0;
      excessForDay = normalLessons;
    }

    const prepDayHours = prepDistribution[d] || 0;
    const guidanceDayHours = guidanceDistribution[d] || 0;
    const dutyDayHours =
      teacher.hasGuardDuty && teacher.guardDutyDay === d ? rules?.nobetHoursPerWeek || 3 : 0;

    const totalDailyAdditionalHours =
      excessForDay + prepDayHours + guidanceDayHours + dutyDayHours + specialLessons;

    dailyBreakdown[d] = {
      dayOfWeek: d,
      dayName: dayNames[d],
      actualLessonHours: normalLessons,
      maasKarsiligiHours: maasForDay,
      excessLessonHours: excessForDay,
      prepPlanningHours: prepDayHours,
      guidanceHours: guidanceDayHours,
      dutyHours: dutyDayHours,
      specialActivityHours: specialLessons,
      totalDailyAdditionalHours,
    };
  }

  return { dailyBreakdown };
}

function formatDateString(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getScheduleDayOfWeek(jsDay) {
  return jsDay === 0 ? 7 : jsDay;
}

function syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year,
  month,
  existingRow = null,
  isSubmissionLocked = false,
  periodStartDate = null,
  periodEndDate = null,
  rules = { gunduzHourlyRate: 220.57, nobetHoursPerWeek: 3 }
}) {
  if (isSubmissionLocked && existingRow) {
    return { updatedRow: existingRow, modifiedDaysCount: 0, wasLocked: true };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDailyHours = existingRow?.dailyHours ? { ...existingRow.dailyHours } : {};
  const currentStatuses = existingRow?.dailyStatuses ? { ...existingRow.dailyStatuses } : {};
  const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || 220.57;

  const weeklyMebBreakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule, rules });

  let modifiedDaysCount = 0;
  const maasDailyHours = {};
  const excessDailyHours = {};
  const prepDailyHours = {};
  const guidanceDailyHours = {};
  const dutyDailyHours = {};
  const dutyDailyStatuses = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const status = currentStatuses[day];
    const dateStr = formatDateString(year, month, day);
    const dateObj = new Date(year, month - 1, day, 12, 0, 0);
    const dow = getScheduleDayOfWeek(dateObj.getDay());

    // Fiili olarak onaylanmış ('confirmed'), elle girilmiş ('manual') veya izinli/raporlu günler KORUNUR!
    const isProtected =
      status === 'confirmed' ||
      status === 'manual' ||
      status === 'izinli' ||
      status === 'raporlu';

    if (isProtected) {
      continue;
    }

    // Hafta sonlarına (Cumartesi=6, Pazar=7) puantaj aktarımı yapılmaz
    const isWeekend = dow === 6 || dow === 7;
    if (isWeekend) {
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
        modifiedDaysCount++;
      }
      maasDailyHours[day] = null;
      excessDailyHours[day] = null;
      prepDailyHours[day] = null;
      guidanceDailyHours[day] = null;
      dutyDailyHours[day] = null;
      continue;
    }

    // Admin tarafından belirlenen tarih aralığı kontrolü (başlangıç ve bitiş dahil)
    const isOutsidePeriod =
      Boolean(periodStartDate && dateStr < periodStartDate) ||
      Boolean(periodEndDate && dateStr > periodEndDate);

    const isOutsideTeacherActive =
      Boolean(teacher.startDate && dateStr < teacher.startDate) ||
      Boolean(teacher.departureDate && dateStr > teacher.departureDate);

    const isOutsideSchedule =
      Boolean(schedule?.effectiveStartDate && dateStr < schedule.effectiveStartDate) ||
      Boolean(schedule?.effectiveEndDate && dateStr > schedule.effectiveEndDate);

    if (isOutsidePeriod || isOutsideTeacherActive || isOutsideSchedule) {
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
        modifiedDaysCount++;
      }
      maasDailyHours[day] = null;
      excessDailyHours[day] = null;
      prepDailyHours[day] = null;
      guidanceDailyHours[day] = null;
      dutyDailyHours[day] = null;
      continue;
    }

    // Resmî Tatil
    const holiday = getOfficialHolidayInfo(year, month, day);
    if (holiday.isHoliday && !holiday.isHalfDay) {
      if (currentDailyHours[day] !== null || currentStatuses[day] !== 'tatil') {
        currentDailyHours[day] = null;
        currentStatuses[day] = 'tatil';
        modifiedDaysCount++;
      }
      maasDailyHours[day] = null;
      excessDailyHours[day] = null;
      prepDailyHours[day] = null;
      guidanceDailyHours[day] = null;
      dutyDailyHours[day] = null;
      continue;
    }

    // MEB Dağılım Çizelgesindeki "Toplam Ek Ders" Sütunundaki Değer
    const breakdownItem = weeklyMebBreakdown.dailyBreakdown[dow];
    let plannedEkDers = breakdownItem?.totalDailyAdditionalHours || 0;

    if (holiday.isHoliday && holiday.isHalfDay) {
      plannedEkDers = Math.ceil(plannedEkDers / 2);
    }

    if (plannedEkDers > 0) {
      if (currentDailyHours[day] !== plannedEkDers || currentStatuses[day] !== 'planned') {
        currentDailyHours[day] = plannedEkDers;
        currentStatuses[day] = 'planned';
        modifiedDaysCount++;
      }

      maasDailyHours[day] = breakdownItem?.maasKarsiligiHours || 0;
      excessDailyHours[day] = breakdownItem?.excessLessonHours || 0;
      prepDailyHours[day] = breakdownItem?.prepPlanningHours || 0;
      guidanceDailyHours[day] = breakdownItem?.guidanceHours || 0;
      if (breakdownItem?.dutyHours) {
        dutyDailyHours[day] = breakdownItem.dutyHours;
        dutyDailyStatuses[day] = 'planned';
      } else {
        dutyDailyHours[day] = null;
      }
    } else {
      if (currentStatuses[day] === 'planned' || !status) {
        if (currentDailyHours[day] !== null || currentStatuses[day] !== undefined) {
          currentDailyHours[day] = null;
          delete currentStatuses[day];
          modifiedDaysCount++;
        }
      }
      maasDailyHours[day] = null;
      excessDailyHours[day] = null;
      prepDailyHours[day] = null;
      guidanceDailyHours[day] = null;
      dutyDailyHours[day] = null;
    }
  }

  const totalHours = Object.values(currentDailyHours).reduce((sum, h) => sum + (h || 0), 0);
  const monthlyMaasHours = Object.values(maasDailyHours).reduce((a, b) => a + (b || 0), 0);
  const monthlyExcessHours = Object.values(excessDailyHours).reduce((a, b) => a + (b || 0), 0);
  const monthlyPrepHours = Object.values(prepDailyHours).reduce((a, b) => a + (b || 0), 0);
  const monthlyGuidanceHours = Object.values(guidanceDailyHours).reduce((a, b) => a + (b || 0), 0);
  const dutyTotalHours = Object.values(dutyDailyHours).reduce((a, b) => a + (b || 0), 0);
  const dutyEstimatedPayment = Math.round(dutyTotalHours * hourlyRate * 100) / 100;

  const payableTotalHours = totalHours;
  const bonusFiveToOneHours = monthlyPrepHours + monthlyGuidanceHours;
  const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;

  const updatedRow = {
    teacherId: teacher.id,
    schoolId: teacher.schoolId,
    year,
    month,
    dailyHours: currentDailyHours,
    dailyStatuses: currentStatuses,
    totalHours,
    bonusFiveToOneHours,
    payableTotalHours,
    estimatedPayment,
    dutyDailyHours,
    dutyDailyStatuses,
    dutyTotalHours,
    dutyEstimatedPayment,
    maasDailyHours,
    excessDailyHours,
    prepDailyHours,
    guidanceDailyHours,
    monthlyMaasHours,
    monthlyExcessHours,
    monthlyPrepHours,
    monthlyGuidanceHours,
  };

  return { updatedRow, modifiedDaysCount, wasLocked: false };
}

// ====================================================================
// TEST AKIŞI
// ====================================================================

// Test Öğretmeni
const teacher = {
  id: 'teacher-nov-1',
  schoolId: 'school-752140',
  fullName: 'Fatma Şahin',
  branch: 'Fizik',
  employmentType: 'sozlesmeli',
  hourlyRate: 220.57,
  hasGuardDuty: true,
  guardDutyDay: 3, // Çarşamba nöbetçi
  hasClassGuidance: false,
  isActive: true,
};

const rules = {
  ucretliHourlyRate: 220.57,
  gunduzHourlyRate: 220.57,
  nobetHoursPerWeek: 3,
};

// Çizelgede Pzt: 3, Salı: 6, Çar: 4, Per: 2, Cum: 3 veren haftalık program
const schedule = {
  id: 'sched-nov-1',
  teacherId: teacher.id,
  schoolId: teacher.schoolId,
  totalWeeklyHours: 25,
  lessons: [
    { dayOfWeek: 1, lessonCount: 6, lessonType: 'normal' },
    { dayOfWeek: 1, lessonCount: 2, lessonType: 'dyk' },
    { dayOfWeek: 2, lessonCount: 6, lessonType: 'normal' },
    { dayOfWeek: 2, lessonCount: 6, lessonType: 'dyk' },
    { dayOfWeek: 3, lessonCount: 4, lessonType: 'normal' },
    { dayOfWeek: 4, lessonCount: 2, lessonType: 'normal' },
    { dayOfWeek: 5, lessonCount: 2, lessonType: 'normal' },
  ],
};

console.log('--- TEST 1: MEB Dağılım Çizelgesi Günlük Değerleri Doğrulama ---');
const breakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule, rules });
assert.strictEqual(breakdown.dailyBreakdown[1].totalDailyAdditionalHours, 3, 'Pazartesi 3 saat olmalı');
assert.strictEqual(breakdown.dailyBreakdown[2].totalDailyAdditionalHours, 6, 'Salı 6 saat olmalı');
assert.strictEqual(breakdown.dailyBreakdown[3].totalDailyAdditionalHours, 4, 'Çarşamba 4 saat olmalı');
assert.strictEqual(breakdown.dailyBreakdown[4].totalDailyAdditionalHours, 2, 'Perşembe 2 saat olmalı');
assert.strictEqual(breakdown.dailyBreakdown[5].totalDailyAdditionalHours, 3, 'Cuma 3 saat olmalı');
console.log('✓ TEST 1 GEÇTİ: Çizelge değerleri Pzt: 3, Sal: 6, Çar: 4, Per: 2, Cum: 3 doğrulandı.\n');

console.log('--- TEST 2: Admin Tarih Aralığı 1–30 Kasım (Tüm Ay Boyunca Dağıtım) ---');
// Admin tarafından belirlenen aktif tarih aralığı: 2026-11-01 ile 2026-11-30
const adminStartDate = '2026-11-01';
const adminEndDate = '2026-11-30';

const syncNov = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: 2026,
  month: 11, // Kasım (30 gün)
  periodStartDate: adminStartDate,
  periodEndDate: adminEndDate,
  rules,
});
const rowNov = syncNov.updatedRow;

// Kasım 2026 Takvim Günleri:
// Pazartesiler: 2, 9, 16, 23, 30 Kasım -> HEPSİ 3 SAAT OLMALI
const mondays = [2, 9, 16, 23, 30];
mondays.forEach((day) => {
  assert.strictEqual(rowNov.dailyHours[day], 3, `Kasım ${day} Pazartesi günü 3 saat olmalı`);
});

// Salılar: 3, 10, 17, 24 Kasım -> HEPSİ 6 SAAT OLMALI
const tuesdays = [3, 10, 17, 24];
tuesdays.forEach((day) => {
  assert.strictEqual(rowNov.dailyHours[day], 6, `Kasım ${day} Salı günü 6 saat olmalı`);
});

// Çarşambalar: 4, 11, 18, 25 Kasım -> HEPSİ 4 SAAT OLMALI
const wednesdays = [4, 11, 18, 25];
wednesdays.forEach((day) => {
  assert.strictEqual(rowNov.dailyHours[day], 4, `Kasım ${day} Çarşamba günü 4 saat olmalı`);
});

// Perşembeler: 5, 12, 19, 26 Kasım -> HEPSİ 2 SAAT OLMALI
const thursdays = [5, 12, 19, 26];
thursdays.forEach((day) => {
  assert.strictEqual(rowNov.dailyHours[day], 2, `Kasım ${day} Perşembe günü 2 saat olmalı`);
});

// Cumalar: 6, 13, 20, 27 Kasım -> HEPSİ 3 SAAT OLMALI
const fridays = [6, 13, 20, 27];
fridays.forEach((day) => {
  assert.strictEqual(rowNov.dailyHours[day], 3, `Kasım ${day} Cuma günü 3 saat olmalı`);
});

// Hafta sonları: 1, 7, 8, 14, 15, 21, 22, 28, 29 Kasım -> DERS YAZILMAMALI (null)
const weekends = [1, 7, 8, 14, 15, 21, 22, 28, 29];
weekends.forEach((day) => {
  assert.ok(!rowNov.dailyHours[day], `Kasım ${day} hafta sonu gününe ek ders yazılmamalı`);
});

console.log('✓ TEST 2 GEÇTİ: Ek dersler sadece ilk haftaya değil, 1–30 Kasım arasındaki tüm Pazartesi (5 gün), Salı (4 gün), Çarşamba (4 gün), Perşembe (4 gün) ve Cuma (4 gün) günlerine eksiksiz dağıtıldı.\n');

console.log('--- TEST 3: Tekrar Çalıştırma ve Idempotency (Mükerrer Ekleme Engeli) ---');
// Aynı aktarımı tekrar çalıştırıyoruz (aynı satır üzerine)
const syncNovSecondRun = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: 2026,
  month: 11,
  existingRow: rowNov,
  periodStartDate: adminStartDate,
  periodEndDate: adminEndDate,
  rules,
});
const rowNovSecond = syncNovSecondRun.updatedRow;

// Saatlerin üst üste eklenmediğini (3 -> 6 veya 6 -> 12 olmadığını), tam olarak aynı kaldığını kontrol et
mondays.forEach((day) => {
  assert.strictEqual(rowNovSecond.dailyHours[day], 3, `Tekrar çalıştırmada ${day} Kasım Pazartesi yine 3 saat olmalı`);
});
tuesdays.forEach((day) => {
  assert.strictEqual(rowNovSecond.dailyHours[day], 6, `Tekrar çalıştırmada ${day} Kasım Salı yine 6 saat olmalı`);
});
assert.strictEqual(rowNovSecond.totalHours, rowNov.totalHours, 'Toplam saat mükerrer artmamalı');
assert.strictEqual(rowNovSecond.payableTotalHours, rowNov.payableTotalHours, 'Ödenecek saat aynı kalmalı');

console.log('✓ TEST 3 GEÇTİ: Aktarım tekrar çalıştırıldığında saatler asla üst üste eklenmedi; sonuç %100 kararlı ve idempotent.\n');

console.log('--- TEST 4: Admin Tarih Aralığını Değiştirdiğinde Kontrollü Güncelleme ---');
// Admin tarih aralığını 9 Kasım - 20 Kasım olarak daralttı (2 haftalık dönem)
const newAdminStartDate = '2026-11-09';
const newAdminEndDate = '2026-11-20';

// Öğretmenin 10 Kasım Salı hücresine okul kullanıcısı elle confirmed bir not/saat girmiş olsun
const rowWithConfirmedCell = {
  ...rowNov,
  dailyHours: { ...rowNov.dailyHours, 10: 7 }, // 6 yerine elle 7 yapıldı
  dailyStatuses: { ...rowNov.dailyStatuses, 10: 'confirmed' },
};

const resyncNewRange = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: 2026,
  month: 11,
  existingRow: rowWithConfirmedCell,
  periodStartDate: newAdminStartDate,
  periodEndDate: newAdminEndDate,
  rules,
});
const updatedRangeRow = resyncNewRange.updatedRow;

// 1-8 Kasım (aralık dışı): planned saatler temizlenmiş olmalı
assert.strictEqual(updatedRangeRow.dailyHours[2], null, '2 Kasım aralık dışı olduğundan temizlenmeli');
assert.strictEqual(updatedRangeRow.dailyHours[3], null, '3 Kasım aralık dışı olduğundan temizlenmeli');
assert.strictEqual(updatedRangeRow.dailyHours[4], null, '4 Kasım aralık dışı olduğundan temizlenmeli');
assert.strictEqual(updatedRangeRow.dailyHours[5], null, '5 Kasım aralık dışı olduğundan temizlenmeli');
assert.strictEqual(updatedRangeRow.dailyHours[6], null, '6 Kasım aralık dışı olduğundan temizlenmeli');

// 9-20 Kasım (aralık içi): saatler korunmalı veya dağıtılmalı
assert.strictEqual(updatedRangeRow.dailyHours[9], 3, '9 Kasım Pazartesi 3 saat olmalı');
assert.strictEqual(updatedRangeRow.dailyHours[10], 7, '10 Kasım onaylanmış manuel saat (7) korunmalı, ezilmemeli');
assert.strictEqual(updatedRangeRow.dailyStatuses[10], 'confirmed');
assert.strictEqual(updatedRangeRow.dailyHours[11], 4, '11 Kasım Çarşamba 4 saat olmalı');
assert.strictEqual(updatedRangeRow.dailyHours[12], 2, '12 Kasım Perşembe 2 saat olmalı');
assert.strictEqual(updatedRangeRow.dailyHours[13], 3, '13 Kasım Cuma 3 saat olmalı');

// 21-30 Kasım (aralık dışı): planned saatler temizlenmiş olmalı
assert.strictEqual(updatedRangeRow.dailyHours[23], null, '23 Kasım aralık dışı temizlenmeli');
assert.strictEqual(updatedRangeRow.dailyHours[30], null, '30 Kasım aralık dışı temizlenmeli');

console.log('✓ TEST 4 GEÇTİ: Admin tarih aralığını değiştirdiğinde aralık dışı günler temizlendi, aralık içi saatler ve manuel onaylar eksiksiz korundu.\n');

console.log('================================================================');
console.log('TÜM TARİH VE DAĞILIM ENTEGRASYON TESTLERİ BAŞARIYLA GEÇTİ! (100%)');
console.log('================================================================');

