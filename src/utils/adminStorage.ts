import {
  School,
  Teacher,
  TeacherMonthlyPuantajRow,
  SchoolMonthlySubmission,
  MebPaymentRules,
  AuditLog,
  TeacherWeeklySchedule,
  TimesheetPeriod,
} from '../types';
import { DEFAULT_MEB_PAYMENT_RULES } from './paymentCalculator';

export const INITIAL_SCHOOLS: School[] = [
  {
    id: 'school-1',
    institutionCode: '752140',
    name: 'Atatürk Anadolu Lisesi',
    district: 'Çankaya / Ankara',
    schoolType: 'Anadolu Lisesi',
    principalName: 'Mustafa Yıldırım',
    contactPhone: '0312 419 2030',
    contactEmail: 'ataturkal@meb.k12.tr',
    isActive: true,
    username: '752140',
    accountActive: true,
    generalDirectorate: 'Ortaöğretim Genel Müdürlüğü',
  },
  {
    id: 'school-2',
    institutionCode: '758920',
    name: 'Cumhuriyet İlkokulu',
    district: 'Yenimahalle / Ankara',
    schoolType: 'İlkokul',
    principalName: 'Zehra Demir',
    contactPhone: '0312 344 1122',
    contactEmail: 'cumhuriyetio@meb.k12.tr',
    isActive: true,
    username: '758920',
    accountActive: true,
    generalDirectorate: 'Temel Eğitim Genel Müdürlüğü',
  },
  {
    id: 'school-3',
    institutionCode: '761045',
    name: 'Halk Eğitimi Merkezi ve ASO',
    district: 'Keçiören / Ankara',
    schoolType: 'Yaygın Eğitim / HEM',
    principalName: 'İbrahim Koç',
    contactPhone: '0312 381 5566',
    contactEmail: 'keciorenhem@meb.k12.tr',
    isActive: true,
    username: '761045',
    accountActive: true,
    generalDirectorate: 'Mesleki ve Teknik Eğitim Genel Müdürlüğü',
  },
  {
    id: 'school-4',
    institutionCode: '764312',
    name: 'Şehit Ömer Halisdemir İmam Hatip Ortaokulu',
    district: 'Etimesgut / Ankara',
    schoolType: 'İmam Hatip Ortaokulu',
    principalName: 'Emine Aksoy',
    contactPhone: '0312 244 8899',
    contactEmail: 'omerhalisdemiriho@meb.k12.tr',
    isActive: true,
    username: '764312',
    accountActive: true,
    generalDirectorate: 'Din Öğretimi Genel Müdürlüğü',
  },
  {
    id: 'school-5',
    institutionCode: '768910',
    name: 'Gölbaşı Özel Eğitim Uygulama Okulu',
    district: 'Gölbaşı / Ankara',
    schoolType: 'Özel Eğitim Uygulama Okulu',
    principalName: 'Hakan Çetin',
    contactPhone: '0312 484 1020',
    contactEmail: 'golbasiozel@meb.k12.tr',
    isActive: true,
    username: '768910',
    accountActive: true,
    generalDirectorate: 'Özel Eğitim Genel Müdürlüğü',
  },
];

