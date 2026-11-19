export type SubmissionStatus =
  | 'taslak'            // Okul hazırlıyor (Draft)
  | 'gonderildi'        // Okul yönetici onayına sundu (Submitted)
  | 'incelemede'        // İlçe/İl MEM incelemesinde (Under Review)
  | 'onaylandi'         // Onaylandı ve kilitlendi (Approved)
  | 'duzeltme_istendi'  // Eksik veya hatalı, düzeltme talep edildi (Correction Requested)
  | 'reddedildi'        // Reddedildi
  | 'bekleniyor'        // Okul henüz veri girmedi (Legacy alias for taslak/bekleniyor)
  | 'eksik_veri';       // Eksik veri uyarısı (Legacy alias)

export type UserRole = 'admin' | 'school_user';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  schoolId?: string; // null for admin, mandatory for school_user
  fullName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type Nationality = 'TR' | 'FOREIGN';

export type EducationLevel = 'lisans' | 'yuksek_lisans' | 'doktora';

export type BranchCategory =
  | 'genel_bilgi_ve_brans'
  | 'sinif'
  | 'okul_oncesi'
  | 'atolye_laboratuvar';

export interface BranchItem {
  id: string;
  name: string;
  category: BranchCategory;
  isCustom?: boolean;
}

export type LessonType = 'normal' | 'gece_haftasonu' | 'dyk' | 'destek';

export interface WeeklyLessonBlock {
  id: string;
  dayOfWeek: number; // 1: Pazartesi, 2: Salı, ..., 7: Pazar
  lessonCount: number; // Ders saati sayısı
  startTime?: string;  // Örn: "09:00"
  endTime?: string;    // Örn: "12:10"
  lessonType: LessonType; // 'normal' | 'gece_haftasonu' | 'dyk' | 'destek'
  subject?: string;
}

export interface TeacherWeeklySchedule {
  id: string;
  teacherId: string;
  schoolId: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  lessons: WeeklyLessonBlock[];
  totalWeeklyHours: number;
  createdAt?: string;
  updatedAt?: string;
}

export type EmploymentType =
  | 'sozlesmeli'
  | 'ucretli'
  | 'stajyer'
  | 'iskurlu'
  | 'kadrolu'
  | 'stajer'
  | 'ucretli_ogretmen'
  | 'usta_ogretici';

export type GeneralDirectorate =
  | 'Temel Eğitim Genel Müdürlüğü'
  | 'Ortaöğretim Genel Müdürlüğü'
  | 'Din Öğretimi Genel Müdürlüğü'
  | 'Özel Eğitim Genel Müdürlüğü'
  | 'Mesleki ve Teknik Eğitim Genel Müdürlüğü';

export const GENERAL_DIRECTORATES: GeneralDirectorate[] = [
  'Temel Eğitim Genel Müdürlüğü',
  'Ortaöğretim Genel Müdürlüğü',
  'Din Öğretimi Genel Müdürlüğü',
  'Özel Eğitim Genel Müdürlüğü',
  'Mesleki ve Teknik Eğitim Genel Müdürlüğü',
];

export interface School {
  id: string;
  institutionCode: string; // Kurum Kodu (örn: 752140)
  name: string;            // Okul Adı
  province?: string;       // İl (örn: Ankara)
  district: string;        // İlçe
  schoolType: string;      // İlkokul, Ortaokul, Lise, HEM vb.
  principalName: string;   // Okul Müdürü
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
  username?: string;       // Okul personeli giriş kullanıcı adı
  accountActive?: boolean; // Okul hesabı aktif/pasif durumu
  generalDirectorate?: GeneralDirectorate; // Bağlı Bulunduğu MEB Genel Müdürlüğü
}

export interface Teacher {
  id: string;
  schoolId: string;
  nationality: Nationality; // 'TR' | 'FOREIGN'
  tcNo: string;
  fullName: string;
  branch: string;
  branchCategory?: BranchCategory; // 'genel_bilgi_ve_brans' | 'sinif' | 'okul_oncesi' | 'atolye_laboratuvar'
  educationLevel?: EducationLevel; // 'lisans' | 'yuksek_lisans' | 'doktora'
  employmentType: EmploymentType;
  iban: string;
  explanation?: string;       // Açıklama / Görev (örn: USTAÖĞRETİCİ)
  hasGuardDuty?: boolean;     // Nöbet Görevi (Haftada 3 saat ek ders)
  guardDutyDay?: number;      // Nöbet Günü (1: Pazartesi ... 7: Pazar, 0/null: Yok)
  hasClassGuidance?: boolean; // Sınıf Rehberliği ve Sosyal Etkinlik (Haftada 2 saat ek ders)
  startDate: string;          // Başlama Tarihi
  departureDate?: string;     // Ayrılış Tarihi
  hasOtherEmployer: boolean;  // Başkaca bir işverende çalışıyor mu?
  otherEmployerTaxBase?: number; // Başkaca işverende çalışıyorsa aylık vergi matrahı
  hourlyRate: number;         // Ders saati ücreti (TL)
  isActive: boolean;
}

export type TimesheetCellStatus =
  | 'planned'    // Haftalık ders programından otomatik aktarılan (doğrulama bekliyor)
  | 'confirmed'  // Okul yetkilisi tarafından doğrulanmış fiili ders saati
  | 'manual'     // Kullanıcı tarafından elle girilen/değiştirilen saat
  | 'tatil'      // Resmi tatil / tatil günü
  | 'izinli'     // Mazeret / idari izinli
  | 'raporlu';   // Sağlık raporlu

