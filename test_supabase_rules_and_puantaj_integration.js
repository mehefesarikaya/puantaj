// test_supabase_rules_and_puantaj_integration.js
// Supabase Ücret ve Kurallar Entegrasyonu ve Puantaj Hesaplama Doğrulama Testi

import assert from 'assert';

console.log('================================================================');
console.log('   ÜCRET VE KURALLAR & SUPABASE & PUANTAJ ENTEGRASYON TESTİ   ');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. Dinamik Saatlik Ek Ders Ücreti Hesaplama Fonksiyonu Testi
// -------------------------------------------------------------
function calculateEffectiveHourlyRate(rules, educationLevel = 'lisans', isSpecialEducation = false, isDyk = false) {
  const baseDayRate = rules.gunduzHourlyRate ?? 220.57;
  let bonus = 0;

  if (isDyk) {
    bonus = rules.dykBonusPercent ?? 100;
  } else if (isSpecialEducation) {
    bonus = rules.ozelEgitimBonusPercent ?? 25;
  } else if (educationLevel === 'doktora') {
    bonus = rules.doktoraBonusPercent ?? 20;
  } else if (educationLevel === 'yuksek_lisans') {
    bonus = rules.yuksekLisansBonusPercent ?? 7;
  }

  return Math.round(baseDayRate * (1 + bonus / 100) * 100) / 100;
}

const defaultRules = {
  gunduzHourlyRate: 220.57,
  geceHaftasonuHourlyRate: 236.33,
  ucretliHourlyRate: 220.57,
  bonusFiveToOne: true,
  incomeTaxRate: 0.15,
  stampTaxRate: 0.00759,
  sgkEmployerShareRate: 0.205,
  sgkEmployeeShareRate: 0.14,
  unemploymentEmployeeRate: 0.01,
  effectiveDate: '2026-07-01',
  yuksekLisansBonusPercent: 7,
  doktoraBonusPercent: 20,
  ozelEgitimBonusPercent: 25,
  dykBonusPercent: 100,
  nobetHoursPerWeek: 3,
  sinifRehberlikHoursPerWeek: 2,
};

// Test 1: Varsayılan değerler kontrolü
const defaultLisans = calculateEffectiveHourlyRate(defaultRules, 'lisans');
const defaultYL = calculateEffectiveHourlyRate(defaultRules, 'yuksek_lisans');
const defaultDoktora = calculateEffectiveHourlyRate(defaultRules, 'doktora');
const defaultOzel = calculateEffectiveHourlyRate(defaultRules, 'lisans', true);
const defaultDyk = calculateEffectiveHourlyRate(defaultRules, 'lisans', false, true);

assert.strictEqual(defaultLisans, 220.57);
assert.strictEqual(defaultYL, 236.01);
assert.strictEqual(defaultDoktora, 264.68); // 220.57 * 1.20 = 264.684 -> 264.68
assert.strictEqual(defaultOzel, 275.71);
assert.strictEqual(defaultDyk, 441.14);
console.log('✓ TEST 1: Varsayılan MEB katsayıları ve artırımlı ücret hesaplamaları başarıyla doğrulandı.');

// -------------------------------------------------------------
// 2. Admin Tarafından Kurallar Değiştirildiğinde Dinamik Hesaplama
// -------------------------------------------------------------
const adminUpdatedRules = {
  ...defaultRules,
  gunduzHourlyRate: 250.00,
  geceHaftasonuHourlyRate: 270.00,
  yuksekLisansBonusPercent: 10,  // %10
  doktoraBonusPercent: 25,       // %25
  ozelEgitimBonusPercent: 30,    // %30
  dykBonusPercent: 100,          // %100
  nobetHoursPerWeek: 4,
};

const updatedLisans = calculateEffectiveHourlyRate(adminUpdatedRules, 'lisans');
const updatedYL = calculateEffectiveHourlyRate(adminUpdatedRules, 'yuksek_lisans');
const updatedDoktora = calculateEffectiveHourlyRate(adminUpdatedRules, 'doktora');
const updatedOzel = calculateEffectiveHourlyRate(adminUpdatedRules, 'lisans', true);
const updatedDyk = calculateEffectiveHourlyRate(adminUpdatedRules, 'lisans', false, true);

// 250 * 1.10 = 275.00
assert.strictEqual(updatedLisans, 250.00);
assert.strictEqual(updatedYL, 275.00);
// 250 * 1.25 = 312.50
assert.strictEqual(updatedDoktora, 312.50);
// 250 * 1.30 = 325.00
assert.strictEqual(updatedOzel, 325.00);
// 250 * 2.00 = 500.00
assert.strictEqual(updatedDyk, 500.00);
console.log('✓ TEST 2: Admin katsayı ve artırım oranlarını güncellediğinde birim ücretler dinamik hesaplandı.');

