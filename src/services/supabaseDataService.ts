import { supabase } from '../lib/supabaseClient';
import {
  School,
  Teacher,
  TeacherMonthlyPuantajRow,
  SchoolMonthlySubmission,
  MebPaymentRules,
  AuditLog,
  SubmissionStatus,
  TimesheetPeriod,
  TimesheetPeriodStatus,
} from '../types';

// =====================================================================
// DATA CONVERSION HELPERS (Snake_case DB <-> camelCase App)
// =====================================================================

export const mapSchoolFromDb = (row: any): School => ({
  id: row.id,
  institutionCode: row.institution_code,
  name: row.name,
  province: row.province || 'Ankara',
  district: row.district,
  schoolType: row.school_type,
  principalName: row.principal_name || '',
  contactPhone: row.contact_phone || '',
  contactEmail: row.contact_email || '',
  isActive: Boolean(row.is_active),
  username: row.username || row.institution_code,
  accountActive: Boolean(row.account_active),
  generalDirectorate: row.general_directorate || undefined,
});

export const mapSchoolToDb = (school: School) => ({
  id: school.id,
  institution_code: school.institutionCode,
  name: school.name,
  province: school.province || 'Ankara',
  district: school.district,
  school_type: school.schoolType,
  principal_name: school.principalName,
  contact_phone: school.contactPhone,
  contact_email: school.contactEmail,
  username: school.username || school.institutionCode,
  account_active: school.accountActive ?? true,
  is_active: school.isActive,
  general_directorate: school.generalDirectorate || null,
  updated_at: new Date().toISOString(),
});

export const mapTeacherFromDb = (row: any): Teacher => ({
  id: row.id,
  schoolId: row.school_id,
  nationality: row.nationality === 'FOREIGN' ? 'FOREIGN' : 'TR',
  tcNo: row.tc_no,
  fullName: row.full_name,
  branch: row.branch,
  branchCategory: row.branch_category || 'genel_bilgi_ve_brans',
  educationLevel: row.education_level || 'lisans',
  employmentType: row.employment_type,
  hasGuardDuty: Boolean(row.has_guard_duty),
  guardDutyDay: row.guard_duty_day !== undefined && row.guard_duty_day !== null ? Number(row.guard_duty_day) : undefined,
  hasClassGuidance: Boolean(row.has_class_guidance),
  iban: row.iban,
  explanation: row.explanation || '',
  startDate: row.start_date,
  departureDate: row.departure_date || undefined,
  hasOtherEmployer: Boolean(row.has_other_employer),
  otherEmployerTaxBase: Number(row.other_employer_tax_base || 0),
  hourlyRate: Number(row.hourly_rate || 220.57),
  isActive: Boolean(row.is_active),
});

export const mapTeacherToDb = (teacher: Teacher) => ({
  id: teacher.id,
  school_id: teacher.schoolId,
  nationality: teacher.nationality || 'TR',
  tc_no: teacher.tcNo,
  full_name: teacher.fullName,
  branch: teacher.branch,
  branch_category: teacher.branchCategory || 'genel_bilgi_ve_brans',
  education_level: teacher.educationLevel || 'lisans',
  employment_type: teacher.employmentType,
  has_guard_duty: Boolean(teacher.hasGuardDuty),
  guard_duty_day: teacher.guardDutyDay ?? null,
  has_class_guidance: Boolean(teacher.hasClassGuidance),
  iban: teacher.iban,
  explanation: teacher.explanation || '',
  start_date: teacher.startDate,
  departure_date: teacher.departureDate || null,
  has_other_employer: teacher.hasOtherEmployer,
  other_employer_tax_base: teacher.otherEmployerTaxBase || 0,
  hourly_rate: teacher.hourlyRate,
  is_active: teacher.isActive,
  updated_at: new Date().toISOString(),
});

