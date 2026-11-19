import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { LoginView } from './components/Auth/LoginView';
import { AdminDashboardView } from './components/Dashboard/AdminDashboardView';
import { SchoolListView } from './components/Schools/SchoolListView';
import { AdminTeacherListView } from './components/Teachers/AdminTeacherListView';
import { AdminMonthlyPuantajView } from './components/Puantaj/AdminMonthlyPuantajView';
import { MonthlyReviewView } from './components/Review/MonthlyReviewView';
import { AdminPayrollCalculationView } from './components/Payroll/AdminPayrollCalculationView';
import { AdminReportsView } from './components/Reports/AdminReportsView';
import { AdminSettingsView } from './components/Settings/AdminSettingsView';
import { SchoolDashboardView } from './components/SchoolPanel/SchoolDashboardView';
import { SchoolTeacherListView } from './components/SchoolPanel/SchoolTeacherListView';
import { SchoolPuantajEntryView } from './components/SchoolPanel/SchoolPuantajEntryView';
import { SchoolHistoryView } from './components/SchoolPanel/SchoolHistoryView';
import { WeeklyScheduleOverviewView } from './components/Schedule/WeeklyScheduleOverviewView';
import { AdminPricingRulesView } from './components/Pricing/AdminPricingRulesView';

export const App: React.FC = () => {
  const { activeTab, currentUser, isAuthChecking } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If Supabase session is being checked on startup, show clean loader
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-blue-500/30">
          KED
        </div>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-blue-200 font-semibold tracking-wide">Kolay Ek Ders yükleniyor...</p>
      </div>
    );
  }

  // If not logged in, show login page
  if (!currentUser) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    // School user panel views
    if (currentUser.role === 'school_user') {
      switch (activeTab) {
        case 'dashboard':
          return <SchoolDashboardView />;
        case 'teachers':
          return <SchoolTeacherListView />;
        case 'schedule':
          return <WeeklyScheduleOverviewView />;
        case 'puantaj':
          return <SchoolPuantajEntryView />;
        case 'history':
          return <SchoolHistoryView />;
        default:
          return <SchoolDashboardView />;
      }
    }

    // Admin panel views
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardView />;
      case 'schools':
        return <SchoolListView />;
      case 'teachers':
        return <AdminTeacherListView />;
      case 'schedule':
        return <WeeklyScheduleOverviewView />;
      case 'puantaj':
        return <AdminMonthlyPuantajView />;
      case 'review':
        return <MonthlyReviewView />;
      case 'payroll':
        return <AdminPayrollCalculationView />;
      case 'pricing':
        return <AdminPricingRulesView />;
      case 'reports':
        return <AdminReportsView />;
      case 'settings':
        return <AdminSettingsView />;
      default:
        return <AdminDashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col justify-between">
          <div className="max-w-[1600px] mx-auto w-full">
            {renderActiveView()}
          </div>

          <footer className="mt-8 pt-4 pb-2 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-500">
            <span>Kolay Ek Ders © 2026 – </span>
            <a
              href="https://kolayekders.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 underline underline-offset-2 font-mono"
            >
              kolayekders.com
            </a>
            <span> – Tüm hakları saklıdır.</span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
