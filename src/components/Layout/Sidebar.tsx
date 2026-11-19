import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  TableProperties,
  ClipboardCheck,
  Calculator,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  History,
  X,
  School as SchoolIcon,
  LogOut,
  Calendar,
  Coins,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeTab, setActiveTab, currentUser, logout, schools } = useApp();

  const isAdmin = currentUser?.role === 'admin';
  const school = schools.find((s) => s.id === currentUser?.schoolId);

  const adminMenuItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'schools', label: 'Kurum Yönetimi', icon: Building2 },
    { id: 'teachers', label: 'Öğretmenler', icon: Users },
    { id: 'schedule', label: 'Ders Programları', icon: Calendar },
    { id: 'puantaj', label: 'Puantaj Rapor', icon: TableProperties },
    { id: 'review', label: 'Kayıt Kontrolü', icon: ClipboardCheck },
    { id: 'payroll', label: 'Ödeme Hesaplamaları', icon: Calculator },
    { id: 'pricing', label: 'Ücret ve Kurallar', icon: Coins },
    { id: 'reports', label: 'Raporlar', icon: FileSpreadsheet },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  const schoolMenuItems = [
    { id: 'dashboard', label: 'Okul Özeti', icon: LayoutDashboard },
    { id: 'teachers', label: 'Öğretmen Listesi', icon: Users },
    { id: 'schedule', label: 'Ders Programı', icon: Calendar },
    { id: 'puantaj', label: 'Puantaj Rapor', icon: TableProperties },
    { id: 'history', label: 'Geçmiş Dönemler', icon: History },
  ];

  const menuItems = isAdmin ? adminMenuItems : schoolMenuItems;

  const handleSelect = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
                isAdmin ? 'bg-blue-600 shadow-blue-500/20' : 'bg-indigo-600 shadow-indigo-500/20'
              }`}
            >
              MEB
            </div>
            <div className="truncate max-w-[140px]">
              <h1 className="font-bold text-slate-900 dark:text-white leading-tight text-sm truncate">
                {isAdmin ? 'Puantaj Yönetimi' : school?.name || 'Okul Paneli'}
              </h1>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                {isAdmin ? 'Merkezi Yönetici' : `Kurum: ${school?.institutionCode || ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Identity & Logout Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              <span className="flex items-center space-x-1.5 truncate">
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <SchoolIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span className="truncate">{currentUser?.fullName || 'Kullanıcı'}</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Rol: {isAdmin ? 'Merkezi Yönetici (Admin)' : 'Okul Personeli'}
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </aside>
    </>
  );
};
