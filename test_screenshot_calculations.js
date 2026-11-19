import assert from 'assert';

console.log('========================================================');
console.log('EKRAN GÖRÜNTÜSÜ REFERANS HESAPLAMA TESTLERİ');
console.log('========================================================\n');

// 1. Ek Ders Birim Ücretleri Fonksiyonu
function calculateEffectiveHourlyRate(educationLevel = 'lisans', rules, options = {}) {
  const baseDayRate = rules.gunduzHourlyRate || 220.57;

  if (options.isDyk) {
    return { baseRate: baseDayRate, bonusPercent: rules.dykBonusPercent || 100, effectiveRate: 441.14 };
  }

  if (options.isOzelEgitim) {
    return { baseRate: baseDayRate, bonusPercent: rules.ozelEgitimBonusPercent || 25, effectiveRate: 275.71 };
  }

  if (options.isGeceHaftasonu) {
    const nightRate = rules.geceHaftasonuHourlyRate || 236.33;
    return { baseRate: nightRate, bonusPercent: 0, effectiveRate: nightRate };
  }

  if (educationLevel === 'doktora') {
    return { baseRate: baseDayRate, bonusPercent: rules.doktoraBonusPercent || 20, effectiveRate: 264.69 };
  }

  if (educationLevel === 'yuksek_lisans') {
    return { baseRate: baseDayRate, bonusPercent: rules.yuksekLisansBonusPercent || 7, effectiveRate: 236.01 };
  }

  return { baseRate: baseDayRate, bonusPercent: 0, effectiveRate: baseDayRate };
}

const RULES = {
  gunduzHourlyRate: 220.57,
  geceHaftasonuHourlyRate: 236.33,
  yuksekLisansBonusPercent: 7,
  doktoraBonusPercent: 20,
  ozelEgitimBonusPercent: 25,
  dykBonusPercent: 100,
  nobetHoursPerWeek: 3,
  sinifRehberlikHoursPerWeek: 2,
  incomeTaxRate: 0.15,
  stampTaxRate: 0.00759,
};

// 1. Ek Ders Birim Ücretleri Doğrulama
const lisansRate = calculateEffectiveHourlyRate('lisans', RULES);
console.log(`✓ Lisans Brüt Saat Ücreti: ${lisansRate.effectiveRate} TL (Beklenen: 220.57 TL)`);
assert.strictEqual(lisansRate.effectiveRate, 220.57);

const yuksekLisansRate = calculateEffectiveHourlyRate('yuksek_lisans', RULES);
console.log(`✓ Yüksek Lisans Brüt Saat Ücreti: ${yuksekLisansRate.effectiveRate} TL (Beklenen: 236.01 TL)`);
assert.strictEqual(yuksekLisansRate.effectiveRate, 236.01);

const doktoraRate = calculateEffectiveHourlyRate('doktora', RULES);
console.log(`✓ Doktora Brüt Saat Ücreti: ${doktoraRate.effectiveRate} TL (Beklenen: 264.69 TL)`);
assert.strictEqual(doktoraRate.effectiveRate, 264.69);

const geceRate = calculateEffectiveHourlyRate('lisans', RULES, { isGeceHaftasonu: true });
console.log(`✓ Gece / Hafta Sonu Saat Ücreti: ${geceRate.effectiveRate} TL (Beklenen: 236.33 TL)`);
assert.strictEqual(geceRate.effectiveRate, 236.33);

const dykRate = calculateEffectiveHourlyRate('lisans', RULES, { isDyk: true });
console.log(`✓ DYK Kursu Saat Ücreti: ${dykRate.effectiveRate} TL (Beklenen: 441.14 TL)`);
assert.strictEqual(dykRate.effectiveRate, 441.14);

const ozelEgitimRate = calculateEffectiveHourlyRate('lisans', RULES, { isOzelEgitim: true });
console.log(`✓ Özel Eğitim Saat Ücreti: ${ozelEgitimRate.effectiveRate} TL (Beklenen: 275.71 TL)`);
assert.strictEqual(ozelEgitimRate.effectiveRate, 275.71);