export type TimesheetPeriodStatus = 'acik' | 'kapali';

export interface TimesheetPeriod {
  id: string;
  year: number;
  month: number;              // 1 - 12
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  status: TimesheetPeriodStatus; // 'acik' | 'kapali'
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyPuantajCell {
  day: number; // 1 to 31
  hours: number | null; // null: no record entered, 0: entered as 0, >0: lesson hours
  status?: TimesheetCellStatus;
  note?: string;
}

export interface TeacherMonthlyPuantajRow {
  teacherId: string;
  schoolId: string;
  year: number;
  month: number; // 1-12
  dailyHours: Record<number, number | null>; // day (1..31) -> hours
  dailyStatuses?: Record<number, TimesheetCellStatus>; // day (1..31) -> status ('planned' | 'confirmed' | 'manual' vb.)
  totalHours: number;
  bonusFiveToOneHours: number; // Her 5 saate 1 saat ek / hazırlık ve rehberlik ekleri
  payableTotalHours: number;
  estimatedPayment: number;
  dutyDailyHours?: Record<number, number | null>; // Nöbet görevi günlük saatleri (3 saat)
  dutyDailyStatuses?: Record<number, TimesheetCellStatus>; // Nöbet görevi hücre durumları ('planned' | 'confirmed')
  dutyTotalHours?: number; // Aylık toplam nöbet saati
  dutyEstimatedPayment?: number; // Nöbet görevi aylık tahakkuk tutarı
  // MEB Mevzuatı Günlük ve Aylık Ayrıntılı Dağılım Kalemleri
  maasDailyHours?: Record<number, number | null>; // Günlük maaş karşılığı saatleri
  excessDailyHours?: Record<number, number | null>; // Günlük maaş üstü ek ders saatleri
  prepDailyHours?: Record<number, number | null>; // Günlük hazırlık ve planlama saatleri (Madde 23)
  guidanceDailyHours?: Record<number, number | null>; // Günlük rehberlik saatleri (Madde 23)
  monthlyMaasHours?: number; // Aylık toplam maaş karşılığı
  monthlyExcessHours?: number; // Aylık toplam maaş üstü ek ders
  monthlyPrepHours?: number; // Aylık toplam hazırlık ve planlama
  monthlyGuidanceHours?: number; // Aylık toplam sınıf rehberliği
}

export interface SchoolMonthlySubmission {
  id: string;
  schoolId: string;
  year: number;
  month: number;
  status: SubmissionStatus;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  correctionRequestedAt?: string;
  correctionNotes?: string;
  rejectionReason?: string;
  notes?: string;
  totalTeachersCount: number;
  totalLessonHours: number;
  totalPayableAmount: number;
}

export interface MebPaymentRules {
  ucretliHourlyRate: number;        // Varsayılan saat ücreti (örn: 140.00 TL)
  gunduzHourlyRate: number;         // 2026 Temmuz-Aralık Normal Gündüz: 220.57 TL
  geceHaftasonuHourlyRate: number;  // 2026 Temmuz-Aralık Gece/Hafta Sonu: 236.33 TL
  yuksekLisansBonusPercent: number; // %7 artırımlı -> 236.01 TL
  doktoraBonusPercent: number;      // %20 artırımlı -> 264.69 TL
  ozelEgitimBonusPercent: number;   // %25 artırımlı -> 275.71 TL
  dykBonusPercent: number;          // %100 artırımlı -> 441.14 TL
  nobetHoursPerWeek: number;        // Nöbet Görevi: 3 saat
  sinifRehberlikHoursPerWeek: number; // Sınıf Rehberliği: 2 saat
  bonusFiveToOne: boolean;          // Her 5 derse 1 saat hazırlık-planlama ilavesi (veya her 10 saate 1 saat)
  incomeTaxRate: number;            // Gelir vergisi oranı (%15 veya %20)
  stampTaxRate: number;             // Damga vergisi binde 7.59 (0.00759)
  sgkEmployerShareRate: number;     // SGK işveren payı (%20.5)
  sgkEmployeeShareRate: number;     // SGK işçi payı (%14)
  unemploymentEmployeeRate: number; // İşsizlik sigortası (%1)
  effectiveDate?: string;           // Kural geçerlilik başlangıç tarihi
}

export interface AdditionalTeachingCalculationResult {
  weeklyScheduledHours: number;
  maasKarsiligiHours: number;
  excessLessonHours: number;
  preparationPlanningHours: number;
  guardDutyHours: number;
  classGuidanceHours: number;
  weeklyAdditionalHours: number;
  weeklyMaxLimit: number;
  isWeeklyLimitExceeded: boolean;

  monthlyWeeksCount: number;
  monthlyScheduledHours: number;
  monthlyActualPuantajHours: number;
  monthlyAdditionalHours: number;

  educationLevel: EducationLevel;
  appliedBaseHourlyRate: number;
  academicBonusPercent: number;
  effectiveHourlyRate: number;

  grossPayment: number;
  incomeTaxRate: number;
  incomeTaxAmount: number;
  stampTaxRate: number;
  stampTaxAmount: number;
  totalDeductions: number;
  netPayment: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface ExcelPuantajImportRow {
  rowNumber: number;
  tcNo: string;
  fullName: string;
  schoolName?: string;
  dailyHours: Record<number, number | null>;
  totalHours: number;
  iban: string;
  explanation: string;
  hasOtherEmployer: boolean;
  otherEmployerTaxBase: number;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}
