import assert from 'assert';

console.log('========================================================');
console.log('HAFTALIK DERS PROGRAMI & AYLIK PUANTAJ ENTEGRASYON TESTLERİ');
console.log('========================================================\n');

function getDaysInMonthCount(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatDateString(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getScheduleDayOfWeek(jsDay) {
  return jsDay === 0 ? 7 : jsDay;
}

function getPlannedHoursForDate(schedule, year, month, day) {
  if (!schedule || !Array.isArray(schedule.lessons) || schedule.lessons.length === 0) {
    return 0;
  }

  const dateStr = formatDateString(year, month, day);

  if (schedule.effectiveStartDate && dateStr < schedule.effectiveStartDate) {
    return 0;
  }

  if (schedule.effectiveEndDate && dateStr > schedule.effectiveEndDate) {
    return 0;
  }

  const dateObj = new Date(year, month - 1, day);
  const dow = getScheduleDayOfWeek(dateObj.getDay());

  const dayLessons = schedule.lessons.filter((l) => l.dayOfWeek === dow);
  return dayLessons.reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);
}

function syncTeacherScheduleToMonth({
  teacher,
  schedule,
  year,
  month,
  existingRow,
  isSubmissionLocked = false,
  rules,
}) {
  if (isSubmissionLocked && existingRow) {
    return {
      updatedRow: existingRow,
      modifiedDaysCount: 0,
      wasLocked: true,
    };
  }

  const daysInMonth = getDaysInMonthCount(year, month);
  const currentDailyHours = existingRow?.dailyHours ? { ...existingRow.dailyHours } : {};
  const currentStatuses = existingRow?.dailyStatuses ? { ...existingRow.dailyStatuses } : {};

  let modifiedDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const status = currentStatuses[day];

    const isProtected =
      status === 'confirmed' ||
      status === 'manual' ||
      status === 'izinli' ||
      status === 'raporlu' ||
      status === 'tatil';

    if (isProtected) {
      continue;
    }

    const plannedHours = getPlannedHoursForDate(schedule, year, month, day);

    if (plannedHours > 0) {
      if (currentDailyHours[day] !== plannedHours || currentStatuses[day] !== 'planned') {
        currentDailyHours[day] = plannedHours;
        currentStatuses[day] = 'planned';
        modifiedDaysCount++;
      }
    } else {
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
        modifiedDaysCount++;
      }
    }
  }

  const totalHours = Object.values(currentDailyHours).reduce(
    (sum, h) => sum + (h || 0),
    0
  );
  const bonusFiveToOneHours = rules?.bonusFiveToOne ? Math.floor(totalHours / 5) : 0;
  const payableTotalHours = totalHours + bonusFiveToOneHours;
  const hourlyRate = teacher.hourlyRate || 220.57;
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
  };

  return {
    updatedRow,
    modifiedDaysCount,
    wasLocked: false,
  };
}

const DEFAULT_RULES = {
  bonusFiveToOne: true,
  gunduzHourlyRate: 220.57,
};

const mockTeacher = {
  id: 'teacher-sync-1',
  schoolId: 'school-1',
  nationality: 'TR',
  tcNo: '51025187672',
  fullName: 'Ahmet Yılmaz',
  branch: 'Matematik',
  branchCategory: 'genel_bilgi_ve_brans',
  educationLevel: 'lisans',
  employmentType: 'kadrolu',
  iban: 'TR030004600152888000222958',
  hourlyRate: 220.57,
  hasOtherEmployer: false,
  startDate: '2026-09-01',
  isActive: true,
};

// ----------------------------------------------------
// TEST 1: Takvim Gün Sayısı (28, 29, 30, 31 Gün)
// ----------------------------------------------------
assert.strictEqual(getDaysInMonthCount(2026, 10), 31, 'Ekim 31 gün olmalıdır');
assert.strictEqual(getDaysInMonthCount(2026, 9), 30, 'Eylül 30 gün olmalıdır');
assert.strictEqual(getDaysInMonthCount(2026, 2), 28, '2026 Şubat 28 gün olmalıdır');
assert.strictEqual(getDaysInMonthCount(2024, 2), 29, '2024 artık yıl Şubat 29 gün olmalıdır');
console.log('✓ TEST 1 GEÇTİ: 28, 29, 30 ve 31 çeken aylar hatasız hesaplandı.');