export const INITIAL_TEACHERS: Teacher[] = [
  // Teachers from the user's provided Excel file:
  {
    id: 't-1',
    schoolId: 'school-3', // Halk Eğitimi Merkezi
    nationality: 'TR',
    tcNo: '51025187672',
    fullName: 'AYŞENUR ÖÇAL',
    branch: 'El Sanatları / Nakış',
    employmentType: 'usta_ogretici',
    iban: 'TR030004600152888000222958',
    explanation: 'USTAÖĞRETİCİ',
    startDate: '2026-09-15',
    hasOtherEmployer: false,
    hourlyRate: 140,
    isActive: true,
  },
  {
    id: 't-2',
    schoolId: 'school-3', // Halk Eğitimi Merkezi
    nationality: 'TR',
    tcNo: '11945043366',
    fullName: 'SÜMEYRA KOLAT',
    branch: 'Giyim Üretim Teknolojisi',
    employmentType: 'usta_ogretici',
    iban: 'TR960004600152888000209935',
    explanation: 'USTAÖĞRETİCİ',
    startDate: '2026-09-01',
    hasOtherEmployer: false,
    hourlyRate: 140,
    isActive: true,
  },
  // Additional teachers across other schools:
  {
    id: 't-3',
    schoolId: 'school-1', // Atatürk Anadolu Lisesi
    nationality: 'TR',
    tcNo: '24567891234',
    fullName: 'BURAK YILMAZ',
    branch: 'Matematik',
    employmentType: 'sozlesmeli',
    iban: 'TR120006200000012345678901',
    explanation: 'Sözleşmeli Öğretmen (9 ve 10. sınıflar)',
    startDate: '2026-09-18',
    hasOtherEmployer: false,
    hourlyRate: 140,
    isActive: true,
  },
  {
    id: 't-4',
    schoolId: 'school-1',
    nationality: 'TR',
    tcNo: '37891234560',
    fullName: 'MELTEM ÇETİN',
    branch: 'Biyoloji',
    employmentType: 'stajyer',
    iban: 'TR560001500000098765432101',
    explanation: 'Stajyer Öğretmen',
    startDate: '2026-10-01',
    hasOtherEmployer: true,
    otherEmployerTaxBase: 18500,
    hourlyRate: 140,
    isActive: true,
  },
  {
    id: 't-5',
    schoolId: 'school-2', // Cumhuriyet İlkokulu
    nationality: 'TR',
    tcNo: '48912345678',
    fullName: 'GÖKÇE ARSLAN',
    branch: 'İngilizce',
    employmentType: 'ucretli',
    iban: 'TR880006400000112233445566',
    explanation: 'Ücretli Öğretmen (2, 3 ve 4. sınıflar)',
    startDate: '2026-09-22',
    hasOtherEmployer: false,
    hourlyRate: 140,
    isActive: true,
  },
  {
    id: 't-6',
    schoolId: 'school-4', // Şehit Ömer Halisdemir İHO
    nationality: 'TR',
    tcNo: '59123456789',
    fullName: 'HASAN KILIÇ',
    branch: 'Arapça',
    employmentType: 'iskurlu',
    iban: 'TR330001000000998877665544',
    explanation: 'İşkurlu Personel',
    startDate: '2026-10-05',
    hasOtherEmployer: false,
    hourlyRate: 140,
    isActive: true,
  },
  {
    id: 't-7',
    schoolId: 'school-5', // Gölbaşı Özel Eğitim Uygulama Okulu
    nationality: 'TR',
    tcNo: '61234567890',
    fullName: 'HAKAN AKSOY',
    branch: 'Özel Eğitim',
    branchCategory: 'genel_bilgi_ve_brans',
    educationLevel: 'lisans',
    employmentType: 'ucretli',
    iban: 'TR440001500000112233445577',
    explanation: 'Özel Eğitim Öğretmeni',
    startDate: '2026-09-15',
    hasOtherEmployer: false,
    hourlyRate: 275.71,
    isActive: true,
  },
];

