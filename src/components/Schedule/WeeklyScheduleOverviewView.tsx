import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { Teacher } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateWeeklyAdditionalTeaching, calculateEffectiveHourlyRate } from '../../utils/additionalTeachingCalculator';
import { formatTRY } from '../../utils/paymentCalculator';
import { TeacherWeeklyScheduleModal } from './TeacherWeeklyScheduleModal';

export const WeeklyScheduleOverviewView: React.FC = () => {
  const { teachers, schools, rules, currentUser, getTeacherSchedule } = useApp();
  const isSchoolUser = currentUser?.role === 'school_user';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>(
    isSchoolUser && currentUser?.schoolId ? currentUser.schoolId : 'all'
  );
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<Teacher | null>(null);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchesSchool = selectedSchool === 'all' || t.schoolId === selectedSchool;
      const matchesSearch =
        t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tcNo.includes(searchQuery);
      return matchesSchool && matchesSearch;
    });
  }, [teachers, selectedSchool, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Haftalık Ders Programı ve Ek Ders Hak Edişi</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğretmenlerin haftalık ders programı, maaş karşılığı düşümü, hazırlık-planlama ve nöbet hak edişlerinin takibi.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Öğretmen adı, branş veya TC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!isSchoolUser && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none cursor-pointer"
            >
              <option value="all">Tüm Okullar ({schools.length})</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Teacher Schedule Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 font-semibold">
                <th className="py-3 px-4">Öğretmen Adı / Kurum</th>
                <th className="py-3 px-4">Branş / Alan</th>
                <th className="py-3 px-4">Eğitim Düzeyi</th>
                <th className="py-3 px-4 text-center">Haftalık Planlanan</th>
                <th className="py-3 px-4 text-center">Maaş Karşılığı</th>
                <th className="py-3 px-4 text-center">Hazırlık / Nöbet</th>
                <th className="py-3 px-4 text-center">Yasal Ek Ders</th>
                <th className="py-3 px-4 text-right">Saatlik Ücret</th>
                <th className="py-3 px-4 text-right">Haftalık Tahmini</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400 italic">
                    Kayıtlı öğretmen veya program bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const schedule = getTeacherSchedule(teacher.id);
                  const calc = calculateWeeklyAdditionalTeaching(teacher, schedule, rules);
                  const rate = calculateEffectiveHourlyRate(teacher.educationLevel || 'lisans', rules);
                  const weeklyGross = calc.weeklyAdditionalHours * rate.effectiveRate;
                  const school = schools.find((s) => s.id === teacher.schoolId);

                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {teacher.fullName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {school?.name || 'Bilinmeyen Kurum'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {teacher.branch}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {teacher.educationLevel === 'doktora'
                            ? 'DOKTORA (+%20)'
                            : teacher.educationLevel === 'yuksek_lisans'
                            ? 'Y. LİSANS (+%7)'
                            : 'LİSANS'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {calc.weeklyScheduledHours} Saat
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {calc.maasKarsiligiHours} Saat
                      </td>

                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-mono">
                        +{calc.preparationPlanningHours + calc.guardDutyHours + calc.classGuidanceHours} Saat
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {calc.weeklyAdditionalHours} Saat
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatTRY(rate.effectiveRate)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatTRY(weeklyGross)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherForSchedule(teacher)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                        >
                          Programı Düzenle
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

      {/* Schedule Edit Modal */}
      {selectedTeacherForSchedule && (
        <TeacherWeeklyScheduleModal
          isOpen={Boolean(selectedTeacherForSchedule)}
          onClose={() => setSelectedTeacherForSchedule(null)}
          teacher={selectedTeacherForSchedule}
        />
      )}
    </div>
  );
};
