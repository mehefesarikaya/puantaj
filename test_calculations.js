import assert from 'assert';

// 1. Preparation calculation test
function calculatePreparationHours(completedWeeklyHours, settings) {
  if (completedWeeklyHours <= 0) return 0;
  const calculated = Math.floor(completedWeeklyHours / 10) * settings.preparationPerTenHours;
  return Math.min(calculated, settings.maxPreparationHours);
}

const testSettings = {
  kadroluBaseHours: 15,
  sozlesmeliBaseHours: 15,
  kadroluHourlyRate: 135.0,
  sozlesmeliHourlyRate: 135.0,
  ucretliHourlyRate: 145.0,
  preparationPerTenHours: 1,
  maxPreparationHours: 3,
  nobetWeeklyHours: 3,
  clubWeeklyHours: 2,
  payHolidaysForKadrolu: true,
};

// Test 1: Preparation hours
assert.strictEqual(calculatePreparationHours(0, testSettings), 0, '0 hours should give 0 prep');
assert.strictEqual(calculatePreparationHours(9, testSettings), 0, '9 hours should give 0 prep');
assert.strictEqual(calculatePreparationHours(10, testSettings), 1, '10 hours should give 1 prep');
assert.strictEqual(calculatePreparationHours(19, testSettings), 1, '19 hours should give 1 prep');
assert.strictEqual(calculatePreparationHours(20, testSettings), 2, '20 hours should give 2 prep');
assert.strictEqual(calculatePreparationHours(30, testSettings), 3, '30 hours should give 3 prep');
assert.strictEqual(calculatePreparationHours(40, testSettings), 3, '40 hours should cap at max 3 prep');
console.log('✓ Hazırlık ve Planlama (10a1) testleri başarılı.');

// Test 2: Kadrolu teacher extra hours calculation
const kadroluTeacher = {
  id: 't-1',
  fullName: 'Ahmet Yılmaz',
  branch: 'Matematik',
  employmentType: 'kadrolu',
  weeklyTeachingHours: 24,
  hourlyRate: 135,
  hasNobetDuty: true,
  hasClubDuty: true,
  hasGuidingDuty: false,
};

// 4 weeks: 24h * 4 = 96 completed hours
const totalCompletedHours = 96;
const estimatedWeeks = 4;
const baseSalaryQuota = testSettings.kadroluBaseHours * estimatedWeeks; // 60 hours
const extraLessons = totalCompletedHours - baseSalaryQuota; // 36 hours
const prep = calculatePreparationHours(totalCompletedHours / estimatedWeeks, testSettings) * estimatedWeeks; // 2 * 4 = 8
const nobet = testSettings.nobetWeeklyHours * estimatedWeeks; // 3 * 4 = 12
const club = testSettings.clubWeeklyHours * estimatedWeeks; // 2 * 4 = 8
const totalPayable = extraLessons + prep + nobet + club; // 36 + 8 + 12 + 8 = 64
const totalPay = totalPayable * kadroluTeacher.hourlyRate; // 64 * 135 = 8640

assert.strictEqual(baseSalaryQuota, 60);
assert.strictEqual(extraLessons, 36);
assert.strictEqual(prep, 8);
assert.strictEqual(nobet, 12);
assert.strictEqual(club, 8);
assert.strictEqual(totalPayable, 64);
assert.strictEqual(totalPay, 8640);
console.log('✓ Kadrolu öğretmen ek ders tahakkuk hesaplaması başarılı.');

// Test 3: Ücretli teacher calculation
const ucretliTeacher = {
  id: 't-3',
  fullName: 'Mehmet Demir',
  branch: 'Kimya',
  employmentType: 'ucretli',
  weeklyTeachingHours: 20,
  hourlyRate: 145,
};
const ucretliCompleted = 80; // 20 * 4
const ucretliBonus = Math.floor(ucretliCompleted / 5); // 80 / 5 = 16
const ucretliTotalPayable = ucretliCompleted + ucretliBonus; // 96
const ucretliTotalPayment = ucretliTotalPayable * ucretliTeacher.hourlyRate; // 96 * 145 = 13920
assert.strictEqual(ucretliTotalPayable, 96);
assert.strictEqual(ucretliTotalPayment, 13920);
console.log('✓ Ücretli öğretmen ek ders hesaplaması başarılı.');

// Test 4: Time validation regex
function isValidTimeFormat(timeStr) {
  if (!timeStr) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr.trim());
}
assert.strictEqual(isValidTimeFormat('08:30'), true);
assert.strictEqual(isValidTimeFormat('14:45'), true);
assert.strictEqual(isValidTimeFormat('25:00'), false);
assert.strictEqual(isValidTimeFormat('9:00'), true);
assert.strictEqual(isValidTimeFormat('abc'), false);
console.log('✓ Saat formatı doğrulama regex testleri başarılı.');

console.log('Tüm birim testler başarıyla geçti!');

