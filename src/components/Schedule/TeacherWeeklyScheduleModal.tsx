import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Save,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  Teacher,
  TeacherWeeklySchedule,
  WeeklyLessonBlock,
  LessonType,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  calculateWeeklyAdditionalTeaching,
  calculateEffectiveHourlyRate,
} from '../../utils/additionalTeachingCalculator';
import { formatTRY } from '../../utils/paymentCalculator';

interface TeacherWeeklyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
  { id: 6, name: 'Cumartesi' },
  { id: 7, name: 'Pazar' },
];

export const TeacherWeeklyScheduleModal: React.FC<TeacherWeeklyScheduleModalProps> = ({
  isOpen,
  onClose,
  teacher,
}) => {
  const { rules, getTeacherSchedule, saveWeeklySchedule } = useApp();
  const existingSchedule = getTeacherSchedule(teacher.id);

  const [effectiveStartDate, setEffectiveStartDate] = useState(
    existingSchedule?.effectiveStartDate || '2026-09-01'
  );
  const [effectiveEndDate, setEffectiveEndDate] = useState(
    existingSchedule?.effectiveEndDate || ''
  );
  const [lessons, setLessons] = useState<WeeklyLessonBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize lessons
  useEffect(() => {
    if (existingSchedule && existingSchedule.lessons.length > 0) {
      setLessons(existingSchedule.lessons);
      setEffectiveStartDate(existingSchedule.effectiveStartDate);
      setEffectiveEndDate(existingSchedule.effectiveEndDate || '');
    } else {
      // Default: 6 hours Monday to Friday (30 hours)
      const defaultLessons: WeeklyLessonBlock[] = [1, 2, 3, 4, 5].map((day) => ({
        id: `blk-${day}-${Date.now()}`,
        dayOfWeek: day,
        lessonCount: 6,
        startTime: '09:00',
        endTime: '14:20',
        lessonType: 'normal',
        subject: teacher.branch,
      }));
      setLessons(defaultLessons);
    }
  }, [teacher, existingSchedule]);

  // Calculate total weekly hours
  const totalWeeklyHours = useMemo(() => {
    return lessons.reduce((acc, l) => acc + (Number(l.lessonCount) || 0), 0);
  }, [lessons]);

  // Calculation engine breakdown
  const mockSchedule: TeacherWeeklySchedule = useMemo(() => ({
    id: existingSchedule?.id || `sched-${teacher.id}`,
    teacherId: teacher.id,
    schoolId: teacher.schoolId,
    effectiveStartDate,
    effectiveEndDate: effectiveEndDate || undefined,
    lessons,
    totalWeeklyHours,
  }), [existingSchedule, teacher, effectiveStartDate, effectiveEndDate, lessons, totalWeeklyHours]);

  const calculation = useMemo(() => {
    return calculateWeeklyAdditionalTeaching(teacher, mockSchedule, rules);
  }, [teacher, mockSchedule, rules]);

  const rateInfo = useMemo(() => {
    return calculateEffectiveHourlyRate(teacher.educationLevel || 'lisans', rules);
  }, [teacher, rules]);

  // Lesson block helpers
  const handleAddLessonBlock = (dayOfWeek: number) => {
    const newBlock: WeeklyLessonBlock = {
      id: `blk-${dayOfWeek}-${Date.now()}-${Math.random()}`,
      dayOfWeek,
      lessonCount: 2,
      startTime: '09:00',
      endTime: '10:30',
      lessonType: 'normal',
      subject: teacher.branch,
    };
    setLessons((prev) => [...prev, newBlock]);
  };

  const handleUpdateBlock = (id: string, updates: Partial<WeeklyLessonBlock>) => {
    setLessons((prev) =>
      prev.map((blk) => (blk.id === id ? { ...blk, ...updates } : blk))
    );
  };

  const handleDeleteBlock = (id: string) => {
    setLessons((prev) => prev.filter((blk) => blk.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const scheduleToSave: TeacherWeeklySchedule = {
        id: existingSchedule?.id || `sched-${teacher.id}-${Date.now()}`,
        teacherId: teacher.id,
        schoolId: teacher.schoolId,
        effectiveStartDate,
        effectiveEndDate: effectiveEndDate || undefined,
        lessons,
        totalWeeklyHours,
        updatedAt: new Date().toISOString(),
      };
      await saveWeeklySchedule(scheduleToSave);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{teacher.fullName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/20">
                  {teacher.branch}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  {teacher.educationLevel === 'doktora'
                    ? 'DOKTORA'
                    : teacher.educationLevel === 'yuksek_lisans'
                    ? 'YÜKSEK LİSANS'
                    : 'LİSANS'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Haftalık Ders Programı, Saat Dağılımı ve Otomatik Ek Ders Hak Edişi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Grid layout (Schedule Left, Calculation Breakdown Right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Weekly Timetable (Monday - Sunday) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Effective Dates */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Geçerlilik Başlangıcı:
                </span>
                <input
                  type="date"
                  value={effectiveStartDate}
                  onChange={(e) => setEffectiveStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Bitiş Tarihi (Opsiyonel):
                </span>
                <input
                  type="date"
                  value={effectiveEndDate}
                  onChange={(e) => setEffectiveEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Days Accordion / Blocks */}
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const dayLessons = lessons.filter((l) => l.dayOfWeek === day.id);
                const dayTotal = dayLessons.reduce(
                  (sum, l) => sum + (Number(l.lessonCount) || 0),
                  0
                );

                return (
                  <div
                    key={day.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {day.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          Günlük: {dayTotal} Saat
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddLessonBlock(day.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ders Bloğu Ekle</span>
                      </button>
                    </div>

                    {dayLessons.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        Bu güne planlanmış ders bulunmamaktadır.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {dayLessons.map((blk) => (
                          <div
                            key={blk.id}
                            className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-xs"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-medium">Saat:</span>
                              <input
                                type="number"
                                min={1}
                                max={12}
                                value={blk.lessonCount}
                                onChange={(e) =>
                                  handleUpdateBlock(blk.id, {
                                    lessonCount: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-14 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-center font-bold font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={blk.startTime || '09:00'}
                                onChange={(e) =>
                                  handleUpdateBlock(blk.id, { startTime: e.target.value })
                                }
                                className="px-1.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-[11px]"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={blk.endTime || '14:20'}
                                onChange={(e) =>
                                  handleUpdateBlock(blk.id, { endTime: e.target.value })
                                }
                                className="px-1.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-[11px]"
                              />
                            </div>

                            <div className="flex-1 min-w-[130px]">
                              <select
                                value={blk.lessonType}
                                onChange={(e) =>
                                  handleUpdateBlock(blk.id, {
                                    lessonType: e.target.value as LessonType,
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-[11px] text-slate-900 dark:text-white outline-none"
                              >
                                <option value="normal">Gündüz Dersi (Normal)</option>
                                <option value="gece_haftasonu">Gece / Hafta Sonu (150 Gösterge)</option>
                                <option value="dyk">DYK Kursu (%100 Artırımlı)</option>
                                <option value="destek">Özel Eğitim / Destek (%25 Artırımlı)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(blk.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Ders bloğunu sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Additional Teaching Calculation Breakdown */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-slate-800 shadow-sm">
              <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400 mb-3 pb-2 border-b border-blue-200 dark:border-slate-700">
                <Calculator className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-sm">Haftalık Otomatik Hesaplama</h4>
              </div>

              {/* Step-by-step breakdown */}
              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Planlanan Toplam Ders:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {calculation.weeklyScheduledHours} Saat
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    Maaş Karşılığı Düşümü:
                  </span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                    -{calculation.maasKarsiligiHours} Saat
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Maaş Üstü Ders Saati:</span>
                  <span className="font-semibold text-slate-900 dark:text-white font-mono">
                    {calculation.excessLessonHours} Saat
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    Hazırlık ve Planlama:
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{calculation.preparationPlanningHours} Saat
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    Nöbet Görevi (+3):
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {calculation.guardDutyHours > 0 ? `+${calculation.guardDutyHours} Saat` : 'Yok'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    Sınıf Rehberliği (+2):
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {calculation.classGuidanceHours > 0 ? `+${calculation.classGuidanceHours} Saat` : 'Yok'}
                  </span>
                </div>

                <div className="pt-2 border-t border-blue-200 dark:border-slate-700 flex justify-between items-center font-bold text-sm">
                  <span className="text-blue-900 dark:text-blue-300">
                    Haftalık Ek Ders:
                  </span>
                  <span className="text-blue-700 dark:text-blue-400 font-mono text-base">
                    {calculation.weeklyAdditionalHours} Saat
                  </span>
                </div>

                {calculation.isWeeklyLimitExceeded && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Haftalık azami ek ders sınırı ({calculation.weeklyMaxLimit} saat) aşıldı!
                    </span>
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div className="mt-4 pt-3 border-t border-blue-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Eğitim Düzeyi:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                    {teacher.educationLevel || 'LİSANS'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">1 Saat Ek Ders Ücreti:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatTRY(rateInfo.effectiveRate)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Haftalık Tahmini Brüt:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {formatTRY(calculation.weeklyAdditionalHours * rateInfo.effectiveRate)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Aylık Tahmini Brüt (4 Hf):</span>
                  <span className="font-extrabold text-sm text-emerald-600 font-mono">
                    {formatTRY(calculation.weeklyAdditionalHours * 4 * rateInfo.effectiveRate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span>MEB Puantaj Ayrımı</span>
              </div>
              <p>
                Haftalık ders programı yasal hak ediş tavanını belirler. Aylık kesin ödeme ise Okul Paneli'nde gün bazında işlenen fiili puantaj kayıtları ve ilçe onayından sonra tahakkuk ettirilir.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Toplam Haftalık Ders: <strong className="text-slate-900 dark:text-white">{totalWeeklyHours} Saat</strong>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Programı Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
