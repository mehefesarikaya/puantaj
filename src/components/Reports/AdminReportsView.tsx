import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  HelpCircle,
  TableProperties,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MONTH_NAMES_TR,
  getDaysInMonth,
  downloadOriginalMonthlyTemplate,
  parseMonthlyPuantajExcel,
  exportMonthlyPuantajToExcel,
} from '../../utils/excelPuantajUtils';
import { ExcelPuantajImportRow } from '../../types';

export const AdminReportsView: React.FC = () => {
  const {
    schools,
    teachers,
    puantajRows,
    selectedYear,
    selectedMonth,
    selectedSchoolId,
    setSelectedSchoolId,
    batchImportPuantajRows,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validatedRows, setValidatedRows] = useState<ExcelPuantajImportRow[]>([]);
  const [importTargetSchoolId, setImportTargetSchoolId] = useState<string>(
    selectedSchoolId === 'all' ? schools[0]?.id || '' : selectedSchoolId
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const monthName = MONTH_NAMES_TR[selectedMonth] || '';
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      const parsed = await parseMonthlyPuantajExcel(file, daysInMonth);
      setValidatedRows(parsed);
    } catch (err: any) {
      alert(`Dosya okunurken hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
      setValidatedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    const validRows = validatedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('İçe aktarılacak geçerli kayıt bulunamadı.');
      return;
    }

    if (!importTargetSchoolId) {
      alert('Lütfen verilerin aktarılacağı okulu seçin.');
      return;
    }

    const rowsToImport = validRows.map((r) => ({
      tcNo: r.tcNo,
      fullName: r.fullName,
      iban: r.iban,
      explanation: r.explanation,
      hasOtherEmployer: r.hasOtherEmployer,
      otherEmployerTaxBase: r.otherEmployerTaxBase,
      dailyHours: r.dailyHours,
    }));

    batchImportPuantajRows(rowsToImport, importTargetSchoolId, selectedYear, selectedMonth);

    const schoolName = schools.find((s) => s.id === importTargetSchoolId)?.name || '';
    setSuccessMessage(
      `Başarılı! ${rowsToImport.length} öğretmenin ${monthName} ${selectedYear} puantaj verisi "${schoolName}" bünyesine aktarıldı.`
    );

    setValidatedRows([]);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    const schoolName = selectedSchoolId === 'all'
      ? 'Tum_Okullar'
      : schools.find((s) => s.id === selectedSchoolId)?.name || 'Okul';

    const activeTeachers = teachers.filter(
      (t) => t.isActive && (selectedSchoolId === 'all' || t.schoolId === selectedSchoolId)
    );

    const exportData = activeTeachers.map((t) => {
      const r = puantajRows.find((p) => p.teacherId === t.id && p.year === selectedYear && p.month === selectedMonth);
      return {
        teacher: t,
        dailyHours: r ? r.dailyHours : {},
        totalHours: r ? r.totalHours : 0,
      };
    });

    exportMonthlyPuantajToExcel(schoolName, selectedYear, selectedMonth, exportData);
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const errorCount = validatedRows.filter((r) => !r.isValid).length;
  const warningCount = validatedRows.filter((r) => r.warnings.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Raporlama, Excel İthalatı ve Resmi Çıktı Merkezi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Okullardan gelen Excel puantaj dosyalarını içe aktarın, doğruluğunu denetleyin veya resmi MEB şablonu formatında dışa aktarın.
        </p>
      </div>

      {/* Top Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Download Template */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Orijinal Aylık Excel Şablonu
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              T.C. Kimlik No, Ad Soyad, 1-31 Günlük hücreler, IBAN, Açıklama ve Vergi Matrahı sütunlarını içeren resmi MEB Excel şablonu.
            </p>
          </div>
          <button
            onClick={() => downloadOriginalMonthlyTemplate(selectedYear, selectedMonth)}
            className="mt-4 flex items-center justify-center space-x-2 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Şablonu İndir (.xlsx)</span>
          </button>
        </div>

        {/* Card 2: Export Puantaj */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Dönem Puantajını Excel'e Aktar
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {monthName} {selectedYear} döneminde onaylanan veya girilen tüm okul kayıtlarını orijinal Excel sütun yapısında indirin.
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="mt-4 flex items-center justify-center space-x-2 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Puantajı İndir (.xlsx)</span>
          </button>
        </div>

        {/* Card 3: Print / PDF */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 mb-3">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Resmi Çıktı ve Yazdırma
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Puantaj cetvelini onay ve imza blokları ile birlikte doğrudan yazdırın veya tarayıcınızdan PDF olarak kaydedin.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="mt-4 flex items-center justify-center space-x-2 w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır / PDF Kaydet</span>
          </button>
        </div>
      </div>

      {/* Upload and Import Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Okul Puantaj Dosyası Yükleme ve Doğrulama
            </h3>
            <p className="text-xs text-slate-500">
              Okul tarafından doldurulan Excel dosyasını seçin ve yüklemeden önce önizleyin.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Hedef Okul:</span>
            <select
              value={importTargetSchoolId}
              onChange={(e) => setImportTargetSchoolId(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-750 font-semibold"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag Drop Area */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-900/30">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
            id="excelUploadPuantajInput"
          />
          <label htmlFor="excelUploadPuantajInput" className="cursor-pointer flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {selectedFile ? selectedFile.name : 'Excel Dosyası Seçin (.xlsx / .xls)'}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              "Ders Ücreti Karşılığında Görevlendirilenlerin Puantajı" şablon formatı
            </span>
          </label>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Validation & Preview Section */}
      {validatedRows.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                İçe Aktarma Önizleme ve Doğrulama Raporu
              </h3>
              <p className="text-xs text-slate-500">
                Dosyadaki {validatedRows.length} satır kontrol edildi.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {validCount} Geçerli
              </span>
              {errorCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  {errorCount} Hatalı
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Satır</th>
                  <th className="py-2.5 px-3">T.C. Kimlik No</th>
                  <th className="py-2.5 px-3">Adı Soyadı</th>
                  <th className="py-2.5 px-3 text-center">Toplam Saat</th>
                  <th className="py-2.5 px-3">IBAN</th>
                  <th className="py-2.5 px-3">Açıklama</th>
                  <th className="py-2.5 px-3 text-center">Başka İşveren?</th>
                  <th className="py-2.5 px-3">Durum / Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {validatedRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${
                      !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-400">#{row.rowNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">{row.tcNo}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">{row.fullName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.totalHours} sa</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">{row.iban}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">{row.explanation || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {row.hasOtherEmployer ? 'EVET' : 'HAYIR'}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {row.errors.length > 0 ? (
                        <span className="text-rose-600 font-medium">{row.errors.join(', ')}</span>
                      ) : row.warnings.length > 0 ? (
                        <span className="text-amber-600">{row.warnings.join(', ')}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Geçerli
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              * Geçersiz satırlar atlanır, sadece doğrulanmış ({validCount}) kayıt kaydedilir.
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setValidatedRows([])}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 hover:bg-slate-100"
              >
                İptal Et
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow"
              >
                Onayla ve Sisteme Kaydet ({validCount} Öğretmen)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

