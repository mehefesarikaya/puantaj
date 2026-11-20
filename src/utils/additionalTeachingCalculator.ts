import {
  AdditionalTeachingCalculationResult,
  BranchCategory,
  EducationLevel,
  MebPaymentRules,
  Teacher,
  TeacherWeeklySchedule,
} from '../types';
import { BRANCH_CATEGORY_CONFIGS, inferBranchCategory } from './branchData';
import { distributeWeeklyHoursAccordingToMebArticle23 } from './schedulePuantajSync';

/**
 * Öğretmenin eğitim düzeyine (Lisans, Yüksek Lisans, Doktora) ve ders türüne göre
 * saatlik brüt ek ders birim ücretini hesaplar.
 *
 * 2026 Temmuz - Aralık Resmi Katsayıları (Ekran Görüntüsü Kaynağı):
 * - Lisans (Normal Gündüz, 140 gösterge): 220,57 TL
 * - Gece / Hafta Sonu (150 gösterge): 236,33 TL
 * - Yüksek Lisans (%7 artırımlı): 236,01 TL
 * - Doktora (%20 artırımlı): 264,69 TL
 * - Özel Eğitim / Destek (%25 artırımlı): 275,71 TL
 * - DYK (%100 artırımlı): 441,14 TL
 */
export function calculateEffectiveHourlyRate(
  educationLevel: EducationLevel = 'lisans',
  rules: MebPaymentRules,
  options?: { isGeceHaftasonu?: boolean; isDyk?: boolean; isOzelEgitim?: boolean }
): { baseRate: number; bonusPercent: number; effectiveRate: number } {
  // Temel gündüz ek ders ücreti (140 gösterge)
  const baseDayRate = rules.gunduzHourlyRate || 220.57;

  // 1. DYK Kursu: Kurallardaki dykBonusPercent oranında artırımlı (Varsayılan %100 -> 441.14 TL)
  if (options?.isDyk) {
    const bonus = Number(rules.dykBonusPercent ?? 100);
    const rate = Math.round(baseDayRate * (1 + bonus / 100) * 100) / 100;
    return { baseRate: baseDayRate, bonusPercent: bonus, effectiveRate: rate };
  }

  // 2. Özel Eğitim / Destek Eğitimi: Kurallardaki ozelEgitimBonusPercent oranında artırımlı (Varsayılan %25 -> 275.71 TL)
  if (options?.isOzelEgitim) {
    const bonus = Number(rules.ozelEgitimBonusPercent ?? 25);
    const rate = Math.round(baseDayRate * (1 + bonus / 100) * 100) / 100;
    return { baseRate: baseDayRate, bonusPercent: bonus, effectiveRate: rate };
  }

  // 3. Gece, Hafta Sonu ve Tatil: 150 gösterge karşılığı
  if (options?.isGeceHaftasonu) {
    const nightRate = Number(rules.geceHaftasonuHourlyRate || 236.33);
    return { baseRate: nightRate, bonusPercent: 0, effectiveRate: nightRate };
  }

  // 4. Akademik Eğitim Düzeyi
  if (educationLevel === 'doktora') {
    // Doktora Mezunu (Gündüz): Kurallardaki doktoraBonusPercent oranında artırımlı (Varsayılan %20 -> 264.69 TL)
    const bonus = Number(rules.doktoraBonusPercent ?? 20);
    const rate = Math.round(baseDayRate * (1 + bonus / 100) * 100) / 100;
    return { baseRate: baseDayRate, bonusPercent: bonus, effectiveRate: rate };
  }

  if (educationLevel === 'yuksek_lisans') {
    // Yüksek Lisans Mezunu (Gündüz): Kurallardaki yuksekLisansBonusPercent oranında artırımlı (Varsayılan %7 -> 236.01 TL)
    const bonus = Number(rules.yuksekLisansBonusPercent ?? 7);
    const rate = Math.round(baseDayRate * (1 + bonus / 100) * 100) / 100;
    return { baseRate: baseDayRate, bonusPercent: bonus, effectiveRate: rate };
  }

  // 5. Lisans (Standart): 220,57 TL
  return { baseRate: baseDayRate, bonusPercent: 0, effectiveRate: baseDayRate };
}