export function generateInitialPuantajRows(): TeacherMonthlyPuantajRow[] {
  const rows: TeacherMonthlyPuantajRow[] = [];
  const year = 2026;
  const month = 10; // Ekim

  // 1. Ayşenur Öçal (Exact data from Excel file):
  const aysenurHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) aysenurHours[d] = null;
  [5, 12, 19, 26].forEach((d) => (aysenurHours[d] = 6));
  [7, 21].forEach((d) => (aysenurHours[d] = 9));
  [8, 9, 16, 22, 23, 30].forEach((d) => (aysenurHours[d] = 2));
  aysenurHours[28] = 4;

  const aysenurTotal = Object.values(aysenurHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const aysenurBonus = Math.floor(aysenurTotal / 5);
  rows.push({
    teacherId: 't-1',
    schoolId: 'school-3',
    year,
    month,
    dailyHours: aysenurHours,
    totalHours: aysenurTotal,
    bonusFiveToOneHours: aysenurBonus,
    payableTotalHours: aysenurTotal + aysenurBonus,
    estimatedPayment: (aysenurTotal + aysenurBonus) * 140,
  });

  // 2. Sümeyra Kolat (Exact data from Excel file):
  const sumeyraHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) sumeyraHours[d] = null;
  [1, 8, 15].forEach((d) => (sumeyraHours[d] = 7));
  [2, 9, 16, 30].forEach((d) => (sumeyraHours[d] = 8));
  [5, 6, 12, 13, 26, 27].forEach((d) => (sumeyraHours[d] = 9));
  [7, 28].forEach((d) => (sumeyraHours[d] = 5));

  const sumeyraTotal = Object.values(sumeyraHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const sumeyraBonus = Math.floor(sumeyraTotal / 5);
  rows.push({
    teacherId: 't-2',
    schoolId: 'school-3',
    year,
    month,
    dailyHours: sumeyraHours,
    totalHours: sumeyraTotal,
    bonusFiveToOneHours: sumeyraBonus,
    payableTotalHours: sumeyraTotal + sumeyraBonus,
    estimatedPayment: (sumeyraTotal + sumeyraBonus) * 140,
  });

  // 3. Burak Yılmaz (Atatürk AL)
  const burakHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) burakHours[d] = null;
  [5, 6, 8, 12, 13, 15, 19, 20, 22, 26, 27].forEach((d) => (burakHours[d] = 6));
  const burakTotal = Object.values(burakHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const burakBonus = Math.floor(burakTotal / 5);
  rows.push({
    teacherId: 't-3',
    schoolId: 'school-1',
    year,
    month,
    dailyHours: burakHours,
    totalHours: burakTotal,
    bonusFiveToOneHours: burakBonus,
    payableTotalHours: burakTotal + burakBonus,
    estimatedPayment: (burakTotal + burakBonus) * 140,
  });

  // 4. Meltem Çetin (Atatürk AL)
  const meltemHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) meltemHours[d] = null;
  [7, 9, 14, 16, 21, 23, 28, 30].forEach((d) => (meltemHours[d] = 5));
  const meltemTotal = Object.values(meltemHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const meltemBonus = Math.floor(meltemTotal / 5);
  rows.push({
    teacherId: 't-4',
    schoolId: 'school-1',
    year,
    month,
    dailyHours: meltemHours,
    totalHours: meltemTotal,
    bonusFiveToOneHours: meltemBonus,
    payableTotalHours: meltemTotal + meltemBonus,
    estimatedPayment: (meltemTotal + meltemBonus) * 140,
  });

  // 5. Gökçe Arslan (Cumhuriyet İO)
  const gokceHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) gokceHours[d] = null;
  [5, 6, 7, 8, 12, 13, 14, 15, 19, 20, 21, 22, 26, 27, 28].forEach((d) => (gokceHours[d] = 4));
  const gokceTotal = Object.values(gokceHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const gokceBonus = Math.floor(gokceTotal / 5);
  rows.push({
    teacherId: 't-5',
    schoolId: 'school-2',
    year,
    month,
    dailyHours: gokceHours,
    totalHours: gokceTotal,
    bonusFiveToOneHours: gokceBonus,
    payableTotalHours: gokceTotal + gokceBonus,
    estimatedPayment: (gokceTotal + gokceBonus) * 140,
  });

  // 6. Hasan Kılıç (Şehit Ömer Halisdemir İHO)
  const hasanHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) hasanHours[d] = null;
  [5, 6, 12, 13, 19].forEach((d) => (hasanHours[d] = 6));
  const hasanTotal = Object.values(hasanHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const hasanBonus = Math.floor(hasanTotal / 5);
  rows.push({
    teacherId: 't-6',
    schoolId: 'school-4',
    year,
    month,
    dailyHours: hasanHours,
    totalHours: hasanTotal,
    bonusFiveToOneHours: hasanBonus,
    payableTotalHours: hasanTotal + hasanBonus,
    estimatedPayment: (hasanTotal + hasanBonus) * 140,
  });

  // 7. Hakan Aksoy (Gölbaşı Özel Eğitim Uygulama Okulu)
  const hakanHours: Record<number, number | null> = {};
  for (let d = 1; d <= 31; d++) hakanHours[d] = null;
  [5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28].forEach((d) => (hakanHours[d] = 5));
  const hakanTotal = Object.values(hakanHours).reduce((acc: number, val) => acc + (val || 0), 0);
  const hakanBonus = Math.floor(hakanTotal / 5);
  rows.push({
    teacherId: 't-7',
    schoolId: 'school-5',
    year,
    month,
    dailyHours: hakanHours,
    totalHours: hakanTotal,
    bonusFiveToOneHours: hakanBonus,
    payableTotalHours: hakanTotal + hakanBonus,
    estimatedPayment: (hakanTotal + hakanBonus) * 275.71,
  });

  return rows;
}

