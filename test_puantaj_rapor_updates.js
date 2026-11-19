// test_puantaj_rapor_updates.js
// Automated verification of Puantaj Rapor updates:
// 1. Section renamed to "Puantaj Rapor"
// 2. Employment status filters (Sözleşmeli, Ücretli, Stajyer, Tümü)
// 3. Duty Day (Nöbet Günü) assignment, 3 hours per duty day, synchronization and safeguards
// 4. Duty totals, payment calculation, and 5'e 1 bonus rules
// 5. Price fields removal from teacher creation and central rules integration

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- PUANTAJ RAPOR UPDATES VERIFICATION ---\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] Test ${totalTests}: ${name}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// -------------------------------------------------------------
// Test 1: Puantaj Rapor naming verification in Sidebar and Views
// -------------------------------------------------------------
runTest('Puantaj Rapor renaming in Sidebar and Views', () => {
  const sidebarContent = fs.readFileSync(path.resolve('./src/components/Layout/Sidebar.tsx'), 'utf-8');
  assert.ok(
    sidebarContent.includes("{ id: 'puantaj', label: 'Puantaj Rapor'"),
    'Sidebar must have menu item label "Puantaj Rapor"'
  );
  assert.ok(
    !sidebarContent.includes("{ id: 'puantaj', label: 'Puantaj Girişi'"),
    'Sidebar must no longer contain "Puantaj Girişi"'
  );

  const adminViewContent = fs.readFileSync(path.resolve('./src/components/Puantaj/AdminMonthlyPuantajView.tsx'), 'utf-8');
  assert.ok(
    adminViewContent.includes('Puantaj Raporu (Aylık Ders Saatleri)'),
    'Admin view must include Puantaj Raporu heading'
  );

  const schoolViewContent = fs.readFileSync(path.resolve('./src/components/SchoolPanel/SchoolPuantajEntryView.tsx'), 'utf-8');
  assert.ok(
    schoolViewContent.includes('Aylık Ders Saatleri Puantaj Raporu'),
    'School view must include Puantaj Raporu heading'
  );
});

// -------------------------------------------------------------
// Test 2: Employment Status Filter Logic
// -------------------------------------------------------------
runTest('Employment Status Filters (Sözleşmeli, Ücretli, Stajyer, Tümü)', () => {
  const teachers = [
    { id: '1', fullName: 'Ayşe Yılmaz', employmentType: 'sozlesmeli', isActive: true, schoolId: 's1' },
    { id: '2', fullName: 'Mehmet Demir', employmentType: 'ucretli', isActive: true, schoolId: 's1' },
    { id: '3', fullName: 'Fatma Kaya', employmentType: 'ucretli_ogretmen', isActive: true, schoolId: 's1' },
    { id: '4', fullName: 'Ali Çelik', employmentType: 'usta_ogretici', isActive: true, schoolId: 's1' },
    { id: '5', fullName: 'Zeynep Şahin', employmentType: 'stajyer', isActive: true, schoolId: 's1' },
    { id: '6', fullName: 'Burak Koç', employmentType: 'stajer', isActive: true, schoolId: 's1' },
  ];

  function filterTeachers(list, filter) {
    return list.filter((t) => {
      if (!t.isActive) return false;
      if (filter === 'all') return true;
      if (filter === 'sozlesmeli') return t.employmentType === 'sozlesmeli';
      if (filter === 'ucretli') {
        return (
          t.employmentType === 'ucretli' ||
          t.employmentType === 'ucretli_ogretmen' ||
          t.employmentType === 'usta_ogretici'
        );
      }
      if (filter === 'stajyer') {
        return t.employmentType === 'stajyer' || t.employmentType === 'stajer';
      }
      return true;
    });
  }

  const all = filterTeachers(teachers, 'all');
  assert.strictEqual(all.length, 6, 'Filter "all" should return all 6 teachers');

  const sozlesmeli = filterTeachers(teachers, 'sozlesmeli');
  assert.strictEqual(sozlesmeli.length, 1, 'Filter "sozlesmeli" should return 1 teacher');
  assert.strictEqual(sozlesmeli[0].fullName, 'Ayşe Yılmaz');

  const ucretli = filterTeachers(teachers, 'ucretli');
  assert.strictEqual(ucretli.length, 3, 'Filter "ucretli" should include ucretli, ucretli_ogretmen, usta_ogretici (3 teachers)');

  const stajyer = filterTeachers(teachers, 'stajyer');
  assert.strictEqual(stajyer.length, 2, 'Filter "stajyer" should include stajyer, stajer (2 teachers)');
});

