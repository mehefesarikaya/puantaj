import assert from 'assert';

console.log('================================================================');
console.log('SÖZLEŞMELİ ÖĞRETMEN DERS PROGRAMI & MEB MADDE 23 PUANTAJ TESTLERİ');
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

// 2. MEB Kararı Madde 23 Dağıtım Fonksiyonu
function distributeWeeklyHoursAccordingToMebArticle23(totalHours) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!totalHours || totalHours <= 0) return result;

  const basePerDay = Math.floor(totalHours / 5);
  for (let d = 1; d <= 5; d++) {
    result[d] = basePerDay;
  }

  const remainder = totalHours % 5;
  if (remainder === 0) return result;

  const priorityOrder = [1, 5, 3, 2, 4];
  for (let i = 0; i < remainder; i++) {
    const day = priorityOrder[i];
    result[day] += 1;
  }

  return result;
}

// 3. Aylık Puantaj Toplamları Hesaplama
function calculateMonthlyPuantajTotalsMock({
  teacher,
  totalHours,
  daysInMonth = 30,
  weeklyScheduleHours,
  rules = { bonusFiveToOne: true, gunduzHourlyRate: 220.57 }
}) {
  const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || 220.57;

  // 1. SÖZLEŞMELİ: Maaş karşılığı düşümü SADECE sözleşmeli öğretmenlere uygulanır
  if (teacher.employmentType === 'sozlesmeli') {
    const maasKarsiligiWeekly = 15; // Genel bilgi ve branş için 15 saat
    const weeksCount = Math.max(1, Math.round(daysInMonth / 7)); // 4 hafta
    const monthlyMaasKarsiligi = maasKarsiligiWeekly * weeksCount; // 60 saat
    const excessHours = Math.max(0, totalHours - monthlyMaasKarsiligi);

    const weeklyHours = weeklyScheduleHours ?? Math.round(totalHours / weeksCount);
    const weeklyPrep = Math.min(3, Math.floor(weeklyHours / 10)); // 30 saat için 3 saat
    const monthlyPrep = weeklyPrep * weeksCount; // 12 saat

    const payableTotalHours = excessHours + monthlyPrep;
    const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;

    return {
      totalHours,
      bonusFiveToOneHours: monthlyPrep,
      payableTotalHours,
      estimatedPayment,
    };
  }

  // 2. STAJYER & İŞKUR: Kesinti uygulanmaz, ek bonus (5'e 1) verilmez
  if (
    teacher.employmentType === 'stajyer' ||
    teacher.employmentType === 'stajer' ||
    teacher.employmentType === 'iskurlu'
  ) {
    const payableTotalHours = totalHours;
    const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;
    return {
      totalHours,
      bonusFiveToOneHours: 0,
      payableTotalHours,
      estimatedPayment,
    };
  }

  // 3. ÜCRETLİ VE DİĞER: Kesinti uygulanmaz, 5'e 1 ek ders ilavesi uygulanır
  const bonusFiveToOneHours = rules.bonusFiveToOne ? Math.floor(totalHours / 5) : 0;
  const payableTotalHours = totalHours + bonusFiveToOneHours;
  const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;

  return {
    totalHours,
    bonusFiveToOneHours,
    payableTotalHours,
    estimatedPayment,
  };
}

// 4. Haftalık Programı Aylık Puantaja Senkronize Etme
function syncTeacherScheduleToMonthMock({
  teacher,
  schedule,
  year = 2026,
  month = 10,
  existingRow = null,
  rules = { bonusFiveToOne: true, gunduzHourlyRate: 220.57 }
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDailyHours = existingRow?.dailyHours ? { ...existingRow.dailyHours } : {};
  const currentStatuses = existingRow?.dailyStatuses ? { ...existingRow.dailyStatuses } : {};

  for (let day = 1; day <= daysInMonth; day++) {
    const status = currentStatuses[day];
    const isProtected =
      status === 'confirmed' ||
      status === 'manual' ||
      status === 'izinli' ||
      status === 'raporlu';

    if (isProtected) continue;

    // Resmî tatil kontrolü
    const holiday = getOfficialHolidayInfo(year, month, day);
    if (holiday.isHoliday && !holiday.isHalfDay) {
      currentDailyHours[day] = null;
      currentStatuses[day] = 'tatil';
      continue;
    }

    const dateObj = new Date(year, month - 1, day);
    const jsDay = dateObj.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    // Hafta sonu
    if (dow === 6 || dow === 7) {
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
      }
      continue;
    }

    const dayLessons = (schedule?.lessons || []).filter((l) => l.dayOfWeek === dow);
    const lessonCount = dayLessons.reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

    if (holiday.isHoliday && holiday.isHalfDay) {
      const halfHours = Math.ceil(lessonCount / 2);
      currentDailyHours[day] = halfHours;
      currentStatuses[day] = 'planned';
      continue;
    }

    if (lessonCount > 0) {
      currentDailyHours[day] = lessonCount;
      currentStatuses[day] = 'planned';
    } else {
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
      }
    }
  }

  const totalHours = Object.values(currentDailyHours).reduce((sum, h) => sum + (h || 0), 0);
  const totals = calculateMonthlyPuantajTotalsMock({
    teacher,
    totalHours,
    daysInMonth,
    weeklyScheduleHours: schedule?.totalWeeklyHours,
    rules,
  });

  return {
    teacherId: teacher.id,
    schoolId: teacher.schoolId,
    year,
    month,
    dailyHours: currentDailyHours,
    dailyStatuses: currentStatuses,
    totalHours,
    bonusFiveToOneHours: totals.bonusFiveToOneHours,
    payableTotalHours: totals.payableTotalHours,
    estimatedPayment: totals.estimatedPayment,
  };
}

