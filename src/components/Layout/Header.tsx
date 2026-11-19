import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Calendar,
  Eye,
  EyeOff,
  Building,
  User,
  ShieldCheck,
  School,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    schools,
    currentUser,
    logout,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedSchoolId,
    setSelectedSchoolId,
    maskSensitiveData,
    toggleMaskSensitiveData,
    darkMode,
    toggleDarkMode,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Menüyü aç"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Admin School Filter (only for admin) */}
        {isAdmin ? (
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Building className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px] sm:max-w-xs truncate"
            >
              <option value="all">Tüm Okullar ({schools.length} Kurum)</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <School className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Kurum:</span>
            <span>{schools.find((s) => s.id === currentUser?.schoolId)?.name || 'Kurum Paneli'}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Month & Year Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <Calendar className="w-4 h-4 text-blue-600" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {MONTH_NAMES_TR.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Mask Sensitive Data Toggle */}
        <button
          onClick={toggleMaskSensitiveData}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            maskSensitiveData
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}
          title={maskSensitiveData ? 'Gizlilik Açık (TC & IBAN maskeli)' : 'Gizlilik Kapalı (TC & IBAN açık)'}
        >
          {maskSensitiveData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{maskSensitiveData ? 'Gizli' : 'Açık'}</span>
        </button>

        {/* Dark Mode */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Açık Mod' : 'Karanlık Mod'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Çıkış Yap"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
