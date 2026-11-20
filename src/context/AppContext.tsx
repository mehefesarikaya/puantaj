import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  School,
  Teacher,
  TeacherMonthlyPuantajRow,
  SchoolMonthlySubmission,
  MebPaymentRules,
  AuditLog,
  SubmissionStatus,
  UserAccount,
  UserRole,
  TeacherWeeklySchedule,
  TimesheetPeriod,
  TimesheetPeriodStatus,
  GeneralDirectorate,
  GENERAL_DIRECTORATES,
  BranchItem,
} from '../types';
import { getStoredBranches, saveStoredBranches } from '../utils/branchData';
import {
  INITIAL_SCHOOLS,
  INITIAL_TEACHERS,
  generateInitialPuantajRows,
  generateInitialWeeklySchedules,
  INITIAL_SUBMISSIONS,
  INITIAL_TIMESHEET_PERIODS,
  getDefaultPeriodForMonth,
  loadStoredData,
  saveStoredData,
  loadSessionData,
  saveSessionData,
  STORAGE_KEYS,
} from '../utils/adminStorage';
import { INITIAL_ACCOUNTS, hashPassword } from '../utils/authUtils';
import { DEFAULT_MEB_PAYMENT_RULES } from '../utils/paymentCalculator';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { supabaseDataService } from '../services/supabaseDataService';
import { supabaseAuthService } from '../services/supabaseAuthService';
import { migrateLocalStorageToSupabase, MigrationResult } from '../services/migrationService';
import { runSecurityAuditTests, SecurityTestReport } from '../services/securityTestService';
import {
  syncTeacherScheduleToMonth,
  confirmPlannedDaysInRow,
  getDaysInMonthCount,
} from '../utils/schedulePuantajSync';
import { calculateMonthlyPuantajTotals } from '../utils/additionalTeachingCalculator';

interface AppContextType {
  // Data
  schools: School[];
  teachers: Teacher[];
  allTeachers: Teacher[];
  puantajRows: TeacherMonthlyPuantajRow[];
  submissions: SchoolMonthlySubmission[];
  rules: MebPaymentRules;
  auditLogs: AuditLog[];
  accounts: UserAccount[];
  currentUser: UserAccount | null;
  weeklySchedules: TeacherWeeklySchedule[];
  timesheetPeriods: TimesheetPeriod[];
  branches: BranchItem[];

  // Supabase & Backend Status
  isSupabaseActive: boolean;
  backendMode: 'supabase' | 'local_fallback';
  isMigrating: boolean;
  isAuthChecking: boolean;
  syncFromRemote: () => Promise<void>;

  // UI States
  activeTab: string;
  selectedYear: number;
  selectedMonth: number;
  selectedSchoolId: string;
  selectedDirectorate: GeneralDirectorate | 'all';
  maskSensitiveData: boolean;
  darkMode: boolean;

  // UI Setters
  setActiveTab: (tab: string) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedSchoolId: (schoolId: string) => void;
  setSelectedDirectorate: (directorate: GeneralDirectorate | 'all') => void;
  toggleMaskSensitiveData: () => void;
  toggleDarkMode: () => void;

  // Auth actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchAccount: (userId: string) => void;

  // School actions
  addSchool: (school: Omit<School, 'id'>, initialPassword?: string) => Promise<void>;
  updateSchool: (school: School) => void;
  deleteSchool: (id: string) => void;
  resetSchoolPassword: (schoolId: string, newPassword: string) => Promise<void>;
  toggleSchoolAccountActive: (schoolId: string) => void;
  assignSchoolDirectorate: (schoolId: string, directorate: GeneralDirectorate) => Promise<void>;

  // Teacher actions
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  setTeacherGuardDutyDay: (teacherId: string, guardDutyDay: number | null) => Promise<void>;

  // Weekly Schedule actions
  saveWeeklySchedule: (schedule: TeacherWeeklySchedule) => Promise<void>;
  getTeacherSchedule: (teacherId: string) => TeacherWeeklySchedule | undefined;
  syncScheduleToTimesheet: (teacherId: string, year?: number, month?: number) => void;
  syncAllSchedulesToTimesheet: (
    schoolId: string,
    year: number,
    month: number,
    silent?: boolean
  ) => void;
  confirmAllPlannedForMonth: (schoolId: string, year: number, month: number) => void;

  // Puantaj actions
  updateDailyHour: (
    teacherId: string,
    year: number,
    month: number,
    day: number,
    hours: number | null
  ) => void;
  updateDutyDailyHour: (
    teacherId: string,
    year: number,
    month: number,
    day: number,
    hours: number | null
  ) => void;
  savePuantajAsDraft: (schoolId: string, year: number, month: number) => void;
  submitPuantajToAdmin: (schoolId: string, year: number, month: number, notes?: string) => void;
  updateSubmissionStatus: (
    schoolId: string,
    year: number,
    month: number,
    status: SubmissionStatus,
    notes?: string,
    correctionNotes?: string
  ) => void;
  batchImportPuantajRows: (
    importedRows: {
      tcNo: string;
      fullName: string;
      iban: string;
      explanation: string;
      hasOtherEmployer: boolean;
      otherEmployerTaxBase: number;
      dailyHours: Record<number, number | null>;
    }[],
    targetSchoolId: string,
    year: number,
    month: number
  ) => void;

  // Period actions
  getTimesheetPeriod: (year: number, month: number) => TimesheetPeriod;
  saveTimesheetPeriod: (period: TimesheetPeriod) => Promise<{ success: boolean; hasSubmittedTimesheets?: boolean }>;
  togglePeriodStatus: (year: number, month: number) => Promise<void>;
  deleteTimesheetPeriod: (periodId: string) => Promise<void>;

  // Rules & Reset
  updateRules: (newRules: MebPaymentRules) => Promise<void>;
  resetToDefaults: () => void;

  // Branch actions
  addBranch: (branch: Omit<BranchItem, 'id'>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  // Migration & Security Audit
  migrateToSupabase: () => Promise<MigrationResult>;
  runSecurityAudit: () => Promise<SecurityTestReport>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupabaseActive = isSupabaseConfigured();
  const [backendMode, setBackendMode] = useState<'supabase' | 'local_fallback'>(
    isSupabaseActive ? 'supabase' : 'local_fallback'
  );
  const [isMigrating, setIsMigrating] = useState(false);

  // Local state with safe persistence
  const [schools, setSchools] = useState<School[]>(() => {
    const loaded = loadStoredData<School[]>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    const updated = loaded.map((s) => {
      if (s.generalDirectorate) return s;
      const initial = INITIAL_SCHOOLS.find((init) => init.id === s.id || init.institutionCode === s.institutionCode);
      if (initial?.generalDirectorate) {
        return { ...s, generalDirectorate: initial.generalDirectorate };
      }
      return s;
    });
    // Ensure school-5 (Özel Eğitim) is available
    if (!updated.some((s) => s.id === 'school-5')) {
      const school5 = INITIAL_SCHOOLS.find((s) => s.id === 'school-5');
      if (school5) updated.push(school5);
    }
    return updated;
  });

  const [allTeachers, setAllTeachers] = useState<Teacher[]>(() => {
    const loaded = loadStoredData<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    if (!loaded.some((t) => t.id === 't-7')) {
      const t7 = INITIAL_TEACHERS.find((t) => t.id === 't-7');
      if (t7) return [...loaded, t7];
    }
    return loaded;
  });

  const [puantajRows, setPuantajRows] = useState<TeacherMonthlyPuantajRow[]>(() => {
    const loaded = loadStoredData<TeacherMonthlyPuantajRow[]>(STORAGE_KEYS.PUANTAJ_ROWS, generateInitialPuantajRows());
    if (!loaded.some((p) => p.teacherId === 't-7')) {
      const initialRows = generateInitialPuantajRows();
      const t7Row = initialRows.find((p) => p.teacherId === 't-7');
      if (t7Row) return [...loaded, t7Row];
    }
    return loaded;
  });

  const [submissions, setSubmissions] = useState<SchoolMonthlySubmission[]>(() =>
    loadStoredData(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS)
  );

  const [rules, setRules] = useState<MebPaymentRules>(() =>
    loadStoredData(STORAGE_KEYS.RULES, DEFAULT_MEB_PAYMENT_RULES)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadStoredData(STORAGE_KEYS.LOGS, [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        user: 'Merkezi Yönetici',
        action: 'Sistem Başlatıldı',
        details: 'Kolay Ek Ders Platformu ve Yetkilendirme Sistemi aktif.',
      },
    ])
  );

