import React, { useState, useMemo } from 'react';
import {
  Inbox,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Search,
  Filter,
  Layers,
  ArrowRight,
  MessageSquare,
  Check,
  RefreshCw,
  Eye,
  X,
  Send,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubmissionStatus, School, SchoolMonthlySubmission, GeneralDirectorate, GENERAL_DIRECTORATES } from '../../types';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';

export const SchoolSubmissionsView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    submissions,
    selectedYear,
    selectedMonth,
    updateSubmissionStatus,
    setSelectedSchoolId,
    setActiveTab,
    syncFromRemote,
    isSupabaseActive,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirectorateFilter, setSelectedDirectorateFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Correction request modal state
  const [correctionTargetSchool, setCorrectionTargetSchool] = useState<School | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';

  // Refresh data from Supabase
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncFromRemote();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Compile full submission data for each school for the selected year and month
  const schoolSubmissionsData = useMemo(() => {
    return schools.map((school) => {
      const submission = submissions.find(
        (s) => s.schoolId === school.id && s.year === selectedYear && s.month === selectedMonth
      );

      const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
      const schoolPuantaj = puantajRows.filter(
        (p) => p.schoolId === school.id && p.year === selectedYear && p.month === selectedMonth
      );

      const totalHours = schoolPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
      const totalAmount = schoolPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

      const status: SubmissionStatus | 'bekleniyor' = submission?.status || 'bekleniyor';

      return {
        school,
        submission,
        status,
        teacherCount: schoolTeachers.length,
        totalHours: submission?.totalLessonHours || totalHours,
        totalAmount: submission?.totalPayableAmount || totalAmount,
        submittedAt: submission?.submittedAt,
        approvedAt: submission?.approvedAt,
        correctionNotes: submission?.correctionNotes,
        notes: submission?.notes,
      };
    });
  }, [schools, submissions, teachers, puantajRows, selectedYear, selectedMonth]);

  // KPI Calculations
  const totalCount = schoolSubmissionsData.length;
  const approvedCount = schoolSubmissionsData.filter((d) => d.status === 'onaylandi').length;
  const submittedCount = schoolSubmissionsData.filter(
    (d) => d.status === 'gonderildi' || d.status === 'incelemede'
  ).length;
  const correctionCount = schoolSubmissionsData.filter((d) => d.status === 'duzeltme_istendi').length;
  const pendingCount = schoolSubmissionsData.filter(
    (d) => d.status === 'bekleniyor' || d.status === 'taslak'
  ).length;

  // Filtered List
  const filteredData = useMemo(() => {
    return schoolSubmissionsData.filter((item) => {
      // Search filter
      const matchesSearch =
        item.school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.school.institutionCode.includes(searchQuery) ||
        (item.school.district && item.school.district.toLowerCase().includes(searchQuery.toLowerCase()));

      // Directorate filter
      const matchesDirectorate =
        selectedDirectorateFilter === 'all' || item.school.generalDirectorate === selectedDirectorateFilter;

      // Status filter
      let matchesStatus = true;
      if (selectedStatusFilter === 'onaylandi') {
        matchesStatus = item.status === 'onaylandi';
      } else if (selectedStatusFilter === 'gonderildi') {
        matchesStatus = item.status === 'gonderildi' || item.status === 'incelemede';
      } else if (selectedStatusFilter === 'duzeltme_istendi') {
        matchesStatus = item.status === 'duzeltme_istendi';
      } else if (selectedStatusFilter === 'bekleniyor') {
        matchesStatus = item.status === 'bekleniyor' || item.status === 'taslak';
      }

      return matchesSearch && matchesDirectorate && matchesStatus;
    });
  }, [schoolSubmissionsData, searchQuery, selectedDirectorateFilter, selectedStatusFilter]);

  // Handlers
  const handleApprove = (schoolId: string, schoolName: string) => {
    if (confirm(`"${schoolName}" kurumunun ${monthName} ${selectedYear} puantaj cetvelini onaylamak istiyor musunuz?`)) {
      updateSubmissionStatus(schoolId, selectedYear, selectedMonth, 'onaylandi', 'İlçe MEM tarafından onaylandı.');
    }
  };

  const handleOpenCorrectionModal = (school: School, existingNote?: string) => {
    setCorrectionTargetSchool(school);
    setCorrectionNote(existingNote || '');
  };

  const handleSaveCorrection = () => {
    if (!correctionTargetSchool) return;
    if (!correctionNote.trim()) {
      alert('Lütfen kuruma iletilecek düzeltme talebi gerekçesini belirtiniz.');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      updateSubmissionStatus(
        correctionTargetSchool.id,
        selectedYear,
        selectedMonth,
        'duzeltme_istendi',
        'İlçe MEM tarafından düzeltme talep edildi.',
        correctionNote.trim()
      );
      setCorrectionTargetSchool(null);
      setCorrectionNote('');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleNavigateToPuantaj = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setActiveTab('puantaj');
  };

  const handleApproveAllSubmitted = () => {
    const submittedSchools = schoolSubmissionsData.filter(
      (d) => d.status === 'gonderildi' || d.status === 'incelemede'
    );
    if (submittedSchools.length === 0) {
      alert('Onay bekleyen teslim edilmiş kurum bulunmamaktadır.');
      return;
    }

    if (
      confirm(
        `Teslim edilmiş ${submittedSchools.length} kurumun puantajını toplu olarak onaylamak istediğinizden emin misiniz?`
      )
    ) {
      submittedSchools.forEach((d) => {
        updateSubmissionStatus(
          d.school.id,
          selectedYear,
          selectedMonth,
          'onaylandi',
          'Toplu yönetici onayı gerçekleştirildi.'
        );
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Inbox className="w-4 h-4" />
            <span>Merkezi Takip & Onay Masası</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Okul Teslimat Durumları ({monthName} {selectedYear})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            İlçe genelindeki okulların aylık puantaj teslimatları, inceleme süreçleri ve onay durumlarının Supabase üzerinden anlık takibi.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {submittedCount > 0 && (
            <button
              onClick={handleApproveAllSubmitted}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Teslim Edilenleri Toplu Onayla ({submittedCount})</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            title="Verileri Supabase'den Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Kurum</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</div>
          <span className="text-[10px] text-slate-400">İlçe genelindeki okullar</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Teslim Edilen</span>
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{submittedCount}</div>
          <span className="text-[10px] text-slate-400">Onay bekleyen kurumlar</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Onaylanan</span>
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</div>
          <span className="text-[10px] text-slate-400">Puantajı onaylananlar</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Düzeltme İstenen</span>
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{correctionCount}</div>
          <span className="text-[10px] text-slate-400">Okula iade edilenler</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Bekleniyor / Taslak</span>
          <div className="text-2xl font-black text-slate-600 dark:text-slate-300 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-slate-400">Henüz teslim etmeyenler</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Okul adı, kurum kodu veya ilçe ile ara..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Directorate Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedDirectorateFilter}
              onChange={(e) => setSelectedDirectorateFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">Tüm Genel Müdürlükler</option>
              {GENERAL_DIRECTORATES.map((gd) => (
                <option key={gd} value={gd}>
                  {gd}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">Tüm Durumlar ({totalCount})</option>
              <option value="gonderildi">Teslim Edilenler ({submittedCount})</option>
              <option value="onaylandi">Onaylananlar ({approvedCount})</option>
              <option value="duzeltme_istendi">Düzeltme İstenenler ({correctionCount})</option>
              <option value="bekleniyor">Bekleniyor / Taslak ({pendingCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 font-semibold">
                <th className="py-3 px-4">Kurum Kodu & Adı</th>
                <th className="py-3 px-4">Genel Müdürlük</th>
                <th className="py-3 px-4 text-center">Öğretmen</th>
                <th className="py-3 px-4 text-center">Toplam Ders</th>
                <th className="py-3 px-4 text-right">Tahakkuk Eden Tutar</th>
                <th className="py-3 px-4 text-center">Teslim Tarihi</th>
                <th className="py-3 px-4 text-center">Teslim Durumu</th>
                <th className="py-3 px-4 text-center">İşlem & Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 italic">
                    Arama kriterlerine uygun okul teslimat kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isApproved = item.status === 'onaylandi';
                  const isSubmitted = item.status === 'gonderildi' || item.status === 'incelemede';
                  const isCorrection = item.status === 'duzeltme_istendi';

                  return (
                    <tr
                      key={item.school.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Kurum Adı & Kodu */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {item.school.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Kod: {item.school.institutionCode} • {item.school.district}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Genel Müdürlük */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.school.generalDirectorate || 'Genel Müdürlük Belirtilmedi'}
                        </span>
                      </td>

                      {/* Öğretmen Sayısı */}
                      <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {item.teacherCount}
                      </td>

                      {/* Toplam Ders Saati */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {item.totalHours} Saat
                      </td>

                      {/* Tahakkuk Eden Tutar */}
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatTRY(item.totalAmount)}
                      </td>

                      {/* Teslim Tarihi */}
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {item.submittedAt ? (
                          <span>{new Date(item.submittedAt).toLocaleDateString('tr-TR')}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Durum Rozeti */}
                      <td className="py-3 px-4 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ONAYLANDI</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                            <Clock className="w-3 h-3" />
                            <span>TESLİM EDİLDİ</span>
                          </span>
                        ) : isCorrection ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>DÜZELTME İSTENDİ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                            <span>BEKLENİYOR</span>
                          </span>
                        )}

                        {item.correctionNotes && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal mt-1 italic max-w-[150px] truncate mx-auto" title={item.correctionNotes}>
                            Not: {item.correctionNotes}
                          </div>
                        )}
                      </td>

                      {/* Aksiyonlar */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Puantaja Git */}
                          <button
                            type="button"
                            onClick={() => handleNavigateToPuantaj(item.school.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                            title="Puantaj Raporunu İncele"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Onayla Butonu */}
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApprove(item.school.id, item.school.name)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                              title="Puantajı Onayla"
                            >
                              Onayla
                            </button>
                          )}

                          {/* Düzeltme İste Butonu */}
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleOpenCorrectionModal(item.school, item.correctionNotes)}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                              title="Okula Düzeltme Notu Gönder"
                            >
                              Düzeltme İste
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Düzeltme Talebi Modalı */}
      {correctionTargetSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Puantaj Düzeltme Talebi
                  </h3>
                  <p className="text-[11px] text-slate-500">{correctionTargetSchool.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionTargetSchool(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Lütfen <strong>{monthName} {selectedYear}</strong> dönemi puantaj cetvelindeki eksik veya hatalı saatleri belirterek kuruma iletilecek düzeltme gerekçesini yazınız:
              </p>

              <textarea
                rows={4}
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="Örnek: Matematik ders saatlerinde Salı günü fazla yazılmış saatler bulunmaktadır. Lütfen güncelleyip tekrar onaya sununuz..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCorrectionTargetSchool(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={isSubmittingCorrection}
                className="flex items-center space-x-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingCorrection ? 'Kaydediliyor...' : 'Düzeltme Talebini Gönder'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

