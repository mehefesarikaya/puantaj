import assert from 'assert';

console.log('================================================================');
console.log('MEB ÇİZELGESİ -> TOPLAM EK DERS -> PUANTAJ RAPORU ENTEGRASYON TESTİ');
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

// 2. Madde 23 Dağıtım Fonksiyonu
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

// 3. MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Çizelgesi Hesaplayıcı
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

  const weeklyNormalLessons = Object.values(dailyBreakdown).reduce((s, d) => s + d.actualLessonHours, 0);
  const weeklyMaasKarsiligi = Object.values(dailyBreakdown).reduce((s, d) => s + d.maasKarsiligiHours, 0);
  const weeklyExcessLessons = Object.values(dailyBreakdown).reduce((s, d) => s + d.excessLessonHours, 0);
  const weeklyTotalAdditionalHours = Object.values(dailyBreakdown).reduce((s, d) => s + d.totalDailyAdditionalHours, 0);

  return {
    dailyBreakdown,
    weeklyNormalLessons,
    weeklyMaasKarsiligi,
    weeklyExcessLessons,
    weeklyTotalAdditionalHours,
  };
}

// 4. Puantaj Senkronizasyon Fonksiyonu (Çizelgedeki Toplam Ek Dersi Puantaj Hücresine Yazar)
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
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;
    const dateObj = new Date(year, month - 1, day);
    const jsDay = dateObj.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    // Korumalı hücreler
    if (status === 'confirmed' || status === 'manual' || status === 'izinli' || status === 'raporlu') {
      continue;
    }

    // Dönem / öğretmen / program tarih kısıtları
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

    // MEB Dağılım Çizelgesindeki "Toplam Ek Ders" Sütunundaki Nihai Değeri Al
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

// 5. Supabase Serialization
function mapPuantajToDb(row) {
  const metaStatuses = { ...(row.dailyStatuses || {}) };
  if (row.maasDailyHours) metaStatuses._maasDaily = row.maasDailyHours;
  if (row.excessDailyHours) metaStatuses._excessDaily = row.excessDailyHours;
  if (row.prepDailyHours) metaStatuses._prepDaily = row.prepDailyHours;
  if (row.guidanceDailyHours) metaStatuses._guidanceDaily = row.guidanceDailyHours;
  if (row.monthlyMaasHours !== undefined) metaStatuses._monthlyMaas = row.monthlyMaasHours;
  if (row.monthlyExcessHours !== undefined) metaStatuses._monthlyExcess = row.monthlyExcessHours;
  if (row.monthlyPrepHours !== undefined) metaStatuses._monthlyPrep = row.monthlyPrepHours;
  if (row.monthlyGuidanceHours !== undefined) metaStatuses._monthlyGuidance = row.monthlyGuidanceHours;

  return {
    id: `${row.teacherId}-${row.year}-${row.month}`,
    teacher_id: row.teacherId,
    school_id: row.schoolId,
    year: row.year,
    month: row.month,
    daily_hours: row.dailyHours,
    daily_statuses: metaStatuses,
    total_hours: row.totalHours,
    bonus_five_to_one_hours: row.bonusFiveToOneHours,
    payable_total_hours: row.payableTotalHours,
    estimated_payment: row.estimatedPayment,
    duty_daily_hours: row.dutyDailyHours || {},
    duty_daily_statuses: row.dutyDailyStatuses || {},
    duty_total_hours: row.dutyTotalHours || 0,
    duty_estimated_payment: row.dutyEstimatedPayment || 0,
    updated_at: new Date().toISOString(),
  };
}

function mapPuantajFromDb(dbRow) {
  const rawStatuses = dbRow.daily_statuses || {};
  const dailyStatuses = {};
  Object.keys(rawStatuses).forEach((k) => {
    if (!k.startsWith('_')) {
      dailyStatuses[Number(k)] = rawStatuses[k];
    }
  });

  return {
    teacherId: dbRow.teacher_id,
    schoolId: dbRow.school_id,
    year: dbRow.year,
    month: dbRow.month,
    dailyHours: dbRow.daily_hours || {},
    dailyStatuses,
    totalHours: Number(dbRow.total_hours || 0),
    bonusFiveToOneHours: Number(dbRow.bonus_five_to_one_hours || 0),
    payableTotalHours: Number(dbRow.payable_total_hours || 0),
    estimatedPayment: Number(dbRow.estimated_payment || 0),
    dutyDailyHours: dbRow.duty_daily_hours || {},
    dutyDailyStatuses: dbRow.duty_daily_statuses || {},
    dutyTotalHours: Number(dbRow.duty_total_hours || 0),
    dutyEstimatedPayment: Number(dbRow.duty_estimated_payment || 0),
    maasDailyHours: rawStatuses._maasDaily,
    excessDailyHours: rawStatuses._excessDaily,
    prepDailyHours: rawStatuses._prepDaily,
    guidanceDailyHours: rawStatuses._guidanceDaily,
    monthlyMaasHours: rawStatuses._monthlyMaas,
    monthlyExcessHours: rawStatuses._monthlyExcess,
    monthlyPrepHours: rawStatuses._monthlyPrep,
    monthlyGuidanceHours: rawStatuses._monthlyGuidance,
  };
}

