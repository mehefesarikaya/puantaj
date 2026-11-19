import { supabase } from '../lib/supabaseClient';
import {
  mapSchoolToDb,
  mapTeacherToDb,
  mapSubmissionToDb,
  mapPuantajToDb,
  mapPeriodToDb,
} from './supabaseDataService';
import {
  loadStoredData,
  STORAGE_KEYS,
  INITIAL_SCHOOLS,
  INITIAL_TEACHERS,
  generateInitialPuantajRows,
  generateInitialWeeklySchedules,
  INITIAL_SUBMISSIONS,
  INITIAL_TIMESHEET_PERIODS,
} from '../utils/adminStorage';
import {
  School,
  Teacher,
  TeacherMonthlyPuantajRow,
  SchoolMonthlySubmission,
  TeacherWeeklySchedule,
  TimesheetPeriod,
  MebPaymentRules,
} from '../types';
import { DEFAULT_MEB_PAYMENT_RULES } from '../utils/paymentCalculator';
import { getStoredBranches } from '../utils/branchData';

export interface MigrationResult {
  success: boolean;
  message: string;
  schoolsMigrated: number;
  teachersMigrated: number;
  schedulesMigrated: number;
  periodsMigrated: number;
  submissionsMigrated: number;
  puantajRowsMigrated: number;
  rulesMigrated: boolean;
  calcRulesMigrated: boolean;
  branchesMigrated?: number;
  errors: string[];
}

/**
 * Safely transfers all existing localStorage data into Supabase tables
 * respecting foreign key order and without deleting or damaging local data.
 */