export const mapSubmissionFromDb = (row: any): SchoolMonthlySubmission => ({
  id: row.id,
  schoolId: row.school_id,
  year: row.year,
  month: row.month,
  status: row.status as SubmissionStatus,
  submittedAt: row.submitted_at || undefined,
  approvedAt: row.approved_at || undefined,
  rejectedAt: row.rejected_at || undefined,
  correctionRequestedAt: row.correction_requested_at || undefined,
  correctionNotes: row.correction_notes || undefined,
  rejectionReason: row.rejection_reason || undefined,
  notes: row.notes || undefined,
  totalTeachersCount: Number(row.total_teachers_count || 0),
  totalLessonHours: Number(row.total_lesson_hours || 0),
  totalPayableAmount: Number(row.total_payable_amount || 0),
});

export const mapSubmissionToDb = (sub: SchoolMonthlySubmission) => ({
  id: sub.id,
  school_id: sub.schoolId,
  year: sub.year,
  month: sub.month,
  status: sub.status,
  submitted_at: sub.submittedAt || null,
  approved_at: sub.approvedAt || null,
  rejected_at: sub.rejectedAt || null,
  correction_requested_at: sub.correctionRequestedAt || null,
  correction_notes: sub.correctionNotes || null,
  rejection_reason: sub.rejectionReason || null,
  notes: sub.notes || null,
  total_teachers_count: sub.totalTeachersCount,
  total_lesson_hours: sub.totalLessonHours,
  total_payable_amount: sub.totalPayableAmount,
  updated_at: new Date().toISOString(),
});

export const mapPuantajFromDb = (row: any): TeacherMonthlyPuantajRow => {
  const rawStatuses = (row.daily_statuses as Record<string, any>) || {};
  const dailyStatuses: Record<number, any> = {};

  Object.keys(rawStatuses).forEach((k) => {
    if (!k.startsWith('_')) {
      dailyStatuses[Number(k)] = rawStatuses[k];
    }
  });

  return {
    teacherId: row.teacher_id,
    schoolId: row.school_id,
    year: row.year,
    month: row.month,
    dailyHours: (row.daily_hours as Record<number, number | null>) || {},
    dailyStatuses,
    totalHours: Number(row.total_hours || 0),
    bonusFiveToOneHours: Number(row.bonus_five_to_one_hours || 0),
    payableTotalHours: Number(row.payable_total_hours || 0),
    estimatedPayment: Number(row.estimated_payment || 0),
    dutyDailyHours: (row.duty_daily_hours as Record<number, number | null>) || {},
    dutyDailyStatuses: (row.duty_daily_statuses as Record<number, any>) || {},
    dutyTotalHours: Number(row.duty_total_hours || 0),
    dutyEstimatedPayment: Number(row.duty_estimated_payment || 0),
    maasDailyHours: rawStatuses._maasDaily,
    excessDailyHours: rawStatuses._excessDaily,
    prepDailyHours: rawStatuses._prepDaily,
    guidanceDailyHours: rawStatuses._guidanceDaily,
    monthlyMaasHours: rawStatuses._monthlyMaas,
    monthlyExcessHours: rawStatuses._monthlyExcess,
    monthlyPrepHours: rawStatuses._monthlyPrep,
    monthlyGuidanceHours: rawStatuses._monthlyGuidance,
  };
};

export const mapPuantajToDb = (row: TeacherMonthlyPuantajRow) => {
  const metaStatuses: Record<string, any> = { ...(row.dailyStatuses || {}) };
  if (row.maasDailyHours) metaStatuses._maasDaily = row.maasDailyHours;
  if (row.excessDailyHours) metaStatuses._excessDaily = row.excessDailyHours;
  if (row.prepDailyHours) metaStatuses._prepDaily = row.prepDailyHours;
  if (row.guidanceDailyHours) metaStatuses._guidanceDaily = row.guidanceDailyHours;
  if (row.monthlyMaasHours !== undefined) metaStatuses._monthlyMaas = row.monthlyMaasHours;
  if (row.monthlyExcessHours !== undefined) metaStatuses._monthlyExcess = row.monthlyExcessHours;
  if (row.monthlyPrepHours !== undefined) metaStatuses._monthlyPrep = row.monthlyPrepHours;
  if (row.monthlyGuidanceHours !== undefined) metaStatuses._monthlyGuidance = row.monthlyGuidanceHours;

  return {
    id: `${row.teacherId}-${row.year}-${row.month}`,
    teacher_id: row.teacherId,
    school_id: row.schoolId,
    year: row.year,
    month: row.month,
    daily_hours: row.dailyHours,
    daily_statuses: metaStatuses,
    total_hours: row.totalHours,
    bonus_five_to_one_hours: row.bonusFiveToOneHours,
    payable_total_hours: row.payableTotalHours,
    estimated_payment: row.estimatedPayment,
    duty_daily_hours: row.dutyDailyHours || {},
    duty_daily_statuses: row.dutyDailyStatuses || {},
    duty_total_hours: row.dutyTotalHours || 0,
    duty_estimated_payment: row.dutyEstimatedPayment || 0,
    updated_at: new Date().toISOString(),
  };
};