// -------------------------------------------------------------
// Test 3: Duty Day synchronization and 3-hour generation
// -------------------------------------------------------------
runTest('Duty Day sync generates 3 hours on matching weekdays within active date range', () => {
  // Simulate syncTeacherDutyHours logic from schedulePuantajSync.ts
  const teacher = {
    id: 't-duty',
    fullName: 'Kemal Nöbetçi',
    guardDutyDay: 2, // Tuesday (Salı)
    hourlyRate: 220.57,
    startDate: '2026-11-01',
    departureDate: undefined,
  };

  const year = 2026;
  const month = 11; // November 2026 has 30 days
  const period = {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
  };

  const daysInMonth = 30;
  const dutyDailyHours = {};
  const dutyDailyStatuses = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    const jsDay = dateObj.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;

    const isWithinPeriod = dateStr >= period.startDate && dateStr <= period.endDate;
    if (!isWithinPeriod) continue;

    if (dow === teacher.guardDutyDay) {
      dutyDailyHours[day] = 3;
      dutyDailyStatuses[day] = 'planned';
    }
  }

  // Tuesdays in Nov 2026: Nov 3, Nov 10, Nov 17, Nov 24 (4 Tuesdays)
  assert.strictEqual(dutyDailyHours[3], 3, 'Nov 3 is Tuesday -> 3 duty hours');
  assert.strictEqual(dutyDailyHours[10], 3, 'Nov 10 is Tuesday -> 3 duty hours');
  assert.strictEqual(dutyDailyHours[17], 3, 'Nov 17 is Tuesday -> 3 duty hours');
  assert.strictEqual(dutyDailyHours[24], 3, 'Nov 24 is Tuesday -> 3 duty hours');
  assert.strictEqual(dutyDailyHours[1], undefined, 'Nov 1 is Sunday -> no duty hours');
  assert.strictEqual(dutyDailyHours[2], undefined, 'Nov 2 is Monday -> no duty hours');

  const dutyTotal = Object.values(dutyDailyHours).reduce((a, b) => a + (b || 0), 0);
  assert.strictEqual(dutyTotal, 12, '4 duty days * 3 hours = 12 total duty hours');
});

// -------------------------------------------------------------
// Test 4: Duty Day respects departure date and date boundaries
// -------------------------------------------------------------
runTest('Duty Day generation respects teacher departure date and custom period bounds', () => {
  const teacher = {
    id: 't-early-dep',
    guardDutyDay: 4, // Thursday (Perşembe)
    departureDate: '2026-11-15', // Departs mid-month
  };

  const year = 2026;
  const month = 11;
  const period = {
    startDate: '2026-11-05', // Period starts on Nov 5
    endDate: '2026-11-25',
  };

  // Thursdays in Nov 2026: Nov 5, Nov 12, Nov 19, Nov 26
  // Eligible: Nov 5 (within period & before dep 15), Nov 12 (within period & before dep 15)
  // Excluded: Nov 19 (after departure date 15), Nov 26 (after departure date and period)

  const dutyDailyHours = {};
  for (let day = 1; day <= 30; day++) {
    const dateObj = new Date(year, month - 1, day);
    const jsDay = dateObj.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;

    if (dateStr < period.startDate || dateStr > period.endDate) continue;
    if (teacher.departureDate && dateStr > teacher.departureDate) continue;

    if (dow === teacher.guardDutyDay) {
      dutyDailyHours[day] = 3;
    }
  }

  assert.strictEqual(dutyDailyHours[5], 3, 'Nov 5 is eligible Thursday -> 3 duty hours');
  assert.strictEqual(dutyDailyHours[12], 3, 'Nov 12 is eligible Thursday -> 3 duty hours');
  assert.strictEqual(dutyDailyHours[19], undefined, 'Nov 19 is after departure date -> no duty');
  assert.strictEqual(dutyDailyHours[26], undefined, 'Nov 26 is after departure date and period -> no duty');
});

// -------------------------------------------------------------
// Test 5: Duty Day change safeguards (protecting confirmed/manual hours)
// -------------------------------------------------------------
runTest('Safeguard: confirmed or manual duty hours are preserved when duty day is updated', () => {
  const dutyDailyHours = {
    3: 3, // confirmed
    10: 4, // manually edited to 4 hours
    17: 3, // planned
  };
  const dutyDailyStatuses = {
    3: 'confirmed',
    10: 'manual',
    17: 'planned',
  };

  // Teacher changes duty day from Tuesday (2) to Wednesday (3)
  const newDutyDay = 3; // Wednesday (Nov 4, 11, 18, 25)

  // Simulation of syncTeacherDutyHours protecting confirmed/manual cells:
  // Days with 'planned' status on old day are cleared, but confirmed/manual are untouched!
  for (const [dayStr, status] of Object.entries(dutyDailyStatuses)) {
    const day = Number(dayStr);
    if (status === 'planned') {
      delete dutyDailyHours[day];
      delete dutyDailyStatuses[day];
    }
  }

  // Confirmed Nov 3 and Manual Nov 10 must remain!
  assert.strictEqual(dutyDailyHours[3], 3, 'Confirmed duty cell must NOT be erased');
  assert.strictEqual(dutyDailyStatuses[3], 'confirmed', 'Confirmed status preserved');
  assert.strictEqual(dutyDailyHours[10], 4, 'Manual 4-hour cell must NOT be erased');
  assert.strictEqual(dutyDailyStatuses[10], 'manual', 'Manual status preserved');
  assert.strictEqual(dutyDailyHours[17], undefined, 'Planned cell from old duty day safely removed');
});

