import assert from 'assert';

console.log('================================================================');
console.log('TEST: MEB DAĞILIM ÇİZELGESİ TOPLAM EK DERSİNİ GÜNLERE EŞİT DAĞITMA');
console.log('================================================================\n');

// 1. MEB Madde 23 Eşit Dağıtım Fonksiyonu
function distributeWeeklyHoursAccordingToMebArticle23(totalHours) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!totalHours || totalHours <= 0) return result;

  const basePerDay = Math.floor(totalHours / 5);
  for (let d = 1; d <= 5; d++) {
    result[d] = basePerDay;
  }

  const remainder = totalHours % 5;
  if (remainder === 0) return result;

  const priorityOrder = [1, 5, 3, 2, 4];
  for (let i = 0; i < remainder; i++) {
    const day = priorityOrder[i];
    result[day] += 1;
  }

  return result;
}

// 2. MEB Dağılım Çizelgesi Hesaplama (Yeni Eşit Dağıtım Kuralı)
function calculateWeeklyDailyMebBreakdown({ teacher, schedule, rules }) {
  const isSozlesmeli = teacher.employmentType === 'sozlesmeli';
  const totalMaasQuota = isSozlesmeli ? 15 : 0;
  let remainingMaasQuota = totalMaasQuota;

  const lessons = schedule?.lessons || [];
  const normalLessonsTotal = lessons
    .filter((l) => l.lessonType === 'normal' || !l.lessonType)
    .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

  const excessTotal = Math.max(0, normalLessonsTotal - totalMaasQuota);
  const prepHours = Math.min(3, Math.floor(normalLessonsTotal / 10));
  const guidanceHours = teacher.hasClassGuidance ? 2 : 0;
  const dutyHours = teacher.hasGuardDuty ? 3 : 0;

  const weeklyTotalAdditionalHours = excessTotal + prepHours + guidanceHours + dutyHours;

  // MEB Günlük Maaş Karşılığı ve Ek Ders Dağılım Çizelgesindeki toplam ek ders saatini günlere eşit dağıt
  const equalEkDersDistribution = distributeWeeklyHoursAccordingToMebArticle23(weeklyTotalAdditionalHours);

  const dailyBreakdown = {};

  for (let dow = 1; dow <= 5; dow++) {
    const dayNormalLessons = lessons
      .filter((l) => l.dayOfWeek === dow && (l.lessonType === 'normal' || !l.lessonType))
      .reduce((sum, l) => sum + (Number(l.lessonCount) || 0), 0);

    let dayMaas = 0;
    let dayExcess = dayNormalLessons;

    if (isSozlesmeli && dayNormalLessons > 0 && remainingMaasQuota > 0) {
      dayMaas = Math.min(dayNormalLessons, remainingMaasQuota);
      remainingMaasQuota -= dayMaas;
      dayExcess = dayNormalLessons - dayMaas;
    } else if (isSozlesmeli && remainingMaasQuota === 0) {
      dayMaas = 0;
      dayExcess = dayNormalLessons;
    }

    dailyBreakdown[dow] = {
      dayOfWeek: dow,
      actualLessonHours: dayNormalLessons,
      maasKarsiligiHours: dayMaas,
      excessLessonHours: dayExcess,
      prepPlanningHours: prepHours,
      guidanceHours: guidanceHours,
      dutyHours: schedule?.dutyDay === dow ? 3 : 0,
      totalDailyAdditionalHours: equalEkDersDistribution[dow] || 0,
    };
  }

  return {
    dailyBreakdown,
    weeklyTotalAdditionalHours,
  };
}

// -------------------------------------------------------------
// TEST 1: 20 SAAT TOPLAM EK DERS -> TÜM GÜNLERE TAM EŞİT (4, 4, 4, 4, 4)
// -------------------------------------------------------------
console.log('--- TEST 1: 20 Saat Toplam Ek Ders Günlere Tam Eşit (4-4-4-4-4) Dağılmalı ---');
const dist20 = distributeWeeklyHoursAccordingToMebArticle23(20);
console.log('Pazartesi :', dist20[1]);
console.log('Salı      :', dist20[2]);
console.log('Çarşamba  :', dist20[3]);
console.log('Perşembe  :', dist20[4]);
console.log('Cuma      :', dist20[5]);

assert.strictEqual(dist20[1], 4);
assert.strictEqual(dist20[2], 4);
assert.strictEqual(dist20[3], 4);
assert.strictEqual(dist20[4], 4);
assert.strictEqual(dist20[5], 4);
assert.strictEqual(dist20[1] + dist20[2] + dist20[3] + dist20[4] + dist20[5], 20);
console.log('✓ TEST 1 GEÇTİ: 20 saat ek ders hafta içi 5 güne tam eşit olarak 4\'er saat dağıtıldı.\n');

// -------------------------------------------------------------
// TEST 2: 15 SAAT TOPLAM EK DERS -> TÜM GÜNLERE TAM EŞİT (3, 3, 3, 3, 3)
// -------------------------------------------------------------
console.log('--- TEST 2: 15 Saat Toplam Ek Ders Günlere Tam Eşit (3-3-3-3-3) Dağılmalı ---');
const dist15 = distributeWeeklyHoursAccordingToMebArticle23(15);
console.log('Pazartesi :', dist15[1]);
console.log('Salı      :', dist15[2]);
console.log('Çarşamba  :', dist15[3]);
console.log('Perşembe  :', dist15[4]);
console.log('Cuma      :', dist15[5]);

