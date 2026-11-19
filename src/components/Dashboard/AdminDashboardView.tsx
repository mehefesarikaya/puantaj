import React from 'react';
import {
  Building2,
  Users,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  Briefcase,
  X,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';
import { GENERAL_DIRECTORATES, GeneralDirectorate } from '../../types';

// Icons and descriptions for the 5 MEB General Directorates
const DIRECTORATE_METADATA: Record<
  GeneralDirectorate,
  { icon: React.FC<{ className?: string }>; color: string; bgLight: string; shortDesc: string }
> = {
  'Temel Eğitim Genel Müdürlüğü': {
    icon: GraduationCap,
    color: 'text-sky-600 dark:text-sky-400',
    bgLight: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    shortDesc: 'İlkokul, ortaokul ve okul öncesi kurumları',
  },
  'Ortaöğretim Genel Müdürlüğü': {
    icon: BookOpen,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    shortDesc: 'Anadolu ve Fen Liseleri genel eğitim kurumları',
  },
  'Din Öğretimi Genel Müdürlüğü': {
    icon: Layers,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    shortDesc: 'İmam Hatip Ortaokul ve Anadolu İHL kurumları',
  },
  'Özel Eğitim Genel Müdürlüğü': {
    icon: HeartHandshake,
    color: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    shortDesc: 'Özel eğitim uygulama okulları ve BİLSEM',
  },
  'Mesleki ve Teknik Eğitim Genel Müdürlüğü': {
    icon: Briefcase,
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    shortDesc: 'Meslek liseleri, ÇEM ve Halk Eğitimi Merkezleri',
  },
};

export const AdminDashboardView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    submissions,
    selectedYear,
    selectedMonth,
    selectedSchoolId,
    setSelectedSchoolId,
    selectedDirectorate,
    setSelectedDirectorate,
    setActiveTab,
  } = useApp();

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';

  // 1. Filter schools by General Directorate if one is selected
  const directorateSchools =
    selectedDirectorate === 'all'
      ? schools
      : schools.filter((s) => s.generalDirectorate === selectedDirectorate);

  const directorateSchoolIds = new Set(directorateSchools.map((s) => s.id));

  // Check if any school in the district lacks a Directorate assignment
  const unassignedSchoolsCount = schools.filter((s) => !s.generalDirectorate).length;

  // 2. Filter teachers: must belong to schools within the selected Directorate (and school if picked)
  const filteredTeachers = teachers.filter((t) => {
    if (!directorateSchoolIds.has(t.schoolId)) return false;
    if (selectedSchoolId !== 'all' && t.schoolId !== selectedSchoolId) return false;
    return true;
  });

  // 3. Filter Puantaj records: only for schools within the selected Directorate
  const filteredPuantaj = puantajRows.filter(
    (p) =>
      p.year === selectedYear &&
      p.month === selectedMonth &&
      directorateSchoolIds.has(p.schoolId) &&
      (selectedSchoolId === 'all' || p.schoolId === selectedSchoolId)
  );

  // 4. Calculate KPI statistics strictly for the selected Directorate
  const totalSchoolsCount = directorateSchools.length;
  const totalTeachersCount = filteredTeachers.length;

  const totalTeachingHours = filteredPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
  const totalPayableHours = filteredPuantaj.reduce((acc, p) => acc + (p.payableTotalHours || 0), 0);
  const totalEstimatedPayment = filteredPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

  // 5. Submissions status for schools in the selected Directorate
  const monthSubmissions = submissions.filter(
    (s) =>
      s.year === selectedYear &&
      s.month === selectedMonth &&
      directorateSchoolIds.has(s.schoolId)
  );

  const approvedSchoolsCount = monthSubmissions.filter((s) => s.status === 'onaylandi').length;
  const inReviewSchoolsCount = monthSubmissions.filter((s) => s.status === 'incelemede').length;
  const missingDataSchoolsCount = monthSubmissions.filter((s) => s.status === 'eksik_veri').length;
  const pendingSchoolsCount =
    directorateSchools.length - (approvedSchoolsCount + inReviewSchoolsCount + missingDataSchoolsCount);

  // Helper to open Puantaj Rapor for a specific Directorate
  const handleOpenDirectoratePuantaj = (directorate: GeneralDirectorate) => {
    setSelectedDirectorate(directorate);
    setSelectedSchoolId('all');
    setActiveTab('puantaj');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span>İlçe Millî Eğitim Müdürlüğü Yönetici Paneli</span>
              <span>•</span>
              <span>{monthName} {selectedYear} Dönemi</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Kolay Ek Ders – Yönetici ve Puantaj Takip Sistemi
            </h2>
            <p className="text-blue-100 text-xs mt-1 max-w-2xl leading-relaxed">
              İlçe genelindeki okulları bağlı bulundukları Genel Müdürlüklere göre listeleyin,
              fiili ders ve nöbet saatlerini inceleyin, onay ve tahakkuk cetvellerini yönetin.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('puantaj')}
              className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Aylık Puantaj Raporu</span>
            </button>
            <button
              onClick={() => setActiveTab('schools')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all flex items-center space-x-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>Okul Tanımları</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned Schools Warning */}
      {unassignedSchoolsCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Genel Müdürlüğü Belirlenmemiş {unassignedSchoolsCount} Okul Var!
              </span>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                Raporların ve puantaj cetvellerinin eksiksiz olması için okullara Genel Müdürlük ataması yapınız.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('schools')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm flex items-center space-x-1 text-xs"
          >
            <span>Atama Yap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* GENERAL DIRECTORATE SELECTION INTERFACE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Bağlı Bulunulan MEB Genel Müdürlüğü Seçimi
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              İlgili Genel Müdürlüğü seçerek yalnızca o kurumlara ait puantaj cetveli ve tahakkuk raporlarını görüntüleyin.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {selectedDirectorate !== 'all' && (
              <button
                onClick={() => setSelectedDirectorate('all')}
                className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Filtreyi Temizle (Tüm Genel Müdürlükler)</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 General Directorate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {GENERAL_DIRECTORATES.map((directorate) => {
            const isSelected = selectedDirectorate === directorate;
            const meta = DIRECTORATE_METADATA[directorate];
            const Icon = meta.icon;

            // Compute statistics specific to this Directorate
            const dirSchools = schools.filter((s) => s.generalDirectorate === directorate);
            const dirSchoolIds = new Set(dirSchools.map((s) => s.id));
            const dirTeachersCount = teachers.filter((t) => dirSchoolIds.has(t.schoolId)).length;
            const dirPuantaj = puantajRows.filter(
              (p) =>
                p.year === selectedYear &&
                p.month === selectedMonth &&
                dirSchoolIds.has(p.schoolId)
            );
            const dirHours = dirPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
            const dirAmount = dirPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

            return (
              <div
                key={directorate}
                onClick={() => setSelectedDirectorate(isSelected ? 'all' : directorate)}
                className={`relative rounded-2xl p-4 cursor-pointer transition-all border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-blue-600 dark:ring-blue-400 shadow-md bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${meta.bgLight} ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                        Aktif Filtre
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">
                        {dirSchools.length} Kurum
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight min-h-[32px]">
                    {directorate}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    {meta.shortDesc}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Görevli:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{dirTeachersCount} kişi</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Fiili Ders:</span>
                    <span className="font-bold text-emerald-600">{dirHours} sa</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Tahakkuk:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{formatTRY(dirAmount)}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDirectoratePuantaj(directorate);
                    }}
                    className="w-full mt-2.5 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 shadow-sm transition-all"
                  >
                    <span>Puantaj Raporu</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Filter Banner */}
        {selectedDirectorate !== 'all' && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2 text-xs">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="text-blue-900 dark:text-blue-200">
                Şu an gösterilen veriler: <strong className="font-bold">{selectedDirectorate}</strong> ({directorateSchools.length} Kurum)
              </span>
            </div>
            <button
              onClick={() => setSelectedDirectorate('all')}
              className="text-blue-700 dark:text-blue-300 font-bold hover:underline"
            >
              Tüm Okulları Göster
            </button>
          </div>
        )}
      </div>

      {/* Main KPI Cards Grid (Reflects selected General Directorate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Schools */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedDirectorate === 'all' ? 'Kayıtlı Okul / Kurum' : 'Bağlı Kurum Sayısı'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalSchoolsCount}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {selectedDirectorate === 'all' ? 'İlçe geneli kurum sayısı' : 'Seçili GM bünyesindeki okullar'}
          </p>
        </div>

        {/* Total Teachers */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Toplam Görevli
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalTeachersCount}
          </h3>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
            Ücretli & Usta Öğretici
          </p>
        </div>

        {/* Total Actual Lesson Hours */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Fiili Ders Saati
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalTeachingHours} <span className="text-xs font-normal text-slate-400">saat</span>
          </h3>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">{monthName} ayı gerçekleşen</p>
        </div>

        {/* Payable Hours (with 5'e 1) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ödenecek Toplam Saat
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalPayableHours} <span className="text-xs font-normal text-slate-400">saat</span>
          </h3>
          <p className="text-[11px] text-indigo-600 mt-1 font-medium">5'e 1 hazırlık dahil</p>
        </div>

        {/* Estimated Total Payment */}
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
            {formatTRY(totalEstimatedPayment)}
          </h3>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">Dönem toplam bütçesi</p>
        </div>
      </div>

      {/* School Submission Status Row (Directorate filtered) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Onaylanan Okullar
            </span>
            <h4 className="text-xl font-bold text-emerald-900 dark:text-white mt-0.5">
              {approvedSchoolsCount} Kurum
            </h4>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              İncelemede Olanlar
            </span>
            <h4 className="text-xl font-bold text-blue-900 dark:text-white mt-0.5">
              {inReviewSchoolsCount} Kurum
            </h4>
          </div>
          <Clock className="w-8 h-8 text-blue-600" />
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Eksik / Hatalı Veri
            </span>
            <h4 className="text-xl font-bold text-amber-900 dark:text-white mt-0.5">
              {missingDataSchoolsCount} Kurum
            </h4>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>

        <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gönderim Bekleniyor
            </span>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {pendingSchoolsCount} Kurum
            </h4>
          </div>
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
      </div>

      {/* Schools Puantaj Status Summary Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {selectedDirectorate === 'all'
                ? `Tüm Okulların ${monthName} ${selectedYear} Puantaj Gönderim Durumları`
                : `${selectedDirectorate} Okullarının ${monthName} ${selectedYear} Puantaj Gönderim Durumları`}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedDirectorate === 'all'
                ? 'İlçe genelindeki tüm okulların aylık puantaj onay ve tahakkuk dökümü.'
                : `${selectedDirectorate} bünyesindeki ${directorateSchools.length} kurumun puantaj dökümü.`}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('schools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>Okulları Yönet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Kurum Kodu</th>
                <th className="py-2.5 px-3">Okul Adı</th>
                <th className="py-2.5 px-3">Genel Müdürlük</th>
                <th className="py-2.5 px-3">İlçe</th>
                <th className="py-2.5 px-3 text-center">Görevli Öğretmen</th>
                <th className="py-2.5 px-3 text-center">Toplam Fiili Saat</th>
                <th className="py-2.5 px-3 text-center">Durum</th>
                <th className="py-2.5 px-3 text-right">Tahakkuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {directorateSchools.map((school) => {
                const sub = monthSubmissions.find((s) => s.schoolId === school.id);
                const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
                const schoolPuantaj = puantajRows.filter(
                  (p) => p.schoolId === school.id && p.year === selectedYear && p.month === selectedMonth
                );
                const totalHours = schoolPuantaj.reduce((acc, p) => acc + (p.totalHours || 0), 0);
                const totalAmount = schoolPuantaj.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

                const status = sub?.status || 'bekleniyor';

                return (
                  <tr key={school.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">
                      {school.institutionCode}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {school.name}
                    </td>
                    <td className="py-2.5 px-3">
                      {school.generalDirectorate ? (
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {school.generalDirectorate}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800">
                          Tanımsız
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{school.district}</td>
                    <td className="py-2.5 px-3 text-center font-medium">
                      {schoolTeachers.length} kişi
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                      {totalHours} sa
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          status === 'onaylandi'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : status === 'incelemede'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : status === 'eksik_veri'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatTRY(totalAmount)}
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