/**
 * Personelin sözleşmeli statüsünde olup olmadığını kontrol eder.
 */
export function isSozlesmeli(
  teacher: Teacher | { employmentType?: string } | null | undefined
): boolean {
  return teacher?.employmentType === 'sozlesmeli';
}

/**
 * Personelin ders ücreti karşılığı çalışan öğretmen statüsünde olup olmadığını kontrol eder.
 */
export function isUcretli(
  teacher: Teacher | { employmentType?: string } | null | undefined
): boolean {
  const type = teacher?.employmentType;
  return type === 'ucretli' || type === 'ucretli_ogretmen' || type === 'usta_ogretici';
}

/**
 * Personel türüne göre ilave ek ders saatini (2+1 sistemi) hesaplar:
 * 1. Yalnızca Ücretli öğretmenler: 2+1 sistemi (Her 2 saatlik çalışma karşılığında 1 saat ek ders)
 * 2. Sözleşmeli personel: Normal hesaplama (5+1 sistemi kesinlikle uygulanmaz -> 0)
 * 3. Diğer bütün personel türleri: Normal hesaplama (2+1 veya 5+1 uygulanmaz -> 0)
 */
export function calculatePersonnelBonusHours(
  teacher: Teacher | { employmentType?: string } | null | undefined,
  hours: number
): number {
  if (hours <= 0) return 0;
  // Yalnızca personel türü "Ücretli" olan öğretmenlerde 2+1 sistemi uygulanır
  if (isUcretli(teacher)) {
    return Math.floor(hours / 2);
  }
  // Sözleşmeli personel ve diğer tüm personel türleri normal hesaplanır (ilave ek ders uygulanmaz)
  return 0;
}

/**
 * Bir öğretmenin haftalık ders programı ve görevlerine göre haftalık ek ders saatini hesaplar.
 */
export function calculateWeeklyAdditionalTeaching(
  teacher: Teacher,
  weeklySchedule: TeacherWeeklySchedule | null | undefined,
  rules: MebPaymentRules
): {
  weeklyScheduledHours: number;
  maasKarsiligiHours: number;
  excessLessonHours: number;
  preparationPlanningHours: number;
  guardDutyHours: number;
  classGuidanceHours: number;
  weeklyAdditionalHours: number;
  weeklyMaxLimit: number;
  isWeeklyLimitExceeded: boolean;
  article23WeeklyHours?: number;
  article23Distribution?: Record<number, number>;
} {
  // 1. Haftalık planlanan toplam ders saati
  const weeklyScheduledHours = weeklySchedule?.totalWeeklyHours ?? (teacher.hourlyRate ? 30 : 0);

  // 2. Branş kategorisi konfigürasyonu
  const category: BranchCategory =
    teacher.branchCategory || inferBranchCategory(teacher.branch);
  const config = BRANCH_CATEGORY_CONFIGS[category] || BRANCH_CATEGORY_CONFIGS.genel_bilgi_ve_brans;
  const maasKarsiligiHours = 0;

  // 3. Planlanan temel ders saati
  const excessLessonHours = weeklyScheduledHours;

  // 4. Hazırlık ve Planlama / İlave Ek Ders:
  // - Yalnızca Ücretli öğretmenler: 2+1 sistemi (Haftalık planlanan her 2 saate 1 saat)
  // - Sözleşmeli ve diğer tüm personel türleri: Normal hesaplama (ilave uygulanmaz -> 0 saat)
  const preparationPlanningHours = calculatePersonnelBonusHours(teacher, weeklyScheduledHours);

  // 5. Nöbet Görevi (Haftada 3 saat)
  const guardDutyHours = teacher.hasGuardDuty ? rules.nobetHoursPerWeek || 3 : 0;

  // 6. Sınıf Rehberliği ve Sosyal Etkinlik (Haftada 2 saat)
  const classGuidanceHours = teacher.hasClassGuidance
    ? rules.sinifRehberlikHoursPerWeek || 2
    : 0;

  // 7. Toplam haftalık ek ders
  const weeklyAdditionalHours =
    excessLessonHours + preparationPlanningHours + guardDutyHours + classGuidanceHours;

  // 8. Azami Ek Ders Sınırı Kontrolü
  const weeklyMaxLimit = config.maxWeeklyAdditionalHours + classGuidanceHours;
  const isWeeklyLimitExceeded = weeklyAdditionalHours > weeklyMaxLimit;

  // 9. İlave saatlerin günlere dağıtımı
  const article23WeeklyHours = preparationPlanningHours + classGuidanceHours;
  const article23Distribution = distributeWeeklyHoursAccordingToMebArticle23(article23WeeklyHours);

  return {
    weeklyScheduledHours,
    maasKarsiligiHours,
    excessLessonHours,
    preparationPlanningHours,
    guardDutyHours,
    classGuidanceHours,
    weeklyAdditionalHours,
    weeklyMaxLimit,
    isWeeklyLimitExceeded,
    article23WeeklyHours,
    article23Distribution,
  };
}