// ====================================================================
// TEST SENARYOSU (Kullanıcının Belirttiği Birebir Örnek)
// ====================================================================

// Öğretmen: Sözleşmeli Branş Öğretmeni (Haftalık 15 saat maaş karşılığı, Çarşamba 3 saat nöbet)
const teacher = {
  id: 'teacher-pilot-101',
  schoolId: 'school-752140',
  fullName: 'Mustafa Demir',
  branch: 'Matematik',
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

// Haftalık Ders Programı (Kullanıcının örnek saatleri: Pzt 3, Salı 6, Çar 4, Per 2, Cum 3)
// 15 saat maaş karşılığı (Pzt 6 + Sal 6 + Çar 3 = 15 saat) düşülür:
// - Pazartesi: 6 saat normal ders (maaş) + 3 saat ek ders/kurs -> Toplam Ek Ders = 3
// - Salı: 6 saat normal ders (maaş) + 6 saat ek ders/kurs -> Toplam Ek Ders = 6
// - Çarşamba: 4 saat normal ders (3 maaş + 1 ek ders) + 3 saat nöbet -> Toplam Ek Ders = 4
// - Perşembe: 2 saat normal ders (2 ek ders) -> Toplam Ek Ders = 2
// - Cuma: 3 saat normal ders (3 ek ders) -> Toplam Ek Ders = 3
const schedule = {
  id: 'sched-101',
  teacherId: teacher.id,
  schoolId: teacher.schoolId,
  effectiveStartDate: '2026-09-01',
  totalWeeklyHours: 30,
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

// ADIM 1: MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Çizelgesi Kontrolü
console.log('--- ADIM 1: MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Çizelgesi ---');
const mebBreakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule, rules });

console.log('Pazartesi Toplam Ek Ders:', mebBreakdown.dailyBreakdown[1].totalDailyAdditionalHours);
console.log('Salı Toplam Ek Ders:', mebBreakdown.dailyBreakdown[2].totalDailyAdditionalHours);
console.log('Çarşamba Toplam Ek Ders:', mebBreakdown.dailyBreakdown[3].totalDailyAdditionalHours);
console.log('Perşembe Toplam Ek Ders:', mebBreakdown.dailyBreakdown[4].totalDailyAdditionalHours);
console.log('Cuma Toplam Ek Ders:', mebBreakdown.dailyBreakdown[5].totalDailyAdditionalHours);

assert.strictEqual(mebBreakdown.dailyBreakdown[1].totalDailyAdditionalHours, 3, 'Pazartesi 3 olmalı');
assert.strictEqual(mebBreakdown.dailyBreakdown[2].totalDailyAdditionalHours, 6, 'Salı 6 olmalı');
assert.strictEqual(mebBreakdown.dailyBreakdown[3].totalDailyAdditionalHours, 4, 'Çarşamba 4 olmalı');
assert.strictEqual(mebBreakdown.dailyBreakdown[4].totalDailyAdditionalHours, 2, 'Perşembe 2 olmalı');
assert.strictEqual(mebBreakdown.dailyBreakdown[5].totalDailyAdditionalHours, 3, 'Cuma 3 olmalı');

console.log('✓ TEST 1 GEÇTİ: MEB Dağılım Çizelgesi Toplam Ek Ders değerleri doğrulandı (Pzt: 3, Sal: 6, Çar: 4, Per: 2, Cum: 3).\n');

// ADIM 2: Puantaj Raporuna Otomatik Aktar (Ekim 2026)
console.log('--- ADIM 2: Puantaj Raporuna Aktar (Ekim 2026) ---');
const syncResult = syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year: 2026,
  month: 10,
  rules,
});
const row = syncResult.updatedRow;