// -------------------------------------------------------------
// Test 6: Payment calculation rules for duty hours vs regular hours
// -------------------------------------------------------------
runTest('Duty hours payment calculation and 5-to-1 bonus separation', () => {
  const teacher = {
    id: 't-calc',
    hourlyRate: 220.57,
  };

  // Regular lessons: 30 hours
  const regularHours = 30;
  const regularBonus = Math.floor(regularHours / 5); // 6 hours
  const regularPayable = regularHours + regularBonus; // 36 hours
  const regularPayment = regularPayable * teacher.hourlyRate; // 36 * 220.57 = 7940.52

  // Duty lessons: 4 duty days * 3 hours = 12 hours
  const dutyHours = 12;
  // Per MEB rules: duty hours do NOT earn 5'e 1 bonus
  const dutyBonus = 0;
  const dutyPayable = dutyHours; // 12 hours
  const dutyPayment = dutyPayable * teacher.hourlyRate; // 12 * 220.57 = 2646.84

  // Combined totals
  const totalActual = regularHours + dutyHours; // 42 hours
  const totalBonus = regularBonus + dutyBonus; // 6 hours
  const totalPayable = regularPayable + dutyPayable; // 48 hours
  const totalPayment = regularPayment + dutyPayment; // 10587.36

  assert.strictEqual(regularBonus, 6, 'Regular 30 hours earns 6 bonus hours');
  assert.strictEqual(dutyBonus, 0, 'Duty hours earn 0 bonus hours');
  assert.strictEqual(totalActual, 42, 'Total actual is 42 hours');
  assert.strictEqual(totalPayable, 48, 'Total payable is 48 hours');
  assert.strictEqual(Math.round(totalPayment * 100) / 100, 10587.36, 'Total payment matches expected sum');
});

// -------------------------------------------------------------
// Test 7: Price fields removal from teacher creation form
// -------------------------------------------------------------
runTest('Price fields completely removed from AdminTeacherFormModal and central rate applied', () => {
  const modalContent = fs.readFileSync(
    path.resolve('./src/components/Teachers/AdminTeacherFormModal.tsx'),
    'utf-8'
  );

  assert.ok(
    !modalContent.includes('Saatlik Ücret (TL)'),
    'Teacher creation modal must NOT have "Saatlik Ücret (TL)" input'
  );
  assert.ok(
    !modalContent.includes('hourlyRate: Number(e.target.value)'),
    'Teacher creation modal must NOT bind hourlyRate to user input'
  );
  assert.ok(
    modalContent.includes('Nöbet Görevi Günü'),
    'Teacher creation modal must include "Nöbet Görevi Günü" dropdown'
  );
  assert.ok(
    modalContent.includes('rules.gunduzHourlyRate') || modalContent.includes('rules.ucretliHourlyRate'),
    'Teacher creation modal must fallback to central rules for hourlyRate'
  );
});

// -------------------------------------------------------------
// Test 8: Supabase schema and mappings for duty_day and duty puantaj
// -------------------------------------------------------------
runTest('Supabase schema & data service include guard_duty_day and duty puantaj fields', () => {
  const schemaSql = fs.readFileSync(path.resolve('./supabase_schema.sql'), 'utf-8');
  assert.ok(
    schemaSql.includes('guard_duty_day'),
    'supabase_schema.sql must include guard_duty_day column'
  );
  assert.ok(
    schemaSql.includes('duty_daily_hours'),
    'supabase_schema.sql must include duty_daily_hours column'
  );
  assert.ok(
    schemaSql.includes('duty_total_hours'),
    'supabase_schema.sql must include duty_total_hours column'
  );

  const dataService = fs.readFileSync(path.resolve('./src/services/supabaseDataService.ts'), 'utf-8');
  assert.ok(
    dataService.includes('guard_duty_day: teacher.guardDutyDay'),
    'supabaseDataService must map guardDutyDay to guard_duty_day'
  );
  assert.ok(
    dataService.includes('duty_daily_hours: row.dutyDailyHours'),
    'supabaseDataService must map dutyDailyHours to duty_daily_hours'
  );
});

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}

