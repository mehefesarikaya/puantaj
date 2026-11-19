import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertCircle, CheckCircle2, Lock, ShieldAlert, GraduationCap, BookOpen, Clock, Briefcase } from 'lucide-react';
import { Teacher, School, EmploymentType, Nationality, EducationLevel, BranchCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  validateTurkishId,
  validateForeignId,
  validateTurkishIban,
} from '../../utils/validationUtils';
import { getStoredBranches, inferBranchCategory } from '../../utils/branchData';

interface AdminTeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id'> | Teacher) => void;
  schools: School[];
  initialTeacher?: Teacher | null;
  defaultSchoolId?: string;
}

export const AdminTeacherFormModal: React.FC<AdminTeacherFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schools,
  initialTeacher,
  defaultSchoolId,
}) => {
  const { currentUser, rules } = useApp();
  const isSchoolUser = currentUser?.role === 'school_user';
  const availableBranches = useMemo(() => getStoredBranches(), []);

  // Form states
  const [nationality, setNationality] = useState<Nationality>('TR');
  const [schoolId, setSchoolId] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('Matematik');
  const [branchCategory, setBranchCategory] = useState<BranchCategory>('genel_bilgi_ve_brans');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('lisans');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('sozlesmeli');
  const [hasGuardDuty, setHasGuardDuty] = useState(false);
  const [guardDutyDay, setGuardDutyDay] = useState<number>(0);
  const [hasClassGuidance, setHasClassGuidance] = useState(false);
  const [iban, setIban] = useState('TR');
  const [explanation, setExplanation] = useState('');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [departureDate, setDepartureDate] = useState('');
  const [hasOtherEmployer, setHasOtherEmployer] = useState(false);
  const [otherEmployerTaxBase, setOtherEmployerTaxBase] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Field touch states for UX
  const [touchedTc, setTouchedTc] = useState(false);
  const [touchedIban, setTouchedIban] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form values
  useEffect(() => {
    if (initialTeacher) {
      setNationality(initialTeacher.nationality || 'TR');
      setSchoolId(
        isSchoolUser && currentUser?.schoolId ? currentUser.schoolId : initialTeacher.schoolId
      );
      setTcNo(initialTeacher.tcNo);
      setFullName(initialTeacher.fullName);
      setBranch(initialTeacher.branch);
      setBranchCategory(
        initialTeacher.branchCategory || inferBranchCategory(initialTeacher.branch)
      );
      setEducationLevel(initialTeacher.educationLevel || 'lisans');
      const initialEmployment = initialTeacher.employmentType === 'kadrolu'
        ? 'sozlesmeli'
        : (initialTeacher.employmentType || 'sozlesmeli');
      setEmploymentType(initialEmployment);
      setHasGuardDuty(Boolean(initialTeacher.hasGuardDuty));
      setGuardDutyDay(initialTeacher.guardDutyDay || 0);
      setHasClassGuidance(Boolean(initialTeacher.hasClassGuidance));
      setIban(initialTeacher.iban);
      setExplanation(initialTeacher.explanation || '');
      setStartDate(initialTeacher.startDate);
      setDepartureDate(initialTeacher.departureDate || '');
      setHasOtherEmployer(Boolean(initialTeacher.hasOtherEmployer));
      setOtherEmployerTaxBase(initialTeacher.otherEmployerTaxBase || 0);
      setIsActive(initialTeacher.isActive);
    } else {
      setNationality('TR');
      const targetSchool = isSchoolUser && currentUser?.schoolId
        ? currentUser.schoolId
        : defaultSchoolId || schools[0]?.id || '';
      setSchoolId(targetSchool);
      setTcNo('');
      setFullName('');
      const defaultBranch = availableBranches[0]?.name || 'Matematik';
      setBranch(defaultBranch);
      setBranchCategory(inferBranchCategory(defaultBranch));
      setEducationLevel('lisans');
      setEmploymentType('sozlesmeli');
      setHasGuardDuty(false);
      setGuardDutyDay(0);
      setHasClassGuidance(false);
      setIban('TR');
      setExplanation('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDepartureDate('');
      setHasOtherEmployer(false);
      setOtherEmployerTaxBase(0);
      setIsActive(true);
    }

    setTouchedTc(false);
    setTouchedIban(false);
    setIsSubmitting(false);
  }, [initialTeacher, isOpen, defaultSchoolId, schools, isSchoolUser, currentUser, rules, availableBranches]);

  // Dynamic status flags
  const isIskur = employmentType === 'iskurlu';
  const isStajyer = employmentType === 'stajyer' || employmentType === 'stajer';
  const isStandardTeacher = !isIskur && !isStajyer;

  // Handler for immediate dynamic adaptation on employment status change
  const handleEmploymentTypeChange = (newType: EmploymentType) => {
    setEmploymentType(newType);

    if (newType === 'iskurlu') {
      // Clear fields not applicable to İŞKUR
      setHasGuardDuty(false);
      setGuardDutyDay(0);
      setHasClassGuidance(false);
      setHasOtherEmployer(false);
      setOtherEmployerTaxBase(0);
      setEducationLevel('lisans');
      if (!initialTeacher || initialTeacher.employmentType !== 'iskurlu') {
        setBranch('Destek ve Temizlik Hizmetleri');
        setBranchCategory('genel_bilgi_ve_brans');
        if (!explanation) setExplanation('İŞKUR TYP');
      }
    } else if (newType === 'stajyer' || newType === 'stajer') {
      // Clear fields not applicable to Stajyer
      setHasGuardDuty(false);
      setGuardDutyDay(0);
      setHasClassGuidance(false);
      setHasOtherEmployer(false);
      setOtherEmployerTaxBase(0);
      setEducationLevel('lisans');
      if (!initialTeacher || (initialTeacher.employmentType !== 'stajyer' && initialTeacher.employmentType !== 'stajer')) {
        if (!explanation) setExplanation('Stajyer');
      }
    }
  };

  // Live Validations
  const idValidation = useMemo(() => {
    if (nationality === 'TR') {
      return validateTurkishId(tcNo);
    }
    return validateForeignId(tcNo);
  }, [nationality, tcNo]);

  const ibanValidation = useMemo(() => {
    return validateTurkishIban(iban);
  }, [iban]);

  const isFormValid = useMemo(() => {
    const hasValidId = idValidation.isValid;
    const hasValidIban = ibanValidation.isValid;
    const hasName = fullName.trim().length > 0;
    const hasSchool = Boolean(schoolId);
    return hasValidId && hasValidIban && hasName && hasSchool;
  }, [idValidation, ibanValidation, fullName, schoolId]);

  if (!isOpen) return null;

  // Resolved school object for display
  const currentAssignedSchool = schools.find((s) => s.id === schoolId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedTc(true);
    setTouchedIban(true);

    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    // Enforce security: hourly rate is retrieved centrally from rules, not user input
    const finalHourlyRate = initialTeacher?.hourlyRate || rules.gunduzHourlyRate || rules.ucretliHourlyRate || 220.57;

    // Determine assigned school ID with security check for school users
    const assignedSchoolId = isSchoolUser ? (currentUser?.schoolId || schoolId) : schoolId;

    // Sanitize fields based on employment type so hidden fields never retain invalid values
    const finalGuardDutyDay = isStandardTeacher && guardDutyDay > 0 ? guardDutyDay : undefined;
    const finalHasGuardDuty = isStandardTeacher && Boolean(finalGuardDutyDay);
    const finalHasClassGuidance = isStandardTeacher && hasClassGuidance;
    const finalHasOtherEmployer = isStandardTeacher && hasOtherEmployer;
    const finalOtherEmployerTaxBase = finalHasOtherEmployer ? Number(otherEmployerTaxBase) : undefined;
    const finalEducationLevel: EducationLevel = isStandardTeacher ? educationLevel : 'lisans';
    const finalBranch = branch.trim() || (isIskur ? 'Destek ve Temizlik Hizmetleri' : 'Matematik');
    const finalBranchCategory = isIskur ? 'genel_bilgi_ve_brans' : branchCategory;

    const payload: Omit<Teacher, 'id'> = {
      schoolId: assignedSchoolId,
      nationality,
      tcNo: tcNo.trim().replace(/\s+/g, ''),
      fullName: fullName.trim(),
      branch: finalBranch,
      branchCategory: finalBranchCategory,
      educationLevel: finalEducationLevel,
      employmentType,
      hasGuardDuty: finalHasGuardDuty,
      guardDutyDay: finalGuardDutyDay,
      hasClassGuidance: finalHasClassGuidance,
      iban: ibanValidation.normalizedIban,
      explanation: explanation.trim() || undefined,
      startDate,
      departureDate: departureDate.trim() || undefined,
      hasOtherEmployer: finalHasOtherEmployer,
      otherEmployerTaxBase: finalOtherEmployerTaxBase,
      hourlyRate: finalHourlyRate,
      isActive,
    };

    try {
      if (initialTeacher) {
        onSave({ ...payload, id: initialTeacher.id });
      } else {
        onSave(payload);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initialTeacher ? 'Öğretmen Bilgilerini Düzenle' : 'Yeni Öğretmen / Personel Ekle'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              MEB ders ücreti ve puantaj cetveline dahil edilecek personel kaydı.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Top Section: School & Nationality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Görevli Olduğu Okul (Admin editable, School user read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Görevli Olduğu Okul *
              </label>

              {isSchoolUser ? (
                <div className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-between font-semibold">
                  <span className="truncate">
                    {currentAssignedSchool?.name || 'Kendi Kurumunuz'}
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 font-bold">
                    <Lock className="w-3 h-3" />
                    <span>Kurumunuz</span>
                  </span>
                </div>
              ) : (
                <select
                  required
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Okul Seçin</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.institutionCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Uyruk Seçimi (Türk / Yabancı) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Uyruk *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNationality('TR');
                    setTcNo('');
                    setTouchedTc(false);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    nationality === 'TR'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>🇹🇷 Türk</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNationality('FOREIGN');
                    setTcNo('');
                    setTouchedTc(false);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    nationality === 'FOREIGN'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>🌍 Yabancı</span>
                </button>
              </div>
            </div>
          </div>

          {/* Identification Number (Dynamic Validation) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {nationality === 'TR' ? 'T.C. Kimlik Numarası *' : 'Yabancı Kimlik Numarası (YKN - 98/99) *'}
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {tcNo.length}/11 Hane
              </span>
            </div>

            <input
              type="text"
              required
              maxLength={11}
              value={tcNo}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                setTcNo(digitsOnly);
                setTouchedTc(true);
              }}
              onBlur={() => setTouchedTc(true)}
              placeholder={nationality === 'TR' ? '11 haneli T.C. Kimlik No' : '98 veya 99 ile başlayan 11 hane'}
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono outline-none transition-all ${
                touchedTc && !idValidation.isValid
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                  : touchedTc && idValidation.isValid
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500'
              }`}
            />

            {/* Validation Message directly below the field */}
            {touchedTc && !idValidation.isValid && (
              <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{idValidation.error}</span>
              </p>
            )}

            {touchedTc && idValidation.isValid && (
              <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{nationality === 'TR' ? 'Geçerli T.C. Kimlik Numarası' : 'Geçerli Yabancı Kimlik Numarası'}</span>
              </p>
            )}
          </div>

          {/* Name & Branch Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adı Soyadı *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: AHMET YILMAZ"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {isIskur
                    ? 'İŞKUR Görev Alanı / Pozisyonu *'
                    : isStajyer
                    ? 'Staj Branşı / Alanı *'
                    : 'Branş / Görev Alanı *'}
                </span>
              </label>
              {isIskur ? (
                <select
                  value={branch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBranch(val);
                    setBranchCategory('genel_bilgi_ve_brans');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="Destek ve Temizlik Hizmetleri">Destek ve Temizlik Hizmetleri</option>
                  <option value="Güvenlik Hizmetleri">Güvenlik Hizmetleri</option>
                  <option value="Bakım ve Onarım">Bakım ve Onarım</option>
                  <option value="Büro ve İdari Destek">Büro ve İdari Destek</option>
                  <option value="İŞKUR / TYP Personeli">İŞKUR / TYP Personeli</option>
                </select>
              ) : (
                <select
                  value={branch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBranch(val);
                    setBranchCategory(inferBranchCategory(val));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <optgroup label="Genel Bilgi ve Branş (15 Saat Maaş Karşılığı)">
                    {availableBranches
                      .filter((b) => b.category === 'genel_bilgi_ve_brans')
                      .map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Sınıf Öğretmenliği (18 Saat Maaş Karşılığı)">
                    {availableBranches
                      .filter((b) => b.category === 'sinif')
                      .map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Okul Öncesi (18 Saat Maaş Karşılığı)">
                    {availableBranches
                      .filter((b) => b.category === 'okul_oncesi')
                      .map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Atölye ve Laboratuvar (20 Saat Maaş Karşılığı)">
                    {availableBranches
                      .filter((b) => b.category === 'atolye_laboratuvar')
                      .map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              )}
              <span className="text-[10px] text-slate-400 mt-1 block">
                {isIskur
                  ? 'İŞKUR Toplum Yararına Program (TYP / İUP) bünyesindeki görev'
                  : isStajyer
                  ? 'Stajyerin eğitim aldığı branş alanı'
                  : 'Maaş karşılığı ve azami ek ders hesabı seçilen branşa göre yapılır.'}
              </span>
            </div>
          </div>

          {/* Academic Qualification & Employment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Academic Qualification: Kept exactly in current position, fee/rate text hidden */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Eğitim Düzeyi *</span>
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                disabled={!isStandardTeacher}
                className={`w-full px-3 py-2 text-xs rounded-xl border font-medium outline-none transition-all ${
                  !isStandardTeacher
                    ? 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer'
                }`}
              >
                {isIskur ? (
                  <option value="lisans">İŞKUR Personeli (Akademik Derece Muaf)</option>
                ) : isStajyer ? (
                  <option value="lisans">Öğrenci / Stajyer</option>
                ) : (
                  <>
                    <option value="lisans">Lisans</option>
                    <option value="yuksek_lisans">Yüksek Lisans</option>
                    <option value="doktora">Doktora</option>
                  </>
                )}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {isIskur
                  ? 'İŞKUR personeli için akademik derece ve ek ders artırımı uygulanmaz.'
                  : isStajyer
                  ? 'Stajyer öğretmenler için stajyer statüsü geçerlidir.'
                  : 'Akademik mezuniyet derecesi (Lisans, Yüksek Lisans, Doktora)'}
              </span>
            </div>

            {/* Employment Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                <span>Görevlendirme / Statü *</span>
              </label>
              <select
                value={employmentType}
                onChange={(e) => handleEmploymentTypeChange(e.target.value as EmploymentType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="sozlesmeli">Sözleşmeli</option>
                <option value="ucretli">Ücretli</option>
                <option value="stajyer">Stajyer</option>
                <option value="iskurlu">İŞKUR</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Personelin kurumdaki yasal istihdam statüsü
              </span>
            </div>
          </div>

          {/* Additional Duties (Ek Puan ve Görev Kalemleri & Nöbet Günü) - Only for standard teachers */}
          {isStandardTeacher && (
            <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                Ek Puan ve Görev Kalemleri (Haftalık Ek Ders İlavesi)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nöbet Günü Seçimi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nöbet Görevi Günü (+3 Saat / Hafta)
                  </label>
                  <select
                    value={guardDutyDay}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGuardDutyDay(val);
                      setHasGuardDuty(val > 0);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value={0}>Nöbet Görevi Yok</option>
                    <option value={1}>Pazartesi</option>
                    <option value={2}>Salı</option>
                    <option value={3}>Çarşamba</option>
                    <option value={4}>Perşembe</option>
                    <option value={5}>Cuma</option>
                    <option value={6}>Cumartesi</option>
                    <option value={7}>Pazar</option>
                  </select>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Seçilen nöbet gününe puantajda otomatik 3 saatlik ayrı "Nöbet Görevi" satırı açılır.
                  </span>
                </div>

                {/* Sınıf Rehberliği */}
                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 mt-2">
                    <input
                      type="checkbox"
                      checked={hasClassGuidance}
                      onChange={(e) => setHasClassGuidance(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold block">Sınıf Rehberliği ve Sosyal Etkinlik (+2 Saat)</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Sınıfı/kulübü olan öğretmenlere haftada 2 saat ek ders verilir.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* IBAN Number (Real Turkish IBAN Validation) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Banka IBAN Numarası *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {iban.replace(/\s+/g, '').length}/26 Karakter (MOD-97)
              </span>
            </div>

            <input
              type="text"
              required
              maxLength={34}
              value={iban}
              onChange={(e) => {
                const formatted = e.target.value.toUpperCase();
                setIban(formatted);
                setTouchedIban(true);
              }}
              onBlur={() => setTouchedIban(true)}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono outline-none transition-all ${
                touchedIban && !ibanValidation.isValid
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                  : touchedIban && ibanValidation.isValid
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500'
              }`}
            />

            {/* IBAN validation message directly below the field */}
            {touchedIban && !ibanValidation.isValid && (
              <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{ibanValidation.error}</span>
              </p>
            )}

            {touchedIban && ibanValidation.isValid && (
              <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Geçerli Türkiye IBAN Numarası (MOD-97 Doğrulandı)</span>
              </p>
            )}
          </div>

          {/* Explanation & Departure Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isIskur
                  ? 'Açıklama / Program Notu'
                  : isStajyer
                  ? 'Açıklama / Üniversite Bilgisi'
                  : 'Açıklama (Puantaj Şablonu Açıklama Sütunu)'}
              </label>
              <input
                type="text"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={
                  isIskur
                    ? 'Örn: İŞKUR TYP Personeli'
                    : isStajyer
                    ? 'Örn: Stajyer Öğretmen / Gazi Üniversitesi'
                    : 'Örn: USTAÖĞRETİCİ'
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isIskur
                  ? 'Program Bitiş / Ayrılış Tarihi (Varsa)'
                  : isStajyer
                  ? 'Staj Bitiş / Ayrılış Tarihi (Varsa)'
                  : 'Ayrılış Tarihi (Varsa)'}
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Other Employer Fields - Only for standard teachers */}
          {isStandardTeacher && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasOtherEmployer}
                  onChange={(e) => setHasOtherEmployer(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Başkaca Bir İşverende Çalışıyor mu?</span>
              </label>

              {hasOtherEmployer && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Başkaca İşverende Çalışıyorsa Aylık Vergi Matrahı (TL)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={otherEmployerTaxBase}
                    onChange={(e) => setOtherEmployerTaxBase(Number(e.target.value))}
                    placeholder="Örn: 18500"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Active status checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="activeTeacherCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="activeTeacherCheck"
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium"
            >
              Aktif Görevde (Aylık puantaj cetvelinde listelensin)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-[11px]">
              {!isFormValid && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Lütfen kimlik no ve IBAN alanlarını eksiksiz doğrulayınız.</span>
                </span>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Check className="w-4 h-4" />
                <span>{initialTeacher ? 'Güncelle' : 'Kaydet'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
