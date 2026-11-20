import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
  User,
  ShieldCheck,
  Send,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubmissionStatus, Teacher } from '../../types';
import { MONTH_NAMES_TR, getDaysInMonth } from '../../utils/excelPuantajUtils';
import { formatTRY, calculateTeacherPayment } from '../../utils/paymentCalculator';
import { syncTeacherScheduleToMonth } from '../../utils/schedulePuantajSync';

export const MonthlyReviewView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    weeklySchedules,
    submissions,
    rules,
    selectedYear,
    selectedMonth,
    selectedSchoolId,
    setSelectedSchoolId,
    updateSubmissionStatus,
    maskSensitiveData,
    getTimesheetPeriod,
  } = useApp();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Active school
  const currentSchool = schools.find((s) => s.id === selectedSchoolId) || schools[0];
  const effectiveSchoolId = currentSchool?.id || '';

  // Submission record for this school & period
  const submission = submissions.find(
    (s) => s.schoolId === effectiveSchoolId && s.year === selectedYear && s.month === selectedMonth
  );

  const status: SubmissionStatus = submission?.status || 'bekleniyor';

  // Teachers of this school
  const schoolTeachers = teachers.filter((t) => t.schoolId === effectiveSchoolId);

  // Filter teachers for detailed view
  const visibleTeachers = selectedTeacherId === 'all'
    ? schoolTeachers
    : schoolTeachers.filter((t) => t.id === selectedTeacherId);

  // Analyze missing / incomplete records
  const teachersWithIssues = schoolTeachers.filter((t) => {
    const row = puantajRows.find(
      (p) => p.teacherId === t.id && p.year === selectedYear && p.month === selectedMonth
    );
    if (!row) return true;
    // Check if total hours is 0 or less than 10
    return row.totalHours <= 0;
  });

  const handleApprove = () => {
    const targetName = currentSchool?.name || 'Seçili okul';
    if (confirm(`${targetName} okulunun ${monthName} ${selectedYear} puantajını ONAYLAMAK istediğinizden emin misiniz?`)) {
      updateSubmissionStatus(effectiveSchoolId, selectedYear, selectedMonth, 'onaylandi', 'İlçe MEM tarafından onaylandı.');
    }
  };

  const handleSendToReview = () => {
    updateSubmissionStatus(effectiveSchoolId, selectedYear, selectedMonth, 'incelemede', 'İnceleme başlatıldı.');
  };

  const handleRejectConfirm = () => {
    if (!rejectionNote.trim()) {
      alert('Lütfen düzeltme talebi gerekçesini yazınız.');
      return;
    }
    updateSubmissionStatus(
      effectiveSchoolId,
      selectedYear,
      selectedMonth,
      'duzeltme_istendi',
      'İlçe MEM tarafından düzeltme talep edildi.',
      rejectionNote.trim()
    );
    setIsRejectModalOpen(false);
    setRejectionNote('');
    alert('Düzeltme talebi okul personeline iletildi. Okul puantajı güncelleyip tekrar onaya sunacaktır.');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Aylık Puantaj Kayıt Kontrolü ve Onay Merkezi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Okulların sunduğu puantaj kayıtlarını denetleyin, eksik saatleri tespit edin, onaylayın veya gerekçe ile iade edin.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">Mevcut Durum:</span>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${
              status === 'onaylandi'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : status === 'incelemede'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                : status === 'eksik_veri'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : status === 'reddedildi'
                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* School & Teacher Selector Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* School picker */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
            <Building className="w-4 h-4 text-blue-600" />
            <select
              value={effectiveSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher picker */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
            <User className="w-4 h-4 text-purple-600" />
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Tüm Öğretmenler ({schoolTeachers.length} Kişi)</option>
              {schoolTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Review Action Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <button
            onClick={handleSendToReview}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-semibold transition-colors"
          >
            İncelemeye Al
          </button>

          <button
            onClick={() => setIsRejectModalOpen(true)}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Reddet / İade Et
          </button>

          <button
            onClick={handleApprove}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Puantajı Onayla</span>
          </button>
        </div>
      </div>

      {/* Issues or Warnings Box */}
      {teachersWithIssues.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start space-x-3 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Eksik Veri / Ders Girişi Uyarısı</span>
            <p className="leading-relaxed">
              Bu okulda kayıtlı <strong>{teachersWithIssues.map((t) => t.fullName).join(', ')}</strong> için bu ay hiç ders saati girilmemiş veya puantaj eksik görünüyor. Onaylamadan önce kontrol ediniz.
            </p>
          </div>
        </div>
      )}

      {/* Submission Notes & Details */}
      {submission?.notes && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start space-x-3 text-xs">
          <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
              İdareci / Komisyon Notu:
            </span>
            <p className="text-slate-600 dark:text-slate-400">{submission.notes}</p>
          </div>
        </div>
      )}

      {/* Teachers Detailed Verification List */}
      <div className="space-y-4">
        {visibleTeachers.map((teacher) => {
          const rowData = puantajRows.find(
            (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
          );
          const schedule = weeklySchedules.find((s) => s.teacherId === teacher.id);
          const currentPeriod = getTimesheetPeriod(selectedYear, selectedMonth);
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
          const totalActual = effectiveRow ? effectiveRow.totalHours : 0;
          const breakdown = calculateTeacherPayment(teacher, totalActual, rules);

          return (
            <div
              key={teacher.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4"
            >
              {/* Teacher Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {teacher.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {teacher.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      TC: {teacher.tcNo} • IBAN: {teacher.iban}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {teacher.explanation || teacher.employmentType.replace('_', ' ')}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Tahakkuk Eden Tutar</span>
                    <span className="font-bold text-sm text-emerald-600">
                      {formatTRY(breakdown.netPayment)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 31 Days Visual Mini Matrix */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  {monthName} {selectedYear} Günlük Ders Dağılımı (1 - {daysInMonth} Gün)
                </span>
                <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1 text-center font-mono">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const h = daily[d];
                    const dateObj = new Date(selectedYear, selectedMonth - 1, d);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    return (
                      <div
                        key={d}
                        className={`p-1 rounded border text-[11px] ${
                          h !== null && h !== undefined && h > 0
                            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                            : isWeekend
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-slate-400 border-amber-200/50'
                            : 'bg-slate-50 dark:bg-slate-700/30 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="text-[9px] opacity-75 font-normal">{d}</div>
                        <div className="font-extrabold">{h !== null && h !== undefined ? h : '-'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calculation Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-slate-750 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Fiili Ders Saati</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{breakdown.totalActualHours} saat</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">İlave Ek Ders</span>
                  <span className="font-bold text-blue-600">+{breakdown.bonusHours} saat</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Ödenecek Toplam</span>
                  <span className="font-extrabold text-indigo-600">{breakdown.payableTotalHours} saat</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Vergi Kesintisi</span>
                  <span className="font-bold text-rose-500">
                    -{formatTRY(breakdown.incomeTaxAmount + breakdown.stampTaxAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Net Ödeme</span>
                  <span className="font-black text-emerald-600">{formatTRY(breakdown.netPayment)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Puantajı İade Et / Reddet
            </h3>
            <p className="text-xs text-slate-500">
              Okul yönetimine iletilecek eksiklik veya hata gerekçesini belirtin:
            </p>
            <textarea
              rows={3}
              required
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Örn: 15-20 Ekim arası usta öğretici ders saatleri girilmemiş, düzeltiniz..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow"
              >
                Reddet ve İade Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