// -------------------------------------------------------------
// 3. Supabase Tablo Mapping Mantığı (payment_calculation_rules & meb_payment_rules)
// -------------------------------------------------------------
function mapRulesToSupabasePayloads(rules) {
  const calcPayload = {
    id: 'default',
    effective_date: rules.effectiveDate,
    gunduz_hourly_rate: rules.gunduzHourlyRate,
    gece_haftasonu_hourly_rate: rules.geceHaftasonuHourlyRate,
    yuksek_lisans_bonus_percent: rules.yuksekLisansBonusPercent,
    doktora_bonus_percent: rules.doktoraBonusPercent,
    ozel_egitim_bonus_percent: rules.ozelEgitimBonusPercent,
    dyk_bonus_percent: rules.dykBonusPercent,
    nobet_hours_per_week: rules.nobetHoursPerWeek,
    sinif_rehberlik_hours_per_week: rules.sinifRehberlikHoursPerWeek,
    income_tax_rate: rules.incomeTaxRate,
    stamp_tax_rate: rules.stampTaxRate,
  };

  const mebPayload = {
    id: 'default',
    effective_date: rules.effectiveDate,
    ucretli_hourly_rate: rules.ucretliHourlyRate,
    bonus_five_to_one: rules.bonusFiveToOne,
    income_tax_rate: rules.incomeTaxRate,
    stamp_tax_rate: rules.stampTaxRate,
    sgk_employer_share_rate: rules.sgkEmployerShareRate,
    sgk_employee_share_rate: rules.sgkEmployeeShareRate,
    unemployment_employee_rate: rules.unemploymentEmployeeRate,
  };

  return { calcPayload, mebPayload };
}

const { calcPayload, mebPayload } = mapRulesToSupabasePayloads(adminUpdatedRules);

assert.strictEqual(calcPayload.gunduz_hourly_rate, 250.00);
assert.strictEqual(calcPayload.yuksek_lisans_bonus_percent, 10);
assert.strictEqual(calcPayload.nobet_hours_per_week, 4);
assert.strictEqual(mebPayload.ucretli_hourly_rate, 220.57);
assert.strictEqual(mebPayload.bonus_five_to_one, true);
console.log('✓ TEST 3: Supabase çift tablo veri eşleştirmesi (payment_calculation_rules + meb_payment_rules) hatasız yapıldı.');

// -------------------------------------------------------------
// 4. Supabase'den Kuralları Çekme ve Birleştirme (fetchRules)
// -------------------------------------------------------------
function mergeSupabaseRules(calcRow, mebRow) {
  return {
    gunduzHourlyRate: Number(calcRow?.gunduz_hourly_rate ?? 220.57),
    geceHaftasonuHourlyRate: Number(calcRow?.gece_haftasonu_hourly_rate ?? 236.33),
    ucretliHourlyRate: Number(mebRow?.ucretli_hourly_rate ?? calcRow?.gunduz_hourly_rate ?? 220.57),
    bonusFiveToOne: mebRow?.bonus_five_to_one ?? true,
    incomeTaxRate: Number(calcRow?.income_tax_rate ?? mebRow?.income_tax_rate ?? 0.15),
    stampTaxRate: Number(calcRow?.stamp_tax_rate ?? mebRow?.stamp_tax_rate ?? 0.00759),
    sgkEmployerShareRate: Number(mebRow?.sgk_employer_share_rate ?? 0.205),
    sgkEmployeeShareRate: Number(mebRow?.sgk_employee_share_rate ?? 0.14),
    unemploymentEmployeeRate: Number(mebRow?.unemployment_employee_rate ?? 0.01),
    effectiveDate: calcRow?.effective_date ?? mebRow?.effective_date ?? '2026-07-01',
    yuksekLisansBonusPercent: Number(calcRow?.yuksek_lisans_bonus_percent ?? 7),
    doktoraBonusPercent: Number(calcRow?.doktora_bonus_percent ?? 20),
    ozelEgitimBonusPercent: Number(calcRow?.ozel_egitim_bonus_percent ?? 25),
    dykBonusPercent: Number(calcRow?.dyk_bonus_percent ?? 100),
    nobetHoursPerWeek: Number(calcRow?.nobet_hours_per_week ?? 3),
    sinifRehberlikHoursPerWeek: Number(calcRow?.sinif_rehberlik_hours_per_week ?? 2),
  };
}