/**
 * Öğretmenin seçilen ay için tam ve şeffaf ek ders ödeme dökümünü hesaplar.
 */
export function calculateMonthlyTeacherPayment(
  teacher: Teacher,
  weeklySchedule: TeacherWeeklySchedule | null | undefined,
  actualMonthlyPuantajHours: number,
  rules: MebPaymentRules,
  monthWeeksCount: number = 4
): AdditionalTeachingCalculationResult {
  const weekly = calculateWeeklyAdditionalTeaching(teacher, weeklySchedule, rules);

  // Aylık planlanan ders saati (haftalık plan × ayın hafta sayısı)
  const monthlyScheduledHours = weekly.weeklyScheduledHours * monthWeeksCount;

  // Aylık ek ders saati:
  // Eğer fiili puantaj girilmişse o kullanılır, aksi halde haftalık hesaptan projeksiyon yapılır
  let monthlyAdditionalHours = weekly.weeklyAdditionalHours * monthWeeksCount;
  if (actualMonthlyPuantajHours > 0) {
    // Fiili puantaj girilmişse:
    // Fiili ders saatinden maaş karşılığı (aylık) düşülür + hazırlık + nöbet + rehberlik
    const monthlyMaasKarsiligi = weekly.maasKarsiligiHours * monthWeeksCount;
    const actualExcess = Math.max(0, actualMonthlyPuantajHours - monthlyMaasKarsiligi);
    const monthlyHazirlik = weekly.preparationPlanningHours * monthWeeksCount;
    const monthlyNobet = weekly.guardDutyHours * monthWeeksCount;
    const monthlyRehberlik = weekly.classGuidanceHours * monthWeeksCount;
    monthlyAdditionalHours = actualExcess + monthlyHazirlik + monthlyNobet + monthlyRehberlik;
  }

  // Birim ücret ve artırımlar
  const educationLevel: EducationLevel = teacher.educationLevel || 'lisans';
  const rateInfo = calculateEffectiveHourlyRate(educationLevel, rules);

  // Brüt Ödeme
  const grossPayment =
    Math.round(monthlyAdditionalHours * rateInfo.effectiveRate * 100) / 100;

  // Kesintiler
  const incomeTaxRate = rules.incomeTaxRate || 0.15;
  const incomeTaxAmount = Math.round(grossPayment * incomeTaxRate * 100) / 100;

  const stampTaxRate = rules.stampTaxRate || 0.00759;
  const stampTaxAmount = Math.round(grossPayment * stampTaxRate * 100) / 100;

  const totalDeductions = Math.round((incomeTaxAmount + stampTaxAmount) * 100) / 100;
  const netPayment = Math.round((grossPayment - totalDeductions) * 100) / 100;

  return {
    weeklyScheduledHours: weekly.weeklyScheduledHours,
    maasKarsiligiHours: weekly.maasKarsiligiHours,
    excessLessonHours: weekly.excessLessonHours,
    preparationPlanningHours: weekly.preparationPlanningHours,
    guardDutyHours: weekly.guardDutyHours,
    classGuidanceHours: weekly.classGuidanceHours,
    weeklyAdditionalHours: weekly.weeklyAdditionalHours,
    weeklyMaxLimit: weekly.weeklyMaxLimit,
    isWeeklyLimitExceeded: weekly.isWeeklyLimitExceeded,

    monthlyWeeksCount: monthWeeksCount,
    monthlyScheduledHours,
    monthlyActualPuantajHours: actualMonthlyPuantajHours,
    monthlyAdditionalHours,

    educationLevel,
    appliedBaseHourlyRate: rateInfo.baseRate,
    academicBonusPercent: rateInfo.bonusPercent,
    effectiveHourlyRate: rateInfo.effectiveRate,

    grossPayment,
    incomeTaxRate,
    incomeTaxAmount,
    stampTaxRate,
    stampTaxAmount,
    totalDeductions,
    netPayment,
  };
}

