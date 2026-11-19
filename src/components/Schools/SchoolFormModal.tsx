import React, { useState, useEffect } from 'react';
import { X, Check, KeyRound, AlertCircle, Building2, Layers, MapPin, Sparkles } from 'lucide-react';
import { School, GeneralDirectorate, GENERAL_DIRECTORATES } from '../../types';

interface SchoolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (school: Omit<School, 'id'> | School, initialPassword?: string) => void;
  initialSchool?: School | null;
  existingSchools?: School[];
}

export const SchoolFormModal: React.FC<SchoolFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSchool,
  existingSchools = [],
}) => {
  const [institutionCode, setInstitutionCode] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('Ankara');
  const [district, setDistrict] = useState('Çankaya');
  const [schoolType, setSchoolType] = useState('Anadolu Lisesi');
  const [generalDirectorate, setGeneralDirectorate] = useState<GeneralDirectorate>('Temel Eğitim Genel Müdürlüğü');
  const [principalName, setPrincipalName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
    if (initialSchool) {
      setInstitutionCode(initialSchool.institutionCode);
      setName(initialSchool.name);
      setProvince(initialSchool.province || 'Ankara');
      setDistrict(initialSchool.district.includes('/') ? initialSchool.district.split('/')[0].trim() : initialSchool.district);
      setSchoolType(initialSchool.schoolType);
      setGeneralDirectorate(initialSchool.generalDirectorate || 'Temel Eğitim Genel Müdürlüğü');
      setPrincipalName(initialSchool.principalName || '');
      setContactPhone(initialSchool.contactPhone || '');
      setContactEmail(initialSchool.contactEmail || '');
      setIsActive(initialSchool.isActive);
    } else {
      setInstitutionCode('');
      setName('');
      setProvince('Ankara');
      setDistrict('Çankaya');
      setSchoolType('Anadolu Lisesi');
      setGeneralDirectorate('Ortaöğretim Genel Müdürlüğü');
      setPrincipalName('');
      setContactPhone('');
      setContactEmail('');
      setInitialPassword('');
      setIsActive(true);
    }
  }, [initialSchool, isOpen]);

  if (!isOpen) return null;

  // Otomatik benzersiz 6 haneli MEB kurum kodu üretme
  const handleGenerateCode = () => {
    let generatedCode = '';
    let attempts = 0;
    while (attempts < 50) {
      // 700000 - 799999 aralığında MEB kurum kodları formatı
      const rand = Math.floor(700000 + Math.random() * 99000);
      generatedCode = String(rand);
      const isTaken = existingSchools.some((s) => s.institutionCode === generatedCode);
      if (!isTaken) break;
      attempts++;
    }
    setInstitutionCode(generatedCode);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanCode = institutionCode.trim();
    const cleanName = name.trim();

    if (!cleanCode) {
      setValidationError('Kurum kodu zorunludur.');
      return;
    }

    if (!cleanName) {
      setValidationError('Kurum adı zorunludur.');
      return;
    }

    if (!initialSchool) {
      const cleanPass = initialPassword.trim();
      if (!cleanPass) {
        setValidationError('Kurum şifresi zorunludur. Lütfen admin olarak bir giriş şifresi belirleyiniz.');
        return;
      }
      if (cleanPass.length < 6) {
        setValidationError('Kurum şifresi en az 6 karakter olmalıdır.');
        return;
      }
    }

    // Benzersizlik kontrolü (Yeni kurum veya düzenlenen kurum kodunun başka okulda olmaması)
    const isDuplicate = existingSchools.some(
      (s) => s.institutionCode.toLowerCase() === cleanCode.toLowerCase() && s.id !== initialSchool?.id
    );

    if (isDuplicate) {
      setValidationError(`"${cleanCode}" kurum kodu zaten kayıtlıdır. Lütfen farklı veya otomatik bir kod seçiniz.`);
      return;
    }

    const fullDistrict = province ? `${district.trim()} / ${province.trim()}` : district.trim();

    const payload: Omit<School, 'id'> = {
      institutionCode: cleanCode,
      name: cleanName,
      province: province.trim(),
      district: fullDistrict,
      schoolType: schoolType.trim(),
      generalDirectorate,
      principalName: principalName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      isActive,
      username: cleanCode,
      accountActive: true,
    };

    if (initialSchool) {
      onSave({ ...payload, id: initialSchool.id });
    } else {
      onSave(payload, initialPassword.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {initialSchool ? 'Kurum Bilgilerini Düzenle' : 'Yeni Kurum ve Giriş Hesabı Ekle'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {initialSchool ? 'Mevcut kurum ve yöneticisi bilgilerini güncelleyin' : 'Merkezi sisteme yeni okul tanımlayın ve personeli için giriş hesabı oluşturun'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {validationError && (
            <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Kurum Kodu & Otomatik Üret Butonu */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                MEB Kurum Kodu (Giriş Kullanıcı Adı) *
              </label>
              {!initialSchool && (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="flex items-center space-x-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Otomatik Kod Üret</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={8}
                value={institutionCode}
                onChange={(e) => {
                  setInstitutionCode(e.target.value);
                  setValidationError(null);
                }}
                placeholder="Örn: 752140"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Kurum yetkilisi sisteme giriş yaparken bu kodu kullanıcı adı olarak kullanacaktır.
            </p>
          </div>

          {/* Kurum Adı */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kurum / Okul Tam Adı *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setValidationError(null);
              }}
              placeholder="Örn: Atatürk Anadolu Lisesi"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Genel Müdürlük Seçimi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bağlı Olduğu MEB Genel Müdürlüğü *
            </label>
            <div className="relative">
              <select
                value={generalDirectorate}
                onChange={(e) => setGeneralDirectorate(e.target.value as GeneralDirectorate)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {GENERAL_DIRECTORATES.map((dir) => (
                  <option key={dir} value={dir}>
                    {dir}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* İl & İlçe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                İl
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Örn: Ankara"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                İlçe
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Örn: Çankaya"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Kurum Türü & Okul Müdürü */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kurum Türü
              </label>
              <select
                value={schoolType}
                onChange={(e) => setSchoolType(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white outline-none"
              >
                <option value="Anadolu Lisesi">Anadolu Lisesi</option>
                <option value="Fen Lisesi">Fen Lisesi</option>
                <option value="İlkokul">İlkokul</option>
                <option value="Ortaokul">Ortaokul</option>
                <option value="İmam Hatip Ortaokulu">İmam Hatip Ortaokulu</option>
                <option value="Yaygın Eğitim / HEM">Yaygın Eğitim / HEM</option>
                <option value="Mesleki ve Teknik AL">Mesleki ve Teknik AL</option>
                <option value="Özel Eğitim Okulu">Özel Eğitim Okulu</option>
                <option value="Anaokulu">Anaokulu</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Okul Müdürü
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="Ad Soyad"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* İletişim Telefonu & E-posta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                İletişim Telefonu
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Örn: 0312 419 2030"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Resmi E-Posta
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Örn: 752140@meb.k12.tr"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* İlk Giriş Şifresi (Yalnızca Yeni Kurum Oluşturulurken) */}
          {!initialSchool && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-950 dark:text-blue-100">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>İlk Giriş Şifresi Belirleme (Zorunlu)</span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                Kurum personeli bu şifre ile ilk oturumunu açacaktır. Şifre admin tarafından belirlenir ve veritabanında güvenli şekilde (bcrypt) saklanır.
              </p>
              <input
                type="text"
                required
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="Admin tarafından belirlenen giriş şifresi (En az 6 karakter)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
              />
            </div>
          )}

          {/* Footer Butonları */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{initialSchool ? 'Değişiklikleri Kaydet' : 'Kurumu ve Hesabı Oluştur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