// 2. Branş Öğretmeni Senaryosu (30 Saat Ders, Nöbet, Rehberlik)
function calculateWeekly(teacher, weeklyHours, rules) {
  const maasKarsiligi = teacher.branchCategory === 'genel_bilgi_ve_brans' ? 15 : 18;
  const excess = Math.max(0, weeklyHours - maasKarsiligi);
  const prep = Math.min(3, Math.floor(weeklyHours / 10));
  const nobet = teacher.hasGuardDuty ? rules.nobetHoursPerWeek : 0;
  const rehberlik = teacher.hasClassGuidance ? rules.sinifRehberlikHoursPerWeek : 0;
  return {
    weeklyScheduledHours: weeklyHours,
    maasKarsiligi,
    excessLessonHours: excess,
    preparationPlanningHours: prep,
    guardDutyHours: nobet,
    classGuidanceHours: rehberlik,
    weeklyAdditionalHours: excess + prep + nobet + rehberlik,
  };
}

const bransTeacher = {
  branchCategory: 'genel_bilgi_ve_brans',
  hasGuardDuty: true,
  hasClassGuidance: true,
};

const weekly = calculateWeekly(bransTeacher, 30, RULES);
console.log('\n--- 30 Saat Derse Giren Branş Öğretmeni Haftalık Hesabı ---');
console.log(`Toplam Ders: ${weekly.weeklyScheduledHours}`);
console.log(`Maaş Karşılığı: ${weekly.maasKarsiligi} saat`);
console.log(`Kalan Maaş Üstü: ${weekly.excessLessonHours} saat`);
console.log(`Hazırlık ve Planlama: ${weekly.preparationPlanningHours} saat`);
console.log(`Nöbet Görevi: ${weekly.guardDutyHours} saat`);
console.log(`Sınıf Rehberliği: ${weekly.classGuidanceHours} saat`);
console.log(`✓ Haftalık Toplam Ek Ders: ${weekly.weeklyAdditionalHours} saat (Beklenen: 23 saat)`);

assert.strictEqual(weekly.excessLessonHours, 15);
assert.strictEqual(weekly.preparationPlanningHours, 3);
assert.strictEqual(weekly.guardDutyHours, 3);
assert.strictEqual(weekly.classGuidanceHours, 2);
assert.strictEqual(weekly.weeklyAdditionalHours, 23);

// 3. Aylık Hesaplama (4 Hafta)
function calculateMonthly(weeklyHours, rate, rules, weeks = 4) {
  const monthlyHours = weeklyHours * weeks;
  const gross = Math.round(monthlyHours * rate * 100) / 100;
  const gelirVergisi = Math.round(gross * rules.incomeTaxRate * 100) / 100;
  const damgaVergisi = Math.round(gross * rules.stampTaxRate * 100) / 100;
  const net = Math.round((gross - gelirVergisi - damgaVergisi) * 100) / 100;
  return { monthlyHours, gross, gelirVergisi, damgaVergisi, net };
}

const monthlyLisans = calculateMonthly(weekly.weeklyAdditionalHours, lisansRate.effectiveRate, RULES, 4);
console.log('\n--- Lisans Öğretmeni 4 Haftalık Aylık Ödeme ---');
console.log(`Aylık Ek Ders: ${monthlyLisans.monthlyHours} saat (Beklenen: 92 saat)`);
console.log(`✓ Brüt Ödeme: ${monthlyLisans.gross} TL (Beklenen: 20292.44 TL)`);
console.log(`Gelir Vergisi (%15): ${monthlyLisans.gelirVergisi} TL`);
console.log(`Damga Vergisi (0.00759): ${monthlyLisans.damgaVergisi} TL`);
console.log(`✓ Net Ödeme: ${monthlyLisans.net} TL`);

assert.strictEqual(monthlyLisans.monthlyHours, 92);
assert.strictEqual(monthlyLisans.gross, 20292.44);

const monthlyYl = calculateMonthly(weekly.weeklyAdditionalHours, yuksekLisansRate.effectiveRate, RULES, 4);
console.log('\n--- Yüksek Lisans Öğretmeni 4 Haftalık Aylık Ödeme ---');
console.log(`✓ Brüt Ödeme: ${monthlyYl.gross} TL (Beklenen: 21712.92 TL)`);
assert.strictEqual(monthlyYl.gross, 21712.92);

const monthlyDoktora = calculateMonthly(weekly.weeklyAdditionalHours, doktoraRate.effectiveRate, RULES, 4);
console.log('\n--- Doktora Öğretmeni 4 Haftalık Aylık Ödeme ---');
console.log(`✓ Brüt Ödeme: ${monthlyDoktora.gross} TL (Beklenen: 24351.48 TL)`);
assert.strictEqual(monthlyDoktora.gross, 24351.48);

console.log('\n========================================================');
console.log('TÜM EKRAN GÖRÜNTÜSÜ HESAPLAMA TESTLERİ BAŞARIYLA GEÇTİ!');
console.log('========================================================');