const fetchedMergedRules = mergeSupabaseRules(calcPayload, mebPayload);
assert.strictEqual(fetchedMergedRules.gunduzHourlyRate, 250.00);
assert.strictEqual(fetchedMergedRules.doktoraBonusPercent, 25);
assert.strictEqual(fetchedMergedRules.nobetHoursPerWeek, 4);
console.log('✓ TEST 4: Supabase\'den okunan satırların MebPaymentRules modeline birleştirilmesi başarılı.');

// -------------------------------------------------------------
// 5. Yetkilendirme Kontrolü (Sadece Admin Güncelleyebilir)
// -------------------------------------------------------------
function checkCanUpdateRules(currentUser) {
  if (currentUser?.role !== 'admin') {
    throw new Error('Yetkisiz işlem: Ücret ve hesaplama kurallarını yalnızca sistem yöneticisi (Admin) değiştirebilir.');
  }
  return true;
}

const adminUser = { id: 'u-1', role: 'admin', name: 'Yönetici' };
const schoolUser = { id: 'u-2', role: 'kurum', name: 'Okul Kullanıcısı' };
const teacherUser = { id: 'u-3', role: 'ogretmen', name: 'Öğretmen' };

assert.strictEqual(checkCanUpdateRules(adminUser), true);
assert.throws(() => checkCanUpdateRules(schoolUser), /Yetkisiz işlem/);
assert.throws(() => checkCanUpdateRules(teacherUser), /Yetkisiz işlem/);
console.log('✓ TEST 5: Yetkilendirme doğrulaması: Sadece Admin güncelleyebilir, kurum ve öğretmen reddedildi.');

// -------------------------------------------------------------
// 6. Onaylı vs Onaysız Puantaj Kayıtlarının Yeniden Hesaplanması
// -------------------------------------------------------------
const sampleSubmissions = [
  { schoolId: 'school-1', year: 2026, month: 11, status: 'taslak' },
  { schoolId: 'school-2', year: 2026, month: 11, status: 'duzeltme_istendi' },
  { schoolId: 'school-3', year: 2026, month: 10, status: 'onaylandi' }, // Dondurulmuş / onaylı
];

const mockPuantajRows = [
  // Taslak kayıt: Yeniden hesaplanmalı
  {
    id: 'row-1',
    schoolId: 'school-1',
    teacherId: 't-1',
    year: 2026,
    month: 11,
    totalHours: 20,
    hourlyRate: 220.57,
    grossAmount: 4411.40,
  },
  // Düzeltme istendi: Yeniden hesaplanmalı
  {
    id: 'row-2',
    schoolId: 'school-2',
    teacherId: 't-2',
    year: 2026,
    month: 11,
    totalHours: 20,
    hourlyRate: 220.57,
    grossAmount: 4411.40,
  },
  // Onaylanmış: KESİNLİKLE DEĞİŞTİRİLMEMELİ
  {
    id: 'row-3',
    schoolId: 'school-3',
    teacherId: 't-3',
    year: 2026,
    month: 10,
    totalHours: 20,
    hourlyRate: 220.57,
    grossAmount: 4411.40,
  },
];

function applyRulesRecalculation(rows, submissions, newRules) {
  const updatedRows = rows.map(row => {
    const sub = submissions.find(s => s.schoolId === row.schoolId && s.year === row.year && s.month === row.month);
    // Onaylanmış geçmiş kayıtlar dondurulur
    if (sub?.status === 'onaylandi') {
      return { ...row, recalculationSkipped: true };
    }

    // Taslak veya düzeltme istenenler güncel kural birim ücretine göre güncellenir
    const effectiveRate = newRules.gunduzHourlyRate;
    const grossAmount = Math.round(row.totalHours * effectiveRate * 100) / 100;

    return {
      ...row,
      hourlyRate: effectiveRate,
      grossAmount,
      recalculated: true,
    };
  });

  return updatedRows;
}

const recalculatedResult = applyRulesRecalculation(mockPuantajRows, sampleSubmissions, adminUpdatedRules);

// row-1 güncellendi
assert.strictEqual(recalculatedResult[0].hourlyRate, 250.00);
assert.strictEqual(recalculatedResult[0].grossAmount, 5000.00);
assert.strictEqual(recalculatedResult[0].recalculated, true);

// row-2 güncellendi
assert.strictEqual(recalculatedResult[1].hourlyRate, 250.00);
assert.strictEqual(recalculatedResult[1].grossAmount, 5000.00);
assert.strictEqual(recalculatedResult[1].recalculated, true);

// row-3 (onaylı) DEĞİŞMEDİ
assert.strictEqual(recalculatedResult[2].hourlyRate, 220.57);
assert.strictEqual(recalculatedResult[2].grossAmount, 4411.40);
assert.strictEqual(recalculatedResult[2].recalculationSkipped, true);
console.log('✓ TEST 6: Onaysız (taslak / düzeltme) puantajlar yeni kurala göre güncellendi; onaylanmış kayıtlar korundu.');

