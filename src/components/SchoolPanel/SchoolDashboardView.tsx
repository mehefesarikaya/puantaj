import React from 'react';
import {
  Building2,
  Users,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  FileSpreadsheet,
  Lock,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { School } from '../../types';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';
import { calculateMonthlyPuantajTotals } from '../../utils/additionalTeachingCalculator';
import { syncTeacherScheduleToMonth } from '../../utils/schedulePuantajSync';

export const SchoolDashboardView: React.FC = () => {
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
    setActiveTab,
    submitPuantajToAdmin,
    getTimesheetPeriod,
  } = useApp();

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';
  const currentPeriod = getTimesheetPeriod(selectedYear, selectedMonth);

  // Safe fallback school if schools list is empty or school record not found
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

  // Get active school of this logged in school user safely
  const school = (currentUser?.schoolId ? schools.find((s) => s.id === currentUser.schoolId) : null) || schools[0] || fallbackSchool;
  const schoolTeachers = teachers; // already scoped by schoolId in context

  // Puantaj for this school and period
  const schoolPuantaj = puantajRows.filter(
    (p) => p.schoolId === school?.id && p.year === selectedYear && p.month === selectedMonth
  );

  const totalTeachingHours = schoolPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
  const totalBonusHours = schoolPuantaj.reduce((acc, p) => acc + (p.bonusFiveToOneHours || 0), 0);
  const totalPayableHours = schoolPuantaj.reduce((acc, p) => acc + (p.payableTotalHours || 0), 0);
  const totalPayment = schoolPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

  // Submission status for this month
  const sub = submissions.find(
    (s) => s.schoolId === school?.id && s.year === selectedYear && s.month === selectedMonth
  );

  const status = sub?.status || 'taslak';
  const isLocked = status === 'onaylandi' || status === 'incelemede';

  const handleSubmitPuantaj = () => {
    if (confirm(`${monthName} ${selectedYear} puantaj cetvelini İlçe Milli Eğitim Müdürlüğü onayına göndermek istediğinizden emin misiniz?`)) {
      submitPuantajToAdmin(school?.id || '', selectedYear, selectedMonth, 'Okul personeli tarafından teslim edildi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Kolay Ekders Kurum Paneli</span>
              <span>•</span>
              <span>{monthName} {selectedYear} Dönemi</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{school?.name || 'Kurum'}</h2>
            <p className="text-blue-100 text-xs mt-1">
              Kurum Kodu: <strong>{school?.institutionCode || '-'}</strong> • Okul Müdürü: {school?.principalName || '-'} • {school?.district || '-'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isLocked ? (
              <button
                onClick={handleSubmitPuantaj}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Yönetici Onayına Gönder</span>
              </button>
            ) : status === 'onaylandi' ? (
              <div className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>İlçe MEM Onayladı (Kilitli)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-4 py-2 bg-blue-100 text-blue-900 rounded-xl text-xs font-bold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>İlçe MEM İncelemesinde</span>
              </div>
            )}

            <button
              onClick={() => setActiveTab('puantaj')}
              className="px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Puantaj Tablosuna Git</span>
            </button>
          </div>
        </div>
      </div>

      {/* Correction Requested Alert (if admin requested correction) */}
      {status === 'duzeltme_istendi' && sub?.correctionNotes && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start space-x-3 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-sm block mb-1">
              İlçe MEM Düzeltme Talebi Bulunmaktadır!
            </span>
            <p className="leading-relaxed bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-700/60">
              {sub.correctionNotes}
            </p>
            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('puantaj')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-sm"
              >
                Puantajı Düzenle
              </button>
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                Gerekli düzenlemeleri yaptıktan sonra tekrar "Yönetici Onayına Gönder" butonuna basınız.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teachers */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Okul Görevli Sayısı
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {schoolTeachers.length} <span className="text-xs font-normal text-slate-400">personel</span>
          </h3>
          <p className="text-[11px] text-purple-600 mt-1">Ücretli ve usta öğreticiler</p>
        </div>

        {/* Total Actual Lesson Hours */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {monthName} Fiili Ders Saati
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalTeachingHours} <span className="text-xs font-normal text-slate-400">saat</span>
          </h3>
          <p className="text-[11px] text-emerald-600 mt-1">Girilen fiili ders saati toplamı</p>
        </div>

        {/* Payable Hours */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ödenecek Toplam Saat
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-blue-600">
            {totalPayableHours} <span className="text-xs font-normal text-slate-400">saat</span>
          </h3>
          <p className="text-[11px] text-blue-500 mt-1">+{totalBonusHours} saat 5'e 1 ilavesi dahil</p>
        </div>

        {/* Total Net Payment */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tahakkuk Eden Tutar
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {formatTRY(totalPayment)}
          </h3>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">{monthName} ayı okul bütçesi</p>
        </div>
      </div>

      {/* Teachers Summary List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {school?.name || 'Kurum'} – Görevli Öğretmen ve Personel Durumu
            </h3>
            <p className="text-xs text-slate-500">
              {monthName} {selectedYear} dönemi için kayıtlı {schoolTeachers.length} personelin ders icmali.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('teachers')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>Öğretmenleri Yönet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">T.C. Kimlik No</th>
                <th className="py-2.5 px-3">Adı Soyadı</th>
                <th className="py-2.5 px-3">Açıklama / Branş</th>
                <th className="py-2.5 px-3 text-center">Fiili Saat</th>
                <th className="py-2.5 px-3 text-center">5'e 1 İlave</th>
                <th className="py-2.5 px-3 text-center">Ödenecek Saat</th>
                <th className="py-2.5 px-3 text-right">Tahakkuk Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {schoolTeachers.map((teacher) => {
                const row = schoolPuantaj.find((p) => p.teacherId === teacher.id);
                const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
                const effectiveRow = schedule
                  ? syncTeacherScheduleToMonth({
                      teacher,
                      schedule,
                      year: selectedYear,
                      month: selectedMonth,
                      existingRow: row,
                      periodStartDate: currentPeriod.startDate,
                      periodEndDate: currentPeriod.endDate,
                      rules,
                    }).updatedRow
                  : row;

                const actual = effectiveRow ? effectiveRow.totalHours : 0;
                const bonus = effectiveRow ? effectiveRow.bonusFiveToOneHours : 0;
                const payable = effectiveRow ? effectiveRow.payableTotalHours : actual;
                const amount = effectiveRow ? effectiveRow.estimatedPayment : payable * teacher.hourlyRate;

                return (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                      {teacher.tcNo}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                      {teacher.fullName}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
                      {teacher.explanation || teacher.branch}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                      {actual} sa
                    </td>
                    <td className="py-2.5 px-3 text-center text-blue-600">
                      +{bonus}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-indigo-600">
                      {payable} sa
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatTRY(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

