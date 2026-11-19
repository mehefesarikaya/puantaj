import React, { useState } from 'react';
import {
  Calculator,
  Coins,
  Download,
  Info,
  Building,
  GraduationCap,
  Percent,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MONTH_NAMES_TR, exportMonthlyPuantajToExcel } from '../../utils/excelPuantajUtils';
import {
  calculateMonthlyTeacherPayment,
  calculateEffectiveHourlyRate,
} from '../../utils/additionalTeachingCalculator';
import { formatTRY } from '../../utils/paymentCalculator';
import { Teacher, AdditionalTeachingCalculationResult, GENERAL_DIRECTORATES } from '../../types';

export const AdminPayrollCalculationView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    rules,
    selectedYear,
    selectedMonth,
    selectedSchoolId,
    setSelectedSchoolId,
    selectedDirectorate,
    setSelectedDirectorate,
    getTeacherSchedule,
  } = useApp();

  const [inspectTeacher, setInspectTeacher] = useState<{
    teacher: Teacher;
    calc: AdditionalTeachingCalculationResult;
  } | null>(null);

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';

  // 1. Filter schools by General Directorate if selected
  const directorateSchools =
    selectedDirectorate === 'all'
      ? schools
      : schools.filter((s) => s.generalDirectorate === selectedDirectorate);

  const directorateSchoolIds = new Set(directorateSchools.map((s) => s.id));

  const effectiveSchoolId =
    selectedSchoolId !== 'all' && !directorateSchoolIds.has(selectedSchoolId)
      ? 'all'
      : selectedSchoolId;

  const activeTeachers = teachers.filter(
    (t) =>
      t.isActive &&
      directorateSchoolIds.has(t.schoolId) &&
      (effectiveSchoolId === 'all' || t.schoolId === effectiveSchoolId)
  );

  const calculatedItems = activeTeachers.map((teacher) => {
    const row = puantajRows.find(
      (p) => p.teacherId === teacher.id && p.year === selectedYear && p.month === selectedMonth
    );
    const actualHours = row ? row.totalHours : 0;
    const schedule = getTeacherSchedule(teacher.id);
    const calc = calculateMonthlyTeacherPayment(teacher, schedule, actualHours, rules, 4);
    return {
      teacher,
      schedule,
      actualHours,
      calc,
    };
  });

  const totalActual = calculatedItems.reduce((acc, b) => acc + b.calc.monthlyActualPuantajHours, 0);
  const totalAdditional = calculatedItems.reduce((acc, b) => acc + b.calc.monthlyAdditionalHours, 0);
  const totalGross = calculatedItems.reduce((acc, b) => acc + b.calc.grossPayment, 0);
  const totalIncomeTax = calculatedItems.reduce((acc, b) => acc + b.calc.incomeTaxAmount, 0);
  const totalStampTax = calculatedItems.reduce((acc, b) => acc + b.calc.stampTaxAmount, 0);
  const totalNet = calculatedItems.reduce((acc, b) => acc + b.calc.netPayment, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            <span>Otomatik Ek Ders ve Aylık Tahakkuk Cetveli</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Haftalık ders programı, maaş karşılığı, hazırlık-planlama, akademik unvan artırımları ve vergi bordrosu dökümü.
          </p>
        </div>

        <button
          onClick={() => {
            const exportData = activeTeachers.map((t) => {
              const r = puantajRows.find(
                (p) => p.teacherId === t.id && p.year === selectedYear && p.month === selectedMonth
              );
              return {
                teacher: t,
                dailyHours: r ? r.dailyHours : {},
                totalHours: r ? r.totalHours : 0,
              };
            });
            exportMonthlyPuantajToExcel('Bordro_Icmali', selectedYear, selectedMonth, exportData);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel Bordro İndir</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Öğretmen Sayısı</span>
          <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
            {activeTeachers.length}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Fiili Ders Saati</span>
          <span className="text-lg font-black text-slate-700 dark:text-slate-200 font-mono mt-0.5 block">
            {totalActual} Saat
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Aylık Ek Ders</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
            {totalAdditional} Saat
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Toplam Brüt</span>
          <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
            {formatTRY(totalGross)}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Vergi Kesintisi</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
            {formatTRY(totalIncomeTax + totalStampTax)}
          </span>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-sm">
          <span className="text-[10px] text-emerald-100 block font-semibold uppercase">Net Ödenecek</span>
          <span className="text-lg font-black font-mono mt-0.5 block">
            {formatTRY(totalNet)}
          </span>
        </div>
      </div>

      {/* Itemized Calculation Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Öğretmen Bazlı Ayrıntılı Ek Ders ve Tahakkuk Cetveli
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Dönem: {monthName} {selectedYear} (4 Hafta Projeksiyonu / Fiili Puantaj)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <select
                value={selectedDirectorate}
                onChange={(e) => {
                  setSelectedDirectorate(e.target.value as any);
                  setSelectedSchoolId('all');
                }}
                className="bg-transparent focus:outline-none cursor-pointer max-w-[190px] truncate font-bold text-xs"
              >
                <option value="all">Tüm Genel Müdürlükler ({schools.length})</option>
                {GENERAL_DIRECTORATES.map((gd) => (
                  <option key={gd} value={gd}>
                    {gd}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium">
              <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={effectiveSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="all">
                  {selectedDirectorate === 'all'
                    ? `Tüm Okullar (${schools.length})`
                    : `${selectedDirectorate} Okulları (${directorateSchools.length})`}
                </option>
                {directorateSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Adı Soyadı / Branş</th>
                <th className="py-2.5 px-3">Eğitim Düzeyi</th>
                <th className="py-2.5 px-3 text-center">Haftalık Plan</th>
                <th className="py-2.5 px-3 text-center">Maaş Karş.</th>
                <th className="py-2.5 px-3 text-center">Hazırlık / Nöbet</th>
                <th className="py-2.5 px-3 text-center">Aylık Ek Ders</th>
                <th className="py-2.5 px-3 text-right">Birim Ücret</th>
                <th className="py-2.5 px-3 text-right">Brüt Tutar</th>
                <th className="py-2.5 px-3 text-right">Gelir V. (%15)</th>
                <th className="py-2.5 px-3 text-right">Damga V.</th>
                <th className="py-2.5 px-3 text-right">Net Ödenecek</th>
                <th className="py-2.5 px-3 text-center">İncele</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {calculatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 font-sans italic">
                    Kayıtlı öğretmen bulunamadı.
                  </td>
                </tr>
              ) : (
                calculatedItems.map(({ teacher, calc }) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-3 font-sans">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {teacher.fullName}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {teacher.branch}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {teacher.educationLevel === 'doktora'
                          ? 'DOKTORA (+%20)'
                          : teacher.educationLevel === 'yuksek_lisans'
                          ? 'Y. LİSANS (+%7)'
                          : 'LİSANS'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center text-slate-800 dark:text-slate-200">
                      {calc.weeklyScheduledHours}s
                    </td>

                    <td className="py-2.5 px-3 text-center text-rose-500">
                      -{calc.maasKarsiligiHours}s
                    </td>

                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                      +{calc.preparationPlanningHours + calc.guardDutyHours + calc.classGuidanceHours}s
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {calc.monthlyAdditionalHours} Saat
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatTRY(calc.effectiveHourlyRate)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                      {formatTRY(calc.grossPayment)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-rose-500 font-medium">
                      -{formatTRY(calc.incomeTaxAmount)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-rose-500 font-medium">
                      -{formatTRY(calc.stampTaxAmount)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 text-sm">
                      {formatTRY(calc.netPayment)}
                    </td>

                    <td className="py-2.5 px-3 text-center font-sans">
                      <button
                        onClick={() => setInspectTeacher({ teacher, calc })}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        title="Hesaplama Bileşenlerini İncele"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-900 font-mono font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td colSpan={5} className="py-3 px-3 font-sans">GENEL TOPLAM</td>
                <td className="py-3 px-3 text-center text-blue-600 font-extrabold">{totalAdditional}s</td>
                <td className="py-3 px-3 text-right">-</td>
                <td className="py-3 px-3 text-right">{formatTRY(totalGross)}</td>
                <td className="py-3 px-3 text-right text-rose-600">-{formatTRY(totalIncomeTax)}</td>
                <td className="py-3 px-3 text-right text-rose-600">-{formatTRY(totalStampTax)}</td>
                <td className="py-3 px-3 text-right font-black text-sm text-emerald-600">{formatTRY(totalNet)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Transparent Breakdown Modal for Inspection */}
      {inspectTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{inspectTeacher.teacher.fullName}</h3>
                <p className="text-xs text-slate-400">Şeffaf Ek Ders ve Vergi Tahakkuk Dökümü</p>
              </div>
              <button
                onClick={() => setInspectTeacher(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 space-y-1">
                <span className="font-bold block">1. Formül Esasları:</span>
                <p>
                  Haftalık Ek Ders = (Planlanan Ders ({inspectTeacher.calc.weeklyScheduledHours}s) - Maaş Karşılığı ({inspectTeacher.calc.maasKarsiligiHours}s)) + Hazırlık/Planlama ({inspectTeacher.calc.preparationPlanningHours}s) + Nöbet ({inspectTeacher.calc.guardDutyHours}s) + Rehberlik ({inspectTeacher.calc.classGuidanceHours}s) = <strong>{inspectTeacher.calc.weeklyAdditionalHours} Saat</strong>
                </p>
              </div>

              <div className="space-y-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Öğretmen Branşı / Kategorisi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectTeacher.teacher.branch}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Akademik Düzey:</span>
                  <span className="font-bold text-indigo-600">
                    {inspectTeacher.teacher.educationLevel === 'doktora'
                      ? 'Doktora (+%20 artırımlı)'
                      : inspectTeacher.teacher.educationLevel === 'yuksek_lisans'
                      ? 'Yüksek Lisans (+%7 artırımlı)'
                      : 'Lisans (Standart)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uygulanan Brüt Saat Ücreti:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {formatTRY(inspectTeacher.calc.effectiveHourlyRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aylık Toplam Ek Ders:</span>
                  <span className="font-bold font-mono text-blue-600 text-sm">
                    {inspectTeacher.calc.monthlyAdditionalHours} Saat
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-bold text-sm">
                  <span>Brüt Ek Ders Tutarı:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {formatTRY(inspectTeacher.calc.grossPayment)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Gelir Vergisi (%{Math.round(inspectTeacher.calc.incomeTaxRate * 100)}):</span>
                  <span className="font-mono">-{formatTRY(inspectTeacher.calc.incomeTaxAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Damga Vergisi (Binde 7.59):</span>
                  <span className="font-mono">-{formatTRY(inspectTeacher.calc.stampTaxAmount)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-base pt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-600">
                  <span>Net Tahakkuk Eden Tutar:</span>
                  <span className="font-mono">{formatTRY(inspectTeacher.calc.netPayment)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-700/50 flex justify-end">
              <button
                onClick={() => setInspectTeacher(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