export const INITIAL_SUBMISSIONS: SchoolMonthlySubmission[] = [
  {
    id: 'sub-1',
    schoolId: 'school-3', // Halk Eğitimi Merkezi
    year: 2026,
    month: 10,
    status: 'onaylandi', // Approved
    submittedAt: '2026-11-01T10:30:00Z',
    approvedAt: '2026-11-02T14:15:00Z',
    notes: 'Tüm usta öğretici puantajları ilçe komisyonunca onaylanmıştır.',
    totalTeachersCount: 2,
    totalLessonHours: 198,
    totalPayableAmount: 33180,
  },
  {
    id: 'sub-2',
    schoolId: 'school-1', // Atatürk AL
    year: 2026,
    month: 10,
    status: 'incelemede', // Under Review
    submittedAt: '2026-11-03T09:15:00Z',
    notes: 'Vergi matrahı beyanları inceleniyor.',
    totalTeachersCount: 2,
    totalLessonHours: 106,
    totalPayableAmount: 17780,
  },
  {
    id: 'sub-3',
    schoolId: 'school-2', // Cumhuriyet İO
    year: 2026,
    month: 10,
    status: 'taslak', // Draft
    totalTeachersCount: 1,
    totalLessonHours: 60,
    totalPayableAmount: 10080,
  },
  {
    id: 'sub-4',
    schoolId: 'school-4', // Şehit Ömer Halisdemir İHO
    year: 2026,
    month: 10,
    status: 'duzeltme_istendi', // Correction Requested
    submittedAt: '2026-11-04T16:00:00Z',
    correctionRequestedAt: '2026-11-05T11:00:00Z',
    correctionNotes: '20-31 Ekim arası günlerin ders saatleri boş bırakılmış. Lütfen ders saatlerini girerek tekrar onaya sununuz.',
    notes: 'Eksik günler mevcut.',
    totalTeachersCount: 1,
    totalLessonHours: 30,
    totalPayableAmount: 5040,
  },
  {
    id: 'sub-5',
    schoolId: 'school-5', // Gölbaşı Özel Eğitim Uygulama Okulu
    year: 2026,
    month: 10,
    status: 'onaylandi', // Approved
    submittedAt: '2026-11-02T09:00:00Z',
    approvedAt: '2026-11-02T16:30:00Z',
    notes: 'Özel eğitim uygulama okulu puantajı onaylandı.',
    totalTeachersCount: 1,
    totalLessonHours: 90,
    totalPayableAmount: 29776.68,
  },
];

export function generateInitialWeeklySchedules(): TeacherWeeklySchedule[] {
  const teacherConfigs = [
    { id: 't-1', schoolId: 'school-3' },
    { id: 't-2', schoolId: 'school-3' },
    { id: 't-3', schoolId: 'school-1' },
    { id: 't-4', schoolId: 'school-1' },
    { id: 't-5', schoolId: 'school-2' },
    { id: 't-6', schoolId: 'school-4' },
    { id: 't-7', schoolId: 'school-5' },
  ];

  return teacherConfigs.map(({ id: teacherId, schoolId }) => ({
    id: `sched-${teacherId}`,
    teacherId,
    schoolId,
    effectiveStartDate: '2026-09-01',
    totalWeeklyHours: 30,
    lessons: [
      { id: `${teacherId}-pzt`, dayOfWeek: 1, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
      { id: `${teacherId}-sal`, dayOfWeek: 2, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
      { id: `${teacherId}-car`, dayOfWeek: 3, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
      { id: `${teacherId}-per`, dayOfWeek: 4, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
      { id: `${teacherId}-cum`, dayOfWeek: 5, lessonCount: 6, startTime: '09:00', endTime: '14:20', lessonType: 'normal' },
    ],
  }));
}

export function getDefaultPeriodForMonth(year: number, month: number): TimesheetPeriod {
  const days = new Date(year, month, 0).getDate();
  const mStr = String(month).padStart(2, '0');
  const dStr = String(days).padStart(2, '0');
  return {
    id: `period-${year}-${mStr}`,
    year,
    month,
    startDate: `${year}-${mStr}-01`,
    endDate: `${year}-${mStr}-${dStr}`,
    status: 'acik',
  };
}

export const INITIAL_TIMESHEET_PERIODS: TimesheetPeriod[] = [
  {
    id: 'period-2026-10',
    year: 2026,
    month: 10,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'kapali',
    notes: 'Ekim 2026 puantaj dönemi tamamlanmıştır.',
  },
  {
    id: 'period-2026-11',
    year: 2026,
    month: 11,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'acik',
    notes: 'Kasım 2026 aktif puantaj dönemi.',
  },
  {
    id: 'period-2026-12',
    year: 2026,
    month: 12,
    startDate: '2026-12-01',
    endDate: '2026-12-31',
    status: 'acik',
    notes: 'Aralık 2026 puantaj dönemi.',
  },
];

const STORAGE_KEYS = {
  SCHOOLS: 'meb_admin_schools',
  TEACHERS: 'meb_admin_teachers',
  PUANTAJ_ROWS: 'meb_admin_puantaj_rows',
  SUBMISSIONS: 'meb_admin_submissions',
  RULES: 'meb_admin_rules',
  LOGS: 'meb_admin_logs',
  ACCOUNTS: 'meb_user_accounts',
  SESSION: 'meb_auth_session',
  WEEKLY_SCHEDULES: 'meb_admin_weekly_schedules',
  TIMESHEET_PERIODS: 'meb_admin_timesheet_periods',
  DIRECTORATE: 'meb_admin_selected_directorate',
};

export function loadStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Could not load ${key}:`, err);
    return fallback;
  }
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Could not save ${key}:`, err);
  }
}

export { STORAGE_KEYS };