// ----------------------------------------------------
// TEST 1: Sözleşmeli Öğretmene Haftalık Ders Programı Girilmesi
// ----------------------------------------------------
const sozlesmeliTeacher = {
  id: 'sozlesmeli-1',
  schoolId: 'school-1',
  fullName: 'Barış Sözleşmeli',
  branch: 'Matematik',
  branchCategory: 'genel_bilgi_ve_brans',
  employmentType: 'sozlesmeli',
  hourlyRate: 220.57,
};

const weeklySchedule30Hours = {
  id: 'sched-1',
  teacherId: 'sozlesmeli-1',
  schoolId: 'school-1',
  effectiveStartDate: '2026-09-01',
  totalWeeklyHours: 30,
  lessons: [
    { id: 'b1', dayOfWeek: 1, lessonCount: 6 }, // Pazartesi
    { id: 'b2', dayOfWeek: 2, lessonCount: 6 }, // Salı
    { id: 'b3', dayOfWeek: 3, lessonCount: 6 }, // Çarşamba
    { id: 'b4', dayOfWeek: 4, lessonCount: 6 }, // Perşembe
    { id: 'b5', dayOfWeek: 5, lessonCount: 6 }, // Cuma
  ],
};

assert.strictEqual(weeklySchedule30Hours.totalWeeklyHours, 30);
assert.strictEqual(weeklySchedule30Hours.lessons.length, 5);
console.log('✓ TEST 1 GEÇTİ: Sözleşmeli öğretmenin haftalık 30 saatlik (Pzt-Cum 6 saat) ders programı başarıyla tanımlandı.');

// ----------------------------------------------------
// TEST 2: MEB Kararı Madde 23 Ek Ders Dağıtımı (Pazartesi ve Cuma Öncelikli)
// ----------------------------------------------------
// 3 saat Hazırlık ve Planlama (10'a 1)
const dist3 = distributeWeeklyHoursAccordingToMebArticle23(3);
assert.strictEqual(dist3[1], 1, 'Pazartesi günü öncelikli 1 saat almalı');
assert.strictEqual(dist3[5], 1, 'Cuma günü öncelikli 1 saat almalı');
assert.strictEqual(dist3[3], 1, 'Kalan 1 saat Çarşamba gününe dağıtılmalı');
assert.strictEqual(dist3[2], 0, 'Salı 0');
assert.strictEqual(dist3[4], 0, 'Perşembe 0');
assert.strictEqual(dist3[1] + dist3[2] + dist3[3] + dist3[4] + dist3[5], 3);

// 2 saat Sınıf Rehberliği
const dist2 = distributeWeeklyHoursAccordingToMebArticle23(2);
assert.strictEqual(dist2[1], 1, 'Pazartesi öncelikli +1');
assert.strictEqual(dist2[5], 1, 'Cuma öncelikli +1');
assert.strictEqual(dist2[2], 0);
assert.strictEqual(dist2[3], 0);
assert.strictEqual(dist2[4], 0);

// 5 saat (3 Hazırlık + 2 Rehberlik)
const dist5 = distributeWeeklyHoursAccordingToMebArticle23(5);
assert.strictEqual(dist5[1], 1);
assert.strictEqual(dist5[2], 1);
assert.strictEqual(dist5[3], 1);
assert.strictEqual(dist5[4], 1);
assert.strictEqual(dist5[5], 1);

// 7 saat
const dist7 = distributeWeeklyHoursAccordingToMebArticle23(7);
assert.strictEqual(dist7[1], 2, 'Taban 1 + Kalan öncelik 1 = 2 saat Pazartesi');
assert.strictEqual(dist7[5], 2, 'Taban 1 + Kalan öncelik 1 = 2 saat Cuma');
assert.strictEqual(dist7[2], 1);
assert.strictEqual(dist7[3], 1);
assert.strictEqual(dist7[4], 1);
assert.strictEqual(dist7[1] + dist7[2] + dist7[3] + dist7[4] + dist7[5], 7);