export const migrateLocalStorageToSupabase = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    message: '',
    schoolsMigrated: 0,
    teachersMigrated: 0,
    schedulesMigrated: 0,
    periodsMigrated: 0,
    submissionsMigrated: 0,
    puantajRowsMigrated: 0,
    rulesMigrated: false,
    calcRulesMigrated: false,
    errors: [],
  };

  if (!supabase) {
    result.message = 'Supabase bağlantısı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.';
    return result;
  }

  try {
    // 1. Schools (Base table for foreign keys)
    const schools: School[] = loadStoredData(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    if (schools.length > 0) {
      const payload = schools.map(mapSchoolToDb);
      const { error: schoolError } = await supabase.from('schools').upsert(payload, {
        onConflict: 'id',
      });
      if (schoolError) {
        result.errors.push(`Okul aktarım hatası: ${schoolError.message}`);
      } else {
        result.schoolsMigrated = schools.length;
      }
    }

    // 2. Teachers (FK -> schools)
    const teachers: Teacher[] = loadStoredData(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    if (teachers.length > 0) {
      const payload = teachers.map(mapTeacherToDb);
      const { error: teacherError } = await supabase.from('teachers').upsert(payload, {
        onConflict: 'id',
      });
      if (teacherError) {
        result.errors.push(`Öğretmen aktarım hatası: ${teacherError.message}`);
      } else {
        result.teachersMigrated = teachers.length;
      }
    }

    // 3. Teacher Weekly Schedules (FK -> teachers, schools)
    const schedules: TeacherWeeklySchedule[] = loadStoredData(
      STORAGE_KEYS.WEEKLY_SCHEDULES,
      generateInitialWeeklySchedules()
    );
    if (schedules.length > 0) {
      const schedulePayload = schedules.map((s) => ({
        id: s.id,
        teacher_id: s.teacherId,
        school_id: s.schoolId,
        effective_start_date: s.effectiveStartDate,
        effective_end_date: s.effectiveEndDate || null,
        lessons: s.lessons || [],
        total_weekly_hours: s.totalWeeklyHours || 0,
        updated_at: new Date().toISOString(),
      }));
      const { error: schedError } = await supabase
        .from('teacher_weekly_schedules')
        .upsert(schedulePayload, {
          onConflict: 'id',
        });
      if (schedError) {
        result.errors.push(`Haftalık ders programı aktarım hatası: ${schedError.message}`);
      } else {
        result.schedulesMigrated = schedules.length;
      }
    }

    // 4. Timesheet Periods (Independent)
    const periods: TimesheetPeriod[] = loadStoredData(
      STORAGE_KEYS.TIMESHEET_PERIODS,
      INITIAL_TIMESHEET_PERIODS
    );
    if (periods.length > 0) {
      const periodPayload = periods.map(mapPeriodToDb);
      const { error: periodError } = await supabase
        .from('timesheet_periods')
        .upsert(periodPayload, {
          onConflict: 'id',
        });
      if (periodError) {
        result.errors.push(`Puantaj dönemi aktarım hatası: ${periodError.message}`);
      } else {
        result.periodsMigrated = periods.length;
      }
    }

    // 5. Monthly Submissions (FK -> schools)
    const submissions: SchoolMonthlySubmission[] = loadStoredData(
      STORAGE_KEYS.SUBMISSIONS,
      INITIAL_SUBMISSIONS
    );
    if (submissions.length > 0) {
      const payload = submissions.map(mapSubmissionToDb);
      const { error: subError } = await supabase
        .from('school_monthly_submissions')
        .upsert(payload, {
          onConflict: 'id',
        });
      if (subError) {
        result.errors.push(`Onay durumu aktarım hatası: ${subError.message}`);
      } else {
        result.submissionsMigrated = submissions.length;
      }
    }

    // 6. Daily Puantaj Records (Table: teacher_monthly_puantaj, FK -> teachers, schools)
    const puantajRows: TeacherMonthlyPuantajRow[] = loadStoredData(
      STORAGE_KEYS.PUANTAJ_ROWS,
      generateInitialPuantajRows()
    );
    if (puantajRows.length > 0) {
      const payload = puantajRows.map(mapPuantajToDb);
      const { error: puantajError } = await supabase
        .from('teacher_monthly_puantaj')
        .upsert(payload, {
          onConflict: 'id',
        });
      if (puantajError) {
        result.errors.push(`Puantaj satırları aktarım hatası: ${puantajError.message}`);
      } else {
        result.puantajRowsMigrated = puantajRows.length;
      }
    }

    // 7. MEB Payment Rules & Calculation Rules
    const rules: MebPaymentRules = loadStoredData(STORAGE_KEYS.RULES, DEFAULT_MEB_PAYMENT_RULES);
    const { error: rulesError } = await supabase.from('meb_payment_rules').upsert({
      id: 'default_rules',
      ucretli_hourly_rate: rules.ucretliHourlyRate,
      bonus_five_to_one: rules.bonusFiveToOne,
      income_tax_rate: rules.incomeTaxRate,
      stamp_tax_rate: rules.stampTaxRate,
      sgk_employer_share_rate: rules.sgkEmployerShareRate,
      sgk_employee_share_rate: rules.sgkEmployeeShareRate,
      unemployment_employee_rate: rules.unemploymentEmployeeRate,
      updated_at: new Date().toISOString(),
    });
    if (rulesError) {
      result.errors.push(`Mevzuat kuralları aktarım hatası: ${rulesError.message}`);
    } else {
      result.rulesMigrated = true;
    }

    // 8. Payment Calculation Rules (2026 H2 Rates)
    const { error: calcRulesError } = await supabase
      .from('payment_calculation_rules')
      .upsert({
        id: 'rules_2026_h2',
        effective_date: rules.effectiveDate || '2026-07-01',
        gunduz_hourly_rate: rules.gunduzHourlyRate || 220.57,
        gece_haftasonu_hourly_rate: rules.geceHaftasonuHourlyRate || 236.33,
        yuksek_lisans_bonus_percent: rules.yuksekLisansBonusPercent || 7.0,
        doktora_bonus_percent: rules.doktoraBonusPercent || 20.0,
        ozel_egitim_bonus_percent: rules.ozelEgitimBonusPercent || 25.0,
        dyk_bonus_percent: rules.dykBonusPercent || 100.0,
        nobet_hours_per_week: rules.nobetHoursPerWeek || 3,
        sinif_rehberlik_hours_per_week: rules.sinifRehberlikHoursPerWeek || 2,
        income_tax_rate: rules.incomeTaxRate || 0.15,
        stamp_tax_rate: rules.stampTaxRate || 0.00759,
      }, {
        onConflict: 'id',
      });
    if (calcRulesError) {
      result.errors.push(`Ek ders katsayı kuralları aktarım hatası: ${calcRulesError.message}`);
    } else {
      result.calcRulesMigrated = true;
    }

    // 9. Branches (Public branches table)
    const branches = getStoredBranches();
    if (branches && branches.length > 0) {
      const branchPayload = branches.map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        is_custom: Boolean(b.isCustom),
      }));
      const { error: branchError } = await supabase
        .from('branches')
        .upsert(branchPayload, { onConflict: 'id' });
      if (branchError) {
        result.errors.push(`Branş listesi aktarım hatası: ${branchError.message}`);
      } else {
        result.branchesMigrated = branches.length;
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? 'Tüm yerel veriler (Okullar, Öğretmenler, Programlar, Dönemler, Puantajlar, Katsayılar, Branşlar) Supabase veritabanına başarıyla aktarıldı.'
      : 'Veri aktarımı bazı hatalarla tamamlandı.';

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen aktarım hatası';
    result.errors.push(msg);
    result.message = `Kritik aktarım hatası: ${msg}`;
    return result;
  }
};

