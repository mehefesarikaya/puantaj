import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Phone,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  History,
  X,
  Lock,
  Filter,
  Layers,
  FileSpreadsheet,
  Copy,
  Check,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { School, SchoolMonthlySubmission, GeneralDirectorate, GENERAL_DIRECTORATES } from '../../types';
import { SchoolFormModal } from './SchoolFormModal';
import { BulkSchoolImportModal } from './BulkSchoolImportModal';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';

export const SchoolListView: React.FC = () => {
  const {
    schools,
    teachers,
    submissions,
    puantajRows,
    selectedYear,
    selectedMonth,
    selectedDirectorate,
    setSelectedDirectorate,
    setSelectedSchoolId,
    setActiveTab,
    addSchool,
    updateSchool,
    deleteSchool,
    resetSchoolPassword,
    toggleSchoolAccountActive,
    assignSchoolDirectorate,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Password reset modal state
  const [resetSchoolTarget, setResetSchoolTarget] = useState<School | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // History modal state
  const [historySchoolTarget, setHistorySchoolTarget] = useState<School | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View credentials modal state
  const [credentialsTarget, setCredentialsTarget] = useState<{ school: School; password?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Detailed view modal state
  const [detailSchoolTarget, setDetailSchoolTarget] = useState<School | null>(null);

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';

  // KPI Calculations
  const totalSchoolsCount = schools.length;
  const activeSchoolsCount = schools.filter((s) => s.accountActive !== false && s.isActive !== false).length;
  const passiveSchoolsCount = schools.filter((s) => s.accountActive === false || s.isActive === false).length;

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.institutionCode.includes(searchQuery) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDirectorate =
      selectedDirectorate === 'all' || s.generalDirectorate === selectedDirectorate;

    const isAccountActive = s.accountActive !== false && s.isActive !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isAccountActive) ||
      (statusFilter === 'passive' && !isAccountActive);

    return matchesSearch && matchesDirectorate && matchesStatus;
  });

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleDelete = (school: School) => {
    if (confirm(`"${school.name}" (${school.institutionCode}) kurumunu ve bağlı tüm puantaj kayıtlarını silmek istediğinizden emin misiniz?`)) {
      deleteSchool(school.id);
    }
  };

  const handleGoToPuantaj = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setActiveTab('puantaj');
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetSchoolTarget) return;

    const cleanPass = newPasswordInput.trim();
    if (!cleanPass) {
      setErrorMessage('Yeni şifre boş bırakılamaz. Lütfen admin olarak bir şifre giriniz.');
      return;
    }
    if (cleanPass.length < 6) {
      setErrorMessage('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setErrorMessage(null);
      await resetSchoolPassword(resetSchoolTarget.id, cleanPass);
      setCredentialsTarget({ school: resetSchoolTarget, password: cleanPass });
      setResetSchoolTarget(null);
      setNewPasswordInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Şifre güncellenemedi.');
    }
  };

  const handleSaveSchool = async (schoolData: Omit<School, 'id'> | School, initialPassword?: string) => {
    setErrorMessage(null);
    if ('id' in schoolData) {
      updateSchool(schoolData as School);
    } else {
      try {
        await addSchool(schoolData, initialPassword || '');
        const created = {
          ...schoolData,
          id: `school-${schoolData.institutionCode}`,
          username: schoolData.institutionCode,
          accountActive: true,
        };
        setCredentialsTarget({ school: created, password: initialPassword || '' });
      } catch (err: any) {
        setErrorMessage(err?.message || 'Kurum oluşturulamadı.');
      }
    }
  };

  const handleCopyCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleBulkImport = async (
    items: Array<{ school: Omit<School, 'id'>; initialPassword: string }>
  ) => {
    for (const item of items) {
      await addSchool(item.school, item.initialPassword);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Kurum Yönetimi
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            İlçe genelindeki okulları, kurum kodlarını, okul personeli giriş hesaplarını ve puantaj durumlarını merkezi olarak yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Toplu Kurum İçe Aktar (Excel/CSV)</span>
          </button>

          <button
            onClick={() => {
              setEditingSchool(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kurum Ekle</span>
          </button>
        </div>
      </div>

      {/* Hata Bildirimi */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-rose-800 dark:text-rose-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg text-rose-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 KPI Cards: Toplam, Aktif, Pasif Kurumlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Toplam Kurum Sayısı
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {totalSchoolsCount}
            </div>
            <span className="text-[10px] text-slate-400">Merkezi kayıtlı kurumlar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Aktif Kurum Sayısı
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {activeSchoolsCount}
            </div>
            <span className="text-[10px] text-emerald-600/70">Giriş ve puantaj yetkisi açık</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Pasif / Kilitli Kurum Sayısı
            </span>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
              {passiveSchoolsCount}
            </div>
            <span className="text-[10px] text-rose-600/70">Girişi askıya alınmış kurumlar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Arama, Durum Filtresi ve Genel Müdürlük Çubuğu */}
      <div className="space-y-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kurum adı, kurum kodu veya ilçe ile ara..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Durum Filtresi (Tümü / Aktif / Pasif) */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs shrink-0 font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tümü ({schools.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800'
              }`}
            >
              Aktif ({activeSchoolsCount})
            </button>
            <button
              onClick={() => setStatusFilter('passive')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'passive'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800'
              }`}
            >
              Pasif ({passiveSchoolsCount})
            </button>
          </div>
        </div>

        {/* Genel Müdürlük Filtre Çubuğu */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-100 shrink-0">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Genel Müdürlük:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedDirectorate('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                selectedDirectorate === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tümü ({schools.length})
            </button>
            {GENERAL_DIRECTORATES.map((dir) => {
              const count = schools.filter((s) => s.generalDirectorate === dir).length;
              const isSelected = selectedDirectorate === dir;
              return (
                <button
                  key={dir}
                  onClick={() => setSelectedDirectorate(dir)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={dir}
                >
                  {dir.replace(' Genel Müdürlüğü', '')} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kurumlar Grid Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSchools.map((school) => {
          const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
          const sub = submissions.find(
            (s) => s.schoolId === school.id && s.year === selectedYear && s.month === selectedMonth
          );
          const status = sub?.status || 'taslak';
          const isAccountActive = school.accountActive !== false && school.isActive !== false;

          return (
            <div
              key={school.id}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md"
            >
              <div>
                {/* Üst Kart Bilgisi */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 font-bold shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          KOD: {school.institutionCode}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            isAccountActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isAccountActive ? 'Hesap Aktif' : 'Hesap Kilitli'}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                        {school.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 block">{school.district}</span>

                      {/* Genel Müdürlük Badge */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {school.generalDirectorate ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Layers className="w-3 h-3 mr-1 text-indigo-500" />
                            {school.generalDirectorate}
                          </span>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                              Genel Müdürlük Atanmadı:
                            </span>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignSchoolDirectorate(school.id, e.target.value as GeneralDirectorate);
                                }
                              }}
                              className="text-[10px] font-semibold bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded px-1.5 py-0.5 text-slate-900 dark:text-white"
                            >
                              <option value="" disabled>Seçiniz</option>
                              {GENERAL_DIRECTORATES.map((dir) => (
                                <option key={dir} value={dir}>{dir}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase shrink-0 ${
                      status === 'onaylandi'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : status === 'gonderildi' || status === 'incelemede'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : status === 'duzeltme_istendi'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </span>
                </div>

                {/* Hızlı Hesap & Güvenlik Kutusu */}
                <div className="my-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-750 text-xs border border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px] text-slate-500">
                      Giriş Kodu: <strong className="text-slate-800 dark:text-slate-200 font-mono">{school.institutionCode}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setCredentialsTarget({ school })}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                      title="Giriş Kodunu ve Bilgilerini Görüntüle"
                    >
                      Giriş Bilgileri
                    </button>
                    <button
                      onClick={() => {
                        setResetSchoolTarget(school);
                        setNewPasswordInput('');
                        setErrorMessage(null);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      Şifre Sıfırla
                    </button>
                    <button
                      onClick={() => toggleSchoolAccountActive(school.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        isAccountActive
                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {isAccountActive ? 'Dondur' : 'Aktif Et'}
                    </button>
                  </div>
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-2 gap-2 my-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Okul Müdürü</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {school.principalName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Kayıtlı Öğretmen</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">
                      {schoolTeachers.length} Kişi
                    </span>
                  </div>
                </div>
              </div>

              {/* Alt Butonlar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleGoToPuantaj(school.id)}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                  >
                    <span>{monthName} Puantajı</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setHistorySchoolTarget(school)}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1 font-semibold"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Teslim Geçmişi</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setDetailSchoolTarget(school)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Detaylı Bilgi"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(school)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(school)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSchools.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Arama kriterlerine uygun kurum bulunamadı
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Filtrelerinizi temizleyebilir veya yeni bir kurum ekleyebilirsiniz.
          </p>
        </div>
      )}

      {/* Kurum Formu (Yeni Ekle veya Düzenle) */}
      <SchoolFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchool(null);
        }}
        onSave={handleSaveSchool}
        initialSchool={editingSchool}
        existingSchools={schools}
      />

      {/* Toplu Kurum İçe Aktarma Modalı */}
      <BulkSchoolImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        existingSchools={schools}
        onImport={handleBulkImport}
      />

      {/* Şifre Sıfırlama Modalı */}
      {resetSchoolTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Şifre Sıfırla
                </h3>
                <p className="text-[11px] text-slate-500">{resetSchoolTarget.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bu okulun personeli için yeni bir giriş şifresi belirleyiniz:
            </p>

            {errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Yeni Giriş Şifresi *
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => {
                    setNewPasswordInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Yeni giriş şifresi (En az 6 karakter)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetSchoolTarget(null)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  Şifreyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Giriş Bilgilerini Görüntüleme / Kopyalama Modalı */}
      {credentialsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kurum Giriş Bilgileri
                  </h3>
                  <p className="text-[11px] text-slate-500">{credentialsTarget.school.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCredentialsTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Kullanıcı Adı (Kurum Kodu)
                </span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {credentialsTarget.school.institutionCode}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Supabase Auth E-Posta
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {credentialsTarget.school.institutionCode}@puantaj.meb.gov.tr
                </span>
              </div>

              {credentialsTarget.password && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Belirlenen Şifre
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {credentialsTarget.password}
                  </span>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Bağlı Genel Müdürlük
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {credentialsTarget.school.generalDirectorate || 'Genel Müdürlük Atanmadı'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const summary = `Kurum Adı: ${credentialsTarget.school.name}\nKurum Kodu (Kullanıcı Adı): ${credentialsTarget.school.institutionCode}\nŞifre: ${credentialsTarget.password || 'Mevcut Şifre'}\nGenel Müdürlük: ${credentialsTarget.school.generalDirectorate || ''}`;
                  handleCopyCredentials(summary);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Kopyalandı!' : 'Bilgileri Kopyala'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCredentialsTarget(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detaylı Kurum Bilgisi Modalı */}
      {detailSchoolTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {detailSchoolTarget.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Kurum Kodu: {detailSchoolTarget.institutionCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailSchoolTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold block">İl / İlçe</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailSchoolTarget.district}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold block">Kurum Türü</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailSchoolTarget.schoolType}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl col-span-2">
                <span className="text-[10px] text-slate-400 font-bold block">Genel Müdürlük</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {detailSchoolTarget.generalDirectorate || 'Atanmadı'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold block">Okul Müdürü</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailSchoolTarget.principalName || '-'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold block">Telefon</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {detailSchoolTarget.contactPhone || '-'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl col-span-2">
                <span className="text-[10px] text-slate-400 font-bold block">Resmi E-Posta</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {detailSchoolTarget.contactEmail || '-'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailSchoolTarget(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teslim Geçmişi Modalı */}
      {historySchoolTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Puantaj Teslim Geçmişi: {historySchoolTarget.name}
                </h3>
                <p className="text-xs text-slate-500">Kurum Kodu: {historySchoolTarget.institutionCode}</p>
              </div>
              <button
                onClick={() => setHistorySchoolTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Dönem</th>
                    <th className="py-2.5 px-3 text-center">Durum</th>
                    <th className="py-2.5 px-3">Teslim Tarihi</th>
                    <th className="py-2.5 px-3">Onay / İade Tarihi</th>
                    <th className="py-2.5 px-3 text-center">Ders Saati</th>
                    <th className="py-2.5 px-3 text-right">Tahakkuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {submissions
                    .filter((s) => s.schoolId === historySchoolTarget.id)
                    .map((sub) => {
                      const mName = MONTH_NAMES_TR[sub.month] || sub.month;
                      const puantajList = puantajRows.filter(
                        (p) => p.schoolId === historySchoolTarget.id && p.year === sub.year && p.month === sub.month
                      );
                      const totalHours = puantajList.reduce((acc, p) => acc + (p.totalHours || 0), 0);
                      const totalAmount = puantajList.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

                      return (
                        <tr key={sub.id}>
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                            {mName} {sub.year}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                sub.status === 'onaylandi'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : sub.status === 'gonderildi' || sub.status === 'incelemede'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {sub.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {sub.approvedAt ? new Date(sub.approvedAt).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {totalHours} saat
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                            {formatTRY(totalAmount)}
                          </td>
                        </tr>
                      );
                    })}

                  {submissions.filter((s) => s.schoolId === historySchoolTarget.id).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        Bu okula ait geçmiş puantaj teslim kaydı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
