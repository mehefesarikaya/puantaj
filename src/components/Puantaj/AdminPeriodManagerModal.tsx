import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  X,
  Save,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimesheetPeriod, TimesheetPeriodStatus } from '../../types';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';

interface AdminPeriodManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
}

export const AdminPeriodManagerModal: React.FC<AdminPeriodManagerModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
}) => {
  const {
    schools,
    submissions,
    getTimesheetPeriod,
    saveTimesheetPeriod,
    setSelectedYear,
    setSelectedMonth,
  } = useApp();

  const [targetYear, setTargetYear] = useState<number>(year);
  const [targetMonth, setTargetMonth] = useState<number>(month);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<TimesheetPeriodStatus>('acik');
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'settings' | 'submissions'>('settings');

  // Load period data whenever targetYear or targetMonth changes
  useEffect(() => {
    if (isOpen) {
      setTargetYear(year);
      setTargetMonth(month);
      const period = getTimesheetPeriod(year, month);
      setStartDate(period.startDate);
      setEndDate(period.endDate);
      setStatus(period.status);
      setNotes(period.notes || '');
    }
  }, [isOpen, year, month]);

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    setTargetYear(newYear);
    setTargetMonth(newMonth);
    const period = getTimesheetPeriod(newYear, newMonth);
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setStatus(period.status);
    setNotes(period.notes || '');
  };

  if (!isOpen) return null;

  // Check submissions for this period
  const submittedSchools = submissions.filter(
    (s) => s.year === targetYear && s.month === targetMonth
  );

  const lockedSubmissionsCount = submittedSchools.filter(
    (s) => s.status === 'onaylandi' || s.status === 'gonderildi' || s.status === 'incelemede'
  ).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      alert('Lütfen geçerli bir başlangıç ve bitiş tarihi giriniz.');
      return;
    }

    if (startDate > endDate) {
      alert('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
      return;
    }

    // Confirmation warning if submitted records exist
    if (lockedSubmissionsCount > 0) {
      const confirmChange = window.confirm(
        `DİKKAT: ${targetMonth}. Ay (${targetYear}) dönemine ait ${lockedSubmissionsCount} kurumun teslim edilmiş veya onaylanmış puantajı bulunmaktadır.\n\nTarih aralığını veya durumunu değiştirmek istediğinize emin misiniz?`
      );
      if (!confirmChange) return;
    }

    const updatedPeriod: TimesheetPeriod = {
      id: `period-${targetYear}-${String(targetMonth).padStart(2, '0')}`,
      year: targetYear,
      month: targetMonth,
      startDate,
      endDate,
      status,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    await saveTimesheetPeriod(updatedPeriod);
    setSelectedYear(targetYear);
    setSelectedMonth(targetMonth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Aylık Puantaj Dönemi ve Tarih Aralığı Yönetimi
              </h3>
              <p className="text-xs text-slate-500">
                Okulların puantaj girişi yapabileceği geçerli tarih sınırlarını ve erişim durumunu belirleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Dönem Ayarları
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'submissions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Okul Teslimat Durumları</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 font-extrabold">
              {submittedSchools.length}/{schools.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Settings Form */}
        {activeTab === 'settings' ? (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Year & Month Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maaş / Tahakkuk Yılı
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => handlePeriodChange(Number(e.target.value), targetMonth)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maaş / Tahakkuk Ayı
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => handlePeriodChange(targetYear, Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.entries(MONTH_NAMES_TR).map(([mNum, mName]) => (
                    <option key={mNum} value={Number(mNum)}>
                      {mNum}. Ay – {mName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Puantaj Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Puantaj Bitiş Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Period Status (Open / Closed) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Dönem Veri Girişi Durumu
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('acik')}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    status === 'acik'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Unlock className="w-4 h-4 text-emerald-600" />
                  <span>AÇIK (Okullar Giriş Yapabilir)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('kapali')}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                    status === 'kapali'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 ring-2 ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>KAPALI (Giriş Kilitli)</span>
                </button>
              </div>
            </div>

            {/* Warning if submitted timesheets exist */}
            {lockedSubmissionsCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold">Geçmiş Kayıt Uyarısı:</div>
                  <div>
                    Bu döneme ait <strong>{lockedSubmissionsCount} kurum</strong> puantaj tesliminde bulunmuş veya onaylanmıştır.
                    Tarih sınırını değiştirmeden önce kurum onaylarını göz önünde bulundurunuz.
                  </div>
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dönem Açıklaması / Duyuru (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: 2026 Kasım ayı ek ders puantajları 30 Kasım saat 17:00'ye kadar girilmelidir."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Dönemi Kaydet ve Uygula</span>
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: School Submissions Status */
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>{targetMonth}. Ay ({MONTH_NAMES_TR[targetMonth]} {targetYear}) Okul Teslimatları</span>
              <span>Toplam {schools.length} Okul</span>
            </div>

            <div className="space-y-2">
              {schools.map((school) => {
                const sub = submissions.find(
                  (s) => s.schoolId === school.id && s.year === targetYear && s.month === targetMonth
                );
                const subStatus = sub?.status || 'taslak';

                const statusBadge =
                  subStatus === 'onaylandi' ? (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Onaylandı</span>
                    </span>
                  ) : subStatus === 'gonderildi' ? (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      <Clock className="w-3 h-3" />
                      <span>İnceleniyor / Teslim Edildi</span>
                    </span>
                  ) : subStatus === 'duzeltme_istendi' ? (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Düzeltme İstendi</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      Henüz Gönderilmedi
                    </span>
                  );

                return (
                  <div
                    key={school.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {school?.name || ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Kurum Kodu: {school?.institutionCode || '-'} • {school?.district || '-'}
                        </div>
                      </div>
                    </div>
                    <div>{statusBadge}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

