import React, { useState } from 'react';
import {
  Coins,
  Save,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Calendar,
  Percent,
  Plus,
  Trash2,
  Building,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MebPaymentRules, BranchCategory } from '../../types';
import { DEFAULT_MEB_PAYMENT_RULES, formatTRY } from '../../utils/paymentCalculator';
import {
  BRANCH_CATEGORY_CONFIGS,
  getStoredBranches,
  saveStoredBranches,
} from '../../utils/branchData';

export const AdminPricingRulesView: React.FC = () => {
  const { rules, updateRules, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  // Rule Form States
  const [gunduzRate, setGunduzRate] = useState<number>(rules.gunduzHourlyRate || 220.57);
  const [geceRate, setGeceRate] = useState<number>(rules.geceHaftasonuHourlyRate || 236.33);
  const [ylBonus, setYlBonus] = useState<number>(rules.yuksekLisansBonusPercent || 7);
  const [doktoraBonus, setDoktoraBonus] = useState<number>(rules.doktoraBonusPercent || 20);
  const [ozelEgitimBonus, setOzelEgitimBonus] = useState<number>(rules.ozelEgitimBonusPercent || 25);
  const [dykBonus, setDykBonus] = useState<number>(rules.dykBonusPercent || 100);
  const [nobetHours, setNobetHours] = useState<number>(rules.nobetHoursPerWeek || 3);
  const [rehberlikHours, setRehberlikHours] = useState<number>(rules.sinifRehberlikHoursPerWeek || 2);
  const [incomeTaxRate, setIncomeTaxRate] = useState<number>(rules.incomeTaxRate || 0.15);
  const [stampTaxRate, setStampTaxRate] = useState<number>(rules.stampTaxRate || 0.00759);
  const [effectiveDate, setEffectiveDate] = useState<string>(rules.effectiveDate || '2026-07-01');

  // Branch list state
  const [branches, setBranches] = useState(() => getStoredBranches());
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCategory, setNewBranchCategory] = useState<BranchCategory>('genel_bilgi_ve_brans');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MebPaymentRules = {
      ...rules,
      gunduzHourlyRate: Number(gunduzRate),
      geceHaftasonuHourlyRate: Number(geceRate),
      ucretliHourlyRate: Number(gunduzRate),
      yuksekLisansBonusPercent: Number(ylBonus),
      doktoraBonusPercent: Number(doktoraBonus),
      ozelEgitimBonusPercent: Number(ozelEgitimBonus),
      dykBonusPercent: Number(dykBonus),
      nobetHoursPerWeek: Number(nobetHours),
      sinifRehberlikHoursPerWeek: Number(rehberlikHours),
      incomeTaxRate: Number(incomeTaxRate),
      stampTaxRate: Number(stampTaxRate),
      effectiveDate,
    };

    updateRules(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    const newBranch = {
      id: `b-${Date.now()}`,
      name: newBranchName.trim(),
      category: newBranchCategory,
      isCustom: true,
    };
    const updated = [...branches, newBranch];
    setBranches(updated);
    saveStoredBranches(updated);
    setNewBranchName('');
  };

  const handleDeleteBranch = (id: string) => {
    const updated = branches.filter((b) => b.id !== id);
    setBranches(updated);
    saveStoredBranches(updated);
  };

  const handleResetToOfficialDefaults = () => {
    if (confirm('Tüm katsayı ve oranları 2026 Temmuz-Aralık resmi MEB katsayılarına sıfırlamak istiyor musunuz?')) {
      setGunduzRate(220.57);
      setGeceRate(236.33);
      setYlBonus(7);
      setDoktoraBonus(20);
      setOzelEgitimBonus(25);
      setDykBonus(100);
      setNobetHours(3);
      setRehberlikHours(2);
      setIncomeTaxRate(0.15);
      setStampTaxRate(0.00759);
      setEffectiveDate('2026-07-01');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-blue-600" />
            <span>Ücret ve Hesaplama Kuralları Yönetimi</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Milli Eğitim Bakanlığı ek ders katsayıları, akademik unvan artırımları ve vergi parametrelerinin merkezi yönetimi.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleResetToOfficialDefaults}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resmi MEB Katsayılarına Sıfırla</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Hesaplama kuralları ve katsayılar başarıyla kaydedildi! Geçmiş onaylı kayıtlar korundu.</span>
        </div>
      )}

      <form onSubmit={handleSaveRules} className="space-y-6">
        {/* 1. Ek Ders Birim Ücretleri (Katsayılar) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Ek Ders Birim Ücretleri ve Göstergeler
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Kural Geçerlilik Tarihi:</span>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Normal Gündüz (140 Gösterge) - Brüt (TL)
              </label>
              <input
                type="number"
                step="0.01"
                value={gunduzRate}
                onChange={(e) => setGunduzRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Lisans mezunları için geçerli temel birim ücret.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gece / Hafta Sonu (150 Gösterge) - Brüt (TL)
              </label>
              <input
                type="number"
                step="0.01"
                value={geceRate}
                onChange={(e) => setGeceRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Cumartesi/Pazar ve akşam dersleri için uygulanır.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                DYK Kursu Artırım Oranı (%)
              </label>
              <input
                type="number"
                step="1"
                value={dykBonus}
                onChange={(e) => setDykBonus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                DYK dersleri %100 artırımlıdır ({formatTRY(gunduzRate * 2)}).
              </span>
            </div>
          </div>
        </div>

        {/* 2. Akademik Unvan ve Özel Eğitim Artırımları */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Akademik Unvan ve Özel Görev Artırımları
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Yüksek Lisans Artırım Oranı (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={ylBonus}
                onChange={(e) => setYlBonus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Yüksek Lisans: +%{ylBonus} -&gt; {formatTRY(236.01)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Doktora Artırım Oranı (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={doktoraBonus}
                onChange={(e) => setDoktoraBonus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Doktora: +%{doktoraBonus} -&gt; {formatTRY(264.69)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Özel Eğitim / Destek Artırım Oranı (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={ozelEgitimBonus}
                onChange={(e) => setOzelEgitimBonus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Özel Eğitim: +%{ozelEgitimBonus} -&gt; {formatTRY(275.71)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Ek Görevler ve Vergi Kesintileri */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <Percent className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Nöbet, Sınıf Rehberliği ve Vergi Oranları
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nöbet Görevi (Haftalık Saat)
              </label>
              <input
                type="number"
                value={nobetHours}
                onChange={(e) => setNobetHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standart: 3 saat</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sınıf Rehberliği (Haftalık Saat)
              </label>
              <input
                type="number"
                value={rehberlikHours}
                onChange={(e) => setRehberlikHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standart: 2 saat</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gelir Vergisi Oranı
              </label>
              <select
                value={incomeTaxRate}
                onChange={(e) => setIncomeTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value={0.15}>%15 (1. Dilim Standart)</option>
                <option value={0.20}>%20 (2. Dilim)</option>
                <option value={0.27}>%27 (3. Dilim)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Standart başlangıç: %15</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Damga Vergisi Oranı
              </label>
              <input
                type="number"
                step="0.00001"
                value={stampTaxRate}
                onChange={(e) => setStampTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Kanuni oran: Binde 7.59 (0.00759)</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Katsayı ve Kuralları Kaydet</span>
            </button>
          </div>
        )}
      </form>

      {/* 4. Branş Listesi Yönetimi */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Sistem Branş Listesi ve Kategorileri ({branches.length} Branş)
            </h3>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Yeni branş adı (örn: Biyomedikal Cihazlar)..."
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
            />
            <select
              value={newBranchCategory}
              onChange={(e) => setNewBranchCategory(e.target.value as BranchCategory)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
            >
              <option value="genel_bilgi_ve_brans">Genel Bilgi ve Branş (15s)</option>
              <option value="sinif">Sınıf Öğretmenliği (18s)</option>
              <option value="okul_oncesi">Okul Öncesi (18s)</option>
              <option value="atolye_laboratuvar">Atölye / Lab (20s)</option>
            </select>
            <button
              type="button"
              onClick={handleAddBranch}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Branş Ekle</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
          {branches.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {b.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {b.category === 'genel_bilgi_ve_brans'
                    ? '15s'
                    : b.category === 'sinif' || b.category === 'okul_oncesi'
                    ? '18s'
                    : '20s'}
                </span>
                {isAdmin && b.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBranch(b.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Branşı kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