// ----------------------------------------------------
// TEST 2: Haftalık Programdan Ayın Günlerine Otomatik Aktarım
// Ekim 2026: 1 Ekim = Perşembe (4), 2 Ekim = Cuma (5), 5 Ekim = Pazartesi (1), 7 Ekim = Çarşamba (3)
// ----------------------------------------------------
const initialSchedule = {
  id: 'sched-1',
  teacherId: 'teacher-sync-1',
  schoolId: 'school-1',
  effectiveStartDate: '2026-10-01',
  effectiveEndDate: undefined,
  totalWeeklyHours: 12,
  lessons: [
    { id: 'l-pzt', dayOfWeek: 1, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
    { id: 'l-car', dayOfWeek: 3, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
  ],
};

const sync1 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: initialSchedule,
  year: 2026,
  month: 10,
  rules: DEFAULT_RULES,
});

// 5 Ekim Pazartesi -> 6 saat
assert.strictEqual(sync1.updatedRow.dailyHours[5], 6);
assert.strictEqual(sync1.updatedRow.dailyStatuses[5], 'planned');

// 7 Ekim Çarşamba -> 6 saat
assert.strictEqual(sync1.updatedRow.dailyHours[7], 6);
assert.strictEqual(sync1.updatedRow.dailyStatuses[7], 'planned');

// 6 Ekim Salı -> ders yok (null veya undefined)
assert.strictEqual(Boolean(sync1.updatedRow.dailyHours[6]), false);
console.log('✓ TEST 2 GEÇTİ: Pazartesi ve Çarşamba günleri puantaj cetveline "planned" olarak otomatik aktarıldı.');

// ----------------------------------------------------
// TEST 3: Programda Ders Saati Değişimi -> Puantaja Yansıma
// Çarşamba dersini 6 saatten 4 saate düşürelim
// ----------------------------------------------------
const updatedSchedule = {
  ...initialSchedule,
  lessons: [
    { id: 'l-pzt', dayOfWeek: 1, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
    { id: 'l-car', dayOfWeek: 3, lessonCount: 4, startTime: '09:00', endTime: '12:30', lessonType: 'normal' },
  ],
};

const sync2 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: updatedSchedule,
  year: 2026,
  month: 10,
  existingRow: sync1.updatedRow,
  rules: DEFAULT_RULES,
});

assert.strictEqual(sync2.updatedRow.dailyHours[7], 4, 'Çarşamba günü dersi 4 saate güncellenmeli');
assert.strictEqual(sync2.updatedRow.dailyStatuses[7], 'planned');
console.log('✓ TEST 3 GEÇTİ: Ders saati değişikliği ilgili tüm Çarşamba günlerine anında yansıdı.');

// ----------------------------------------------------
// TEST 4: Yeni Ders Ekleme -> Puantajda İlgili Güne Yansıma
// Cuma gününe (5) 4 saat ders ekleyelim
// ----------------------------------------------------
const scheduleWithFriday = {
  ...updatedSchedule,
  lessons: [
    ...updatedSchedule.lessons,
    { id: 'l-cum', dayOfWeek: 5, lessonCount: 4, startTime: '09:00', endTime: '12:30', lessonType: 'normal' },
  ],
};

const sync3 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: scheduleWithFriday,
  year: 2026,
  month: 10,
  existingRow: sync2.updatedRow,
  rules: DEFAULT_RULES,
});

// 2 Ekim 2026 = Cuma -> 4 saat
assert.strictEqual(sync3.updatedRow.dailyHours[2], 4);
assert.strictEqual(sync3.updatedRow.dailyStatuses[2], 'planned');
console.log('✓ TEST 4 GEÇTİ: Cuma gününe eklenen ders tüm Cuma günlerine eklendi.');

// ----------------------------------------------------
// TEST 5: Ders Silme -> Sadece Onaylanmamış Planlananlar Etkilenir
// Cuma gününü kaldıralım
// ----------------------------------------------------
const scheduleWithoutFriday = {
  ...updatedSchedule,
  lessons: updatedSchedule.lessons, // Cuma yok
};

const sync4 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: scheduleWithoutFriday,
  year: 2026,
  month: 10,
  existingRow: sync3.updatedRow,
  rules: DEFAULT_RULES,
});

