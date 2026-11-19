import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Database,
  History,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  KeyRound,
  FileCode,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  X,
  Coins,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MebPaymentRules } from '../../types';
import { MigrationResult } from '../../services/migrationService';
import { SecurityTestReport } from '../../services/securityTestService';

export const AdminSettingsView: React.FC = () => {
  const {
    rules,
    auditLogs,
    resetToDefaults,
    isSupabaseActive,
    backendMode,
    isMigrating,
    migrateToSupabase,
    runSecurityAudit,
    setActiveTab,
  } = useApp();

  // Migration modal state
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Security test modal state
  const [securityReport, setSecurityReport] = useState<SecurityTestReport | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isRunningSecurity, setIsRunningSecurity] = useState(false);

  const handleRunMigration = async () => {
    const res = await migrateToSupabase();
    setMigrationResult(res);
    setShowMigrationModal(true);
  };

  const handleRunSecurity = async () => {
    setIsRunningSecurity(true);
    try {
      const rep = await runSecurityAudit();
      setSecurityReport(rep);
      setShowSecurityModal(true);
    } finally {
      setIsRunningSecurity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Kolay Ek Ders Sistem ve Mevzuat Ayarları
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ders saati ücreti katsayıları, 5'e 1 ilavesi, vergi oranları, Supabase veritabanı entegrasyonu, veri aktarımı ve güvenlik denetimi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Rules Redirect Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <Coins className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                MEB Ek Ders Ücret ve Katsayı Parametreleri
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Milli Eğitim Bakanlığı ek ders saatlik birim ücretleri, akademik unvan artırımları (Yüksek Lisans, Doktora), özel eğitim, DYK kursları ve branş tanımlamaları merkezi olarak <strong>Ücret ve Kurallar</strong> sekmesinde gerçek Supabase veritabanına bağlı şekilde yönetilmektedir.
            </p>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <div className="font-bold">Aktif Katsayı Parametreleri (2026 H2):</div>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700">
                  Gündüz: {rules.gunduzHourlyRate || rules.ucretliHourlyRate} TL
                </span>
                <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700">
                  Gece: {rules.geceHaftasonuHourlyRate || 236.33} TL
                </span>
                <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700">
                  Gelir Vergisi: %{(rules.incomeTaxRate || 0.15) * 100}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all"
            >
              <span>Ücret ve Kurallar Yönetimine Git</span>
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Database & Independent Architecture */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <Database className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                PostgreSQL & Supabase Veritabanı Entegrasyonu
              </h3>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Bağlantı Durumu:
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    isSupabaseActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
                  {isSupabaseActive ? 'Supabase Bağlantısı Aktif' : 'Yerel Kalıcı Mod (Offline)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                {isSupabaseActive
                  ? 'Verileriniz Supabase bulut veritabanı ile eşzamanlı çalışmaktadır.'
                  : '.env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY eklendiğinde bulut veritabanına otomatik bağlanır.'}
              </p>
            </div>

            {/* Actions: Migrate & Security Test */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleRunMigration}
                  disabled={isMigrating}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isMigrating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  <span>Yerel Verileri Supabase'e Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunSecurity}
                  disabled={isRunningSecurity}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isRunningSecurity ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Güvenlik & RLS Denetimi</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-700/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="font-semibold block mb-0.5 text-slate-700 dark:text-slate-300">
                  SQL Şeması:
                </span>
                Proje kök dizinindeki <code className="text-blue-600 font-mono">supabase_schema.sql</code> dosyasını Supabase SQL Editöründe çalıştırarak RLS ve tüm tabloları tek tıkla kurabilirsiniz.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Kullanıcı verileri cihazınızda şifreli olarak saklanır.
            </span>
            <button
              onClick={() => {
                if (confirm('Sistemi orijinal Ekim ayı test verileriyle sıfırlamak istiyor musunuz?')) {
                  resetToDefaults();
                }
              }}
              className="flex items-center space-x-1 text-xs text-rose-600 hover:underline shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Verileri Sıfırla</span>
            </button>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Merkezi İşlem ve Güvenlik Denetim Günlüğü (Audit Log)
            </h3>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white mr-2">
                    {log.action}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{log.details}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString('tr-TR')} • {log.user}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Migration Result Modal */}
      {showMigrationModal && migrationResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Veri Aktarım Raporu
                </h3>
              </div>
              <button
                onClick={() => setShowMigrationModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  migrationResult.success
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {migrationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{migrationResult.message}</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Aktarılan Okul Sayısı:</span>
                  <span className="font-bold">{migrationResult.schoolsMigrated}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Aktarılan Öğretmen Sayısı:</span>
                  <span className="font-bold">{migrationResult.teachersMigrated}</span>
                </div>
                {migrationResult.schedulesMigrated !== undefined && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                    <span>Haftalık Ders Programları:</span>
                    <span className="font-bold">{migrationResult.schedulesMigrated}</span>
                  </div>
                )}
                {migrationResult.periodsMigrated !== undefined && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                    <span>Puantaj Dönemleri & Tarih Aralıkları:</span>
                    <span className="font-bold">{migrationResult.periodsMigrated}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Aktarılan Aylık Gönderim Durumları:</span>
                  <span className="font-bold">{migrationResult.submissionsMigrated}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Aktarılan Günlük Puantaj Satırları:</span>
                  <span className="font-bold">{migrationResult.puantajRowsMigrated}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>MEB Mevzuat Parametreleri:</span>
                  <span className="font-bold text-emerald-600">
                    {migrationResult.rulesMigrated ? 'Aktarıldı' : 'Beklemede'}
                  </span>
                </div>
              </div>

              {migrationResult.errors.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 max-h-24 overflow-y-auto">
                  <p className="font-bold mb-1">Karşılaşılan Sorunlar:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {migrationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowMigrationModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Audit Modal */}
      {showSecurityModal && securityReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Güvenlik, İzolasyon ve RLS Denetim Raporu
                </h3>
              </div>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2.5">
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
                <span className="font-semibold">Genel Güvenlik Skoru:</span>
                <span className="font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">
                  {securityReport.allPassed ? 'BAŞARILI (Tüm Testler Geçti)' : 'UYARI'}
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {securityReport.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 text-xs flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