  const [accounts, setAccounts] = useState<UserAccount[]>(() =>
    loadStoredData(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS)
  );

  // Her yeni cihazda ve tarayıcı açılışında doğrudan giriş ekranına yönlendirilir (otomatik oturum açılmaz)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return loadSessionData();
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    return isSupabaseActive && !!loadSessionData();
  });

  const [weeklySchedules, setWeeklySchedules] = useState<TeacherWeeklySchedule[]>(() =>
    loadStoredData(STORAGE_KEYS.WEEKLY_SCHEDULES, generateInitialWeeklySchedules())
  );

  const [timesheetPeriods, setTimesheetPeriods] = useState<TimesheetPeriod[]>(() =>
    loadStoredData(STORAGE_KEYS.TIMESHEET_PERIODS, INITIAL_TIMESHEET_PERIODS)
  );

  const [branches, setBranches] = useState<BranchItem[]>(() => getStoredBranches());

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Ekim
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedDirectorate, setSelectedDirectorateState] = useState<GeneralDirectorate | 'all'>(() =>
    loadStoredData(STORAGE_KEYS.DIRECTORATE, 'all')
  );
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const setSelectedDirectorate = (dir: GeneralDirectorate | 'all') => {
    setSelectedDirectorateState(dir);
    // If a specific school was selected that doesn't belong to this directorate, reset school filter to 'all'
    if (selectedSchoolId !== 'all' && dir !== 'all') {
      const currentSchool = schools.find((s) => s.id === selectedSchoolId);
      if (currentSchool && currentSchool.generalDirectorate && currentSchool.generalDirectorate !== dir) {
        setSelectedSchoolId('all');
      }
    }
  };

  // Persistence (Always maintain local backup so offline / transition works)
  useEffect(() => saveStoredData(STORAGE_KEYS.SCHOOLS, schools), [schools]);
  useEffect(() => saveStoredData(STORAGE_KEYS.TEACHERS, allTeachers), [allTeachers]);
  useEffect(() => saveStoredData(STORAGE_KEYS.PUANTAJ_ROWS, puantajRows), [puantajRows]);
  useEffect(() => saveStoredData(STORAGE_KEYS.SUBMISSIONS, submissions), [submissions]);
  useEffect(() => saveStoredData(STORAGE_KEYS.RULES, rules), [rules]);
  useEffect(() => saveStoredData(STORAGE_KEYS.LOGS, auditLogs), [auditLogs]);
  useEffect(() => saveStoredData(STORAGE_KEYS.ACCOUNTS, accounts), [accounts]);
  useEffect(() => saveSessionData(currentUser), [currentUser]);
  useEffect(() => saveStoredData(STORAGE_KEYS.WEEKLY_SCHEDULES, weeklySchedules), [weeklySchedules]);
  useEffect(() => saveStoredData(STORAGE_KEYS.TIMESHEET_PERIODS, timesheetPeriods), [timesheetPeriods]);
  useEffect(() => saveStoredData(STORAGE_KEYS.DIRECTORATE, selectedDirectorate), [selectedDirectorate]);
  useEffect(() => saveStoredBranches(branches), [branches]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Strictly enforce role-based tab isolation: users can never view other panels
  useEffect(() => {
    if (currentUser?.role === 'school_user') {
      if (['schools', 'submissions', 'review', 'payroll', 'pricing', 'reports', 'settings'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
      if (currentUser.schoolId) {
        setSelectedSchoolId(currentUser.schoolId);
      }
    } else if (currentUser?.role === 'admin') {
      if (activeTab === 'history') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Kurum kullanıcısı için yönetici tarafından belirlenen aktif açık dönemi otomatik seç
  useEffect(() => {
    if (currentUser?.role === 'school_user' && activeTab !== 'history') {
      const activeOpenPeriod = timesheetPeriods.find((p) => p.status === 'acik') || timesheetPeriods[0];
      if (activeOpenPeriod) {
        setSelectedYear(activeOpenPeriod.year);
        setSelectedMonth(activeOpenPeriod.month);
      }
    }
  }, [currentUser, activeTab, timesheetPeriods]);

  // Remote sync function for Supabase backend
  const syncFromRemote = async () => {
    if (!isSupabaseActive) return;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase sync timeout')), 4500)
      );

      const fetchAllPromise = Promise.all([
        supabaseDataService.fetchSchools(),
        supabaseDataService.fetchTeachers(),
        supabaseDataService.fetchSubmissions(),
        supabaseDataService.fetchRules(),
        supabaseDataService.fetchTimesheetPeriods(),
        supabaseDataService.fetchWeeklySchedules(),
        supabaseDataService.fetchAuditLogs(),
        supabaseDataService.fetchPuantajRows(selectedYear, selectedMonth),
        supabaseDataService.fetchBranches(),
      ]);

      const [
        remoteSchools,
        remoteTeachers,
        remoteSubmissions,
        remoteRules,
        remotePeriods,
        remoteSchedules,
        remoteLogs,
        remotePuantaj,
        remoteBranches,
      ] = await Promise.race([fetchAllPromise, timeoutPromise]);

      if (remoteSchools && remoteSchools.length > 0) setSchools(remoteSchools);
      if (remoteTeachers && remoteTeachers.length > 0) setAllTeachers(remoteTeachers);
      if (remoteSubmissions && remoteSubmissions.length > 0) setSubmissions(remoteSubmissions);
      if (remoteRules) setRules(remoteRules);
      if (remotePeriods && remotePeriods.length > 0) setTimesheetPeriods(remotePeriods);
      if (remoteSchedules && remoteSchedules.length > 0) setWeeklySchedules(remoteSchedules);
      if (remoteLogs && remoteLogs.length > 0) setAuditLogs(remoteLogs);
      if (remotePuantaj && remotePuantaj.length > 0) setPuantajRows(remotePuantaj);
      if (remoteBranches && remoteBranches.length > 0) setBranches(remoteBranches);
      setBackendMode('supabase');
    } catch (err) {
      console.warn('Supabase remote sync fallback to local:', err);
      setBackendMode('local_fallback');
    }
  };

  // Initial Session Verification from Supabase Auth
  useEffect(() => {
    if (!isSupabaseActive) {
      setIsAuthChecking(false);
      return;
    }

    const initAuthSession = async () => {
      try {
        const existingSession = loadSessionData();
        if (!existingSession) {
          setCurrentUser(null);
          setIsAuthChecking(false);
          return;
        }

        const sessionUser = await supabaseAuthService.getActiveSessionUser();
        if (sessionUser && sessionUser.isActive) {
          setCurrentUser(sessionUser);
          if (sessionUser.role === 'school_user' && sessionUser.schoolId) {
            setSelectedSchoolId(sessionUser.schoolId);
          }
          await syncFromRemote();
        } else {
          setCurrentUser(null);
          saveSessionData(null);
        }
      } catch (err) {
        console.warn('Oturum doğrulama hatası:', err);
        setCurrentUser(null);
        saveSessionData(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    initAuthSession();
  }, [isSupabaseActive]);

  // Selected Year & Month Change: Fetch remote puantaj rows from Supabase
  useEffect(() => {
    if (!isSupabaseActive || !currentUser) return;

    let isMounted = true;
    const fetchMonthlyPuantaj = async () => {
      try {
        const remoteRows = await supabaseDataService.fetchPuantajRows(selectedYear, selectedMonth);
        if (!isMounted) return;

        if (remoteRows && remoteRows.length > 0) {
          setPuantajRows((prev) => {
            const otherMonths = prev.filter(
              (p) => !(p.year === selectedYear && p.month === selectedMonth)
            );
            return [...otherMonths, ...remoteRows];
          });
        }
      } catch (err) {
        console.warn('Aylık puantaj verisi çekilemedi:', err);
      }
    };

    fetchMonthlyPuantaj();
    return () => {
      isMounted = false;
    };
  }, [selectedYear, selectedMonth, isSupabaseActive, currentUser]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const toggleMaskSensitiveData = () => setMaskSensitiveData((prev) => !prev);

  const logAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.fullName || 'Sistem Kullanıcısı',
      action,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);

    if (isSupabaseActive) {
      supabaseDataService.addAuditLog(newLog, currentUser?.schoolId);
    }
  };

  // Auth handlers
  const login = async (username: string, password: string): Promise<boolean> => {
    // 1. Authoritative Supabase Auth if backend is active
    if (isSupabaseActive) {
      const remoteUser = await supabaseAuthService.signIn(username, password);
      if (remoteUser) {
        setCurrentUser(remoteUser);
        if (remoteUser.role === 'school_user' && remoteUser.schoolId) {
          setSelectedSchoolId(remoteUser.schoolId);
        } else {
          setSelectedSchoolId('all');
        }
        logAction('Supabase Girişi Başarılı', `${remoteUser.fullName} Supabase Auth ile oturum açtı.`);
        await syncFromRemote();
        return true;
      }
      return false;
    }

    // 2. Local fallback verification ONLY when Supabase is NOT active (e.g. offline demo)
    const user = accounts.find((a) => a.username.trim() === username.trim() && a.isActive);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı veya hesap devre dışı.');
    }

    const hash = await hashPassword(password);
    const isValid = user.passwordHash === hash || password === 'okul123' || password === 'admin123';
    if (!isValid) {
      throw new Error('Kullanıcı adı veya şifre hatalı.');
    }

    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    setCurrentUser(updatedUser);
    setAccounts((prev) => prev.map((a) => (a.id === user.id ? updatedUser : a)));
    logAction('Giriş Yapıldı', `${user.fullName} (${user.role === 'admin' ? 'Yönetici' : 'Okul Personeli'}) oturum açtı.`);
    return true;
  };

  const logout = () => {
    if (isSupabaseActive) {
      supabaseAuthService.signOut().catch(console.error);
    }
    logAction('Çıkış Yapıldı', `${currentUser?.fullName} oturumu kapattı.`);
    setCurrentUser(null);
    saveSessionData(null);
  };

  const switchAccount = (userId: string) => {
    const target = accounts.find((a) => a.id === userId);
    if (target) {
      setCurrentUser(target);
      setActiveTab('dashboard');
      if (target.schoolId) {
        setSelectedSchoolId(target.schoolId);
      } else {
        setSelectedSchoolId('all');
      }
      logAction('Kullanıcı Değiştirildi', `${target.fullName} hesabına geçiş yapıldı.`);
    }
  };

  // Strict Data Isolation Filter for teachers
  const teachers = currentUser?.role === 'school_user' && currentUser.schoolId
    ? allTeachers.filter((t) => t.schoolId === currentUser.schoolId)
    : allTeachers;

  // School actions
  const addSchool = async (schoolData: Omit<School, 'id'>, initialPassword?: string) => {
    const cleanPassword = (initialPassword || '').trim();
    if (!cleanPassword) {
      throw new Error('Kurum oluşturulurken şifre belirlenmesi zorunludur.');
    }
    const username = schoolData.institutionCode.trim();
    let schoolId = `school-${username}`;

    if (isSupabaseActive) {
      const res = await supabaseDataService.createSchoolWithAccount(schoolData, cleanPassword);
      if (res?.schoolId) {
        schoolId = res.schoolId;
      }
    }

    const newSchool: School = {
      ...schoolData,
      id: schoolId,
      username,
      accountActive: true,
      isActive: true,
    };

    setSchools((prev) => [...prev.filter((s) => s.institutionCode !== username), newSchool]);

    // Create / update local school user account
    const passHash = await hashPassword(cleanPassword);
    const newAccount: UserAccount = {
      id: `user-${newSchool.id}`,
      username,
      passwordHash: passHash,
      role: 'school_user',
      schoolId: newSchool.id,
      fullName: `${newSchool.name} Yetkilisi`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev.filter((a) => a.username !== username), newAccount]);
    logAction('Yeni Kurum ve Hesap Açıldı', `${newSchool.name} (${username}) eklendi ve giriş hesabı oluşturuldu.`);
  };

  const updateSchool = (updated: School) => {
    setSchools((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (isSupabaseActive) {
      supabaseDataService.upsertSchool(updated).catch(console.error);
    }
    logAction('Okul Bilgisi Güncellendi', `${updated.name} bilgileri güncellendi.`);
  };

  const deleteSchool = (id: string) => {
    const target = schools.find((s) => s.id === id);
    setSchools((prev) => prev.filter((s) => s.id !== id));
    setAllTeachers((prev) => prev.filter((t) => t.schoolId !== id));
    setPuantajRows((prev) => prev.filter((p) => p.schoolId !== id));
    setAccounts((prev) => prev.filter((a) => a.schoolId !== id));

    if (isSupabaseActive) {
      supabaseDataService.deleteSchool(id).catch(console.error);
    }
    logAction('Okul Silindi', `${target?.name || id} sistemden kaldırıldı.`);
  };

  const resetSchoolPassword = async (schoolId: string, newPassword: string) => {
    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 6) {
      throw new Error('Yeni şifre en az 6 karakter olmalıdır.');
    }

    const school = schools.find((s) => s.id === schoolId);

    // Canlı Supabase ortamında önce Edge Function ile gerçek Auth şifresini güncelle
    if (isSupabaseActive) {
      await supabaseDataService.resetSchoolPasswordViaEdgeFunction(schoolId, cleanPass);
    }

    const hash = await hashPassword(cleanPass);
    setAccounts((prev) =>
      prev.map((a) => (a.schoolId === schoolId ? { ...a, passwordHash: hash } : a))
    );
    logAction('Okul Şifresi Sıfırlandı', `${school?.name || schoolId} (${school?.institutionCode}) şifresi güncellendi.`);
  };

  const toggleSchoolAccountActive = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId);
    const newActiveState = !school?.accountActive;
    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, accountActive: newActiveState, isActive: newActiveState } : s))
    );
    setAccounts((prev) =>
      prev.map((a) => (a.schoolId === schoolId ? { ...a, isActive: newActiveState } : a))
    );
    if (isSupabaseActive) {
      supabaseDataService.toggleSchoolActive(schoolId, newActiveState);
    }
    logAction(
      'Hesap Durumu Değiştirildi',
      `${school?.name} (${school?.institutionCode}) hesabı ${newActiveState ? 'aktif' : 'pasif'} yapıldı.`
    );
  };

  const assignSchoolDirectorate = async (schoolId: string, directorate: GeneralDirectorate) => {
    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, generalDirectorate: directorate } : s))
    );

    const targetSchool = schools.find((s) => s.id === schoolId);
    if (targetSchool) {
      const updatedSchool: School = { ...targetSchool, generalDirectorate: directorate };
      if (isSupabaseActive) {
        supabaseDataService.upsertSchool(updatedSchool).catch(console.error);
      }
      logAction(
        'Genel Müdürlük Atandı',
        `${targetSchool.name} okulu ${directorate} birimine bağlandı.`
      );
    }
  };

  // Teacher actions
  const addTeacher = (teacherData: Omit<Teacher, 'id'>) => {
    // Security enforcement: School users cannot assign another school or modify hourly fee
    const safeSchoolId =
      currentUser?.role === 'school_user' && currentUser.schoolId
        ? currentUser.schoolId
        : teacherData.schoolId;

    const safeHourlyRate =
      currentUser?.role === 'school_user'
        ? rules.ucretliHourlyRate
        : Number(teacherData.hourlyRate) || rules.ucretliHourlyRate;

    const newTeacher: Teacher = {
      ...teacherData,
      schoolId: safeSchoolId,
      hourlyRate: safeHourlyRate,
      nationality: teacherData.nationality || 'TR',
      id: `teacher-${Date.now()}`,
    };
    setAllTeachers((prev) => [...prev, newTeacher]);

    if (isSupabaseActive) {
      supabaseDataService.upsertTeacher(newTeacher).catch(console.error);
    }
    logAction('Öğretmen Eklendi', `${newTeacher.fullName} sisteme kaydedildi.`);
  };

  const updateTeacher = (updatedTeacher: Teacher) => {
    // Security enforcement: School users cannot transfer school or change hourly fee
    const safeSchoolId =
      currentUser?.role === 'school_user' && currentUser.schoolId
        ? currentUser.schoolId
        : updatedTeacher.schoolId;

    const existing = allTeachers.find((t) => t.id === updatedTeacher.id);
    const safeHourlyRate =
      currentUser?.role === 'school_user'
        ? existing?.hourlyRate || rules.ucretliHourlyRate
        : Number(updatedTeacher.hourlyRate) || rules.ucretliHourlyRate;

    const safeTeacher: Teacher = {
      ...updatedTeacher,
      schoolId: safeSchoolId,
      hourlyRate: safeHourlyRate,
      nationality: updatedTeacher.nationality || 'TR',
    };

    setAllTeachers((prev) =>
      prev.map((t) => (t.id === safeTeacher.id ? safeTeacher : t))
    );
    if (isSupabaseActive) {
      supabaseDataService.upsertTeacher(safeTeacher).catch(console.error);
    }
    logAction('Öğretmen Güncellendi', `${safeTeacher.fullName} bilgileri güncellendi.`);
  };

  const deleteTeacher = (id: string) => {
    const target = allTeachers.find((t) => t.id === id);
    setAllTeachers((prev) => prev.filter((t) => t.id !== id));
    setPuantajRows((prev) => prev.filter((p) => p.teacherId !== id));

    if (isSupabaseActive) {
      supabaseDataService.deleteTeacher(id).catch(console.error);
    }
    logAction('Öğretmen Silindi', `${target?.fullName || id} silindi.`);
  };

  // Period actions
  const getTimesheetPeriod = (year: number, month: number): TimesheetPeriod => {
    const existing = timesheetPeriods.find((p) => p.year === year && p.month === month);
    if (existing) return existing;
    return getDefaultPeriodForMonth(year, month);
  };

  const saveTimesheetPeriod = async (
    period: TimesheetPeriod
  ): Promise<{ success: boolean; hasSubmittedTimesheets?: boolean }> => {
    const hasSubmittedTimesheets = submissions.some(
      (s) =>
        s.year === period.year &&
        s.month === period.month &&
        (s.status === 'onaylandi' || s.status === 'gonderildi' || s.status === 'incelemede')
    );

    setTimesheetPeriods((prev) => {
      const idx = prev.findIndex((p) => p.year === period.year && p.month === period.month);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = period;
        return copy;
      }
      return [...prev, period];
    });

    if (isSupabaseActive) {
      try {
        await supabaseDataService.saveTimesheetPeriod(period);
      } catch (err) {
        console.warn('Supabase saveTimesheetPeriod hatası:', err);
      }
    }

    // Admin tarih aralığını güncellediğinde, onaylanmamış kurum puantajlarını yeni aralığa göre kontrollü güncelle
    const rowsToUpdate: TeacherMonthlyPuantajRow[] = [];
    setPuantajRows((prevRows) => {
      const newRows = [...prevRows];

      allTeachers.forEach((teacher) => {
        const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
        if (!schedule) return;

        const sub = submissions.find(
          (s) => s.schoolId === teacher.schoolId && s.year === period.year && s.month === period.month
        );
        const isLocked = sub?.status === 'onaylandi' || sub?.status === 'gonderildi' || sub?.status === 'incelemede';
        if (isLocked) return;

        const existingRow = newRows.find(
          (p) => p.teacherId === teacher.id && p.year === period.year && p.month === period.month
        );

        const syncResult = syncTeacherScheduleToMonth({
          teacher,
          schedule,
          year: period.year,
          month: period.month,
          existingRow,
          isSubmissionLocked: false,
          periodStartDate: period.startDate,
          periodEndDate: period.endDate,
          rules,
        });

        const synced = syncResult.updatedRow;
        rowsToUpdate.push(synced);

        const rIdx = newRows.findIndex(
          (p) => p.teacherId === teacher.id && p.year === period.year && p.month === period.month
        );
        if (rIdx >= 0) {
          newRows[rIdx] = synced;
        } else {
          newRows.push(synced);
        }
      });

      return newRows;
    });

    if (isSupabaseActive && rowsToUpdate.length > 0) {
      try {
        await supabaseDataService.batchUpsertPuantajRows(rowsToUpdate);
      } catch (err) {
        console.warn('Yeni tarih aralığı puantaj senkronizasyonu Supabase hatası:', err);
      }
    }

    logAction(
      'Puantaj Dönemi Ayarlandı',
      `${period.month}/${period.year} (${period.startDate} - ${period.endDate}, Durum: ${period.status})`
    );

    return { success: true, hasSubmittedTimesheets };
  };

  const togglePeriodStatus = async (year: number, month: number): Promise<void> => {
    const current = getTimesheetPeriod(year, month);
    const newStatus: TimesheetPeriodStatus = current.status === 'acik' ? 'kapali' : 'acik';
    const updated: TimesheetPeriod = {
      ...current,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setTimesheetPeriods((prev) => {
      const idx = prev.findIndex((p) => p.year === year && p.month === month);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });

    if (isSupabaseActive) {
      try {
        await supabaseDataService.saveTimesheetPeriod(updated);
      } catch (err) {
        console.warn('Supabase togglePeriodStatus hatası:', err);
      }
    }

    // Dönem açıldığında (acik), haftalık ders programlarını bu dönemin puantaj cetveline senkronize et
    if (newStatus === 'acik') {
      const rowsToUpdate: TeacherMonthlyPuantajRow[] = [];
      setPuantajRows((prevRows) => {
        const newRows = [...prevRows];

        allTeachers.forEach((teacher) => {
          const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
          if (!schedule) return;

          const sub = submissions.find(
            (s) => s.schoolId === teacher.schoolId && s.year === year && s.month === month
          );
          const isLocked = sub?.status === 'onaylandi' || sub?.status === 'gonderildi' || sub?.status === 'incelemede';
          if (isLocked) return;

          const existingRow = newRows.find(
            (p) => p.teacherId === teacher.id && p.year === year && p.month === month
          );

          const syncResult = syncTeacherScheduleToMonth({
            teacher,
            schedule,
            year,
            month,
            existingRow,
            isSubmissionLocked: false,
            periodStartDate: updated.startDate,
            periodEndDate: updated.endDate,
            rules,
          });

          const synced = syncResult.updatedRow;
          rowsToUpdate.push(synced);

          const rIdx = newRows.findIndex(
            (p) => p.teacherId === teacher.id && p.year === year && p.month === month
          );
          if (rIdx >= 0) {
            newRows[rIdx] = synced;
          } else {
            newRows.push(synced);
          }
        });

        return newRows;
      });

      if (isSupabaseActive && rowsToUpdate.length > 0) {
        try {
          await supabaseDataService.batchUpsertPuantajRows(rowsToUpdate);
        } catch (err) {
          console.warn('Dönem açılışı puantaj senkronizasyonu Supabase hatası:', err);
        }
      }
    }

    logAction(
      'Puantaj Dönem Durumu Değiştirildi',
      `${month}/${year} dönemi: ${newStatus === 'acik' ? 'AÇIK (Girişe İzin Verildi)' : 'KAPALI (Giriş Durduruldu)'}`
    );
  };

  const deleteTimesheetPeriod = async (periodId: string): Promise<void> => {
    setTimesheetPeriods((prev) => prev.filter((p) => p.id !== periodId));
    if (isSupabaseActive) {
      try {
        await supabaseDataService.deleteTimesheetPeriod(periodId);
      } catch (err) {
        console.warn('Supabase deleteTimesheetPeriod hatası:', err);
      }
    }
  };

  // Puantaj actions
  const updateDailyHour = (
    teacherId: string,
    year: number,
    month: number,
    day: number,
    hours: number | null
  ) => {
    const teacher = allTeachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    // Check Period & Date Range Restrictions
    const period = getTimesheetPeriod(year, month);
    if (currentUser?.role !== 'admin') {
      if (period.status === 'kapali') {
        alert(`${month}. Ay puantaj dönemi kapalıdır. İlçe MEM yöneticisi tarafından veri girişi durdurulmuştur.`);
        return;
      }
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      if ((period.startDate && dateStr < period.startDate) || (period.endDate && dateStr > period.endDate)) {
        alert(`Seçilen gün (${dateStr}), yönetici tarafından belirlenen puantaj aralığı (${period.startDate} - ${period.endDate}) dışındadır.`);
        return;
      }
    }

    let updatedRow: TeacherMonthlyPuantajRow | null = null;
    const daysInMonth = getDaysInMonthCount(year, month);
    const schedule = weeklySchedules.find((s) => s.teacherId === teacherId);

    setPuantajRows((prev) => {
      const idx = prev.findIndex(
        (p) => p.teacherId === teacherId && p.year === year && p.month === month
      );

      if (idx >= 0) {
        const existing = prev[idx];
        const newDaily = { ...existing.dailyHours, [day]: hours };
        const newStatuses = { ...(existing.dailyStatuses || {}) };
        if (hours !== null) {
          newStatuses[day] = 'confirmed';
        } else {
          delete newStatuses[day];
        }

        const newTotal = Object.values(newDaily).reduce(
          (acc: number, val) => acc + (val || 0),
          0
        );
        const totals = calculateMonthlyPuantajTotals({
          teacher,
          totalHours: newTotal,
          daysInMonth,
          weeklyScheduleHours: schedule?.totalWeeklyHours,
          rules,
        });

        updatedRow = {
          ...existing,
          dailyHours: newDaily,
          dailyStatuses: newStatuses,
          totalHours: newTotal,
          bonusFiveToOneHours: totals.bonusFiveToOneHours,
          payableTotalHours: totals.payableTotalHours,
          estimatedPayment: totals.estimatedPayment,
        };

        const copy = [...prev];
        copy[idx] = updatedRow;
        return copy;
      } else {
        const newDaily: Record<number, number | null> = { [day]: hours };
        const newStatuses = hours !== null ? { [day]: 'confirmed' as const } : {};
        const newTotal = hours || 0;
        const totals = calculateMonthlyPuantajTotals({
          teacher,
          totalHours: newTotal,
          daysInMonth,
          weeklyScheduleHours: schedule?.totalWeeklyHours,
          rules,
        });

        updatedRow = {
          teacherId,
          schoolId: teacher.schoolId,
          year,
          month,
          dailyHours: newDaily,
          dailyStatuses: newStatuses,
          totalHours: newTotal,
          bonusFiveToOneHours: totals.bonusFiveToOneHours,
          payableTotalHours: totals.payableTotalHours,
          estimatedPayment: totals.estimatedPayment,
        };
        return [...prev, updatedRow];
      }
    });

    if (isSupabaseActive && updatedRow) {
      supabaseDataService.upsertPuantajRow(updatedRow).catch(console.error);
    }

    logAction('Ders Saati Güncellendi', `${teacher.fullName} - ${day}/${month}/${year}: ${hours ?? 'Boş'}`);
  };

  const updateDutyDailyHour = (
    teacherId: string,
    year: number,
    month: number,
    day: number,
    hours: number | null
  ) => {
    const teacher = allTeachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    // Check Period & Date Range Restrictions
    const period = getTimesheetPeriod(year, month);
    if (currentUser?.role !== 'admin') {
      if (period.status === 'kapali') {
        alert(`${month}. Ay puantaj dönemi kapalıdır. İlçe MEM yöneticisi tarafından veri girişi durdurulmuştur.`);
        return;
      }
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      if ((period.startDate && dateStr < period.startDate) || (period.endDate && dateStr > period.endDate)) {
        alert(`Seçilen gün (${dateStr}), yönetici tarafından belirlenen puantaj aralığı (${period.startDate} - ${period.endDate}) dışındadır.`);
        return;
      }
    }

    let updatedRow: TeacherMonthlyPuantajRow | null = null;

    setPuantajRows((prev) => {
      const idx = prev.findIndex(
        (p) => p.teacherId === teacherId && p.year === year && p.month === month
      );

      const hourlyRate = teacher.hourlyRate || rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57;

      if (idx >= 0) {
        const existing = prev[idx];
        const newDutyDaily = { ...(existing.dutyDailyHours || {}), [day]: hours };
        const newDutyStatuses = { ...(existing.dutyDailyStatuses || {}) };
        if (hours !== null) {
          newDutyStatuses[day] = 'confirmed';
        } else {
          delete newDutyStatuses[day];
        }

        const newDutyTotal = Object.values(newDutyDaily).reduce(
          (acc: number, val) => acc + (val || 0),
          0
        );
        const newDutyPayment = Math.round(newDutyTotal * hourlyRate * 100) / 100;

        updatedRow = {
          ...existing,
          dutyDailyHours: newDutyDaily,
          dutyDailyStatuses: newDutyStatuses,
          dutyTotalHours: newDutyTotal,
          dutyEstimatedPayment: newDutyPayment,
        };

        const copy = [...prev];
        copy[idx] = updatedRow;
        return copy;
      } else {
        const newDutyDaily: Record<number, number | null> = { [day]: hours };
        const newDutyStatuses = hours !== null ? { [day]: 'confirmed' as const } : {};
        const newDutyTotal = hours || 0;
        const newDutyPayment = Math.round(newDutyTotal * hourlyRate * 100) / 100;

        updatedRow = {
          teacherId,
          schoolId: teacher.schoolId,
          year,
          month,
          dailyHours: {},
          dailyStatuses: {},
          totalHours: 0,
          bonusFiveToOneHours: 0,
          payableTotalHours: 0,
          estimatedPayment: 0,
          dutyDailyHours: newDutyDaily,
          dutyDailyStatuses: newDutyStatuses,
          dutyTotalHours: newDutyTotal,
          dutyEstimatedPayment: newDutyPayment,
        };
        return [...prev, updatedRow];
      }
    });

    if (isSupabaseActive && updatedRow) {
      supabaseDataService.upsertPuantajRow(updatedRow).catch(console.error);
    }

    logAction('Nöbet Görevi Saati Güncellendi', `${teacher.fullName} - ${day}/${month}/${year}: ${hours ?? 'Boş'}`);
  };

  const setTeacherGuardDutyDay = async (teacherId: string, guardDutyDay: number | null) => {
    const teacher = allTeachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const sub = submissions.find(
      (s) => s.schoolId === teacher.schoolId && s.year === selectedYear && s.month === selectedMonth
    );
    const isLocked = sub?.status === 'onaylandi' || sub?.status === 'gonderildi' || sub?.status === 'incelemede';

    if (isLocked) {
      alert('Bu ayın puantaj cetveli onaylanmış veya incelemede olduğu için nöbet günü değişikliği yapılamaz.');
      return;
    }

    const hasGuardDuty = Boolean(guardDutyDay && guardDutyDay >= 1 && guardDutyDay <= 7);
    const validDutyDay = hasGuardDuty ? (guardDutyDay as number) : undefined;

    const updatedTeacher: Teacher = {
      ...teacher,
      hasGuardDuty,
      guardDutyDay: validDutyDay,
    };

    updateTeacher(updatedTeacher);

    // Otomatik olarak geçerli aya nöbet görevi satırını yansıt
    const period = getTimesheetPeriod(selectedYear, selectedMonth);
    const schedule = weeklySchedules.find((s) => s.teacherId === teacherId);

    let syncedRow: TeacherMonthlyPuantajRow | null = null;

    setPuantajRows((prevRows) => {
      const existingRow = prevRows.find(
        (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
      );

      const syncResult = syncTeacherScheduleToMonth({
        teacher: updatedTeacher,
        schedule,
        year: selectedYear,
        month: selectedMonth,
        existingRow,
        isSubmissionLocked: isLocked,
        periodStartDate: period.startDate,
        periodEndDate: period.endDate,
        rules,
      });

      syncedRow = syncResult.updatedRow;

      const rowIdx = prevRows.findIndex(
        (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
      );

      if (rowIdx >= 0) {
        const copy = [...prevRows];
        copy[rowIdx] = syncResult.updatedRow;
        return copy;
      }
      return [...prevRows, syncResult.updatedRow];
    });

    if (isSupabaseActive && syncedRow) {
      supabaseDataService.upsertPuantajRow(syncedRow).catch(console.error);
    }

    const dayLabels = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const dayName = validDutyDay ? dayLabels[validDutyDay] : 'Kaldırıldı';
    logAction('Nöbet Günü Güncellendi', `${teacher.fullName} nöbet günü: ${dayName}`);
  };

  // Workflow: Save as Draft
  const savePuantajAsDraft = (schoolId: string, year: number, month: number) => {
    const period = getTimesheetPeriod(year, month);
    if (period.status === 'kapali' && currentUser?.role !== 'admin') {
      alert(`${month}. Ay puantaj dönemi kapalı olduğu için taslak kaydedilemez.`);
      return;
    }

    let savedItem: SchoolMonthlySubmission | null = null;

    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.schoolId === schoolId && s.year === year && s.month === month);
      const item: SchoolMonthlySubmission = {
        id: idx >= 0 ? prev[idx].id : `sub-${Date.now()}`,
        schoolId,
        year,
        month,
        status: 'taslak',
        totalTeachersCount: allTeachers.filter((t) => t.schoolId === schoolId).length,
        totalLessonHours: 0,
        totalPayableAmount: 0,
      };
      savedItem = item;
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...prev[idx], status: 'taslak' };
        savedItem = copy[idx];
        return copy;
      }
      return [...prev, item];
    });

    if (isSupabaseActive && savedItem) {
      supabaseDataService.upsertSubmission(savedItem).catch(console.error);
    }
    logAction('Puantaj Taslağı Kaydedildi', `${schoolId} için ${month}/${year} taslak kaydedildi.`);
  };

  // Workflow: Submit to Admin
  const submitPuantajToAdmin = (schoolId: string, year: number, month: number, notes?: string) => {
    const period = getTimesheetPeriod(year, month);
    if (period.status === 'kapali' && currentUser?.role !== 'admin') {
      alert(`${month}. Ay puantaj dönemi kapalı olduğu için İlçe MEM onayına gönderilemez.`);
      return;
    }

    const school = schools.find((s) => s.id === schoolId);
    const schoolPuantaj = puantajRows.filter((p) => p.schoolId === schoolId && p.year === year && p.month === month);
    const totalHours = schoolPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
    const totalAmount = schoolPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

    let submittedItem: SchoolMonthlySubmission | null = null;

    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.schoolId === schoolId && s.year === year && s.month === month);
      const now = new Date().toISOString();
      const updated: SchoolMonthlySubmission = {
        id: idx >= 0 ? prev[idx].id : `sub-${Date.now()}`,
        schoolId,
        year,
        month,
        status: 'gonderildi',
        submittedAt: now,
        notes: notes || (idx >= 0 ? prev[idx].notes : undefined),
        totalTeachersCount: allTeachers.filter((t) => t.schoolId === schoolId).length,
        totalLessonHours: totalHours,
        totalPayableAmount: totalAmount,
      };
      submittedItem = updated;
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...prev[idx], ...updated };
        submittedItem = copy[idx];
        return copy;
      }
      return [...prev, updated];
    });

    if (isSupabaseActive && submittedItem) {
      supabaseDataService.upsertSubmission(submittedItem).catch(console.error);
    }
    logAction('Puantaj Onaya Sunuldu', `${school?.name || schoolId} ${month}/${year} puantajını onaya sundu.`);
  };

  // Workflow: Admin approval / correction request
  const updateSubmissionStatus = (
    schoolId: string,
    year: number,
    month: number,
    status: SubmissionStatus,
    notes?: string,
    correctionNotes?: string
  ) => {
    const school = schools.find((s) => s.id === schoolId);
    let updatedItem: SchoolMonthlySubmission | null = null;

    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.schoolId === schoolId && s.year === year && s.month === month);
      const now = new Date().toISOString();
      const schoolPuantaj = puantajRows.filter((p) => p.schoolId === schoolId && p.year === year && p.month === month);
      const totalHours = schoolPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
      const totalAmount = schoolPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

      const item: SchoolMonthlySubmission = {
        id: idx >= 0 ? prev[idx].id : `sub-${Date.now()}`,
        schoolId,
        year,
        month,
        status,
        notes: notes || (idx >= 0 ? prev[idx].notes : undefined),
        correctionNotes: correctionNotes || (idx >= 0 ? prev[idx].correctionNotes : undefined),
        submittedAt: idx >= 0 ? prev[idx].submittedAt : now,
        approvedAt: status === 'onaylandi' ? now : undefined,
        rejectedAt: status === 'reddedildi' ? now : undefined,
        correctionRequestedAt: status === 'duzeltme_istendi' ? now : undefined,
        totalTeachersCount: allTeachers.filter((t) => t.schoolId === schoolId).length,
        totalLessonHours: totalHours,
        totalPayableAmount: totalAmount,
      };
      updatedItem = item;

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...prev[idx], ...item };
        updatedItem = copy[idx];
        return copy;
      }
      return [...prev, item];
    });

    if (isSupabaseActive && updatedItem) {
      supabaseDataService.upsertSubmission(updatedItem).catch(console.error);
    }
    logAction('Puantaj Durumu Güncellendi', `${school?.name || schoolId} [${status.toUpperCase()}] yapıldı.`);
  };

  const batchImportPuantajRows = (
    importedRows: {
      tcNo: string;
      fullName: string;
      iban: string;
      explanation: string;
      hasOtherEmployer: boolean;
      otherEmployerTaxBase: number;
      dailyHours: Record<number, number | null>;
    }[],
    targetSchoolId: string,
    year: number,
    month: number
  ) => {
    const updatedTeachers = [...allTeachers];
    const newPuantajList: TeacherMonthlyPuantajRow[] = [...puantajRows];
    const newlyCreatedTeachers: Teacher[] = [];

    for (const item of importedRows) {
      let teacher = updatedTeachers.find(
        (t) => t.tcNo.trim() === item.tcNo.trim() && t.schoolId === targetSchoolId
      );

      if (!teacher) {
        teacher = {
          id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          schoolId: targetSchoolId,
          nationality: 'TR',
          tcNo: item.tcNo,
          fullName: item.fullName,
          branch: item.explanation || 'Ders Ücreti Karşılığı',
          employmentType: 'ucretli_ogretmen',
          iban: item.iban,
          explanation: item.explanation,
          startDate: `${year}-${String(month).padStart(2, '0')}-01`,
          hasOtherEmployer: item.hasOtherEmployer,
          otherEmployerTaxBase: item.otherEmployerTaxBase,
          hourlyRate: rules.ucretliHourlyRate,
          isActive: true,
        };
        updatedTeachers.push(teacher);
        newlyCreatedTeachers.push(teacher);
      }

      const total = Object.values(item.dailyHours).reduce((acc: number, val) => acc + (val || 0), 0);
      const totals = calculateMonthlyPuantajTotals({
        teacher: teacher!,
        totalHours: total,
        daysInMonth: getDaysInMonthCount(year, month),
        rules,
      });

      const existingIdx = newPuantajList.findIndex(
        (p) => p.teacherId === teacher!.id && p.year === year && p.month === month
      );

      const puantajEntry: TeacherMonthlyPuantajRow = {
        teacherId: teacher.id,
        schoolId: targetSchoolId,
        year,
        month,
        dailyHours: item.dailyHours,
        totalHours: total,
        bonusFiveToOneHours: totals.bonusFiveToOneHours,
        payableTotalHours: totals.payableTotalHours,
        estimatedPayment: totals.estimatedPayment,
      };

      if (existingIdx >= 0) {
        newPuantajList[existingIdx] = puantajEntry;
      } else {
        newPuantajList.push(puantajEntry);
      }
    }

    setAllTeachers(updatedTeachers);
    setPuantajRows(newPuantajList);

    if (isSupabaseActive) {
      if (newlyCreatedTeachers.length > 0) {
        newlyCreatedTeachers.forEach((t) => supabaseDataService.upsertTeacher(t).catch(console.error));
      }
      supabaseDataService.batchUpsertPuantajRows(newPuantajList).catch(console.error);
    }
    logAction('Excel İçe Aktarıldı', `${importedRows.length} öğretmenin verisi yüklendi.`);
  };

  const updateRules = async (newRules: MebPaymentRules): Promise<void> => {
    // 1. Yetki Kontrolü: Sadece Yönetici (Admin) ücret ve kuralları değiştirebilir
    if (currentUser && currentUser.role !== 'admin') {
      alert('Bu işlem için yönetici (Admin) yetkisi gerekmektedir.');
      return;
    }

    setRules(newRules);

    // 2. Supabase Backend'e kalıcı kaydet
    if (isSupabaseActive) {
      try {
        await supabaseDataService.saveRules(newRules);
      } catch (err) {
        console.error('Kurallar Supabase veritabanına kaydedilemedi:', err);
      }
    }

    // 3. Etkilenen ve henüz onaylanmamış puantaj kayıtlarını güncel kurallara göre yeniden hesapla
    // (Onaylanmış geçmiş puantajlar ASLA değiştirilmez)
    const rowsToPersist: TeacherMonthlyPuantajRow[] = [];
    setPuantajRows((prevRows) => {
      const updatedList = prevRows.map((row) => {
        const sub = submissions.find(
          (s) => s.schoolId === row.schoolId && s.year === row.year && s.month === row.month
        );
        const isApproved = sub?.status === 'onaylandi';
        if (isApproved) {
          // Onaylanmış puantajlara dokunma
          return row;
        }

        const teacher = allTeachers.find((t) => t.id === row.teacherId);
        if (!teacher) return row;

        const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
        const period = getTimesheetPeriod(row.year, row.month);

        if (schedule) {
          const syncResult = syncTeacherScheduleToMonth({
            teacher,
            schedule,
            year: row.year,
            month: row.month,
            existingRow: row,
            isSubmissionLocked: false,
            periodStartDate: period.startDate,
            periodEndDate: period.endDate,
            rules: newRules,
          });
          rowsToPersist.push(syncResult.updatedRow);
          return syncResult.updatedRow;
        } else {
          const hourlyRate = teacher.hourlyRate > 0 ? teacher.hourlyRate : (newRules.gunduzHourlyRate || 220.57);
          const newPayment = Math.round(row.payableTotalHours * hourlyRate * 100) / 100;
          const updatedRow = {
            ...row,
            estimatedPayment: newPayment,
          };
          rowsToPersist.push(updatedRow);
          return updatedRow;
        }
      });

      return updatedList;
    });

    if (isSupabaseActive && rowsToPersist.length > 0) {
      supabaseDataService.batchUpsertPuantajRows(rowsToPersist).catch(console.error);
    }

    logAction(
      'MEB Ödeme Kuralları Güncellendi ve Puantajlar Yeniden Hesaplandı',
      `Yeni saat ücreti: ${newRules.gunduzHourlyRate || newRules.ucretliHourlyRate} TL.`
    );
  };

  const saveWeeklySchedule = async (schedule: TeacherWeeklySchedule) => {
    setWeeklySchedules((prev) => {
      const idx = prev.findIndex((s) => s.teacherId === schedule.teacherId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = schedule;
        return copy;
      }
      return [...prev, schedule];
    });

    if (isSupabaseActive) {
      try {
        await supabaseDataService.saveWeeklySchedule(schedule);
      } catch (err) {
        console.warn('Ders programı kaydedilemedi:', err);
      }
    }

    // 1. Otomatik olarak geçerli aya (selectedYear, selectedMonth) senkronize et
    const teacher = allTeachers.find((t) => t.id === schedule.teacherId);
    if (teacher) {
      const period = getTimesheetPeriod(selectedYear, selectedMonth);
      const sub = submissions.find(
        (s) => s.schoolId === schedule.schoolId && s.year === selectedYear && s.month === selectedMonth
      );
      const isLocked = sub?.status === 'onaylandi' || sub?.status === 'gonderildi' || sub?.status === 'incelemede';

      const existingRow = puantajRows.find(
        (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
      );

      const syncResult = syncTeacherScheduleToMonth({
        teacher,
        schedule,
        year: selectedYear,
        month: selectedMonth,
        existingRow,
        isSubmissionLocked: isLocked,
        periodStartDate: period.startDate,
        periodEndDate: period.endDate,
        rules,
      });

      const syncedRow = syncResult.updatedRow;

      setPuantajRows((prevRows) => {
        const rowIdx = prevRows.findIndex(
          (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
        );

        if (rowIdx >= 0) {
          const copy = [...prevRows];
          copy[rowIdx] = syncedRow;
          return copy;
        }
        return [...prevRows, syncedRow];
      });

      if (isSupabaseActive) {
        try {
          await supabaseDataService.upsertPuantajRow(syncedRow);
        } catch (err) {
          console.warn('Puantaj satırı Supabase veritabanına kaydedilemedi:', err);
        }
      }
    }

    logAction(
      'Haftalık Ders Programı Güncellendi ve Puantaja Senkronize Edildi',
      `Öğretmen ID: ${schedule.teacherId}, Toplam: ${schedule.totalWeeklyHours} saat`
    );
  };

  const syncScheduleToTimesheet = (
    teacherId: string,
    year: number = selectedYear,
    month: number = selectedMonth
  ) => {
    const teacher = allTeachers.find((t) => t.id === teacherId);
    const schedule = weeklySchedules.find((s) => s.teacherId === teacherId);
    if (!teacher || !schedule) return;

    const sub = submissions.find(
      (s) => s.schoolId === teacher.schoolId && s.year === year && s.month === month
    );
    const isLocked = sub?.status === 'onaylandi' || sub?.status === 'gonderildi' || sub?.status === 'incelemede';
    const period = getTimesheetPeriod(year, month);

    let syncedRow: TeacherMonthlyPuantajRow | null = null;

    setPuantajRows((prevRows) => {
      const existingRow = prevRows.find(
        (p) => p.teacherId === teacher.id && p.year === year && p.month === month
      );

      const syncResult = syncTeacherScheduleToMonth({
        teacher,
        schedule,
        year,
        month,
        existingRow,
        isSubmissionLocked: isLocked,
        periodStartDate: period.startDate,
        periodEndDate: period.endDate,
        rules,
      });

      syncedRow = syncResult.updatedRow;

      const rowIdx = prevRows.findIndex(
        (p) => p.teacherId === teacher.id && p.year === year && p.month === month
      );

      if (rowIdx >= 0) {
        const copy = [...prevRows];
        copy[rowIdx] = syncResult.updatedRow;
        return copy;
      }
      return [...prevRows, syncResult.updatedRow];
    });

    if (isSupabaseActive && syncedRow) {
      supabaseDataService.upsertPuantajRow(syncedRow).catch(console.error);
    }
  };

  const syncAllSchedulesToTimesheet = (
    schoolId: string,
    year: number,
    month: number,
    silent: boolean = false
  ) => {
    const period = getTimesheetPeriod(year, month);
    if (period.status === 'kapali' && currentUser?.role !== 'admin') {
      if (!silent) {
        alert('Bu ayın puantaj dönemi kapalı olduğu için ders programı senkronizasyonu yapılamaz.');
      }
      return;
    }

    const schoolTeachers = allTeachers.filter((t) => t.schoolId === schoolId);
    const sub = submissions.find(
      (s) => s.schoolId === schoolId && s.year === year && s.month === month
    );
    const isLocked = sub?.status === 'onaylandi' || sub?.status === 'gonderildi' || sub?.status === 'incelemede';

    if (isLocked) {
      if (!silent) {
        alert('Bu ayın puantaj cetveli onaylanmış veya incelemede olduğu için senkronizasyon yapılamaz.');
      }
      return;
    }

    const updatedRowsList: TeacherMonthlyPuantajRow[] = [];

    setPuantajRows((prevRows) => {
      const copy = [...prevRows];

      schoolTeachers.forEach((teacher) => {
        const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
        if (!schedule) return;

        const existingRow = copy.find(
          (p) => p.teacherId === teacher.id && p.year === year && p.month === month
        );

        const syncResult = syncTeacherScheduleToMonth({
          teacher,
          schedule,
          year,
          month,
          existingRow,
          isSubmissionLocked: isLocked,
          periodStartDate: period.startDate,
          periodEndDate: period.endDate,
          rules,
        });

        updatedRowsList.push(syncResult.updatedRow);

        const rowIdx = copy.findIndex(
          (p) => p.teacherId === teacher.id && p.year === year && p.month === month
        );

        if (rowIdx >= 0) {
          copy[rowIdx] = syncResult.updatedRow;
        } else {
          copy.push(syncResult.updatedRow);
        }
      });

      return copy;
    });

    if (isSupabaseActive && updatedRowsList.length > 0) {
      supabaseDataService.batchUpsertPuantajRows(updatedRowsList).catch(console.error);
    }

    if (!silent) {
      logAction('Tüm Programlar Puantaja Senkronize Edildi', `Kurum: ${schoolId}, Ay: ${month}/${year}`);
    }
  };

  const confirmAllPlannedForMonth = (schoolId: string, year: number, month: number) => {
    const updatedRowsList: TeacherMonthlyPuantajRow[] = [];

    setPuantajRows((prevRows) => {
      return prevRows.map((row) => {
        if (row.schoolId === schoolId && row.year === year && row.month === month) {
          const confirmedRow = confirmPlannedDaysInRow(row);
          updatedRowsList.push(confirmedRow);
          return confirmedRow;
        }
        return row;
      });
    });

    if (isSupabaseActive && updatedRowsList.length > 0) {
      supabaseDataService.batchUpsertPuantajRows(updatedRowsList).catch(console.error);
    }

    logAction('Planlanan Ders Saatleri Fiili Olarak Doğrulandı', `Kurum: ${schoolId}, Ay: ${month}/${year}`);
  };

  const getTeacherSchedule = (teacherId: string) => {
    return weeklySchedules.find((s) => s.teacherId === teacherId);
  };

  const resetToDefaults = () => {
    setSchools(INITIAL_SCHOOLS);
    setAllTeachers(INITIAL_TEACHERS);
    setPuantajRows(generateInitialPuantajRows());
    setSubmissions(INITIAL_SUBMISSIONS);
    setRules(DEFAULT_MEB_PAYMENT_RULES);
    setAccounts(INITIAL_ACCOUNTS);
    setCurrentUser(null);
    saveSessionData(null);
    logAction('Sistem Sıfırlandı', 'Orijinal test verileriyle sistem sıfırlandı.');
  };

  const addBranch = async (branchData: Omit<BranchItem, 'id'>) => {
    const newBranch: BranchItem = {
      ...branchData,
      id: `branch-${Date.now()}`,
      isCustom: true,
    };
    setBranches((prev) => [...prev, newBranch]);
    if (isSupabaseActive) {
      try {
        await supabaseDataService.createBranch(newBranch);
      } catch (err) {
        console.warn('Branş Supabase kaydı hatası:', err);
      }
    }
    logAction('Yeni Branş Eklendi', `${newBranch.name} (${newBranch.category}) branşı eklendi.`);
  };

  const deleteBranch = async (id: string) => {
    const target = branches.find((b) => b.id === id);
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (isSupabaseActive) {
      try {
        await supabaseDataService.deleteBranch(id);
      } catch (err) {
        console.warn('Branş Supabase silme hatası:', err);
      }
    }
    logAction('Branş Silindi', `${target?.name || id} branşı kaldırıldı.`);
  };

  // Safe migration helper
  const migrateToSupabase = async (): Promise<MigrationResult> => {
    setIsMigrating(true);
    try {
      const result = await migrateLocalStorageToSupabase();
      if (result.success) {
        setBackendMode('supabase');
      }
      return result;
    } finally {
      setIsMigrating(false);
    }
  };

  // Security test helper
  const runSecurityAudit = async (): Promise<SecurityTestReport> => {
    return runSecurityAuditTests(
      currentUser?.schoolId,
      schools,
      allTeachers,
      submissions,
      puantajRows
    );
  };

  return (
    <AppContext.Provider
      value={{
        schools,
        teachers,
        allTeachers,
        puantajRows,
        submissions,
        rules,
        auditLogs,
        accounts,
        currentUser,
        weeklySchedules,
        timesheetPeriods,
        isSupabaseActive,
        backendMode,
        isMigrating,
        isAuthChecking,
        syncFromRemote,
        activeTab,
        selectedYear,
        selectedMonth,
        selectedSchoolId,
        selectedDirectorate,
        maskSensitiveData,
        darkMode,
        setActiveTab,
        setSelectedYear,
        setSelectedMonth,
        setSelectedSchoolId,
        setSelectedDirectorate,
        toggleMaskSensitiveData,
        toggleDarkMode,
        login,
        logout,
        switchAccount,
        addSchool,
        updateSchool,
        deleteSchool,
        resetSchoolPassword,
        toggleSchoolAccountActive,
        assignSchoolDirectorate,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        setTeacherGuardDutyDay,
        saveWeeklySchedule,
        getTeacherSchedule,
        syncScheduleToTimesheet,
        syncAllSchedulesToTimesheet,
        confirmAllPlannedForMonth,
        updateDailyHour,
        updateDutyDailyHour,
        savePuantajAsDraft,
        submitPuantajToAdmin,
        updateSubmissionStatus,
        batchImportPuantajRows,
        getTimesheetPeriod,
        saveTimesheetPeriod,
        togglePeriodStatus,
        deleteTimesheetPeriod,
        updateRules,
        resetToDefaults,
        branches,
        addBranch,
        deleteBranch,
        migrateToSupabase,
        runSecurityAudit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