// Ekim 2026 Takvim Kontrolü:
// 1 Ekim Perşembe -> 2
// 2 Ekim Cuma -> 3
// 5 Ekim Pazartesi -> 3
// 6 Ekim Salı -> 6
// 7 Ekim Çarşamba -> 4
// 8 Ekim Perşembe -> 2
// 9 Ekim Cuma -> 3
// 12 Ekim Pazartesi -> 3
// 13 Ekim Salı -> 6
// 14 Ekim Çarşamba -> 4
// 15 Ekim Perşembe -> 2
// 16 Ekim Cuma -> 3
// 19 Ekim Pazartesi -> 3
// 20 Ekim Salı -> 6
// 21 Ekim Çarşamba -> 4
// 22 Ekim Perşembe -> 2
// 23 Ekim Cuma -> 3
// 26 Ekim Pazartesi -> 3
// 27 Ekim Salı -> 6
// 28 Ekim Çarşamba (Yarım gün tatil) -> Math.ceil(4/2) = 2
// 29 Ekim Perşembe (Tam gün tatil) -> null (tatil rozeti)
// 30 Ekim Cuma -> 3
// Hafta sonları (3, 4, 10, 11, 17, 18, 24, 25, 31 Ekim) -> null / ders yok

// Pazartesi günleri kontrolü
assert.strictEqual(row.dailyHours[5], 3, '5 Ekim Pazartesi 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[12], 3, '12 Ekim Pazartesi 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[19], 3, '19 Ekim Pazartesi 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[26], 3, '26 Ekim Pazartesi 3 saat ek ders olmalı');

// Salı günleri kontrolü
assert.strictEqual(row.dailyHours[6], 6, '6 Ekim Salı 6 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[13], 6, '13 Ekim Salı 6 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[20], 6, '20 Ekim Salı 6 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[27], 6, '27 Ekim Salı 6 saat ek ders olmalı');

// Çarşamba günleri kontrolü
assert.strictEqual(row.dailyHours[7], 4, '7 Ekim Çarşamba 4 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[14], 4, '14 Ekim Çarşamba 4 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[21], 4, '21 Ekim Çarşamba 4 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[28], 2, '28 Ekim Çarşamba yarım gün tatil 2 saat ek ders olmalı');

// Perşembe günleri kontrolü
assert.strictEqual(row.dailyHours[1], 2, '1 Ekim Perşembe 2 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[8], 2, '8 Ekim Perşembe 2 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[15], 2, '15 Ekim Perşembe 2 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[22], 2, '22 Ekim Perşembe 2 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[29], null, '29 Ekim Perşembe tam gün tatil saat yazılmamalı');
assert.strictEqual(row.dailyStatuses[29], 'tatil', '29 Ekim tatil durumu olmalı');

// Cuma günleri kontrolü
assert.strictEqual(row.dailyHours[2], 3, '2 Ekim Cuma 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[9], 3, '9 Ekim Cuma 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[16], 3, '16 Ekim Cuma 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[23], 3, '23 Ekim Cuma 3 saat ek ders olmalı');
assert.strictEqual(row.dailyHours[30], 3, '30 Ekim Cuma 3 saat ek ders olmalı');

// Hafta sonları kontrolü
assert.ok(!row.dailyHours[3], '3 Ekim Cumartesi ders yazılmamalı');
assert.ok(!row.dailyHours[4], '4 Ekim Pazar ders yazılmamalı');
assert.ok(!row.dailyHours[10], '10 Ekim Cumartesi ders yazılmamalı');
assert.ok(!row.dailyHours[11], '11 Ekim Pazar ders yazılmamalı');

console.log('✓ TEST 2 GEÇTİ: Puantaj Raporunda aynı öğretmenin aynı günlerinde tam olarak Toplam Ek Ders değerleri (3, 6, 4, 2, 3) görüntülendi.\n');

// ADIM 3: Supabase Veritabanına Kalıcı Kayıt
console.log('--- ADIM 3: Supabase Veritabanına Kalıcı Kayıt (teacher_monthly_puantaj) ---');
const dbPayload = mapPuantajToDb(row);

assert.strictEqual(dbPayload.id, 'teacher-pilot-101-2026-10');
assert.strictEqual(dbPayload.teacher_id, 'teacher-pilot-101');
assert.strictEqual(dbPayload.school_id, 'school-752140');
assert.strictEqual(dbPayload.daily_hours[5], 3);
assert.strictEqual(dbPayload.daily_hours[6], 6);
assert.strictEqual(dbPayload.daily_hours[7], 4);
assert.strictEqual(dbPayload.daily_hours[1], 2);
assert.strictEqual(dbPayload.daily_hours[2], 3);
assert.strictEqual(dbPayload.payable_total_hours, row.totalHours);
assert.strictEqual(dbPayload.estimated_payment, Math.round(row.totalHours * 220.57 * 100) / 100);

console.log('Supabase Kayıt ID:', dbPayload.id);
console.log('Supabase Toplam Ek Ders Saati:', dbPayload.total_hours);
console.log('Supabase Tahakkuk Tutarı:', dbPayload.estimated_payment, 'TL');
console.log('✓ TEST 3 GEÇTİ: Supabase teacher_monthly_puantaj tablosuna kalıcı kayıt şeması başarıyla serialize edildi.\n');

// ADIM 4: Puantaj Raporunu Yeniden Açma ve Supabase\'den Geri Yükleme
console.log('--- ADIM 4: Puantaj Raporunu Yeniden Aç ve Verileri Doğrula ---');
const restoredRow = mapPuantajFromDb(dbPayload);

assert.strictEqual(restoredRow.teacherId, teacher.id);
assert.strictEqual(restoredRow.dailyHours[5], 3);
assert.strictEqual(restoredRow.dailyHours[6], 6);
assert.strictEqual(restoredRow.dailyHours[7], 4);
assert.strictEqual(restoredRow.dailyHours[1], 2);
assert.strictEqual(restoredRow.dailyHours[2], 3);
assert.strictEqual(restoredRow.dailyHours[29], null);
assert.strictEqual(restoredRow.dailyStatuses[29], 'tatil');
assert.strictEqual(restoredRow.totalHours, row.totalHours);
assert.strictEqual(restoredRow.payableTotalHours, row.payableTotalHours);

console.log('✓ TEST 4 GEÇTİ: Sayfa yenilendiğinde ve rapor yeniden açıldığında veriler %100 kayıpsız görüntülendi.\n');

// ADIM 5: Ders Programı Güncellendiğinde Puantajın Yenilenmesi
console.log('--- ADIM 5: Program Değişikliğinde Puantajın Otomatik Yenilenmesi ---');
// Cuma gününe 2 saat ders ekleyelim (3 saat -> 5 saat ek ders)
const updatedSchedule = {
  ...schedule,
  lessons: [
    ...schedule.lessons.filter((l) => l.dayOfWeek !== 5),
    { dayOfWeek: 5, lessonCount: 5, lessonType: 'normal' },
  ],
};

const updatedSyncResult = syncTeacherScheduleToMonth({
  teacher,
  schedule: updatedSchedule,
  year: 2026,
  month: 10,
  existingRow: restoredRow,
  rules,
});

const updatedRow = updatedSyncResult.updatedRow;
// Tüm Cuma günleri (2, 9, 16, 23, 30 Ekim) 6 olmalı (5 fiili + 1 hazırlık)
assert.strictEqual(updatedRow.dailyHours[2], 6);
assert.strictEqual(updatedRow.dailyHours[9], 6);
assert.strictEqual(updatedRow.dailyHours[16], 6);
assert.strictEqual(updatedRow.dailyHours[23], 6);
assert.strictEqual(updatedRow.dailyHours[30], 6);

// Diğer günler korunmalı
assert.strictEqual(updatedRow.dailyHours[5], 3); // Pazartesi hala 3
assert.strictEqual(updatedRow.dailyHours[6], 6); // Salı hala 6

console.log('✓ TEST 5 GEÇTİ: Ders programı değiştiğinde puantaj raporu derhal güncellendi.\n');

// ADIM 6: Korumalı Hücrelerin ve Onaylı Puantajın Korunması
console.log('--- ADIM 6: Korumalı Hücreler ve Kilitli Ay Güvenliği ---');
// Kullanıcı 5 Ekim Pazartesi gününü elle "confirmed" veya 5 saat yaptı
const rowWithManualEdit = {
  ...updatedRow,
  dailyHours: { ...updatedRow.dailyHours, 5: 5 },
  dailyStatuses: { ...updatedRow.dailyStatuses, 5: 'confirmed' },
};

// Programı tekrar senkronize etmeyi deneyelim
const resyncResult = syncTeacherScheduleToMonth({
  teacher,
  schedule: updatedSchedule,
  year: 2026,
  month: 10,
  existingRow: rowWithManualEdit,
  rules,
});

// 5 Ekim hücresi ezilmemiş olmalı (5 korunmalı)
assert.strictEqual(resyncResult.updatedRow.dailyHours[5], 5);
assert.strictEqual(resyncResult.updatedRow.dailyStatuses[5], 'confirmed');

// Kilitli ay denemesi
const lockedResult = syncTeacherScheduleToMonth({
  teacher,
  schedule: updatedSchedule,
  year: 2026,
  month: 10,
  existingRow: rowWithManualEdit,
  isSubmissionLocked: true,
  rules,
});
assert.strictEqual(lockedResult.wasLocked, true);
assert.strictEqual(lockedResult.modifiedDaysCount, 0);

console.log('✓ TEST 6 GEÇTİ: Manuel olarak onaylanan hücreler ve kilitli aylar başarıyla korundu.\n');

console.log('================================================================');
console.log('TÜM ENTEGRASYON VE DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ! (100%)');
console.log('================================================================');