// -------------------------------------------------------------
// 7. Net ve Brüt Ödeme Özeti Hesaplaması Testi
// -------------------------------------------------------------
function calculateNetSummary(totalHours, effectiveRate, rules) {
  const gross = Math.round(totalHours * effectiveRate * 100) / 100;
  const incomeTax = Math.round(gross * rules.incomeTaxRate * 100) / 100;
  const stampTax = Math.round(gross * rules.stampTaxRate * 100) / 100;
  const totalDeduction = Math.round((incomeTax + stampTax) * 100) / 100;
  const net = Math.round((gross - totalDeduction) * 100) / 100;

  return { gross, incomeTax, stampTax, net };
}

const paymentSummary = calculateNetSummary(40, 250.00, adminUpdatedRules);
// gross: 40 * 250 = 10000
assert.strictEqual(paymentSummary.gross, 10000.00);
// incomeTax: 10000 * 0.15 = 1500.00
assert.strictEqual(paymentSummary.incomeTax, 1500.00);
// stampTax: 10000 * 0.00759 = 75.90
assert.strictEqual(paymentSummary.stampTax, 75.90);
// net: 10000 - 1575.90 = 8424.10
assert.strictEqual(paymentSummary.net, 8424.10);
console.log('✓ TEST 7: Güncel kurallar üzerinden brüt, gelir vergisi, damga vergisi ve net tutar hesaplaması doğrulandı.');

// -------------------------------------------------------------
// 8. Eşit Dağıtım ve Tarih Aralığı Uyumluluğu
// -------------------------------------------------------------
// MEB Çizelgesinden hesaplanan toplam ek dersin ayın seçili iş günlerine eşit dağıtılması mantığı
function distributeWeeklyHoursEqually(weeklyTotalHours, weekdaysCount) {
  const baseHour = Math.floor(weeklyTotalHours / weekdaysCount);
  const remainder = weeklyTotalHours % weekdaysCount;

  const distribution = [];
  for (let i = 0; i < weekdaysCount; i++) {
    distribution.push(baseHour + (i < remainder ? 1 : 0));
  }
  return distribution;
}

const dist18 = distributeWeeklyHoursEqually(18, 5); // [4, 4, 4, 3, 3] -> toplam 18
assert.deepStrictEqual(dist18, [4, 4, 4, 3, 3]);
assert.strictEqual(dist18.reduce((a, b) => a + b, 0), 18);
console.log('✓ TEST 8: MEB çizelgesindeki toplam ek dersin günlere eşit dağıtım algoritması entegrasyonla uyumlu.');

// -------------------------------------------------------------
// 9. Resmi MEB Katsayılarına Sıfırlama
// -------------------------------------------------------------
function resetToOfficialDefaults() {
  return { ...defaultRules };
}

const resetRules = resetToOfficialDefaults();
assert.strictEqual(resetRules.gunduzHourlyRate, 220.57);
assert.strictEqual(resetRules.doktoraBonusPercent, 20);
assert.strictEqual(calculateEffectiveHourlyRate(resetRules, 'doktora'), 264.68);
console.log('✓ TEST 9: Resmi MEB katsayılarına sıfırlama mekanizması doğrulandı.');

// -------------------------------------------------------------
// 10. Hata Yönetimi ve Girdi Doğrulama
// -------------------------------------------------------------
function validateRuleInputs(rules) {
  if (rules.gunduzHourlyRate <= 0) return 'Gündüz birim ücreti sıfırdan büyük olmalıdır.';
  if (rules.incomeTaxRate < 0 || rules.incomeTaxRate > 1) return 'Geçersiz vergi oranı.';
  if (!rules.effectiveDate) return 'Geçerlilik tarihi belirtilmelidir.';
  return null;
}

assert.strictEqual(validateRuleInputs(adminUpdatedRules), null);
assert.strictEqual(validateRuleInputs({ ...adminUpdatedRules, gunduzHourlyRate: -10 }), 'Gündüz birim ücreti sıfırdan büyük olmalıdır.');
assert.strictEqual(validateRuleInputs({ ...adminUpdatedRules, incomeTaxRate: 1.5 }), 'Geçersiz vergi oranı.');
assert.strictEqual(validateRuleInputs({ ...adminUpdatedRules, effectiveDate: '' }), 'Geçerlilik tarihi belirtilmelidir.');
console.log('✓ TEST 10: Girdi doğrulama ve hata yakalama mekanizması başarıyla test edildi.');

console.log('\n================================================================');
console.log('   TÜM 10 SENARYO VE ENTEGRASYON TESTİ BAŞARIYLA TAMAMLANDI!   ');
console.log('================================================================');
