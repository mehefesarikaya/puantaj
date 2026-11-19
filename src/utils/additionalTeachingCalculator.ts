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

  // 1. DYK Kursu: %100 artırımlı -> 441,14 TL
  if (options?.isDyk) {
    const rate = 441.14;
    return { baseRate: baseDayRate, bonusPercent: rules.dykBonusPercent || 100, effectiveRate: rate };
  }

  // 2. Özel Eğitim / Destek Eğitimi: %25 artırımlı -> 275,71 TL
  if (options?.isOzelEgitim) {
    const rate = 275.71;
    return { baseRate: baseDayRate, bonusPercent: rules.ozelEgitimBonusPercent || 25, effectiveRate: rate };
  }

  // 3. Gece, Hafta Sonu ve Tatil: 150 gösterge -> 236,33 TL
  if (options?.isGeceHaftasonu) {
    const nightRate = rules.geceHaftasonuHourlyRate || 236.33;
    return { baseRate: nightRate, bonusPercent: 0, effectiveRate: nightRate };
  }

  // 4. Akademik Eğitim Düzeyi
  if (educationLevel === 'doktora') {
    // Doktora Mezunu (Gündüz): %20 artırımlı -> 264,69 TL (168 gösterge karşılığı)
    const bonus = rules.doktoraBonusPercent || 20;
    const rate = 264.69;
    return { baseRate: baseDayRate, bonusPercent: bonus, effectiveRate: rate };
  }

  if (educationLevel === 'yuksek_lisans') {
    // Yüksek Lisans Mezunu (Gündüz): %7 artırımlı -> 236,01 TL
    const bonus = rules.yuksekLisansBonusPercent || 7;
    const rate = 236.01;
    return { baseRate: baseDayRate, bonusPercent: bonus, effectiveRate: rate };
  }

  // 5. Lisans (Standart): 220,57 TL
  return { baseRate: baseDayRate, bonusPercent: 0, effectiveRate: baseDayRate };
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

  // 2. Branş kategorisi ve maaş karşılığı (Yalnızca Sözleşmeli statüde uygulanır)
  const isSozlesmeli = teacher.employmentType === 'sozlesmeli';
  const category: BranchCategory =
    teacher.branchCategory || inferBranchCategory(teacher.branch);
  const config = BRANCH_CATEGORY_CONFIGS[category] || BRANCH_CATEGORY_CONFIGS.genel_bilgi_ve_brans;

  // Maaş karşılığı düşümü KURAL: SADECE sözleşmeli statüde uygulanır.
  // Stajyer, İŞKUR ve diğer statülerde maaş karşılığı düşümü yapılmaz (0).
  const maasKarsiligiHours = isSozlesmeli ? config.maasKarsiligiHours : 0;

  // 3. Maaş karşılığı üstü ders saati
  const excessLessonHours = Math.max(0, weeklyScheduledHours - maasKarsiligiHours);

  // 4. Hazırlık ve Planlama (Sözleşmeli: 10'a 1 veya sabit; Ücretli: 5'e 1; Stajyer/İŞKUR: 0)
  let preparationPlanningHours = 0;
  if (isSozlesmeli) {
    if (config.hazirlikPerTenHours) {
      preparationPlanningHours = Math.min(
        config.maxHazirlikHours,
        Math.floor(weeklyScheduledHours / 10)
      );
    } else {
      preparationPlanningHours = config.hazirlikFixedHours || 1;
    }
  } else if (
    teacher.employmentType === 'stajyer' ||
    teacher.employmentType === 'stajer' ||
    teacher.employmentType === 'iskurlu'
  ) {
    preparationPlanningHours = 0;
  } else {
    preparationPlanningHours = rules.bonusFiveToOne ? Math.floor(weeklyScheduledHours / 5) : 0;
  }

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

  // 9. MEB Kararı Madde 23 Kapsamındaki Ek Derslerin Çalışma Günlerine Dağıtımı
  // Hazırlık ve planlama (Madde 11) ile sınıf rehberliği (Madde 6) ek ders saatleri
  // çalışma günlerine eşit dağıtılır; eşit bölünemeyen saatler öncelikle Pazartesi ve Cuma günlerine eklenir.
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
 * Aylık puantaj cetveli için toplam saat, 5'e 1 / hazırlık ve ödenecek toplam saati hesaplar.
 *
 * RESMİ MEB KURALLARI:
 * 1. Sözleşmeli: Haftalık programa göre maaş karşılığı düşümü uygulanır.
 *    Ödenecek Saat = (Toplam Fiili Saat - Aylık Maaş Karşılığı) + Hazırlık/Planlama
 * 2. Stajyer: Maaş karşılığı düşümü YOKTUR, 5'e 1 ilavesi YOKTUR. Ödenecek = Fiili Saat.
 * 3. İŞKUR: Maaş karşılığı düşümü YOKTUR, 5'e 1 ilavesi YOKTUR. Ödenecek = Fiili Saat.
 * 4. Ücretli ve Diğer: Maaş karşılığı düşümü YOKTUR, 5'e 1 ek ders ilavesi uygulanır.
 */
export function calculateMonthlyPuantajTotals(params: {
  teacher: Teacher;
  totalHours: number;
  daysInMonth: number;
  weeklyScheduleHours?: number;
  rules: MebPaymentRules;
  isAlreadyEkDers?: boolean;
}): MonthlyPuantajTotals {
  const { teacher, totalHours, daysInMonth, weeklyScheduleHours, rules, isAlreadyEkDers } = params;
  const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57;

  // MEB Günlük Çizelgesinden aktarılan Toplam Ek Ders değerleri için ek düşüm yapılmaz
  if (isAlreadyEkDers) {
    return {
      totalHours,
      bonusFiveToOneHours: 0,
      payableTotalHours: totalHours,
      estimatedPayment: Math.round(totalHours * hourlyRate * 100) / 100,
    };
  }

  // 1. SÖZLEŞMELİ: Maaş karşılığı düşümü SADECE sözleşmeli öğretmenlere uygulanır
  if (teacher.employmentType === 'sozlesmeli') {
    const category = teacher.branchCategory || inferBranchCategory(teacher.branch);
    const config = BRANCH_CATEGORY_CONFIGS[category] || BRANCH_CATEGORY_CONFIGS.genel_bilgi_ve_brans;
    const weeksCount = Math.max(1, Math.round(daysInMonth / 7));
    const monthlyMaasKarsiligi = config.maasKarsiligiHours * weeksCount;
    const excessHours = Math.max(0, totalHours - monthlyMaasKarsiligi);

    const weeklyHours = weeklyScheduleHours ?? (weeksCount > 0 ? Math.round(totalHours / weeksCount) : 30);
    const weeklyPrep = config.hazirlikPerTenHours
      ? Math.min(config.maxHazirlikHours, Math.floor(weeklyHours / 10))
      : (config.hazirlikFixedHours || 1);
    const monthlyPrep = weeklyPrep * weeksCount;

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
