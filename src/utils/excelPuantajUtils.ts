import * as XLSX from 'xlsx';
import { ExcelPuantajImportRow, School, Teacher, TeacherMonthlyPuantajRow } from '../types';

export const MONTH_NAMES_TR = [
  '',
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

/**
 * Returns the number of days in a given year and month (handles leap years)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Downloads the exact MEB monthly puantaj Excel template
 */
export function downloadOriginalMonthlyTemplate(year: number = 2026, month: number = 10): void {
  const monthNameUpper = (MONTH_NAMES_TR[month] || 'EKİM').toUpperCase();
  const daysCount = getDaysInMonth(year, month);

  // Row 0: Title banner
  const titleText = `DERS ÜCRETİ KARŞILIĞINDA GÖREVLENDİRİLENLERİN ${monthNameUpper} AYI DERS SAATLERİ PUANTAJI`;

  // Row 1: Headers
  const headers: (string | number)[] = ['T.C. KİMLİK NO', 'ADI SOYADI'];
  for (let day = 1; day <= daysCount; day++) {
    headers.push(day);
  }
  headers.push(
    'IBAN',
    'AÇIKLAMA/AYRILIŞ TARİHİ',
    'BAŞKACA BİR İŞVERENDE ÇALIŞIYOR MU?',
    'BAŞKACA İŞVERENDE ÇALIŞIYORSA AYLIK VERGİ MATRAHI'
  );

  // Sample data identical to the provided template
  const sampleRow1: (string | number)[] = [
    '51025187672',
    'AYŞENUR ÖÇAL',
  ];
  for (let day = 1; day <= daysCount; day++) {
    if ([5, 12, 19, 26].includes(day)) sampleRow1.push(6);
    else if ([7, 21].includes(day)) sampleRow1.push(9);
    else if ([8, 9, 16, 22, 23, 30].includes(day)) sampleRow1.push(2);
    else if (day === 28) sampleRow1.push(4);
    else sampleRow1.push('');
  }
  sampleRow1.push('TR030004600152888000222958', '', 'HAYIR', '');

  const sampleRow2: (string | number)[] = [
    '11945043366',
    'SÜMEYRA KOLAT',
  ];
  for (let day = 1; day <= daysCount; day++) {
    if ([1, 8, 15].includes(day)) sampleRow2.push(7);
    else if ([2, 9, 16, 30].includes(day)) sampleRow2.push(8);
    else if ([5, 6, 12, 13, 26, 27].includes(day)) sampleRow2.push(9);
    else if ([7, 28].includes(day)) sampleRow2.push(5);
    else sampleRow2.push('');
  }
  sampleRow2.push('TR960004600152888000209935', 'USTAÖĞRETİCİ', 'HAYIR', '');

  const titleRow = [titleText];
  const rows = [titleRow, headers, sampleRow1, sampleRow2];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Merge the title row across all columns
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Puantaj Cetveli');

  const fileName = `Ders_Ucreti_${monthNameUpper}_Ayi_Puantaji_Sablonu.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Validates a Turkish ID Number (11 digits)
 */
export function isValidTcNo(tc: string): boolean {
  if (!tc) return false;
  const cleaned = tc.replace(/\s+/g, '');
  return /^[1-9][0-9]{10}$/.test(cleaned);
}

/**
 * Validates an IBAN string
 */
export function isValidIban(iban: string): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  return cleaned.startsWith('TR') && cleaned.length === 26;
}

/**
 * Parses an uploaded Excel file matching the supplied MEB Puantaj format
 */
export async function parseMonthlyPuantajExcel(
  file: File,
  daysCount: number = 31
): Promise<ExcelPuantajImportRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find the header row (contains 'T.C.' or 'KİMLİK' or 'ADI SOYADI')
  let headerRowIndex = 1;
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const rowStr = rawRows[i].join(' ').toUpperCase();
    if (rowStr.includes('KİMLİK') || rowStr.includes('ADI SOYADI')) {
      headerRowIndex = i;
      break;
    }
  }

  const resultRows: ExcelPuantajImportRow[] = [];
  const seenTcs = new Set<string>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    if (!row || row.every((c) => String(c).trim() === '')) {
      continue; // Skip empty rows
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const tcNo = String(row[0] || '').trim().replace(/\s+/g, '');
    const fullName = String(row[1] || '').trim();

    if (!fullName) {
      errors.push('Öğretmen Adı Soyadı boş olamaz.');
    }

    if (!tcNo) {
      errors.push('T.C. Kimlik Numarası boş olamaz.');
    } else if (!isValidTcNo(tcNo)) {
      warnings.push(`T.C. Kimlik No 11 haneli standart biçimde görünmüyor (${tcNo}).`);
    }

    if (seenTcs.has(tcNo)) {
      errors.push(`Aynı dosyada mükerrer (çift) T.C. Kimlik No bulundu: ${tcNo}`);
    } else if (tcNo) {
      seenTcs.add(tcNo);
    }

    // Daily hours: columns 2 to 2 + daysCount - 1
    const dailyHours: Record<number, number | null> = {};
    let totalHours = 0;

    for (let day = 1; day <= daysCount; day++) {
      const cellVal = row[1 + day];
      if (cellVal === '' || cellVal === undefined || cellVal === null) {
        dailyHours[day] = null; // Unentered / no lesson day
      } else {
        const num = Number(cellVal);
        if (isNaN(num) || num < 0) {
          errors.push(`Gün ${day} için geçersiz ders saati: "${cellVal}"`);
          dailyHours[day] = null;
        } else {
          dailyHours[day] = num;
          totalHours += num;
        }
      }
    }

    // Trailing columns
    const ibanColIndex = 2 + daysCount;
    const iban = String(row[ibanColIndex] || '').trim().replace(/\s+/g, '').toUpperCase();
    const explanation = String(row[ibanColIndex + 1] || '').trim();
    const otherEmployerStr = String(row[ibanColIndex + 2] || '').trim().toUpperCase();
    const otherEmployerTaxBase = Number(row[ibanColIndex + 3]) || 0;

    const hasOtherEmployer = otherEmployerStr === 'EVET' || otherEmployerStr === 'TRUE' || otherEmployerStr === '1';

    if (iban && !isValidIban(iban)) {
      warnings.push('IBAN formatı TR ile başlayan 26 karakter formatına uymuyor.');
    }

    resultRows.push({
      rowNumber: rowIndex + 1,
      tcNo,
      fullName,
      dailyHours,
      totalHours,
      iban,
      explanation,
      hasOtherEmployer,
      otherEmployerTaxBase,
      errors,
      warnings,
      isValid: errors.length === 0,
    });
  }

  return resultRows;
}

/**
 * Exports the monthly puantaj back to Excel in the exact supplied format
 */
export function exportMonthlyPuantajToExcel(
  schoolName: string,
  year: number,
  month: number,
  puantajRows: {
    teacher: Teacher;
    dailyHours: Record<number, number | null>;
    totalHours: number;
  }[]
): void {
  const monthNameUpper = (MONTH_NAMES_TR[month] || 'AYLIK').toUpperCase();
  const daysCount = getDaysInMonth(year, month);

  const titleText = `${schoolName.toUpperCase()} - ${monthNameUpper} ${year} DÖNEMİ DERS SAATLERİ PUANTAJI`;

  const headers: (string | number)[] = ['T.C. KİMLİK NO', 'ADI SOYADI'];
  for (let day = 1; day <= daysCount; day++) {
    headers.push(day);
  }
  headers.push(
    'TOPLAM SAAT',
    'IBAN',
    'AÇIKLAMA/AYRILIŞ TARİHİ',
    'BAŞKACA BİR İŞVERENDE ÇALIŞIYOR MU?',
    'BAŞKACA İŞVERENDE ÇALIŞIYORSA AYLIK VERGİ MATRAHI'
  );

  const rows: any[][] = [[titleText], headers];

  for (const item of puantajRows) {
    const row: any[] = [item.teacher.tcNo, item.teacher.fullName];

    for (let day = 1; day <= daysCount; day++) {
      const val = item.dailyHours[day];
      row.push(val !== null && val !== undefined ? val : '');
    }

    row.push(
      item.totalHours,
      item.teacher.iban,
      item.teacher.explanation || item.teacher.departureDate || '',
      item.teacher.hasOtherEmployer ? 'EVET' : 'HAYIR',
      item.teacher.otherEmployerTaxBase || ''
    );

    rows.push(row);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${monthNameUpper}_Puantaj`);

  const safeSchool = schoolName.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, '_');
  XLSX.writeFile(workbook, `${safeSchool}_${monthNameUpper}_${year}_Puantaj.xlsx`);
}