assert.strictEqual(dist15[1], 3);
assert.strictEqual(dist15[2], 3);
assert.strictEqual(dist15[3], 3);
assert.strictEqual(dist15[4], 3);
assert.strictEqual(dist15[5], 3);
assert.strictEqual(dist15[1] + dist15[2] + dist15[3] + dist15[4] + dist15[5], 15);
console.log('✓ TEST 2 GEÇTİ: 15 saat ek ders hafta içi 5 güne tam eşit olarak 3\'er saat dağıtıldı.\n');

// -------------------------------------------------------------
// TEST 3: 23 SAAT TOPLAM EK DERS (30 Saat Dersi Olan Öğretmen: 15 Ek Ders + 3 Hazırlık + 2 Rehberlik + 3 Nöbet)
// Taban 4'er saat eşit, artan 3 saat Madde 23 önceliğine göre (Pzt: 5, Sal: 4, Çar: 5, Per: 4, Cum: 5)
// -------------------------------------------------------------
console.log('--- TEST 3: 23 Saat Toplam Ek Ders MEB Madde 23 Eşit Dağıtımı (5-4-5-4-5) ---');
const dist23 = distributeWeeklyHoursAccordingToMebArticle23(23);
console.log('Pazartesi :', dist23[1]);
console.log('Salı      :', dist23[2]);
console.log('Çarşamba  :', dist23[3]);
console.log('Perşembe  :', dist23[4]);
console.log('Cuma      :', dist23[5]);

assert.strictEqual(dist23[1], 5, 'Pzt 5 olmalı');
assert.strictEqual(dist23[2], 4, 'Salı 4 olmalı');
assert.strictEqual(dist23[3], 5, 'Çarşamba 5 olmalı');
assert.strictEqual(dist23[4], 4, 'Perşembe 4 olmalı');
assert.strictEqual(dist23[5], 5, 'Cuma 5 olmalı');
assert.strictEqual(dist23[1] + dist23[2] + dist23[3] + dist23[4] + dist23[5], 23);
console.log('✓ TEST 3 GEÇTİ: 23 saat toplam ek ders eşit taban ve Madde 23 kuralıyla dağıtıldı.\n');

// -------------------------------------------------------------
// TEST 4: ÇİZELGE VE PUANTAJ RAPORU ENTEGRASYONU
// -------------------------------------------------------------
console.log('--- TEST 4: Çizelgedeki Değerlerin Puantaj Raporuna Yansıması ---');
const teacher = {
  id: 'teacher-sozlesmeli-1',
  fullName: 'Ayşe Kaya',
  branch: 'Türkçe',
  employmentType: 'sozlesmeli',
  hasClassGuidance: false,
  hasGuardDuty: false,
};

// 25 saat ders -> 15 maaş, 10 maaş üstü, 2 hazırlık -> Toplam Ek Ders = 12 saat
// 12 saat eşit dağılım: 12 / 5 = 2'şer saat, kalan 2 saat Pzt ve Cum'ya:
// Pzt: 3, Sal: 2, Çar: 2, Per: 2, Cum: 3 (Toplam = 12)
const schedule = {
  teacherId: teacher.id,
  lessons: [
    { dayOfWeek: 1, lessonCount: 5, lessonType: 'normal' },
    { dayOfWeek: 2, lessonCount: 5, lessonType: 'normal' },
    { dayOfWeek: 3, lessonCount: 5, lessonType: 'normal' },
    { dayOfWeek: 4, lessonCount: 5, lessonType: 'normal' },
    { dayOfWeek: 5, lessonCount: 5, lessonType: 'normal' },
  ],
};

const result = calculateWeeklyDailyMebBreakdown({ teacher, schedule });
assert.strictEqual(result.weeklyTotalAdditionalHours, 12);
assert.strictEqual(result.dailyBreakdown[1].totalDailyAdditionalHours, 3);
assert.strictEqual(result.dailyBreakdown[2].totalDailyAdditionalHours, 2);
assert.strictEqual(result.dailyBreakdown[3].totalDailyAdditionalHours, 2);
assert.strictEqual(result.dailyBreakdown[4].totalDailyAdditionalHours, 2);
assert.strictEqual(result.dailyBreakdown[5].totalDailyAdditionalHours, 3);

console.log('Çizelge Günlük Toplam Ek Ders Değerleri:');
console.log('  Pazartesi :', result.dailyBreakdown[1].totalDailyAdditionalHours, 'saat');
console.log('  Salı      :', result.dailyBreakdown[2].totalDailyAdditionalHours, 'saat');
console.log('  Çarşamba  :', result.dailyBreakdown[3].totalDailyAdditionalHours, 'saat');
console.log('  Perşembe  :', result.dailyBreakdown[4].totalDailyAdditionalHours, 'saat');
console.log('  Cuma      :', result.dailyBreakdown[5].totalDailyAdditionalHours, 'saat');

console.log('✓ TEST 4 GEÇTİ: Çizelgedeki toplam ek ders günlere eşit şekilde dağıtıldı.\n');

console.log('================================================================');
console.log('MEB ÇİZELGESİ TOPLAM EK DERS EŞİT DAĞITIM TESTİ BAŞARIYLA GEÇTİ!');
console.log('================================================================');