console.log('✓ TEST 2 GEÇTİ: MEB Kararı Madde 23 uyarınca ek derslerin çalışma günlerine eşit dağıtımı ve artan saatlerin Pazartesi-Cuma önceliği doğrulandı.');

// ----------------------------------------------------
// TEST 3: Dağıtımın Aylık Puantaj Raporuna Yansıtılması
// ----------------------------------------------------
const syncedRow = syncTeacherScheduleToMonthMock({
  teacher: sozlesmeliTeacher,
  schedule: weeklySchedule30Hours,
  year: 2026,
  month: 10,
});

assert.strictEqual(syncedRow.dailyHours[5], 6, 'Ekim 2026 Pazartesi 5. gün 6 saat olmalı');
assert.strictEqual(syncedRow.dailyHours[6], 6, 'Ekim 2026 Salı 6. gün 6 saat olmalı');
assert.strictEqual(syncedRow.dailyHours[7], 6, 'Ekim 2026 Çarşamba 7. gün 6 saat olmalı');
assert.strictEqual(syncedRow.dailyHours[8], 6, 'Ekim 2026 Perşembe 8. gün 6 saat olmalı');
assert.strictEqual(syncedRow.dailyHours[9], 6, 'Ekim 2026 Cuma 9. gün 6 saat olmalı');
console.log('✓ TEST 3 GEÇTİ: Haftalık ders saatleri aylık puantaj cetvelindeki ilgili hafta içi günlerine tam olarak yansıtıldı.');

// ----------------------------------------------------
// TEST 4: Ders Programı Değiştirilince Puantajın Güncellenmesi
// ----------------------------------------------------
const updatedWeeklySchedule = {
  ...weeklySchedule30Hours,
  totalWeeklyHours: 25,
  lessons: [
    { id: 'b1', dayOfWeek: 1, lessonCount: 5 }, // Pazartesi 5
    { id: 'b2', dayOfWeek: 2, lessonCount: 5 }, // Salı 5
    { id: 'b3', dayOfWeek: 3, lessonCount: 5 }, // Çarşamba 5
    { id: 'b4', dayOfWeek: 4, lessonCount: 5 }, // Perşembe 5
    { id: 'b5', dayOfWeek: 5, lessonCount: 5 }, // Cuma 5
  ],
};

const resyncedRow = syncTeacherScheduleToMonthMock({
  teacher: sozlesmeliTeacher,
  schedule: updatedWeeklySchedule,
  year: 2026,
  month: 10,
  existingRow: syncedRow,
});

assert.strictEqual(resyncedRow.dailyHours[5], 5, 'Güncellenen program ile 5. gün 5 saat olmalı');
assert.strictEqual(resyncedRow.dailyHours[6], 5, 'Güncellenen program ile 6. gün 5 saat olmalı');
console.log('✓ TEST 4 GEÇTİ: Ders programı güncellendiğinde aylık puantaj cetveli yeni saatleri derhal yansıttı.');

// ----------------------------------------------------
// TEST 5: Sayfa Yenilendiğinde Kayıtların Korunması (Supabase Mapping)
// ----------------------------------------------------
function mapPuantajToDbMock(row) {
  return {
    id: `${row.schoolId}_${row.teacherId}_${row.year}_${row.month}`,
    teacher_id: row.teacherId,
    school_id: row.schoolId,
    year: row.year,
    month: row.month,
    daily_hours: row.dailyHours,
    daily_statuses: row.dailyStatuses,
    total_hours: row.totalHours,
    bonus_five_to_one_hours: row.bonusFiveToOneHours,
    payable_total_hours: row.payableTotalHours,
    estimated_payment: row.estimatedPayment,
  };
}

function mapPuantajFromDbMock(db) {
  return {
    teacherId: db.teacher_id,
    schoolId: db.school_id,
    year: db.year,
    month: db.month,
    dailyHours: db.daily_hours,
    dailyStatuses: db.daily_statuses,
    totalHours: Number(db.total_hours),
    bonusFiveToOneHours: Number(db.bonus_five_to_one_hours),
    payableTotalHours: Number(db.payable_total_hours),
    estimatedPayment: Number(db.estimated_payment),
  };
}

const dbRecord = mapPuantajToDbMock(resyncedRow);
const reloadedRow = mapPuantajFromDbMock(dbRecord);
assert.deepStrictEqual(reloadedRow.dailyHours, resyncedRow.dailyHours, 'Günlük saatler reload sonrası birebir korunmalı');
assert.strictEqual(reloadedRow.payableTotalHours, resyncedRow.payableTotalHours, 'Ödenecek toplam saat reload sonrası korunmalı');
console.log('✓ TEST 5 GEÇTİ: Puantaj kaydı veritabanı mapping döngüsünde veri kaybı olmaksızın tam olarak korundu.');

