import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { School, GeneralDirectorate, GENERAL_DIRECTORATES } from '../../types';

interface BulkSchoolImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSchools: School[];
  onImport: (schools: Array<{ school: Omit<School, 'id'>; initialPassword: string }>) => Promise<void>;
}

interface ParsedRow {
  institutionCode: string;
  name: string;
  generalDirectorate: GeneralDirectorate;
  district: string;
  schoolType: string;
  initialPassword: string;
  isDuplicate: boolean;
  isValid: boolean;
  errorMessage?: string;
}

export const BulkSchoolImportModal: React.FC<BulkSchoolImportModalProps> = ({
  isOpen,
  onClose,
  existingSchools,
  onImport,
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  // Örnek CSV şablonunu indirme
  const handleDownloadTemplate = () => {
    const csvHeader = 'Kurum Kodu;Kurum Adı;Genel Müdürlük;İlçe;Kurum Türü;İlk Şifre\n';
    const sampleRows = [
      '752101;Cumhuriyet Ortaokulu;Temel Eğitim Genel Müdürlüğü;Çankaya;Ortaokul;okul123',
      '752102;Mehmet Akif Ersoy Lisesi;Ortaöğretim Genel Müdürlüğü;Yenimahalle;Anadolu Lisesi;okul123',
      '752103;Mimar Sinan Mesleki ve Teknik AL;Mesleki ve Teknik Eğitim Genel Müdürlüğü;Keçiören;Mesleki ve Teknik AL;okul123',
    ].join('\n');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'meb_96_kurum_sablonu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metni / Tabloyu ayrıştırma (CSV, Semicolon veya Tab ile ayrılmış)
  const handleParse = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const existingCodes = new Set(existingSchools.map((s) => s.institutionCode.trim().toLowerCase()));
    const seenBatchCodes = new Set<string>();

    const rows: ParsedRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Başlık satırı kontrolü
      if (
        i === 0 &&
        (line.toLowerCase().includes('kurum kodu') || line.toLowerCase().includes('institution_code'))
      ) {
        continue;
      }

      // Ayrıştırma: Noktalı virgül, virgül veya TAB
      let parts: string[] = [];
      if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes('\t')) {
        parts = line.split('\t');
      } else {
        parts = line.split(',');
      }

      parts = parts.map((p) => p.trim());
      if (parts.length < 2) continue;

      const code = parts[0];
      const name = parts[1];
      let rawDirectorate = parts[2] || 'Temel Eğitim Genel Müdürlüğü';
      const district = parts[3] || 'Çankaya';
      const schoolType = parts[4] || 'Okul';
      const password = parts[5] || 'okul123';

      // Eşleşen Genel Müdürlük bul
      let matchedDirectorate: GeneralDirectorate = 'Temel Eğitim Genel Müdürlüğü';
      for (const dir of GENERAL_DIRECTORATES) {
        if (dir.toLowerCase().includes(rawDirectorate.toLowerCase()) || rawDirectorate.toLowerCase().includes(dir.toLowerCase().replace(' genel müdürlüğü', ''))) {
          matchedDirectorate = dir;
          break;
        }
      }

      const lowerCode = code.toLowerCase();
      let isDuplicate = false;
      let errorMessage = '';

      if (existingCodes.has(lowerCode)) {
        isDuplicate = true;
        errorMessage = 'Sistemde zaten kayıtlı kurum kodu';
      } else if (seenBatchCodes.has(lowerCode)) {
        isDuplicate = true;
        errorMessage = 'Bu listede mükerrer tekrar eden kod';
      } else {
        seenBatchCodes.add(lowerCode);
      }

      const isValid = Boolean(code && name && !isDuplicate);

      rows.push({
        institutionCode: code,
        name,
        generalDirectorate: matchedDirectorate,
        district,
        schoolType,
        initialPassword: password,
        isDuplicate,
        isValid,
        errorMessage,
      });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('İçe aktarılacak geçerli kurum bulunamadı.');
      return;
    }

    setIsProcessing(true);
    setImportSummary(null);

    try {
      const payload = validRows.map((r) => ({
        school: {
          institutionCode: r.institutionCode,
          name: r.name,
          province: 'Ankara',
          district: `${r.district} / Ankara`,
          schoolType: r.schoolType,
          generalDirectorate: r.generalDirectorate,
          principalName: '',
          contactPhone: '',
          contactEmail: `${r.institutionCode}@meb.k12.tr`,
          isActive: true,
          username: r.institutionCode,
          accountActive: true,
        },
        initialPassword: r.initialPassword,
      }));

      await onImport(payload);
      setImportSummary(`Toplam ${validRows.length} kurum ve kullanıcı hesabı başarıyla oluşturuldu.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Toplu içe aktarma hatası: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Toplu Kurum İçe Aktarma (Excel / CSV Desteği)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                96 kurum listesini tek seferde sisteme ekleyin, kurum kodlarını doğrulayın ve kullanıcı hesaplarını otomatik açın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {importSummary && (
            <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-2xl text-xs flex items-center space-x-2 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{importSummary}</span>
            </div>
          )}

          {/* Aksiyon Şeritleri */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Excel/CSV dosyanızı yükleyin veya metin alanına yapıştırın.</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Örnek CSV Şablonu İndir</span>
              </button>
              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Dosya Seç (.csv)</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Paste Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Excel'den Kopyalanan Verileri Buraya Yapıştırın:
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder="Örnek: 752101;Cumhuriyet İlkokulu;Temel Eğitim Genel Müdürlüğü;Çankaya;İlkokul;okul123&#10;752102;Atatürk Lisesi;Ortaöğretim Genel Müdürlüğü;Yenimahalle;Anadolu Lisesi;okul123"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Sütun sırası: <strong>Kurum Kodu ; Kurum Adı ; Genel Müdürlük ; İlçe ; Kurum Türü ; İlk Şifre</strong>
            </p>
          </div>

          {/* Preview Stats */}
          {parsedRows.length > 0 && (
            <div className="flex items-center space-x-4 p-3 bg-slate-100 dark:bg-slate-750 rounded-xl text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">
                Toplam Okunan: <strong>{parsedRows.length}</strong>
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Geçerli: {validCount}</span>
              </span>
              {duplicateCount > 0 && (
                <span className="text-rose-700 dark:text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mükerrer/Hatalı: {duplicateCount}</span>
                </span>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Durum</th>
                    <th className="p-2.5">Kurum Kodu</th>
                    <th className="p-2.5">Kurum Adı</th>
                    <th className="p-2.5">Genel Müdürlük</th>
                    <th className="p-2.5">İlk Şifre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        row.isDuplicate
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }
                    >
                      <td className="p-2.5 font-bold">
                        {row.isDuplicate ? (
                          <span className="inline-flex items-center text-rose-600 text-[10px]">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {row.errorMessage}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-600 text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Hazır
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold">{row.institutionCode}</td>
                      <td className="p-2.5 font-semibold">{row.name}</td>
                      <td className="p-2.5 text-[11px]">{row.generalDirectorate}</td>
                      <td className="p-2.5 font-mono">{row.initialPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {validCount > 0
              ? `${validCount} kurum için otomatik kullanıcı hesabı açılacaktır.`
              : 'Verileri yapıştırıp içe aktarmaya başlayın.'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Kapat
            </button>
            <button
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessing ? 'İçe Aktarılıyor...' : `${validCount} Kurumu İçe Aktar`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

