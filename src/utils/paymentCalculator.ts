import { MebPaymentRules, Teacher } from '../types';
import { calculateMonthlyPuantajTotals } from './additionalTeachingCalculator';

export const DEFAULT_MEB_PAYMENT_RULES: MebPaymentRules = {
  ucretliHourlyRate: 140.0,
  gunduzHourlyRate: 220.57,          // 2026 Temmuz - Aralık Normal Gündüz (140 gösterge)
  geceHaftasonuHourlyRate: 236.33,   // Gece / Hafta Sonu ve Tatil (150 gösterge)
  yuksekLisansBonusPercent: 7,       // Yüksek Lisans: %7 artırımlı -> 236.01 TL
  doktoraBonusPercent: 20,           // Doktora: %20 artırımlı -> 264.69 TL
  ozelEgitimBonusPercent: 25,        // Özel Eğitim: %25 artırımlı -> 275.71 TL
  dykBonusPercent: 100,              // DYK Kursu: %100 artırımlı -> 441.14 TL
  nobetHoursPerWeek: 3,              // Nöbet Görevi: 3 saat ek ders
  sinifRehberlikHoursPerWeek: 2,     // Sınıf Rehberliği ve Sosyal Etkinlik: 2 saat ek ders
  bonusFiveToOne: true,              // 5'e 1 veya 10'a 1 hazırlık kuralı
  incomeTaxRate: 0.15,               // %15 standart başlangıç dilimi
  stampTaxRate: 0.00759,             // Damga vergisi binde 7.59
  sgkEmployerShareRate: 0.205,
  sgkEmployeeShareRate: 0.14,
  unemploymentEmployeeRate: 0.01,
  effectiveDate: '2026-07-01',
};

export interface TeacherPaymentBreakdown {
  teacherId: string;
  teacherName: string;
  totalActualHours: number;      // Fiili girdiği ders saati
  bonusHours: number;             // 5'e 1 hazırlık ve planlama ilavesi
  payableTotalHours: number;      // Ödenecek toplam saat
  hourlyRate: number;             // Birim ders saat ücreti
  grossPayment: number;           // Brüt ek ders ücreti
  incomeTaxBase: number;          // Gelir vergisi matrahı
  otherEmployerTaxBase: number;   // Başkaca işverenden gelen matrah
  totalCumulativeTaxBase: number; // Kümülatif vergi matrahı
  incomeTaxAmount: number;        // Kesilen gelir vergisi
  stampTaxAmount: number;         // Kesilen damga vergisi
  netPayment: number;             // Net ödenecek ek ders ücreti
}

/**
 * Calculates payment breakdown for a single teacher based on monthly hours and rules
 */
export function calculateTeacherPayment(
  teacher: Teacher,
  actualHours: number,
  rules: MebPaymentRules,
  options?: { daysInMonth?: number; weeklyScheduleHours?: number }
): TeacherPaymentBreakdown {
  const hourlyRate = teacher.hourlyRate > 0 ? teacher.hourlyRate : (rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57);
  const daysInMonth = options?.daysInMonth || 30;

  // Resmî statü kurallarına göre aylık puantaj toplamları
  const totals = calculateMonthlyPuantajTotals({
    teacher,
    totalHours: actualHours,
    daysInMonth,
    weeklyScheduleHours: options?.weeklyScheduleHours,
    rules,
  });

  const bonusHours = totals.bonusFiveToOneHours;
  const payableTotalHours = totals.payableTotalHours;
  const grossPayment = totals.estimatedPayment;

  // Tax calculations
  const otherEmployerTaxBase = teacher.hasOtherEmployer ? teacher.otherEmployerTaxBase || 0 : 0;
  const incomeTaxBase = grossPayment;
  const totalCumulativeTaxBase = incomeTaxBase + otherEmployerTaxBase;

  // Standard stamp tax (binde 7.59)
  const stampTaxAmount = grossPayment * rules.stampTaxRate;

  // Standard income tax (%15)
  const incomeTaxAmount = grossPayment * rules.incomeTaxRate;

  const netPayment = Math.max(0, grossPayment - (stampTaxAmount + incomeTaxAmount));

  return {
    teacherId: teacher.id,
    teacherName: teacher.fullName,
    totalActualHours: actualHours,
    bonusHours,
    payableTotalHours,
    hourlyRate,
    grossPayment,
    incomeTaxBase,
    otherEmployerTaxBase,
    totalCumulativeTaxBase,
    incomeTaxAmount,
    stampTaxAmount,
    netPayment,
  };
}

export function formatTRY(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

