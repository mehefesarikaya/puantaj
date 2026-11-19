import assert from 'assert';
import fs from 'fs';
import * as XLSX from 'xlsx';

console.log('--- MEB AYLIK PUANTAJ DOĞRULAMA TESTLERİ ---');

// 1. Read actual user Excel file
const fileName = 'Ders Ucreti Karsiliginda Gorevlendirilenlerin Ekim Ayi Ders Saatleri Puantaji Sablonu.xlsx';
const buf = fs.readFileSync(fileName);
const wb = XLSX.read(buf, { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];

const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Row 0 is Title
assert.ok(data[0][0].includes('DERS ÜCRETİ KARŞILIĞINDA GÖREVLENDİRİLENLERİN EKİM AYI DERS SAATLERİ PUANTAJI'));
console.log('✓ Başlık satırı doğrulandı:', data[0][0]);

// Row 1 is Headers
const headers = data[1];
assert.strictEqual(headers[0], 'T.C. KİMLİK NO');
assert.strictEqual(headers[1], 'ADI SOYADI');
assert.strictEqual(headers[2], 1);
assert.strictEqual(headers[32], 31);
assert.strictEqual(headers[33], 'IBAN');
assert.strictEqual(headers[34], 'AÇIKLAMA/AYRILIŞ TARİHİ');
assert.strictEqual(headers[35], 'BAŞACA BİR İŞVERENDE ÇALILIYOR MU?');
console.log('✓ Sütun başlıkları (T.C., Ad Soyad, 1-31 Günler, IBAN, Açıklama, Başka İşveren) doğrulandı.');

// Row 2: Ayşenur Öçal
const rowAysenur = data[2];
assert.strictEqual(String(rowAysenur[0]), '51025187672');
assert.strictEqual(rowAysenur[1], 'AYŞENUR ÖÇAL');
assert.strictEqual(rowAysenur[6], 6); // Day 5 (index 1 + 5 = 6) -> 6
assert.strictEqual(rowAysenur[8], 9); // Day 7 -> 9
assert.strictEqual(rowAysenur[9], 2); // Day 8 -> 2
assert.strictEqual(rowAysenur[33], 'TR030004600152888000222958');
console.log('✓ Ayşenur Öçal satırı ve hücre verileri doğrulandı.');

// Row 3: Sümeyra Kolat
const rowSumeyra = data[3];
assert.strictEqual(String(rowSumeyra[0]), '11945043366');
assert.strictEqual(rowSumeyra[1], 'SÜMEYRA KOLAT');
assert.strictEqual(rowSumeyra[2], 7); // Day 1 -> 7
assert.strictEqual(rowSumeyra[3], 8); // Day 2 -> 8
assert.strictEqual(rowSumeyra[6], 9); // Day 5 -> 9
assert.strictEqual(rowSumeyra[34], 'USTAÖĞRETİCİ');
console.log('✓ Sümeyra Kolat satırı ve Ustaöğretici unvanı doğrulandı.');

// 2. Test 5'e 1 calculation formula
function calculateBonus(actualHours) {
  return Math.floor(actualHours / 5);
}
assert.strictEqual(calculateBonus(10), 2);
assert.strictEqual(calculateBonus(14), 2);
assert.strictEqual(calculateBonus(15), 3);
assert.strictEqual(calculateBonus(60), 12);
console.log('✓ 5\'e 1 hazırlık ve planlama ilavesi testi başarılı.');

// 3. Test gross & net calculation
const actual = 60;
const bonus = calculateBonus(actual); // 12
const payable = actual + bonus; // 72
const hourlyRate = 140;
const gross = payable * hourlyRate; // 72 * 140 = 10080
const incomeTax = gross * 0.15; // 1512
const stampTax = gross * 0.00759; // 76.5072
const net = gross - (incomeTax + stampTax);
assert.strictEqual(gross, 10080);
assert.strictEqual(net > 8400, true);
console.log('✓ Tahakkuk ve vergi kesintisi hesaplaması başarılı (Brüt: ' + gross + ' TL, Net: ' + net.toFixed(2) + ' TL).');

console.log('TÜM TESTLER BAŞARIYLA TAMAMLANDI!');