export interface DailyMebScheduleBreakdown {
  dayOfWeek: number; // 1: Pzt ... 5: Cum, 6: Cmt, 7: Paz
  dayName: string;
  actualLessonHours: number; // Fiili okutulan normal ders
  maasKarsiligiHours: number; // Maaş karşılığı sayılan kısım
  excessLessonHours: number; // Gündüz ek dersi (maaş üstü)
  prepPlanningHours: number; // Hazırlık ve planlama (10'a 1, Madde 23)
  guidanceHours: number; // Sınıf rehberliği (Madde 6, Madde 23)
  dutyHours: number; // Nöbet görevi (varsa o güne 3 saat)
  specialActivityHours: number; // DYK, destek vb.
  totalDailyAdditionalHours: number; // O güne tahakkuk eden toplam ek ders
}

export interface WeeklyMebScheduleBreakdownResult {
  dailyBreakdown: Record<number, DailyMebScheduleBreakdown>;
  weeklyNormalLessons: number;
  weeklySpecialLessons: number;
  weeklyTotalLessons: number;
  weeklyMaasKarsiligi: number;
  weeklyExcessLessons: number;
  weeklyPrepPlanning: number;
  weeklyGuidance: number;
  weeklyDuty: number;
  weeklyTotalAdditionalHours: number;
}

/**
 * Haftalık ders programını MEB mevzuatına uygun olarak gün gün
 * Maaş Karşılığı, Ek Ders, Hazırlık-Planlama (Madde 23) ve Rehberlik olarak ayrıştırır.
 */
