import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Building,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Teacher, School } from '../../types';
import { AdminTeacherFormModal } from '../Teachers/AdminTeacherFormModal';
import { TeacherWeeklyScheduleModal } from '../Schedule/TeacherWeeklyScheduleModal';
import { formatTRY } from '../../utils/paymentCalculator';

export const SchoolTeacherListView: React.FC = () => {
  const {
    teachers,
    schools,
    currentUser,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<Teacher | null>(null);

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

  const filteredTeachers = teachers.filter(
    (t) =>
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tcNo.includes(searchQuery) ||
      (t.explanation && t.explanation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = (teacher: Teacher) => {
    if (confirm(`"${teacher.fullName}" adlı personeli okul listenizden silmek istediğinizden emin misiniz?`)) {
      deleteTeacher(teacher.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {school?.name || 'Kurum'} – Görevli Öğretmen ve Personel Listesi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Okulunuzda ders ücreti karşılığında görevlendirilen ücretli öğretmen ve usta öğreticilerin listesi.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTeacher(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Öğretmen Ekle</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ad Soyad veya T.C. Kimlik No ile ara..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold">
                <th className="py-3 px-4">Kimlik No / Uyruk</th>
                <th className="py-3 px-4">Adı Soyadı</th>
                <th className="py-3 px-4">Branş / Görev</th>
                <th className="py-3 px-4">Statü / Açıklama</th>
                <th className="py-3 px-4">IBAN</th>
                <th className="py-3 px-4 text-center">Başka İşveren?</th>
                <th className="py-3 px-4 text-right">Saat Ücreti</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Kayıtlı öğretmen bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span>{teacher.tcNo}</span>
                        {teacher.nationality === 'FOREIGN' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            YABANCI
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            TR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{teacher.fullName}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {teacher.educationLevel === 'doktora'
                          ? 'DOKTORA'
                          : teacher.educationLevel === 'yuksek_lisans'
                          ? 'Y. LİSANS'
                          : 'LİSANS'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {teacher.branch}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {teacher.employmentType === 'sozlesmeli'
                          ? 'SÖZLEŞMELİ'
                          : teacher.employmentType === 'ucretli'
                          ? 'ÜCRETLİ'
                          : teacher.employmentType === 'stajyer' || teacher.employmentType === 'stajer'
                          ? 'STAJYER'
                          : teacher.employmentType === 'iskurlu'
                          ? 'İŞKURLU'
                          : teacher.explanation || teacher.employmentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {teacher.iban}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {teacher.hasOtherEmployer ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          EVET
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">HAYIR</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {formatTRY(teacher.hourlyRate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {teacher.isActive ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Pasif</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setSelectedTeacherForSchedule(teacher)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                          title="Haftalık Ders Programı"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminTeacherFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          if (editingTeacher) {
            updateTeacher(data as Teacher);
          } else {
            addTeacher(data);
          }
        }}
        schools={[school]}
        initialTeacher={editingTeacher}
        defaultSchoolId={school.id}
      />

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