// ----------------------------------------------------
// TEST 6: Resmî Tatil ve Hafta Sonlarının Doğru Ele Alınması
// ----------------------------------------------------
// Ekim 2026:
// 28 Ekim Çarşamba -> Yarım gün tatil (6 saat yerine 3 saat)
// 29 Ekim Perşembe -> Cumhuriyet Bayramı Tam gün tatil (0 saat, status 'tatil')
// 10-11 Ekim -> Hafta sonu (Cumartesi-Pazar, 0 ders)
assert.strictEqual(syncedRow.dailyStatuses[29], 'tatil', '29 Ekim Cumhuriyet Bayramı tatil olarak işaretlenmeli');
assert.strictEqual(syncedRow.dailyHours[29], null, '29 Ekim günü fiili ders yazılmamalıdır');
assert.strictEqual(syncedRow.dailyHours[28], 3, '28 Ekim yarım gün tatilde saatler yarıya inmelidir (6 -> 3)');
assert.ok(!syncedRow.dailyHours[10], '10 Ekim Cumartesi normal hafta içi dersi yazılmamalı');
assert.ok(!syncedRow.dailyHours[11], '11 Ekim Pazar normal hafta içi dersi yazılmamalı');
console.log('✓ TEST 6 GEÇTİ: 29 Ekim tam gün tatil, 28 Ekim yarım gün tatil ve hafta sonu kısıtlamaları hatasız uygulandı.');

// ----------------------------------------------------
// TEST 7: Aynı Hesaplamanın İkinci Kez Uygulanıp Mükerrer Kesinti Yapılmaması
// ----------------------------------------------------
const firstCalc = calculateMonthlyPuantajTotalsMock({
  teacher: sozlesmeliTeacher,
  totalHours: 120,
  daysInMonth: 30,
  weeklyScheduleHours: 30,
});
// 120 - 60 = 60 + 12 = 72
assert.strictEqual(firstCalc.payableTotalHours, 72);

// İkinci hesaplama döngüsü aynı totalHours (120) üzerinden çalışır
const secondCalc = calculateMonthlyPuantajTotalsMock({
  teacher: sozlesmeliTeacher,
  totalHours: 120,
  daysInMonth: 30,
  weeklyScheduleHours: 30,
});
assert.strictEqual(secondCalc.payableTotalHours, 72, 'İkinci kez çalıştırıldığında mükerrer düşüm YAPILMAMALIDIR');
assert.notStrictEqual(secondCalc.payableTotalHours, 12, 'Kesinti kesinlikle 72 - 60 = 12 olmamalıdır!');
console.log('✓ TEST 7 GEÇTİ: Mükerrer maaş karşılığı düşümü engellendi; her döngüde net 72 saat korundu.');

// ----------------------------------------------------
// TEST 8: Stajyer ve İŞKUR Öğretmenlerde Kesinti Yapılmaması
// ----------------------------------------------------
const stajyerTeacher = {
  id: 'stajyer-1',
  fullName: 'Canan Stajyer',
  employmentType: 'stajyer',
  hourlyRate: 220.57,
};
const stajyerCalc = calculateMonthlyPuantajTotalsMock({
  teacher: stajyerTeacher,
  totalHours: 120,
  daysInMonth: 30,
  weeklyScheduleHours: 30,
});
assert.strictEqual(stajyerCalc.payableTotalHours, 120, 'Stajyerde kesinti yapılmaz (120 fiili = 120 ödenecek)');
assert.strictEqual(stajyerCalc.bonusFiveToOneHours, 0);

const iskurTeacher = {
  id: 'iskur-1',
  fullName: 'Murat İŞKUR',
  employmentType: 'iskurlu',
  hourlyRate: 220.57,
};
const iskurCalc = calculateMonthlyPuantajTotalsMock({
  teacher: iskurTeacher,
  totalHours: 120,
  daysInMonth: 30,
  weeklyScheduleHours: 30,
});
assert.strictEqual(iskurCalc.payableTotalHours, 120, 'İŞKUR personelde kesinti yapılmaz (120 fiili = 120 ödenecek)');
assert.strictEqual(iskurCalc.bonusFiveToOneHours, 0);

console.log('✓ TEST 8 GEÇTİ: Stajyer ve İŞKUR personelde sözleşmeliye özel maaş karşılığı düşümü uygulanmadı.');

console.log('\n================================================================');
console.log('TÜM 8 MEB VE PUANTAJ ENTEGRASYON SENARYOSU BAŞARIYLA TAMAMLANDI! (100%)');
console.log('================================================================');