export const mapPeriodFromDb = (row: any): TimesheetPeriod => ({
  id: row.id,
  year: Number(row.year),
  month: Number(row.month),
  startDate: row.start_date,
  endDate: row.end_date,
  status: (row.status as TimesheetPeriodStatus) || 'acik',
  notes: row.notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapPeriodToDb = (period: TimesheetPeriod) => ({
  id: period.id,
  year: period.year,
  month: period.month,
  start_date: period.startDate,
  end_date: period.endDate,
  status: period.status,
  notes: period.notes || null,
  updated_at: new Date().toISOString(),
});

// =====================================================================
// SUPABASE DATABASE OPERATIONS
// =====================================================================

export const supabaseDataService = {
  // --- Schools ---
  async fetchSchools(): Promise<School[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('schools').select('*');
    if (error) throw error;
    return (data || []).map(mapSchoolFromDb);
  },

  async upsertSchool(school: School): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('schools').upsert(mapSchoolToDb(school));
    if (error) throw error;
  },

  /**
   * Kurum ve Supabase Auth hesabını Edge Function üzerinden güvenle oluşturur.
   * ASLA doğrudan SQL ile auth.users'a yazmaz; supabaseAdmin.auth.admin.createUser kullanır.
   */
  async createSchoolWithAccount(
    schoolData: Omit<School, 'id'>,
    initialPassword: string = 'okul123'
  ): Promise<{ success: boolean; schoolId: string; username: string }> {
    if (!supabase) {
      return {
        success: true,
        schoolId: `school-${schoolData.institutionCode.trim()}`,
        username: schoolData.institutionCode.trim(),
      };
    }

    // 1. Resmi Supabase Edge Function üzerinden çağır
    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manage-school', {
        body: {
          action: 'create_school',
          institutionCode: schoolData.institutionCode.trim(),
          name: schoolData.name.trim(),
          district: schoolData.district.trim(),
          schoolType: schoolData.schoolType.trim(),
          generalDirectorate: schoolData.generalDirectorate || 'Temel Eğitim Genel Müdürlüğü',
          initialPassword: initialPassword.trim(),
          province: schoolData.province || 'Ankara',
          principalName: schoolData.principalName || '',
          contactPhone: schoolData.contactPhone || '',
          contactEmail: schoolData.contactEmail || '',
        },
      });

      if (!edgeError && edgeData?.success) {
        return {
          success: true,
          schoolId: edgeData.schoolId,
          username: edgeData.institutionCode,
        };
      }

      if (edgeError) {
        const rawMsg = edgeError.message || '';
        if (rawMsg.includes('not found') || (edgeError as any).status === 404 || rawMsg.includes('Failed to send')) {
          throw new Error(
            'manage-school Edge Function henüz Supabase ortamında deploy edilmemiş (404 NOT FOUND). Lütfen terminalden "npx supabase functions deploy manage-school" komutunu çalıştırınız.'
          );
        }
        throw new Error(edgeData?.error || `Edge Function Hatası: ${rawMsg}`);
      }

      if (edgeData?.error) {
        throw new Error(edgeData.error);
      }

      throw new Error('Kurum ve Auth hesabı oluşturulamadı.');
    } catch (err: any) {
      console.error('Edge Function create_school hatası:', err);
      throw err;
    }
  },

  /**
   * Toplu Kurum ve Auth Hesabı Oluşturma (96 Okul İçin - Edge Function Üzerinden)
   */
  async batchCreateSchoolsViaEdgeFunction(
    schoolsList: Array<{ school: Omit<School, 'id'>; initialPassword: string }>
  ): Promise<{ success: boolean; createdCount: number; skippedCount: number; errors: any[] }> {
    if (!supabase) {
      return { success: true, createdCount: schoolsList.length, skippedCount: 0, errors: [] };
    }

    const payload = schoolsList.map((item) => ({
      institutionCode: item.school.institutionCode.trim(),
      name: item.school.name.trim(),
      district: item.school.district.trim(),
      schoolType: item.school.schoolType.trim(),
      generalDirectorate: item.school.generalDirectorate || 'Temel Eğitim Genel Müdürlüğü',
      initialPassword: item.initialPassword.trim(),
      province: item.school.province || 'Ankara',
      principalName: item.school.principalName || '',
      contactPhone: item.school.contactPhone || '',
      contactEmail: item.school.contactEmail || '',
    }));

    const { data, error } = await supabase.functions.invoke('manage-school', {
      body: { action: 'batch_create_schools', schools: payload },
    });

    if (error) {
      const rawMsg = error.message || '';
      if (rawMsg.includes('not found') || (error as any).status === 404) {
        throw new Error(
          'manage-school Edge Function henüz Supabase ortamında deploy edilmemiş (404 NOT FOUND). Toplu aktarım yapılamadı.'
        );
      }
      throw new Error(`Toplu oluşturma hatası: ${rawMsg}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * Pilot okulların eksik Auth hesaplarını ve profillerini topluca oluşturma
   */
  async setupPilotSchoolsViaEdgeFunction(): Promise<{
    success: boolean;
    createdCount: number;
    results: any[];
  }> {
    if (!supabase) {
      return { success: true, createdCount: 0, results: [] };
    }

    const { data, error } = await supabase.functions.invoke('manage-school', {
      body: { action: 'setup_pilot_schools' },
    });

    if (error) {
      throw new Error(`Pilot okul kurulumu başarısız: ${error.message}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * Okul şifresi sıfırlama (Yalnızca Edge Function üzerinden supabaseAdmin.auth.admin.updateUserById ile)
   */
  async resetSchoolPasswordViaEdgeFunction(schoolId: string, newPassword: string): Promise<void> {
    if (!supabase) return;

    const { data, error } = await supabase.functions.invoke('manage-school', {
      body: { action: 'reset_password', schoolId, newPassword },
    });

    if (error) {
      const rawMsg = error.message || '';
      if (rawMsg.includes('not found') || (error as any).status === 404) {
        throw new Error(
          'manage-school Edge Function henüz Supabase ortamına deploy edilmemiş (404 NOT FOUND). Şifre sıfırlanamadı.'
        );
      }
      throw new Error(`Şifre sıfırlama hatası: ${rawMsg}`);
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  },

  /**
   * Okul hesabı durumunu aktif/pasif yapma
   */
  async toggleSchoolActive(schoolId: string, isActive: boolean): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.functions.invoke('manage-school', {
        body: { action: 'toggle_active', schoolId, isActive },
      });
    } catch {
      // Edge Function yoksa doğrudan tablolarda güncelle
      await supabase
        .from('schools')
        .update({ account_active: isActive, is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', schoolId);

      await supabase
        .from('user_profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('school_id', schoolId);
    }
  },

  async deleteSchool(schoolId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('schools').delete().eq('id', schoolId);
    if (error) throw error;
  },

  // --- Teachers ---
  async fetchTeachers(): Promise<Teacher[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('teachers').select('*');
    if (error) throw error;
    return (data || []).map(mapTeacherFromDb);
  },

  async upsertTeacher(teacher: Teacher): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('teachers').upsert(mapTeacherToDb(teacher));
    if (error) throw error;
  },

  async deleteTeacher(teacherId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    if (error) throw error;
  },

  // --- Submissions ---
  async fetchSubmissions(): Promise<SchoolMonthlySubmission[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('school_monthly_submissions').select('*');
    if (error) throw error;
    return (data || []).map(mapSubmissionFromDb);
  },

  async upsertSubmission(sub: SchoolMonthlySubmission): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('school_monthly_submissions').upsert(mapSubmissionToDb(sub));
    if (error) throw error;
  },

  // --- Monthly Puantaj Rows ---
  async fetchPuantajRows(year: number, month: number): Promise<TeacherMonthlyPuantajRow[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('teacher_monthly_puantaj')
      .select('*')
      .eq('year', year)
      .eq('month', month);

    if (error) throw error;
    return (data || []).map(mapPuantajFromDb);
  },

  async upsertPuantajRow(row: TeacherMonthlyPuantajRow): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('teacher_monthly_puantaj').upsert(mapPuantajToDb(row));
    if (error) throw error;
  },

  async batchUpsertPuantajRows(rows: TeacherMonthlyPuantajRow[]): Promise<void> {
    if (!supabase || rows.length === 0) return;
    const payload = rows.map(mapPuantajToDb);
    const { error } = await supabase.from('teacher_monthly_puantaj').upsert(payload);
    if (error) throw error;
  },

  // --- Rules ---
  async fetchRules(): Promise<MebPaymentRules | null> {
    if (!supabase) return null;
    try {
      // 1. Önce katsayı ve artırım tablosundan oku (payment_calculation_rules)
      const { data: calcData } = await supabase
        .from('payment_calculation_rules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Mevzuat tablosundan oku (meb_payment_rules)
      const { data: mebData } = await supabase
        .from('meb_payment_rules')
        .select('*')
        .eq('id', 'default_rules')
        .maybeSingle();

      if (!calcData && !mebData) return null;

      const gunduzRate = Number(calcData?.gunduz_hourly_rate ?? mebData?.ucretli_hourly_rate ?? 220.57);
      const geceRate = Number(calcData?.gece_haftasonu_hourly_rate ?? 236.33);

      return {
        ucretliHourlyRate: gunduzRate,
        gunduzHourlyRate: gunduzRate,
        geceHaftasonuHourlyRate: geceRate,
        yuksekLisansBonusPercent: Number(calcData?.yuksek_lisans_bonus_percent ?? 7),
        doktoraBonusPercent: Number(calcData?.doktora_bonus_percent ?? 20),
        ozelEgitimBonusPercent: Number(calcData?.ozel_egitim_bonus_percent ?? 25),
        dykBonusPercent: Number(calcData?.dyk_bonus_percent ?? 100),
        nobetHoursPerWeek: Number(calcData?.nobet_hours_per_week ?? 3),
        sinifRehberlikHoursPerWeek: Number(calcData?.sinif_rehberlik_hours_per_week ?? 2),
        bonusFiveToOne: Boolean(mebData?.bonus_five_to_one ?? true),
        incomeTaxRate: Number(calcData?.income_tax_rate ?? mebData?.income_tax_rate ?? 0.15),
        stampTaxRate: Number(calcData?.stamp_tax_rate ?? mebData?.stamp_tax_rate ?? 0.00759),
        sgkEmployerShareRate: Number(mebData?.sgk_employer_share_rate ?? 0.205),
        sgkEmployeeShareRate: Number(mebData?.sgk_employee_share_rate ?? 0.14),
        unemploymentEmployeeRate: Number(mebData?.unemployment_employee_rate ?? 0.01),
        effectiveDate: calcData?.effective_date || '2026-07-01',
      };
    } catch (err) {
      console.warn('fetchRules Supabase hatası:', err);
      return null;
    }
  },

  async saveRules(rules: MebPaymentRules): Promise<void> {
    if (!supabase) return;

    const gunduzRate = Number(rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57);
    const geceRate = Number(rules.geceHaftasonuHourlyRate || 236.33);

    // 1. payment_calculation_rules tablosuna kaydet
    const calcPayload = {
      id: 'rules_2026_h2',
      effective_date: rules.effectiveDate || '2026-07-01',
      gunduz_hourly_rate: gunduzRate,
      gece_haftasonu_hourly_rate: geceRate,
      yuksek_lisans_bonus_percent: Number(rules.yuksekLisansBonusPercent ?? 7),
      doktora_bonus_percent: Number(rules.doktoraBonusPercent ?? 20),
      ozel_egitim_bonus_percent: Number(rules.ozelEgitimBonusPercent ?? 25),
      dyk_bonus_percent: Number(rules.dykBonusPercent ?? 100),
      nobet_hours_per_week: Number(rules.nobetHoursPerWeek ?? 3),
      sinif_rehberlik_hours_per_week: Number(rules.sinifRehberlikHoursPerWeek ?? 2),
      income_tax_rate: Number(rules.incomeTaxRate ?? 0.15),
      stamp_tax_rate: Number(rules.stampTaxRate ?? 0.00759),
      created_at: new Date().toISOString(),
    };

    // 2. meb_payment_rules tablosuna kaydet
    const mebPayload = {
      id: 'default_rules',
      ucretli_hourly_rate: gunduzRate,
      bonus_five_to_one: rules.bonusFiveToOne ?? true,
      income_tax_rate: Number(rules.incomeTaxRate ?? 0.15),
      stamp_tax_rate: Number(rules.stampTaxRate ?? 0.00759),
      sgk_employer_share_rate: Number(rules.sgkEmployerShareRate ?? 0.205),
      sgk_employee_share_rate: Number(rules.sgkEmployeeShareRate ?? 0.14),
      unemployment_employee_rate: Number(rules.unemploymentEmployeeRate ?? 0.01),
      updated_at: new Date().toISOString(),
    };

    const [resCalc, resMeb] = await Promise.all([
      supabase.from('payment_calculation_rules').upsert(calcPayload),
      supabase.from('meb_payment_rules').upsert(mebPayload),
    ]);

    if (resCalc.error) console.warn('payment_calculation_rules kaydetme uyarısı:', resCalc.error);
    if (resMeb.error) console.warn('meb_payment_rules kaydetme uyarısı:', resMeb.error);
    if (resCalc.error && resMeb.error) throw resCalc.error;
  },

  // --- Audit Logs ---
  async fetchAuditLogs(): Promise<AuditLog[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      user: row.user_name,
      action: row.action,
      details: row.details || '',
    }));
  },

  async addAuditLog(log: AuditLog, schoolId?: string): Promise<void> {
    if (!supabase) return;
    const payload = {
      id: log.id,
      timestamp: log.timestamp,
      user_name: log.user,
      school_id: schoolId || null,
      action: log.action,
      details: log.details,
    };
    await supabase.from('audit_logs').insert(payload);
  },

  // --- Teacher Weekly Schedules ---
  async fetchWeeklySchedules(): Promise<any[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('teacher_weekly_schedules')
        .select('*');
      if (error) return [];
      return (data || []).map((row) => ({
        id: row.id,
        teacherId: row.teacher_id,
        schoolId: row.school_id,
        effectiveStartDate: row.effective_start_date,
        effectiveEndDate: row.effective_end_date || undefined,
        lessons: row.lessons || [],
        totalWeeklyHours: Number(row.total_weekly_hours || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async saveWeeklySchedule(schedule: any): Promise<void> {
    if (!supabase) return;
    const payload = {
      id: schedule.id,
      teacher_id: schedule.teacherId,
      school_id: schedule.schoolId,
      effective_start_date: schedule.effectiveStartDate,
      effective_end_date: schedule.effectiveEndDate || null,
      lessons: schedule.lessons || [],
      total_weekly_hours: schedule.totalWeeklyHours || 0,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('teacher_weekly_schedules').upsert(payload);
    if (error) throw error;
  },

  // --- Timesheet Periods ---
  async fetchTimesheetPeriods(): Promise<TimesheetPeriod[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('timesheet_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) return [];
      return (data || []).map(mapPeriodFromDb);
    } catch {
      return [];
    }
  },

  async saveTimesheetPeriod(period: TimesheetPeriod): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('timesheet_periods').upsert(mapPeriodToDb(period));
    if (error) throw error;
  },

  async deleteTimesheetPeriod(periodId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('timesheet_periods').delete().eq('id', periodId);
    if (error) throw error;
  },
};