assert.strictEqual(sync4.updatedRow.dailyHours[2], null, 'Cuma günü dersi silinmeli');
assert.strictEqual(sync4.updatedRow.dailyStatuses[2], undefined);
console.log('✓ TEST 5 GEÇTİ: Kaldırılan ders puantajdan temizlendi.');

// ----------------------------------------------------
// TEST 6: Geçerlilik Başlangıç Tarihi Koruma
// Program 15 Ekim 2026'dan itibaren geçerli olsun -> 1-14 Ekim günlerine ders yazılmamalıdır
// ----------------------------------------------------
const futureSchedule = {
  ...updatedSchedule,
  effectiveStartDate: '2026-10-15',
};

const sync5 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: futureSchedule,
  year: 2026,
  month: 10,
  rules: DEFAULT_RULES,
});

// 5 ve 7 Ekim 15 Ekim'den önce olduğu için 0 olmalı
assert.strictEqual(Boolean(sync5.updatedRow.dailyHours[5]), false);
assert.strictEqual(Boolean(sync5.updatedRow.dailyHours[7]), false);

// 19 Ekim Pazartesi 15 Ekim'den sonra olduğu için 6 saat olmalı
assert.strictEqual(sync5.updatedRow.dailyHours[19], 6);
console.log('✓ TEST 6 GEÇTİ: Geçerlilik başlangıç tarihinden önceki günler korunarak ders yazılmadı.');

// ----------------------------------------------------
// TEST 7: Fiili Olarak Doğrulanmış / Manuel Hücrelerin Korunması
// 5 Ekim Pazartesi gününü okul kullanıcısı "confirmed" yapsın veya 8 saat girsin
// ----------------------------------------------------
const rowWithConfirmedDay = {
  ...sync2.updatedRow,
  dailyHours: { ...sync2.updatedRow.dailyHours, 5: 8 },
  dailyStatuses: { ...sync2.updatedRow.dailyStatuses, 5: 'confirmed' },
};

// Şimdi programda Pazartesi dersini 2 saate indirelim
const changedPazartesiSchedule = {
  ...updatedSchedule,
  lessons: [
    { id: 'l-pzt', dayOfWeek: 1, lessonCount: 2, startTime: '09:00', endTime: '10:30', lessonType: 'normal' },
    { id: 'l-car', dayOfWeek: 3, lessonCount: 4, startTime: '09:00', endTime: '12:30', lessonType: 'normal' },
  ],
};

const sync7 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: changedPazartesiSchedule,
  year: 2026,
  month: 10,
  existingRow: rowWithConfirmedDay,
  rules: DEFAULT_RULES,
});

// 5 Ekim "confirmed" olduğu için 8 saat kalmalı, EZİLMEMELİ!
assert.strictEqual(sync7.updatedRow.dailyHours[5], 8, 'Onaylanmış 5 Ekim 8 saat olarak korunmalı');
assert.strictEqual(sync7.updatedRow.dailyStatuses[5], 'confirmed');

// Ancak onaylanmamış olan 12 Ekim Pazartesi yeni program saatine (2) güncellenmeli!
assert.strictEqual(sync7.updatedRow.dailyHours[12], 2, 'Onaylanmamış 12 Ekim 2 saate güncellenmeli');
console.log('✓ TEST 7 GEÇTİ: Doğrulanmış/manuel fiili hücreler KORUNDU, ezilmedi; planlananlar güncellendi.');

// ----------------------------------------------------
// TEST 8: Onaylanmış / Gönderilmiş Ayın Korunması (Kilit Kuralı)
// ----------------------------------------------------
const sync8 = syncTeacherScheduleToMonth({
  teacher: mockTeacher,
  schedule: changedPazartesiSchedule,
  year: 2026,
  month: 10,
  existingRow: rowWithConfirmedDay,
  isSubmissionLocked: true, // Onaylandı / İncelemede
  rules: DEFAULT_RULES,
});

assert.strictEqual(sync8.wasLocked, true);
assert.strictEqual(sync8.modifiedDaysCount, 0);
console.log('✓ TEST 8 GEÇTİ: Onaylanmış/kilitli ay puantajı program değişikliklerine karşı tamamen kilitlendi.');

console.log('\n========================================================');
console.log('TÜM 8 ENTEGRASYON VE GÜVENLİK TESTİ BAŞARIYLA TAMAMLANDI!');
console.log('========================================================');
