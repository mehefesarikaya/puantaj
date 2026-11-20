import React, { useState, useEffect, useMemo } from 'react';
import {
  TableProperties,
  Download,
  FileSpreadsheet,
  Printer,
  Send,
  Save,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Building,
  RefreshCw,
  Check,
  Calendar,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { School } from '../../types';
import {
  MONTH_NAMES_TR,
  getDaysInMonth,
  downloadOriginalMonthlyTemplate,
  exportMonthlyPuantajToExcel,
} from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';
import { calculateMonthlyPuantajTotals } from '../../utils/additionalTeachingCalculator';
import { syncTeacherScheduleToMonth } from '../../utils/schedulePuantajSync';

const DUTY_DAY_OPTIONS = [
  { value: '', label: 'Nöbet Yok' },
  { value: '1', label: 'Pazartesi' },
  { value: '2', label: 'Salı' },
  { value: '3', label: 'Çarşamba' },
  { value: '4', label: 'Perşembe' },
  { value: '5', label: 'Cuma' },
  { value: '6', label: 'Cumartesi' },
  { value: '7', label: 'Pazar' },
];

const DUTY_DAY_SHORT_LABELS: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi',
  7: 'Pazar',
};

export const SchoolPuantajEntryView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    weeklySchedules,
    rules,
    submissions,
    selectedYear,
    selectedMonth,
    currentUser,
    updateDailyHour,
    updateDutyDailyHour,
    setTeacherGuardDutyDay,
    savePuantajAsDraft,
    submitPuantajToAdmin,
    syncAllSchedulesToTimesheet,
    confirmAllPlannedForMonth,
    getTimesheetPeriod,
    maskSensitiveData,
  } = useApp();

  const [editingCell, setEditingCell] = useState<{ teacherId: string; day: number; isDuty?: boolean } | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Period configured by admin
  const period = getTimesheetPeriod(selectedYear, selectedMonth);
  const isPeriodClosed = period.status === 'kapali';

  // Safe fallback school
  const fallbackSchool: School = {
    id: currentUser?.schoolId || 'default-school',
    institutionCode: currentUser?.username || '000000',
    name: currentUser?.fullName ? currentUser.fullName.replace(' Yetkilisi', '') : 'Kurum',
    province: 'Ankara',
    district: 'İlçe / İl',
    schoolType: 'Okul',
    principalName: '',
    contactPhone: '',
    contactEmail: '',
    generalDirectorate: 'Temel Eğitim Genel Müdürlüğü',
    accountActive: true,
    isActive: true,
  };

  // School belonging to this user
  const school = (currentUser?.schoolId ? schools.find((s) => s.id === currentUser.schoolId) : null) || schools[0] || fallbackSchool;
  const schoolTeachers = teachers; // strictly scoped

  // Submission status
  const sub = submissions.find(
    (s) => s.schoolId === school?.id && s.year === selectedYear && s.month === selectedMonth
  );

  const status = sub?.status || 'taslak';
  const isLocked = status === 'onaylandi' || status === 'incelemede';

  // Day metadata (1..N days) with period date-range check (memoized)
  const daysMetadata = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayNameShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][dayOfWeek];
      const mStr = String(selectedMonth).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${mStr}-${dStr}`;
      const isWithinPeriod =
        (!period.startDate || dateStr >= period.startDate) &&
        (!period.endDate || dateStr <= period.endDate);

      return { day, isWeekend, dayNameShort, dateStr, isWithinPeriod };
    });
  }, [daysInMonth, selectedYear, selectedMonth, period.startDate, period.endDate]);

  // Table rows with duty details (memoized)
  const tableRows = useMemo(() => {
    return schoolTeachers.map((teacher) => {
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
            periodStartDate: period.startDate,
            periodEndDate: period.endDate,
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
  }, [schoolTeachers, puantajRows, weeklySchedules, selectedYear, selectedMonth, period.startDate, period.endDate, rules]);

  // Puantaj Raporu açıldığında haftalık ders programını ayın tamamına yay ve veritabanına otomatik kaydet
  useEffect(() => {
    if (!isLocked && !isPeriodClosed && school?.id) {
      syncAllSchedulesToTimesheet(school.id, selectedYear, selectedMonth, true);
    }
  }, [school?.id, selectedYear, selectedMonth, isLocked, isPeriodClosed]);

  // Grand totals
  const grandTotalActual = tableRows.reduce((acc, r) => acc + r.total, 0);
  const grandTotalBonus = tableRows.reduce((acc, r) => acc + r.bonus, 0);
  const grandTotalPayable = tableRows.reduce((acc, r) => acc + r.payable, 0);
  const grandTotalPayment = tableRows.reduce((acc, r) => acc + r.payment, 0);

  // Column totals combining regular and duty hours
  const dailyColumnTotals = daysMetadata.map(({ day }) => {
    return tableRows.reduce((acc, r) => {
      const reg = r.daily[day] || 0;
      return acc + reg;
    }, 0);
  });

  const handleStartCellEdit = (
    teacherId: string,
    day: number,
    currentVal: number | null | undefined,
    isDuty: boolean = false
  ) => {
    if (isPeriodClosed) {
      alert(`${monthName} ${selectedYear} puantaj dönemi kapalıdır. İlçe MEM yöneticisi tarafından veri girişi durdurulmuştur.`);
      return;
    }
    if (isLocked) {
      alert('Bu ayın puantaj cetveli onaylanmış veya incelemede olduğu için düzenlemeye kilitlidir.');
      return;
    }

    const dayMeta = daysMetadata[day - 1];
    if (dayMeta && !dayMeta.isWithinPeriod) {
      alert(
        `Bu tarih (${dayMeta.dateStr}), İlçe MEM yöneticisi tarafından belirlenen puantaj aralığı (${period.startDate} - ${period.endDate}) dışındadır.`
      );
      return;
    }

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

  const handleSaveDraft = () => {
    if (isPeriodClosed) {
      alert('Puantaj dönemi kapalı olduğu için taslak kaydedilemez.');
      return;
    }
    savePuantajAsDraft(school.id, selectedYear, selectedMonth);
    setSyncNotification('Puantaj cetveli taslak olarak kaydedildi.');
    setTimeout(() => setSyncNotification(null), 3500);
  };

  const handleSyncFromSchedule = () => {
    if (isPeriodClosed) {
      alert('Puantaj dönemi kapalı olduğu için program aktarımı yapılamaz.');
      return;
    }
    if (isLocked) {
      alert('Kilitli puantaj cetveline program aktarımı yapılamaz.');
      return;
    }
    syncAllSchedulesToTimesheet(school.id, selectedYear, selectedMonth);
    setSyncNotification('Haftalık ders programı bu ayın puantaj cetveline başarıyla aktarıldı (Belirlenen tarih sınırları ve doğrulanmış saatler korundu).');
    setTimeout(() => setSyncNotification(null), 4000);
  };

  const handleConfirmAllPlanned = () => {
    if (isPeriodClosed) {
      alert('Puantaj dönemi kapalı olduğu için işlem yapılamaz.');
      return;
    }
    if (isLocked) {
      alert('Kilitli puantaj cetvelinde işlem yapılamaz.');
      return;
    }
    if (confirm('Ders programından aktarılan tüm planlanan saatler fiili gerçekleşen ders olarak onaylansın mı?')) {
      confirmAllPlannedForMonth(school.id, selectedYear, selectedMonth);
      setSyncNotification('Tüm planlanan ders saatleri fiili gerçekleşen ders olarak onaylandı.');
      setTimeout(() => setSyncNotification(null), 4000);
    }
  };

  const handleSubmitToAdmin = () => {
    if (isPeriodClosed) {
      alert('Puantaj dönemi kapalı olduğu için onaya gönderilemez.');
      return;
    }
    if (confirm(`${monthName} ${selectedYear} puantaj cetvelini İlçe MEM onayına göndermek istediğinizden emin misiniz?`)) {
      submitPuantajToAdmin(school.id, selectedYear, selectedMonth, 'Okul personeli tarafından onaylandı ve sunuldu.');
    }
  };

  const handleExportExcel = () => {
    const exportData = tableRows.map((r) => ({
      teacher: r.teacher,
      dailyHours: r.daily,
      totalHours: r.total,
    }));
    exportMonthlyPuantajToExcel(school?.name || 'Kurum', selectedYear, selectedMonth, exportData);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <TableProperties className="w-4 h-4" />
            <span>{school?.name || 'Kurum'} – {monthName.toUpperCase()} {selectedYear}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Aylık Ders Saatleri Puantaj Raporu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Öğretmenlerinizin ayın her gününe ait fiili ders ve nöbet saatlerini giriniz. Toplam ve tahakkuk otomatik hesaplanır.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isLocked && (
            <>
              <button
                onClick={handleSyncFromSchedule}
                disabled={isPeriodClosed}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isPeriodClosed
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
                title="Haftalık ders programındaki dersleri puantaj cetveline tekrar senkronize eder"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Programı Yenile</span>
              </button>

              <button
                onClick={handleConfirmAllPlanned}
                disabled={isPeriodClosed}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isPeriodClosed
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                }`}
                title="Programdan aktarılan tüm planlanan dersleri tek tıkla fiili gerçekleşen ders olarak onaylar"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Planlananları Onayla</span>
              </button>

              <button
                onClick={handleSubmitToAdmin}
                disabled={isPeriodClosed}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow transition-all ${
                  isPeriodClosed
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Yönetici Onayına Sun</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel'e Aktar</span>
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

      {/* Permitted Date Range & Period Status Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-2xl border text-xs gap-3 shadow-sm bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border-blue-100 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-white">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Yetkili Puantaj Giriş Aralığı:</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-blue-700 dark:text-blue-300">
            {period.startDate} → {period.endDate}
          </div>

          <div>
            {isPeriodClosed ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-[11px] border border-rose-300 dark:border-rose-700">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Puantaj Dönemi Kapalı (Girişe Kilitli)</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-700">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dönem Açık (Veri Girişi Aktif)</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          * Tarih sınırları İlçe MEM yöneticisi tarafından belirlenir; okul tarafından değiştirilemez.
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncNotification && (
        <div className="flex items-center space-x-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 font-medium">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{syncNotification}</span>
        </div>
      )}

      {/* Lock / Approval Status Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-2xl border text-xs gap-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2">
          {isLocked ? (
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Puantaj Kilitli: {status === 'onaylandi' ? 'İlçe MEM Tarafından Onaylandı' : 'İnceleme Sürecinde'}</span>
            </div>
          ) : status === 'duzeltme_istendi' ? (
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Düzeltme İstenmiş (Düzenlemeye Açık)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300 font-bold">
              <Unlock className="w-4 h-4 text-blue-600" />
              <span>Taslak Aşamasında (Ders saatlerini hücrelere tıklayarak yazabilirsiniz)</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-500">
          <span>* Hücreye tıklayıp ders saatini yazıp Enter'a basınız.</span>
        </div>
      </div>

      {/* CORE 31-DAY EXCEL TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700">
              <tr>
                <th
                  colSpan={2 + daysInMonth + 7}
                  className="py-2.5 px-4 text-center font-bold text-xs uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700"
                >
                  {school?.name ? school.name.toUpperCase() : 'KURUM'} - {monthName.toUpperCase()} {selectedYear} DÖNEMİ DERS SAATLERİ PUANTAJI
                </th>
              </tr>

              <tr className="text-slate-600 dark:text-slate-300 text-[11px]">
                <th className="py-2.5 px-3 font-bold border-r border-slate-300 dark:border-slate-700 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 min-w-[110px]">
                  T.C. KİMLİK NO
                </th>
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
                    title={!isWithinPeriod ? `Bu tarih (${dateStr}) belirlenen puantaj dönemi dışındadır.` : undefined}
                  >
                    <div className="text-[11px] leading-tight font-extrabold">{day}</div>
                    <div className="text-[8px] font-normal text-slate-400">{dayNameShort}</div>
                  </th>
                ))}

                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 bg-emerald-100/60 text-emerald-900 min-w-[50px]">
                  TOPLAM SAAT
                </th>
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 bg-blue-100/60 text-blue-900 min-w-[45px]">
                  İlave (2+1)
                </th>
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-300 dark:border-slate-700 bg-indigo-100/60 text-indigo-900 min-w-[55px]">
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
                <th className="py-2.5 px-3 text-right font-bold bg-amber-50 text-amber-900 min-w-[110px]">
                  TAHAKKUK (TL)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 9} className="py-12 text-center text-slate-400">
                    Okulunuza kayıtlı öğretmen bulunmamaktadır. "Öğretmenler" menüsünden öğretmen ekleyebilirsiniz.
                  </td>
                </tr>
              ) : (
                tableRows.map(({ teacher, rowData, daily, statuses, total, bonus, payable, payment, hasDuty, dutyDaily, dutyStatuses, dutyTotal, dutyPayment }) => (
                  <React.Fragment key={teacher.id}>
                    {/* 1. REGULAR LESSONS ROW */}
                    <tr className="hover:bg-blue-50/40 dark:hover:bg-slate-750 transition-colors group">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50">
                        {maskSensitiveData && teacher.tcNo && teacher.tcNo.length >= 5
                          ? `${teacher.tcNo.slice(0, 3)}*****${teacher.tcNo.slice(-2)}`
                          : teacher.tcNo}
                      </td>

                      {/* Sticky Col 2: Name + Quick Nöbet Günü Selector */}
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 sticky left-[110px] z-10 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 truncate max-w-[170px]">
                        <div className="font-bold text-slate-900 dark:text-white">{teacher.fullName}</div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="text-[10px] text-slate-400 font-medium">Nöbet:</span>
                          <select
                            value={teacher.guardDutyDay || ''}
                            disabled={isLocked || isPeriodClosed}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              setTeacherGuardDutyDay(teacher.id, val);
                            }}
                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 focus:outline-none"
                            title="Öğretmenin nöbet tuttuğu günü seçiniz (Günde 3 saat ek ders yazılır)"
                          >
                            {DUTY_DAY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Days Cells */}
                      {daysMetadata.map(({ day, isWeekend, isWithinPeriod, dateStr }) => {
                        const val = daily[day];
                        const cellStatus = statuses[day] || (val !== null && val !== undefined && val > 0 ? 'confirmed' : undefined);
                        const isPlanned = cellStatus === 'planned';
                        const isEditing = editingCell?.teacherId === teacher.id && editingCell?.day === day && !editingCell?.isDuty;
                        const canEditCell = !isLocked && !isPeriodClosed && isWithinPeriod;
                        const maasVal = rowData?.maasDailyHours?.[day];
                        const excessVal = rowData?.excessDailyHours?.[day];
                        const prepVal = rowData?.prepDailyHours?.[day];

                        return (
                          <td
                            key={day}
                            onClick={() => canEditCell && handleStartCellEdit(teacher.id, day, val, false)}
                            className={`py-1 px-0.5 text-center font-bold font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors ${
                              canEditCell ? 'cursor-pointer' : 'cursor-not-allowed'
                            } ${
                              !isWithinPeriod
                                ? 'bg-slate-100/70 dark:bg-slate-900/80 text-slate-400 opacity-40'
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
                                ? `Tarih puantaj dönemi dışındadır (${dateStr})`
                                : cellStatus === 'tatil'
                                ? `Resmî Tatil (${dateStr})`
                                : val !== null && val !== undefined && val > 0
                                ? teacher.employmentType === 'sozlesmeli' && maasVal !== undefined && excessVal !== undefined
                                  ? `${teacher.fullName} (Gün ${day}): ${val} Saat (${maasVal} Sa Maaş + ${excessVal} Sa Ek Ders${prepVal ? ` + ${prepVal} Sa H/P` : ''})`
                                  : isPlanned
                                  ? `Planlanan Ders: ${val} Saat (${teacher.fullName} - Gün ${day})`
                                  : `Fiili Ders: ${val} Saat (${teacher.fullName} - Gün ${day})`
                                : undefined
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
                            ) : !isWithinPeriod ? (
                              <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                            ) : (
                              '·'
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2 px-2 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 border-r border-slate-200">
                        {total}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/30 border-r border-slate-200">
                        {bonus > 0 ? `+${bonus}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 border-r border-slate-200">
                        {payable}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500 border-r border-slate-200">
                        {maskSensitiveData && teacher.iban && teacher.iban.length >= 10
                          ? `${teacher.iban.slice(0, 4)} **** ${teacher.iban.slice(-4)}`
                          : teacher.iban}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200">
                        {teacher.explanation || teacher.departureDate || '-'}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        {teacher.hasOtherEmployer ? 'EVET' : 'HAYIR'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
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
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-400 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-indigo-50/30 dark:bg-slate-850">
                          <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                            NÖBET
                          </span>
                        </td>

                        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-700 sticky left-[110px] z-10 bg-indigo-50/30 dark:bg-slate-850 truncate max-w-[170px]">
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
                          const canEditDutyCell = !isLocked && !isPeriodClosed && isWithinPeriod;

                          return (
                            <td
                              key={day}
                              onClick={() => canEditDutyCell && handleStartCellEdit(teacher.id, day, dutyVal, true)}
                              className={`py-1 px-0.5 text-center font-bold font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors ${
                                canEditDutyCell ? 'cursor-pointer' : 'cursor-not-allowed'
                              } ${
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
                              ) : !isWithinPeriod ? (
                                <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                              ) : (
                                '·'
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Columns for Duty */}
                        <td className="py-1.5 px-2 text-center font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/30 border-r border-slate-200">
                          {dutyTotal}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-400 bg-slate-50/50 border-r border-slate-200 text-[11px]" title="Nöbet saatlerine ek ders ilavesi uygulanmaz">
                          —
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/40 border-r border-slate-200">
                          {dutyTotal}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[10px] text-slate-400 border-r border-slate-200">
                          —
                        </td>
                        <td className="py-1.5 px-3 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium border-r border-slate-200">
                          Haftalık Nöbet (3 Saat)
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-400 text-[10px] border-r border-slate-200">
                          —
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-400 text-[10px] border-r border-slate-200">
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

            {tableRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-900 font-extrabold border-t-2 border-slate-300">
                <tr className="text-slate-900 dark:text-white">
                  <td className="py-3 px-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-300">
                    TOPLAM
                  </td>
                  <td className="py-3 px-3 sticky left-[110px] z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 text-slate-500 font-normal">
                    {tableRows.length} Öğretmen
                  </td>

                  {dailyColumnTotals.map((colTotal, idx) => (
                    <td
                      key={idx}
                      className="py-2 px-0.5 text-center font-mono text-[10px] border-r border-slate-200 text-blue-700 dark:text-blue-300"
                    >
                      {colTotal > 0 ? colTotal : ''}
                    </td>
                  ))}

                  <td className="py-3 px-2 text-center font-mono font-black text-emerald-700 bg-emerald-100/50 border-r border-slate-300">
                    {grandTotalActual}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-blue-700 bg-blue-100/50 border-r border-slate-300">
                    {grandTotalBonus}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-black text-indigo-700 bg-indigo-100/50 border-r border-slate-300">
                    {grandTotalPayable}
                  </td>
                  <td colSpan={4} className="py-3 px-3 border-r border-slate-300 text-right text-xs text-slate-500">
                    Okul Tahakkuk Toplamı:
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
            <span className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-400 dark:border-indigo-700 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              3
            </span>
            <span>Nöbet Görevi (3 Saat)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700"></span>
            <span>Hafta Sonu</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-500 font-bold">
              —
            </span>
            <span>Dönem Dışı (Giriş Kilitli)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          * Ders saatine tıklayarak doğrudan düzenleme yapabilirsiniz.
        </div>
      </div>
    </div>
  );
};

