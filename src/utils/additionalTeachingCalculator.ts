import {
  AdditionalTeachingCalculationResult,
  BranchCategory,
  EducationLevel,
  MebPaymentRules,
  Teacher,
  TeacherWeeklySchedule,
} from '../types';
import { BRANCH_CATEGORY_CONFIGS, inferBranchCategory } from './branchData';

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
} {
  // 1. Haftalık planlanan toplam ders saati
  const weeklyScheduledHours = weeklySchedule?.totalWeeklyHours ?? (teacher.hourlyRate ? 30 : 0);

  // 2. Branş kategorisi ve maaş karşılığı
  const category: BranchCategory =
    teacher.branchCategory || inferBranchCategory(teacher.branch);
  const config = BRANCH_CATEGORY_CONFIGS[category] || BRANCH_CATEGORY_CONFIGS.genel_bilgi_ve_brans;

  const maasKarsiligiHours = config.maasKarsiligiHours;

  // 3. Maaş karşılığı üstü ders saati
  const excessLessonHours = Math.max(0, weeklyScheduledHours - maasKarsiligiHours);

  // 4. Hazırlık ve Planlama (Genel bilgi ve branş için her 10 saate +1 saat, maks 3; diğerlerinde sabit)
  let preparationPlanningHours = 0;
  if (config.hazirlikPerTenHours) {
    preparationPlanningHours = Math.min(
      config.maxHazirlikHours,
      Math.floor(weeklyScheduledHours / 10)
    );
  } else {
    preparationPlanningHours = config.hazirlikFixedHours || 1;
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