export function calculateWeeklyDailyMebBreakdown(params: {
  teacher: Teacher;
  schedule: TeacherWeeklySchedule | null | undefined;
  rules: MebPaymentRules;
}): WeeklyMebScheduleBreakdownResult {
  const { teacher, schedule, rules } = params;
  const isSozlesmeli = teacher.employmentType === 'sozlesmeli';
  const category = teacher.branchCategory || inferBranchCategory(teacher.branch);
  const config = BRANCH_CATEGORY_CONFIGS[category] || BRANCH_CATEGORY_CONFIGS.genel_bilgi_ve_brans;

  const weeklyCalc = calculateWeeklyAdditionalTeaching(teacher, schedule, rules);
  const totalMaasQuota = isSozlesmeli ? config.maasKarsiligiHours : 0;
  let remainingMaasQuota = totalMaasQuota;

  const prepDistribution = distributeWeeklyHoursAccordingToMebArticle23(weeklyCalc.preparationPlanningHours);
  const guidanceDistribution = distributeWeeklyHoursAccordingToMebArticle23(weeklyCalc.classGuidanceHours);
  // MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Çizelgesindeki toplam ek ders saatini günlere eşit dağıt
  const equalEkDersDistribution = distributeWeeklyHoursAccordingToMebArticle23(weeklyCalc.weeklyAdditionalHours);

  const dayNames: Record<number, string> = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi',
    7: 'Pazar',
  };

  const dailyBreakdown: Record<number, DailyMebScheduleBreakdown> = {};
  const lessons = schedule?.lessons || [];

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
      teacher.hasGuardDuty && teacher.guardDutyDay === d ? rules.nobetHoursPerWeek || 3 : 0;

    const totalDailyAdditionalHours =
      d >= 1 && d <= 5
        ? (equalEkDersDistribution[d] || 0)
        : (specialLessons);

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
  const weeklySpecialLessons = Object.values(dailyBreakdown).reduce((s, d) => s + d.specialActivityHours, 0);
  const weeklyMaasKarsiligi = Object.values(dailyBreakdown).reduce((s, d) => s + d.maasKarsiligiHours, 0);
  const weeklyExcessLessons = Object.values(dailyBreakdown).reduce((s, d) => s + d.excessLessonHours, 0);

  return {
    dailyBreakdown,
    weeklyNormalLessons,
    weeklySpecialLessons,
    weeklyTotalLessons: weeklyNormalLessons + weeklySpecialLessons,
    weeklyMaasKarsiligi,
    weeklyExcessLessons,
    weeklyPrepPlanning: weeklyCalc.preparationPlanningHours,
    weeklyGuidance: weeklyCalc.classGuidanceHours,
    weeklyDuty: weeklyCalc.guardDutyHours,
    weeklyTotalAdditionalHours: weeklyCalc.weeklyAdditionalHours,
  };
}

export interface MonthlyPuantajTotals {
  totalHours: number;
  bonusFiveToOneHours: number;
  payableTotalHours: number;
  estimatedPayment: number;
}

/**
 * Aylık puantaj cetveli için toplam saat, ek ders ilavesi ve ödenecek toplam saati hesaplar.
 *
 * HESAPLAMA KURALLARI:
 * 1. Ücretli öğretmenler:
 *    - Yalnızca ücretli öğretmenlere 2+1 sistemi uygulanır (Her 2 saatlik çalışma karşılığında 1 saat ek ders).
 *    - İlave Ek Ders = Math.floor(totalHours / 2)
 *    - Ödenecek Saat = totalHours + İlave Ek Ders
 *
 * 2. Sözleşmeli personel:
 *    - Normal ek ders hesaplama kurallarına göre hesaplanır. 5+1 sistemi kesinlikle uygulanmaz.
 *    - İlave Ek Ders = 0
 *    - Ödenecek Saat = totalHours
 *
 * 3. Diğer bütün personel türleri (stajyer, İŞKUR, kadrolu vb.):
 *    - Normal ek ders hesaplama sistemi uygulanır. 2+1 veya 5+1 uygulanmaz.
 *    - İlave Ek Ders = 0
 *    - Ödenecek Saat = totalHours
 */
export function calculateMonthlyPuantajTotals(params: {
  teacher: Teacher;
  totalHours: number;
  daysInMonth?: number;
  weeklyScheduleHours?: number;
  rules: MebPaymentRules;
  isAlreadyEkDers?: boolean;
}): MonthlyPuantajTotals {
  const { teacher, totalHours, rules } = params;
  const hourlyRate =
    teacher.hourlyRate || rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57;

  // Personel türüne göre ilave ek ders saati:
  // - Yalnızca Ücretli öğretmenler: 2+1 sistemi (Math.floor(totalHours / 2))
  // - Sözleşmeli ve diğer tüm personel türleri: Normal hesaplama (0)
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
