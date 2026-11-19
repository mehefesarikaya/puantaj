import {
  Teacher,
  TeacherWeeklySchedule,
  TeacherMonthlyPuantajRow,
  TimesheetCellStatus,
  MebPaymentRules,
  SchoolMonthlySubmission,
} from '../types';

/**
 * Ayın kaç gün çektiğini döner (28, 29, 30 veya 31)
 */
export function getDaysInMonthCount(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
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

  // 3. Haftanın Günü Eşleşmesi (Pzt=1, Sal=2, Çar=3, Per=4, Cum=5, Cmt=6, Paz=7)
  const dateObj = new Date(year, month - 1, day);
  const dow = getScheduleDayOfWeek(dateObj.getDay());

  const dayLessons = schedule.lessons.filter((l) => l.dayOfWeek === dow);
  return dayLessons.reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);
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

    if (hasDuty && dow === dutyDay && !isOutsidePeriod && !isOutsideTeacherActive) {
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

  let modifiedDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const status = currentStatuses[day];

    // Fiili olarak onaylanmış ('confirmed'), elle girilmiş ('manual') veya izinli/raporlu günler KORUNUR!
    const isProtected =
      status === 'confirmed' ||
      status === 'manual' ||
      status === 'izinli' ||
      status === 'raporlu' ||
      status === 'tatil';

    if (isProtected) {
      continue;
    }

    const dateStr = formatDateString(year, month, day);
    const isOutsidePeriod =
      (periodStartDate && dateStr < periodStartDate) ||
      (periodEndDate && dateStr > periodEndDate);

    if (isOutsidePeriod) {
      // Yönetici tarafından belirlenen dönem dışındaki planlanan saatleri temizle
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
        modifiedDaysCount++;
      }
      continue;
    }

    // Programdan planlanan ders saatini al
    const plannedHours = getPlannedHoursForDate(schedule, year, month, day);

    if (plannedHours > 0) {
      if (currentDailyHours[day] !== plannedHours || currentStatuses[day] !== 'planned') {
        currentDailyHours[day] = plannedHours;
        currentStatuses[day] = 'planned';
        modifiedDaysCount++;
      }
    } else {
      // Eğer daha önce programdan aktarılmış bir 'planned' değer varsa ve yeni programda o gün ders yoksa temizle
      if (currentStatuses[day] === 'planned') {
        currentDailyHours[day] = null;
        delete currentStatuses[day];
        modifiedDaysCount++;
      }
    }
  }

  // Toplam ders saati, 5'e 1 ve tahakkuk hesabı
  const totalHours = Object.values(currentDailyHours).reduce(
    (sum: number, h) => sum + (h || 0),
    0
  );
  const bonusFiveToOneHours = rules.bonusFiveToOne ? Math.floor(totalHours / 5) : 0;
  const payableTotalHours = totalHours + bonusFiveToOneHours;
  const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57;
  const estimatedPayment = Math.round(payableTotalHours * hourlyRate * 100) / 100;

  // Nöbet görevi saatlerini senkronize et
  const dutyResult = syncTeacherDutyHours({
    teacher,
    year,
    month,
    existingDutyHours: existingRow?.dutyDailyHours,
    existingDutyStatuses: existingRow?.dutyDailyStatuses,
    isSubmissionLocked,
    periodStartDate,
    periodEndDate,
    hourlyRate,
  });

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
    dutyDailyHours: dutyResult.dutyDailyHours,
    dutyDailyStatuses: dutyResult.dutyDailyStatuses,
    dutyTotalHours: dutyResult.dutyTotalHours,
    dutyEstimatedPayment: dutyResult.dutyEstimatedPayment,
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

