import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { School } from '../../types';
import { MONTH_NAMES_TR } from '../../utils/excelPuantajUtils';
import { formatTRY } from '../../utils/paymentCalculator';

export const SchoolHistoryView: React.FC = () => {
  const {
    schools,
    submissions,
    puantajRows,
    currentUser,
    setSelectedYear,
    setSelectedMonth,
    setActiveTab,
  } = useApp();

  // Safe fallback school
  const fallbackSchool: School = {
    id: currentUser?.schoolId || 'default-school',
    institutionCode: currentUser?.username || '000000',
    name: currentUser?.fullName ? currentUser.fullName.replace(' Yetkilisi', '') : 'Kurum',
    province: 'Ankara',
    district: 'İlçe / İl',
    schoolType: 'Okul',
    principalName: '',
    contactPhone: '',
    contactEmail: '',
    generalDirectorate: 'Temel Eğitim Genel Müdürlüğü',
    accountActive: true,
    isActive: true,
  };

  const school = (currentUser?.schoolId ? schools.find((s) => s.id === currentUser.schoolId) : null) || schools[0] || fallbackSchool;

  const schoolSubmissions = submissions
    .filter((s) => s.schoolId === school?.id)
    .sort((a, b) => b.year - a.year || b.month - a.month);

  const handleOpenMonth = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setActiveTab('puantaj');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Geçmiş Dönem Puantaj ve Onay Geçmişi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {school?.name || 'Kurum'} kurumuna ait geçmiş ayların teslim ve ilçe onay geçmişi.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold">
                <th className="py-3 px-4">Dönem (Ay / Yıl)</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4">Teslim Tarihi</th>
                <th className="py-3 px-4">Onay / Düzeltme Tarihi</th>
                <th className="py-3 px-4 text-center">Öğretmen Sayısı</th>
                <th className="py-3 px-4 text-center">Toplam Fiili Saat</th>
                <th className="py-3 px-4 text-right">Tahakkuk Tutar</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schoolSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Henüz geçmiş dönem kaydı bulunmamaktadır.
                  </td>
                </tr>
              ) : (
                schoolSubmissions.map((sub) => {
                  const mName = MONTH_NAMES_TR[sub.month] || sub.month;
                  const puantajList = puantajRows.filter(
                    (p) => p.schoolId === school.id && p.year === sub.year && p.month === sub.month
                  );
                  const totalHours = puantajList.reduce((acc, p) => acc + (p.totalHours || 0), 0);
                  const totalPayment = puantajList.reduce((acc, p) => acc + (p.estimatedPayment || 0), 0);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {mName} {sub.year}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sub.status === 'onaylandi'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : sub.status === 'gonderildi' || sub.status === 'incelemede'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : sub.status === 'duzeltme_istendi'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {sub.approvedAt
                          ? new Date(sub.approvedAt).toLocaleDateString('tr-TR')
                          : sub.correctionRequestedAt
                          ? new Date(sub.correctionRequestedAt).toLocaleDateString('tr-TR')
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {puantajList.length || sub.totalTeachersCount} kişi
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {totalHours || sub.totalLessonHours} sa
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatTRY(totalPayment || sub.totalPayableAmount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenMonth(sub.year, sub.month)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Cetveli Aç &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

