import {
  Teacher,
  TeacherWeeklySchedule,
  TeacherMonthlyPuantajRow,
  TimesheetCellStatus,
  MebPaymentRules,
  SchoolMonthlySubmission,
} from '../types';
import {
  calculateMonthlyPuantajTotals,
  calculateWeeklyDailyMebBreakdown,
} from './additionalTeachingCalculator';

/**
 * Ayın kaç gün çektiğini döner (28, 29, 30 veya 31)
 */
export function getDaysInMonthCount(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export interface OfficialHolidayInfo {
  isHoliday: boolean;
  name: string;
  isHalfDay?: boolean; // 28 Ekim gibi yarım gün tatiller
}

/**
 * Resmî Tatil Takvimi Bilgisi (MEB Çalışma Takvimi & 2429 Sayılı Kanun)
 *
 * - 1 Ocak: Yılbaşı (Tam gün)
 * - 23 Nisan: Ulusal Egemenlik ve Çocuk Bayramı (Tam gün)
 * - 1 Mayıs: Emek ve Dayanışma Günü (Tam gün)
 * - 19 Mayıs: Atatürk'ü Anma, Gençlik ve Spor Bayramı (Tam gün)
 * - 15 Temmuz: Demokrasi ve Millî Birlik Günü (Tam gün)
 * - 30 Ağustos: Zafer Bayramı (Tam gün)
 * - 28 Ekim: Cumhuriyet Bayramı Arefesi (Yarım gün tatil - 13:00'ten sonra)
 * - 29 Ekim: Cumhuriyet Bayramı (Tam gün)
 */
export function getOfficialHolidayInfo(year: number, month: number, day: number): OfficialHolidayInfo {
  if (month === 1 && day === 1) {
    return { isHoliday: true, name: 'Yılbaşı' };
  }
  if (month === 4 && day === 23) {
    return { isHoliday: true, name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' };
  }
  if (month === 5 && day === 1) {
    return { isHoliday: true, name: '1 Mayıs Emek ve Dayanışma Günü' };
  }
  if (month === 5 && day === 19) {
    return { isHoliday: true, name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı" };
  }
  if (month === 7 && day === 15) {
    return { isHoliday: true, name: '15 Temmuz Demokrasi ve Millî Birlik Günü' };
  }
  if (month === 8 && day === 30) {
    return { isHoliday: true, name: '30 Ağustos Zafer Bayramı' };
  }
  if (month === 10 && day === 28) {
    return { isHoliday: true, name: '28 Ekim Cumhuriyet Bayramı Arefesi', isHalfDay: true };
  }
  if (month === 10 && day === 29) {
    return { isHoliday: true, name: '29 Ekim Cumhuriyet Bayramı' };
  }

  return { isHoliday: false, name: '' };
}

/**
 * MEB Ek Ders Kararı Madde 23 Dağıtım Kuralı:
 *
 * "Bu Kararın 10, 14 ve 21 inci maddelerindeki ek ders saatleri...
 * haftanın çalışma günlerine eşit olarak dağıtılır. Eşit dağıtılamayan saatler
 * öncelikle Pazartesi ve Cuma günlerine eklenir."
 *
 * @param totalHours Haftalık dağıtılacak ek ders saati (Hazırlık/Planlama, Rehberlik vb.)
 * @returns Record<number, number> Günlere göre (1: Pzt, 2: Sal, 3: Çar, 4: Per, 5: Cum) saat dağılımı
 */
export function distributeWeeklyHoursAccordingToMebArticle23(totalHours: number): Record<number, number> {
  const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!totalHours || totalHours <= 0) return result;

  // 1. Çalışma günlerine (5 iş günü) eşit taban dağıtım
  const basePerDay = Math.floor(totalHours / 5);
  for (let d = 1; d <= 5; d++) {
    result[d] = basePerDay;
  }

  // 2. Eşit dağıtılamayan kalan saatler (öncelikle Pazartesi ve Cuma)
  const remainder = totalHours % 5;
  if (remainder === 0) return result;

  const priorityOrder = [1, 5, 3, 2, 4];
  for (let i = 0; i < remainder; i++) {
    const day = priorityOrder[i];
    result[day] += 1;
  }

  return result;
}

/**
 * YYYY-MM-DD formatında tarih dizesi oluşturur
 */
export function formatDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * JavaScript getDay() (0: Pazar, 1: Pzt, ..., 6: Cmt)
 * -> MEB Haftalık Program Gün Kodu (1: Pazartesi, ..., 7: Pazar)
 */
export function getScheduleDayOfWeek(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Belirli bir tarih için öğretmenin haftalık ders programından planlanan ders saatini hesaplar.
 * Geçerlilik başlangıç ve bitiş tarihlerine titizlikle uyar.
 */
export function getPlannedHoursForDate(
  schedule: TeacherWeeklySchedule | null | undefined,
  year: number,
  month: number,
  day: number
): number {
  if (!schedule || !Array.isArray(schedule.lessons) || schedule.lessons.length === 0) {
    return 0;
  }

  const dateStr = formatDateString(year, month, day);

  // 1. Geçerlilik Başlangıç Tarihi Kontrolü (Başlangıçtan önceki günlere ders yazılmaz)
  if (schedule.effectiveStartDate && dateStr < schedule.effectiveStartDate) {
    return 0;
  }

  // 2. Geçerlilik Bitiş Tarihi Kontrolü (Bitişten sonraki günlere ders yazılmaz)
  if (schedule.effectiveEndDate && dateStr > schedule.effectiveEndDate) {
    return 0;
  }

  // 3. Resmî Tatil Kontrolü
  const holiday = getOfficialHolidayInfo(year, month, day);
  if (holiday.isHoliday && !holiday.isHalfDay) {
    return 0; // Tam gün resmî tatilde fiili ders yapılmaz
  }

  // 4. Haftanın Günü Eşleşmesi (Pzt=1, Sal=2, Çar=3, Per=4, Cum=5, Cmt=6, Paz=7)
  const dateObj = new Date(year, month - 1, day);
  const dow = getScheduleDayOfWeek(dateObj.getDay());

  const dayLessons = schedule.lessons.filter((l) => l.dayOfWeek === dow);
  const totalDayLessons = dayLessons.reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

  // Yarım gün resmî tatilde (örn. 28 Ekim) öğleden önce yapılan dersler verilir
  if (holiday.isHoliday && holiday.isHalfDay) {
    return Math.ceil(totalDayLessons / 2);
  }

  return totalDayLessons;
}

/**
 * Nöbet görevi saatlerini (haftada 3 saat) ayın ilgili günlerine işler.
 *
 * KRİTİK GÜVENLİK KURALLARI:
 * - Onaylanmış veya kilitli aylar ASLA değiştirilmez.
 * - 'confirmed' veya 'manual' olarak işaretlenmiş nöbet hücreleri ASLA ezilmez.
 * - Sadece otomatik 'planned' nöbet günleri nöbet gününe göre güncellenir.
 * - Yalnızca geçerli dönem tarih aralığı ve öğretmenin aktiflik tarihlerine göre işlenir.
 */
export function syncTeacherDutyHours(params: {
  teacher: Teacher;
  year: number;
  month: number;
  existingDutyHours?: Record<number, number | null>;
  existingDutyStatuses?: Record<number, TimesheetCellStatus>;
  isSubmissionLocked?: boolean;
  periodStartDate?: string;
  periodEndDate?: string;
  hourlyRate: number;
}): {
  dutyDailyHours: Record<number, number | null>;
  dutyDailyStatuses: Record<number, TimesheetCellStatus>;
  dutyTotalHours: number;
  dutyEstimatedPayment: number;
} {
  const {
    teacher,
    year,
    month,
    existingDutyHours,
    existingDutyStatuses,
    isSubmissionLocked,
    periodStartDate,
    periodEndDate,
    hourlyRate,
  } = params;

  const dutyDailyHours: Record<number, number | null> = existingDutyHours
    ? { ...existingDutyHours }
    : {};
  const dutyDailyStatuses: Record<number, TimesheetCellStatus> = existingDutyStatuses
    ? { ...existingDutyStatuses }
    : {};

  if (isSubmissionLocked) {
    const total = Object.values(dutyDailyHours).reduce((sum: number, h) => sum + (h || 0), 0);
    return {
      dutyDailyHours,
      dutyDailyStatuses,
      dutyTotalHours: total,
      dutyEstimatedPayment: Math.round(total * hourlyRate * 100) / 100,
    };
  }

  const daysInMonth = getDaysInMonthCount(year, month);
  const dutyDay = teacher.guardDutyDay;
  const hasDuty = Boolean(teacher.hasGuardDuty && dutyDay && dutyDay >= 1 && dutyDay <= 7);

  for (let day = 1; day <= daysInMonth; day++) {
    const status = dutyDailyStatuses[day];
    const isProtected =
      status === 'confirmed' ||
      status === 'manual' ||
      status === 'izinli' ||
      status === 'raporlu' ||
      status === 'tatil';

    if (isProtected) {
      continue;
    }

    const dateObj = new Date(year, month - 1, day);
    const dow = getScheduleDayOfWeek(dateObj.getDay());
    const dateStr = formatDateString(year, month, day);

    const isOutsidePeriod =
      (periodStartDate && dateStr < periodStartDate) ||
      (periodEndDate && dateStr > periodEndDate);
    const isOutsideTeacherActive =
      (teacher.startDate && dateStr < teacher.startDate) ||
      (teacher.departureDate && dateStr > teacher.departureDate);

    const holiday = getOfficialHolidayInfo(year, month, day);
    const isFullHoliday = holiday.isHoliday && !holiday.isHalfDay;

    if (hasDuty && dow === dutyDay && !isOutsidePeriod && !isOutsideTeacherActive && !isFullHoliday) {
      dutyDailyHours[day] = 3;
      dutyDailyStatuses[day] = 'planned';
    } else {
      if (dutyDailyStatuses[day] === 'planned') {
        dutyDailyHours[day] = null;
        delete dutyDailyStatuses[day];
      }
    }
  }

  const dutyTotalHours = Object.values(dutyDailyHours).reduce(
    (sum: number, h) => sum + (h || 0),
    0
  );
  const dutyEstimatedPayment = Math.round(dutyTotalHours * hourlyRate * 100) / 100;

  return {
    dutyDailyHours,
    dutyDailyStatuses,
    dutyTotalHours,
    dutyEstimatedPayment,
  };
}

/**
 * Bir öğretmenin haftalık ders programını seçilen ayın puantaj cetveline senkronize eder.
 *
 * KRİTİK GÜVENLİK KURALLARI:
 * - Onaylanmış veya incelemedeki aylar ASLA değiştirilmez (Kilitli puantaj korunur).
 * - Manuel olarak girilmiş veya okul kullanıcısı tarafından 'confirmed' edilmiş hücreler ASLA ezilmez.
 * - Sadece otomatik aktarılmış ('planned') veya henüz girilmemiş günlerin planlanan saatleri güncellenir.
 */
export function syncTeacherScheduleToMonth(params: {
  teacher: Teacher;
  schedule: TeacherWeeklySchedule | null | undefined;
  year: number;
  month: number;
  existingRow?: TeacherMonthlyPuantajRow | null;
  isSubmissionLocked?: boolean;
  periodStartDate?: string;
  periodEndDate?: string;
  rules: MebPaymentRules;
}): {
  updatedRow: TeacherMonthlyPuantajRow;
  modifiedDaysCount: number;
  wasLocked: boolean;
} {
  const {
    teacher,
    schedule,
    year,
    month,
    existingRow,
    isSubmissionLocked,
    periodStartDate,
    periodEndDate,
    rules,
  } = params;

  // 1. Ay onaylanmış veya kilitliyse kesinlikle değiştirme
  if (isSubmissionLocked && existingRow) {
    return {
      updatedRow: existingRow,
      modifiedDaysCount: 0,
      wasLocked: true,
    };
  }

  const daysInMonth = getDaysInMonthCount(year, month);
  const currentDailyHours: Record<number, number | null> = existingRow?.dailyHours ? { ...existingRow.dailyHours } : {};
  const currentStatuses: Record<number, TimesheetCellStatus> = existingRow?.dailyStatuses ? { ...existingRow.dailyStatuses } : {};
  const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57;

  // 2. MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Çizelgesini Hesapla
  const weeklyMebBreakdown = calculateWeeklyDailyMebBreakdown({ teacher, schedule, rules });

  let modifiedDaysCount = 0;
  const maasDailyHours: Record<number, number | null> = {};
  const excessDailyHours: Record<number, number | null> = {};
  const prepDailyHours: Record<number, number | null> = {};
  const guidanceDailyHours: Record<number, number | null> = {};
  const dutyDailyHours: Record<number, number | null> = {};
  const dutyDailyStatuses: Record<number, TimesheetCellStatus> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const status = currentStatuses[day];
    const dateStr = formatDateString(year, month, day);
    // Saat dilimi ve yaz/kış saati kaynaklı gün kaymasını önlemek için öğle saatini (12:00) kullan
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

    // Admin tarafından belirlenen aktif tarih aralığı sınırları (belirtilmemişse ayın 1'i ve son günü)
    const effectivePeriodStart = periodStartDate || `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonthCount = getDaysInMonthCount(year, month);
    const effectivePeriodEnd = periodEndDate || `${year}-${String(month).padStart(2, '0')}-${String(daysInMonthCount).padStart(2, '0')}`;

    const isOutsidePeriod =
      Boolean(dateStr < effectivePeriodStart) ||
      Boolean(dateStr > effectivePeriodEnd);

    const isOutsideTeacherActive =
      Boolean(teacher.startDate && dateStr < teacher.startDate) ||
      Boolean(teacher.departureDate && dateStr > teacher.departureDate);

    if (isOutsidePeriod || isOutsideTeacherActive) {
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

    // Resmî Tatil Kontrolü
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

    // Yarım gün resmî tatilde (örn. 28 Ekim) öğleden önce yapılan ek dersler verilir
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

  // Toplam saat: Puantaj cetvelindeki hücreler doğrudan "Toplam Ek Ders" olduğundan:
  const totalHours = Object.values(currentDailyHours).reduce(
    (sum: number, h) => sum + (h || 0),
    0
  );

  const monthlyMaasHours = Object.values(maasDailyHours).reduce((a: number, b) => a + (b || 0), 0);
  const monthlyExcessHours = Object.values(excessDailyHours).reduce((a: number, b) => a + (b || 0), 0);
  const monthlyPrepHours = Object.values(prepDailyHours).reduce((a: number, b) => a + (b || 0), 0);
  const monthlyGuidanceHours = Object.values(guidanceDailyHours).reduce((a: number, b) => a + (b || 0), 0);
  const dutyTotalHours = Object.values(dutyDailyHours).reduce((a: number, b) => a + (b || 0), 0);
  const dutyEstimatedPayment = Math.round(dutyTotalHours * hourlyRate * 100) / 100;

  // Puantaj raporundaki ödenecek saat, çizelgedeki toplam ek derstir
  const payableTotalHours = totalHours;
  const bonusFiveToOneHours = monthlyPrepHours + monthlyGuidanceHours;
  const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;

  const updatedRow: TeacherMonthlyPuantajRow = {
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

  return {
    updatedRow,
    modifiedDaysCount,
    wasLocked: false,
  };
}

/**
 * Puantaj cetvelindeki planlanan ('planned') ders saatlerini okul kullanıcısının tek tıkla fiili ('confirmed') yapmasını sağlar.
 */
export function confirmPlannedDaysInRow(
  row: TeacherMonthlyPuantajRow,
  targetDay?: number
): TeacherMonthlyPuantajRow {
  const newStatuses = { ...(row.dailyStatuses || {}) };
  const newDutyStatuses = { ...(row.dutyDailyStatuses || {}) };

  if (targetDay !== undefined) {
    if (newStatuses[targetDay] === 'planned' || row.dailyHours[targetDay] !== null) {
      newStatuses[targetDay] = 'confirmed';
    }
    if (newDutyStatuses[targetDay] === 'planned' || (row.dutyDailyHours && row.dutyDailyHours[targetDay] !== null)) {
      newDutyStatuses[targetDay] = 'confirmed';
    }
  } else {
    // Tüm 'planned' günleri 'confirmed' yap
    Object.keys(row.dailyHours).forEach((key) => {
      const day = Number(key);
      if (row.dailyHours[day] !== null && newStatuses[day] === 'planned') {
        newStatuses[day] = 'confirmed';
      }
    });

    if (row.dutyDailyHours) {
      Object.keys(row.dutyDailyHours).forEach((key) => {
        const day = Number(key);
        if (row.dutyDailyHours![day] !== null && newDutyStatuses[day] === 'planned') {
          newDutyStatuses[day] = 'confirmed';
        }
      });
    }
  }

  return {
    ...row,
    dailyStatuses: newStatuses,
    dutyDailyStatuses: newDutyStatuses,
  };
}

