import React, { useState, useMemo } from 'react';
import {
  TableProperties,
  Download,
  Upload,
  FileSpreadsheet,
  Printer,
  Building,
  Calendar,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Unlock,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MONTH_NAMES_TR,
  getDaysInMonth,
  downloadOriginalMonthlyTemplate,
  exportMonthlyPuantajToExcel,
} from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';
import { calculateMonthlyPuantajTotals } from '../../utils/additionalTeachingCalculator';
import { syncTeacherScheduleToMonth } from '../../utils/schedulePuantajSync';
import { AdminPeriodManagerModal } from './AdminPeriodManagerModal';
import { GENERAL_DIRECTORATES, GeneralDirectorate } from '../../types';

const DUTY_DAY_SHORT_LABELS: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi',
  7: 'Pazar',
};

export const AdminMonthlyPuantajView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    weeklySchedules,
    rules,
    selectedYear,
    selectedMonth,
    selectedSchoolId,
    setSelectedSchoolId,
    selectedDirectorate,
    setSelectedDirectorate,
    maskSensitiveData,
    toggleMaskSensitiveData,
    updateDailyHour,
    updateDutyDailyHour,
    setActiveTab,
    getTimesheetPeriod,
    togglePeriodStatus,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'sozlesmeli' | 'ucretli' | 'stajyer'>('all');
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [editingCell, setEditingCell] = useState<{ teacherId: string; day: number; isDuty?: boolean } | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');

  const currentPeriod = getTimesheetPeriod(selectedYear, selectedMonth);
  const isPeriodClosed = currentPeriod.status === 'kapali';

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  // 1. Filter schools by General Directorate if selected
  const directorateSchools =
    selectedDirectorate === 'all'
      ? schools
      : schools.filter((s) => s.generalDirectorate === selectedDirectorate);

  const directorateSchoolIds = new Set(directorateSchools.map((s) => s.id));

  // If currently selected school is not in the active Directorate, treat as 'all'
  const effectiveSchoolId =
    selectedSchoolId !== 'all' && !directorateSchoolIds.has(selectedSchoolId)
      ? 'all'
      : selectedSchoolId;

  // 2. Filter teachers by Directorate, school and employment status
  const activeTeachers = teachers.filter((t) => {
    if (!t.isActive) return false;
    if (!directorateSchoolIds.has(t.schoolId)) return false;
    if (effectiveSchoolId !== 'all' && t.schoolId !== effectiveSchoolId) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'sozlesmeli') return t.employmentType === 'sozlesmeli';
    if (statusFilter === 'ucretli') {
      return (
        t.employmentType === 'ucretli' ||
        t.employmentType === 'ucretli_ogretmen' ||
        t.employmentType === 'usta_ogretici'
      );
    }
    if (statusFilter === 'stajyer') {
      return t.employmentType === 'stajyer' || t.employmentType === 'stajer';
    }
    return true;
  });

  const selectedSchool = schools.find((s) => s.id === effectiveSchoolId);
  const schoolLabel = selectedSchool
    ? selectedSchool.name
    : selectedDirectorate === 'all'
    ? 'Tüm Kurumlar'
    : `${selectedDirectorate} (Tüm Kurumlar)`;

  // Compute day of week for each day 1..daysInMonth (memoized)
  const daysMetadata = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayNameShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][dayOfWeek];
      const mStr = String(selectedMonth).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${mStr}-${dStr}`;
      const isWithinPeriod =
        (!currentPeriod.startDate || dateStr >= currentPeriod.startDate) &&
        (!currentPeriod.endDate || dateStr <= currentPeriod.endDate);
      return { day, dayOfWeek, isWeekend, dayNameShort, dateStr, isWithinPeriod };
    });
  }, [daysInMonth, selectedYear, selectedMonth, currentPeriod.startDate, currentPeriod.endDate]);

  // Calculate table rows with teacher details and separate duty rows (memoized)
  const tableRows = useMemo(() => {
    return activeTeachers.map((teacher) => {
      const rowData = puantajRows.find(
        (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
      );
      const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
      const effectiveRow = schedule
        ? syncTeacherScheduleToMonth({
            teacher,
            schedule,
            year: selectedYear,
            month: selectedMonth,
            existingRow: rowData,
            periodStartDate: currentPeriod.startDate,
            periodEndDate: currentPeriod.endDate,
            rules,
          }).updatedRow
        : rowData;

      const daily = effectiveRow ? effectiveRow.dailyHours : {};
      const statuses = effectiveRow ? effectiveRow.dailyStatuses || {} : {};
      const total = effectiveRow ? effectiveRow.totalHours : 0;
      const bonus = effectiveRow ? effectiveRow.bonusFiveToOneHours : 0;
      const payable = effectiveRow ? effectiveRow.payableTotalHours : total;
      const payment = effectiveRow ? effectiveRow.estimatedPayment : payable * teacher.hourlyRate;

      const dutyDaily = effectiveRow ? effectiveRow.dutyDailyHours || {} : {};
      const dutyStatuses = effectiveRow ? effectiveRow.dutyDailyStatuses || {} : {};
      const dutyTotal = effectiveRow ? (effectiveRow.dutyTotalHours ?? 0) : 0;
      const dutyPayment = effectiveRow
        ? (effectiveRow.dutyEstimatedPayment ?? (dutyTotal * teacher.hourlyRate))
        : (dutyTotal * teacher.hourlyRate);
      const hasDuty = Boolean(teacher.guardDutyDay || dutyTotal > 0 || Object.keys(dutyDaily).length > 0);

      return {
        teacher,
        rowData: rowData || effectiveRow,
        daily,
        statuses,
        total,
        bonus,
        payable,
        payment,
        hasDuty,
        dutyDaily,
        dutyStatuses,
        dutyTotal,
        dutyPayment,
      };
    });
  }, [activeTeachers, puantajRows, weeklySchedules, selectedYear, selectedMonth, currentPeriod.startDate, currentPeriod.endDate, rules]);

  // Grand totals
  const grandTotalActual = tableRows.reduce((acc, r) => acc + r.total, 0);
  const grandTotalBonus = tableRows.reduce((acc, r) => acc + r.bonus, 0);
  const grandTotalPayable = tableRows.reduce((acc, r) => acc + r.payable, 0);
  const grandTotalPayment = tableRows.reduce((acc, r) => acc + r.payment, 0);

  // Column totals for each day
  const dailyColumnTotals = daysMetadata.map(({ day }) => {
    return tableRows.reduce((acc, r) => {
      const reg = r.daily[day] || 0;
      return acc + reg;
    }, 0);
  });

  const maskTc = (tc: string) => {
    if (!maskSensitiveData || !tc || tc.length < 5) return tc;
    return `${tc.slice(0, 3)}*****${tc.slice(-2)}`;
  };

  const maskIbanStr = (iban: string) => {
    if (!maskSensitiveData || !iban || iban.length < 10) return iban;
    return `${iban.slice(0, 4)} **** ${iban.slice(-4)}`;
  };

  const handleStartCellEdit = (
    teacherId: string,
    day: number,
    currentVal: number | null | undefined,
    isDuty: boolean = false
  ) => {
    setEditingCell({ teacherId, day, isDuty });
    setCellInputValue(currentVal !== null && currentVal !== undefined ? String(currentVal) : '');
  };

  const handleSaveCell = (teacherId: string, day: number, isDuty: boolean = false) => {
    const trimmed = cellInputValue.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);

    if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 12)) {
      alert('Lütfen geçerli bir ders saati girin (0 - 12 saat).');
      return;
    }

    if (isDuty) {
      updateDutyDailyHour(teacherId, selectedYear, selectedMonth, day, parsed);
    } else {
      updateDailyHour(teacherId, selectedYear, selectedMonth, day, parsed);
    }
    setEditingCell(null);
  };

  const handleExportExcel = () => {
    const exportData = tableRows.map((r) => ({
      teacher: r.teacher,
      dailyHours: r.daily,
      totalHours: r.total,
    }));
    exportMonthlyPuantajToExcel(schoolLabel, selectedYear, selectedMonth, exportData);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <TableProperties className="w-4 h-4" />
            <span>Resmi MEB Formatı – {monthName.toUpperCase()} {selectedYear}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Puantaj Raporu (Aylık Ders Saatleri)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ders ücreti karşılığında görevlendirilenlerin aylık ders ve nöbet saatleri puantajı, IBAN ve tahakkuk dökümü.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel'e Aktar</span>
          </button>

          <button
            onClick={() => downloadOriginalMonthlyTemplate(selectedYear, selectedMonth)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            title="Orijinal MEB formatında boş şablon indir"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Boş Şablon (.xlsx)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700"
            title="Yazdır"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Administrator Timesheet Period & Date Range Bar */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 p-3.5 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{monthName} {selectedYear} Puantaj Dönemi:</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300">
            <span>{currentPeriod.startDate}</span>
            <span className="text-slate-400">→</span>
            <span>{currentPeriod.endDate}</span>
          </div>

          <div>
            {currentPeriod.status === 'acik' ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-700">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>AÇIK (Okullar Giriş Yapabilir)</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-[11px] border border-rose-300 dark:border-rose-700">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>KAPALI (Giriş Kilitli)</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => togglePeriodStatus(selectedYear, selectedMonth)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl font-bold border transition-colors ${
              currentPeriod.status === 'acik'
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {currentPeriod.status === 'acik' ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Dönemi Kapat</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Dönemi Aç</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsPeriodModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Tarih Aralığını Yönet</span>
          </button>
        </div>
      </div>

      {/* Filter and School Banner */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* General Directorate Selector */}
          <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 font-semibold text-blue-900 dark:text-blue-200">
            <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <select
              value={selectedDirectorate}
              onChange={(e) => {
                setSelectedDirectorate(e.target.value as any);
                setSelectedSchoolId('all');
              }}
              className="bg-transparent focus:outline-none cursor-pointer max-w-[210px] truncate font-bold text-xs"
              title="MEB Genel Müdürlüğü Filtresi"
            >
              <option value="all">Tüm Genel Müdürlükler ({schools.length} Kurum)</option>
              {GENERAL_DIRECTORATES.map((gd) => {
                const count = schools.filter((s) => s.generalDirectorate === gd).length;
                return (
                  <option key={gd} value={gd}>
                    {gd} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* School Selector */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
            <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <select
              value={effectiveSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[240px] truncate"
            >
              <option value="all">
                {selectedDirectorate === 'all'
                  ? `Tüm Okullar (${schools.length} Kurum)`
                  : `${selectedDirectorate} Okulları (${directorateSchools.length})`}
              </option>
              {directorateSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 pl-2 pr-1 font-bold text-[11px] flex items-center space-x-1">
              <Filter className="w-3 h-3 text-slate-500" />
              <span>Statü:</span>
            </span>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'sozlesmeli', label: 'Sözleşmeli' },
              { id: 'ucretli', label: 'Ücretli' },
              { id: 'stajyer', label: 'Stajyer' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-slate-500 font-medium hidden md:inline">
            Listelenen: <strong className="text-slate-800 dark:text-slate-200">{activeTeachers.length}</strong> öğretmen
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] text-slate-500">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
            <span>Boş: Ders Yok</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-100 dark:bg-amber-950 border border-amber-300" />
            <span>Hafta Sonu</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-100 dark:bg-blue-950 border border-blue-400 font-bold" />
            <span>Fiili Saat</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-indigo-100 dark:bg-indigo-950 border border-indigo-400 font-bold" />
            <span>Nöbet Saati</span>
          </div>
        </div>
      </div>

      {/* CORE EXCEL TABLE (Smooth horizontal scroll with sticky TC and Name columns) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700">
              {/* Row 0: Full banner row as in the Excel template */}
              <tr>
                <th
                  colSpan={2 + daysInMonth + 7}
                  className="py-2.5 px-4 text-center font-bold text-xs uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700"
                >
                  DERS ÜCRETİ KARŞILIĞINDA GÖREVLENDİRİLENLERİN {monthName.toUpperCase()} AYI DERS SAATLERİ PUANTAJI ({schoolLabel.toUpperCase()})
                </th>
              </tr>

              {/* Row 1: Columns */}
              <tr className="text-slate-600 dark:text-slate-300 text-[11px]">
                {/* Sticky Col 1: TC */}
                <th className="py-2.5 px-3 font-bold border-r border-slate-300 dark:border-slate-700 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 min-w-[110px]">
                  T.C. KİMLİK NO
                </th>

                {/* Sticky Col 2: Name */}
                <th className="py-2.5 px-3 font-bold border-r border-slate-300 dark:border-slate-700 sticky left-[110px] z-30 bg-slate-100 dark:bg-slate-900 min-w-[150px]">
                  ADI SOYADI
                </th>

                {/* Days 1..N */}
                {daysMetadata.map(({ day, isWeekend, dayNameShort, isWithinPeriod, dateStr }) => (
                  <th
                    key={day}
                    className={`py-1.5 px-1 text-center font-bold border-r border-slate-200 dark:border-slate-700 min-w-[32px] ${
                      !isWithinPeriod
                        ? 'bg-slate-200/50 dark:bg-slate-900/90 text-slate-400 opacity-60'
                        : isWeekend
                        ? 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200'
                    }`}
                    title={!isWithinPeriod ? `Bu tarih (${dateStr}) belirlenen puantaj aralığı dışındadır.` : undefined}
                  >
                    <div className="text-[11px] leading-tight font-extrabold">{day}</div>
                    <div className="text-[8px] font-normal text-slate-400">{dayNameShort}</div>
                  </th>
                ))}

                {/* Summary & Metadata Columns */}
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 min-w-[50px]">
                  TOPLAM SAAT
                </th>
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 bg-blue-100/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 min-w-[45px]">
                  İlave (5+1 / 2+1)
                </th>
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 bg-indigo-100/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 min-w-[55px]">
                  ÖDENECEK
                </th>
                <th className="py-2.5 px-3 font-bold border-r border-slate-300 dark:border-slate-700 min-w-[180px]">
                  IBAN
                </th>
                <th className="py-2.5 px-3 font-bold border-r border-slate-300 dark:border-slate-700 min-w-[140px]">
                  AÇIKLAMA / AYRILIŞ
                </th>
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 min-w-[80px]">
                  BAŞKA İŞVEREN?
                </th>
                <th className="py-2.5 px-3 text-right font-bold border-r border-slate-300 dark:border-slate-700 min-w-[110px]">
                  DİĞER VERGİ MATRAHI
                </th>
                <th className="py-2.5 px-3 text-right font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 min-w-[110px]">
                  TAHAKKUK (TL)
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 9} className="py-12 text-center text-slate-400 text-sm">
                    Bu okul veya ay için kayıtlı öğretmen bulunamadı.
                  </td>
                </tr>
              ) : (
                tableRows.map(({ teacher, rowData, daily, statuses, total, bonus, payable, payment, hasDuty, dutyDaily, dutyStatuses, dutyTotal, dutyPayment }) => (
                  <React.Fragment key={teacher.id}>
                    {/* 1. REGULAR LESSONS ROW */}
                    <tr className="hover:bg-blue-50/40 dark:hover:bg-slate-750 transition-colors group">
                      {/* Sticky Col 1: TC */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50">
                        {maskTc(teacher.tcNo)}
                      </td>

                      {/* Sticky Col 2: Name & Status */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 sticky left-[110px] z-10 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 truncate max-w-[160px]">
                        <div className="font-bold text-slate-900 dark:text-white">{teacher.fullName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <span>{teacher.branch || 'Öğretmen'}</span>
                          <span>•</span>
                          <span>
                            {teacher.employmentType === 'sozlesmeli'
                              ? 'Sözleşmeli'
                              : teacher.employmentType === 'stajyer' || teacher.employmentType === 'stajer'
                              ? 'Stajyer'
                              : 'Ücretli'}
                          </span>
                        </div>
                      </td>

                      {/* Days 1..N Cells */}
                      {daysMetadata.map(({ day, isWeekend, isWithinPeriod, dateStr }) => {
                        const val = daily[day];
                        const cellStatus = statuses[day] || (val !== null && val !== undefined && val > 0 ? 'confirmed' : undefined);
                        const isPlanned = cellStatus === 'planned';
                        const isEditing = editingCell?.teacherId === teacher.id && editingCell?.day === day && !editingCell?.isDuty;
                        const maasVal = rowData?.maasDailyHours?.[day];
                        const excessVal = rowData?.excessDailyHours?.[day];
                        const prepVal = rowData?.prepDailyHours?.[day];

                        return (
                          <td
                            key={day}
                            onClick={() => handleStartCellEdit(teacher.id, day, val, false)}
                            className={`py-1 px-0.5 text-center font-bold font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none transition-colors ${
                              !isWithinPeriod
                                ? 'bg-slate-100/70 dark:bg-slate-900/80 text-slate-400 opacity-60'
                                : isWeekend
                                ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                : ''
                            } ${
                              val !== null && val !== undefined && val > 0
                                ? isPlanned
                                  ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-b-2 border-b-blue-400'
                                  : 'bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-900 dark:text-white font-extrabold'
                                : cellStatus === 'tatil'
                                ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[10px]'
                                : val === 0
                                ? 'text-slate-400 bg-slate-50'
                                : 'text-transparent hover:text-slate-300'
                            }`}
                            title={
                              !isWithinPeriod
                                ? `Dönem dışı tarih (${dateStr})`
                                : cellStatus === 'tatil'
                                ? `Resmî Tatil (${dateStr})`
                                : val !== null && val !== undefined && val > 0
                                ? teacher.employmentType === 'sozlesmeli' && maasVal !== undefined && excessVal !== undefined
                                  ? `${teacher.fullName} (Gün ${day}): ${val} Saat (${maasVal} Sa Maaş + ${excessVal} Sa Ek Ders${prepVal ? ` + ${prepVal} Sa H/P` : ''})`
                                  : `Ders Saati: ${val} Saat (${teacher.fullName} - Gün ${day})`
                                : `Düzenle: ${teacher.fullName} - Gün ${day}`
                            }
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                autoFocus
                                value={cellInputValue}
                                onChange={(e) => setCellInputValue(e.target.value)}
                                onBlur={() => handleSaveCell(teacher.id, day, false)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCell(teacher.id, day, false);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full text-center py-0.5 font-bold font-mono text-xs rounded bg-blue-600 text-white outline-none"
                              />
                            ) : cellStatus === 'tatil' ? (
                              <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">TATİL</span>
                            ) : val !== null && val !== undefined ? (
                              <div>
                                <span>{val}</span>
                                {isPlanned && (
                                  <span className="block text-[8px] font-semibold text-blue-500 uppercase tracking-tighter leading-none">
                                    plan
                                  </span>
                                )}
                              </div>
                            ) : (
                              '·'
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="py-2 px-2 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 border-r border-slate-200 dark:border-slate-700">
                        {total}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/30 border-r border-slate-200 dark:border-slate-700">
                        {bonus > 0 ? `+${bonus}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 border-r border-slate-200 dark:border-slate-700">
                        {payable}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500 border-r border-slate-200 dark:border-slate-700">
                        {maskIbanStr(teacher.iban)}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                        {teacher.explanation || teacher.departureDate || '-'}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">
                        {teacher.hasOtherEmployer ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            EVET
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">HAYIR</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                        {teacher.hasOtherEmployer && teacher.otherEmployerTaxBase
                          ? formatTRY(teacher.otherEmployerTaxBase)
                          : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white bg-amber-50/30">
                        {formatTRY(payment)}
                      </td>
                    </tr>

                    {/* 2. SEPARATE DUTY ROW (Nöbet Görevi) */}
                    {hasDuty && (
                      <tr className="bg-indigo-50/25 dark:bg-indigo-950/20 border-b border-indigo-100/70 dark:border-indigo-900/40 hover:bg-indigo-50/40 transition-colors">
                        {/* Sticky Col 1: TC */}
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-400 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-indigo-50/30 dark:bg-slate-850">
                          <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                            NÖBET
                          </span>
                        </td>

                        {/* Sticky Col 2: Duty Label */}
                        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-700 sticky left-[110px] z-10 bg-indigo-50/30 dark:bg-slate-850 truncate max-w-[160px]">
                          <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] pl-2">
                            <span>↳ Nöbet Görevi</span>
                            {teacher.guardDutyDay && (
                              <span className="text-[10px] text-indigo-500/80 dark:text-indigo-400 font-normal">
                                ({DUTY_DAY_SHORT_LABELS[teacher.guardDutyDay]})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Days 1..N Duty Cells */}
                        {daysMetadata.map(({ day, isWeekend, isWithinPeriod, dateStr }) => {
                          const dutyVal = dutyDaily[day];
                          const dutyCellStatus = dutyStatuses[day] || (dutyVal !== null && dutyVal !== undefined && dutyVal > 0 ? 'confirmed' : undefined);
                          const isDutyPlanned = dutyCellStatus === 'planned';
                          const isEditingDuty = editingCell?.teacherId === teacher.id && editingCell?.day === day && editingCell?.isDuty;

                          return (
                            <td
                              key={day}
                              onClick={() => handleStartCellEdit(teacher.id, day, dutyVal, true)}
                              className={`py-1 px-0.5 text-center font-bold font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none transition-colors ${
                                !isWithinPeriod
                                  ? 'bg-slate-100/50 dark:bg-slate-900/60 text-slate-400 opacity-50'
                                  : isWeekend
                                  ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                  : ''
                              } ${
                                dutyVal !== null && dutyVal !== undefined && dutyVal > 0
                                  ? isDutyPlanned
                                    ? 'bg-purple-100/80 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-b-2 border-b-purple-400'
                                    : 'bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-black'
                                  : 'text-transparent hover:text-slate-300'
                              }`}
                              title={
                                !isWithinPeriod
                                  ? `Dönem dışı nöbet tarihi (${dateStr})`
                                  : isDutyPlanned
                                  ? `Planlanan Nöbet Saati (3 Saat) - Gün ${day}`
                                  : dutyVal
                                  ? `Nöbet Saati (${dutyVal} Saat) - Gün ${day}`
                                  : `Nöbet Düzenle: Gün ${day}`
                              }
                            >
                              {isEditingDuty ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellInputValue}
                                  onChange={(e) => setCellInputValue(e.target.value)}
                                  onBlur={() => handleSaveCell(teacher.id, day, true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCell(teacher.id, day, true);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full text-center py-0.5 font-bold font-mono text-xs rounded bg-purple-600 text-white outline-none"
                                />
                              ) : dutyVal !== null && dutyVal !== undefined && dutyVal > 0 ? (
                                <div>
                                  <span>{dutyVal}</span>
                                  {isDutyPlanned && (
                                    <span className="block text-[7px] font-semibold text-purple-600 uppercase tracking-tighter leading-none">
                                      nöbet
                                    </span>
                                  )}
                                </div>
                              ) : (
                                '·'
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Columns for Duty */}
                        <td className="py-1.5 px-2 text-center font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/30 border-r border-slate-200 dark:border-slate-700">
                          {dutyTotal}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-400 bg-slate-50/50 border-r border-slate-200 dark:border-slate-700 text-[11px]" title="Nöbet saatlerine ek ders ilavesi uygulanmaz">
                          —
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/40 border-r border-slate-200 dark:border-slate-700">
                          {dutyTotal}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[10px] text-slate-400 border-r border-slate-200 dark:border-slate-700">
                          —
                        </td>
                        <td className="py-1.5 px-3 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium border-r border-slate-200 dark:border-slate-700">
                          Haftalık Nöbet (3 Saat)
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-400 text-[10px] border-r border-slate-200 dark:border-slate-700">
                          —
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-400 text-[10px] border-r border-slate-200 dark:border-slate-700">
                          —
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-50/40">
                          {formatTRY(dutyPayment)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>

            {/* Table Footer: Column Totals */}
            {tableRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-900 font-extrabold border-t-2 border-slate-300 dark:border-slate-700">
                <tr className="text-slate-900 dark:text-white">
                  <td className="py-3 px-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700">
                    GENEL TOPLAM
                  </td>
                  <td className="py-3 px-3 sticky left-[110px] z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 text-slate-500 font-normal">
                    {tableRows.length} Öğretmen
                  </td>

                  {/* Daily Totals */}
                  {dailyColumnTotals.map((colTotal, idx) => (
                    <td
                      key={idx}
                      className="py-2 px-0.5 text-center font-mono text-[10px] border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300"
                    >
                      {colTotal > 0 ? colTotal : ''}
                    </td>
                  ))}

                  <td className="py-3 px-2 text-center font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 border-r border-slate-300">
                    {grandTotalActual}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100/50 border-r border-slate-300">
                    {grandTotalBonus}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 border-r border-slate-300">
                    {grandTotalPayable}
                  </td>
                  <td colSpan={4} className="py-3 px-3 border-r border-slate-300 text-right text-xs text-slate-500">
                    Tahakkuk Eden Toplam Net Tutar:
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white bg-amber-100/50">
                    {formatTRY(grandTotalPayment)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              PLAN
            </span>
            <span>Haftalık Programdan Planlanan (Doğrulama bekliyor)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-700 flex items-center justify-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              ✓
            </span>
            <span>Doğrulanmış Fiili Ders Saati</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700"></span>
            <span>Hafta Sonu</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          * Hücreye tıklayarak ders saatini güncelleyebilirsiniz.
        </div>
      </div>

      {/* Admin Period Manager Modal */}
      <AdminPeriodManagerModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        year={selectedYear}
        month={selectedMonth}
      />
    </div>
  );
};

