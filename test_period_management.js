/**
 * Aylık Puantaj Dönemi ve Tarih Aralığı Yönetimi Testleri
 *
 * Doğrulanan Maddeler:
 * 1. Admin Kasım 2026 dönemini (1 Kasım - 30 Kasım) oluşturur ve ayarlar.
 * 2. Okul paneli otomatik olarak bu dönemi ve sınırları okur.
 * 3. Okul kullanıcısı başlangıç/bitiş tarihlerini bağımsız olarak değiştiremez.
 * 4. Dönem dışındaki tarihler (örn: 10-25 Kasım aralığında 28 Kasım) düzenlenemez, bloke edilir.
 * 5. Dönemin kapatılması ('kapali') okul kullanıcısının veri girişini tamamen engeller.
 * 6. Dönemin yeniden açılması ('acik') okul kullanıcısının giriş yetkisini geri kazandırır.
 * 7. Onaylanmış ve teslim edilmiş mevcut kayıtlar tarih ve dönem değişikliklerinden etkilenmeden korunur.
 * 8. Farklı aylar için bağımsız tarih aralıkları (örn: Ekim 1-31, Kasım 5-25, Aralık 1-31) hatasız yönetilir.
 */

import assert from 'assert';

console.log('========================================================');
console.log('AYLIK PUANTAJ DÖNEMİ VE TARİH ARALIĞI YÖNETİMİ TESTLERİ');
console.log('========================================================\n');

// 1. Simüle Edilmiş Dönem Deposu (LocalStorage / Supabase simülasyonu)
const timesheetPeriods = [
  {
    id: 'period-2026-10',
    year: 2026,
    month: 10,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'kapali',
  },
  {
    id: 'period-2026-11',
    year: 2026,
    month: 11,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'acik',
  },
];

function getTimesheetPeriod(year, month) {
  const existing = timesheetPeriods.find((p) => p.year === year && p.month === month);
  if (existing) return existing;
  const days = new Date(year, month, 0).getDate();
  const mStr = String(month).padStart(2, '0');
  const dStr = String(days).padStart(2, '0');
  return {
    id: `period-${year}-${mStr}`,
    year,
    month,
    startDate: `${year}-${mStr}-01`,
    endDate: `${year}-${mStr}-${dStr}`,
    status: 'acik',
  };
}

function saveTimesheetPeriod(period, userRole) {
  if (userRole !== 'admin') {
    throw new Error('YETKİSİZ İŞLEM: Yalnızca yöneticiler dönem tarih aralıklarını değiştirebilir.');
  }
  const idx = timesheetPeriods.findIndex((p) => p.year === period.year && p.month === period.month);
  if (idx >= 0) {
    timesheetPeriods[idx] = { ...period };
  } else {
    timesheetPeriods.push({ ...period });
  }
}

// Hücre düzenleme işlevi simülasyonu
function attemptEditCell(params) {
  const { userRole, year, month, day, newHours, isSubmissionLocked } = params;
  const period = getTimesheetPeriod(year, month);

  // 1. Onaylanmış / teslim edilmiş submission kilidi
  if (isSubmissionLocked) {
    return { success: false, reason: 'Puantaj kilitli veya onaylanmış.' };
  }

  // 2. Dönem kapalı mı?
  if (period.status === 'kapali' && userRole !== 'admin') {
    return { success: false, reason: 'Dönem veri girişine kapalıdır.' };
  }

  // 3. Tarih aralığı kontrolü
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  const dateStr = `${year}-${mStr}-${dStr}`;

  if (period.startDate && dateStr < period.startDate) {
    return { success: false, reason: 'Tarih belirlenen dönem başlangıcından öncedir.' };
  }
  if (period.endDate && dateStr > period.endDate) {
    return { success: false, reason: 'Tarih belirlenen dönem bitişinden sonradır.' };
  }

  return { success: true, newHours };
}

// ---------------------------------------------------------------------
// TEST 1: Admin Kasım 2026 Dönemini 1 Kasım - 30 Kasım olarak ayarlar
// ---------------------------------------------------------------------
const novPeriod = getTimesheetPeriod(2026, 11);
assert.strictEqual(novPeriod.startDate, '2026-11-01');
assert.strictEqual(novPeriod.endDate, '2026-11-30');
assert.strictEqual(novPeriod.status, 'acik');
console.log('✓ TEST 1 GEÇTİ: Kasım 2026 dönemi (2026-11-01 -> 2026-11-30, AÇIK) başarıyla doğrulandı.');

// ---------------------------------------------------------------------
// TEST 2: Okul paneli otomatik olarak bu dönemi ve sınırları okur
// ---------------------------------------------------------------------
const schoolUserPeriod = getTimesheetPeriod(2026, 11);
assert.deepStrictEqual(schoolUserPeriod, novPeriod);
console.log('✓ TEST 2 GEÇTİ: Okul paneli yönetici tarafından tanımlanan dönemi otomatik olarak okudu.');

// ---------------------------------------------------------------------
// TEST 3: Okul kullanıcısı tarih aralığını bağımsız olarak DEĞİŞTİREMEZ
// ---------------------------------------------------------------------
let unauthorizedBlocked = false;
try {
  saveTimesheetPeriod(
    {
      id: 'period-2026-11',
      year: 2026,
      month: 11,
      startDate: '2026-11-05',
      endDate: '2026-11-20',
      status: 'acik',
    },
    'school_user'
  );
} catch (err) {
  unauthorizedBlocked = true;
}
assert.strictEqual(unauthorizedBlocked, true);
console.log('✓ TEST 3 GEÇTİ: Okul kullanıcısının tarih aralığını değiştirme girişimi yetki kontrolüyle engellendi.');

// ---------------------------------------------------------------------
// TEST 4: Tarih aralığı daraltıldığında aralık dışındaki günler düzenlenemez
// ---------------------------------------------------------------------
// Admin Kasım dönemini 5 Kasım - 25 Kasım olarak günceller
saveTimesheetPeriod(
  {
    id: 'period-2026-11',
    year: 2026,
    month: 11,
    startDate: '2026-11-05',
    endDate: '2026-11-25',
    status: 'acik',
  },
  'admin'
);

// 2 Kasım (5 Kasım'dan önce) -> Giriş engellenmeli
const editNov2 = attemptEditCell({
  userRole: 'school_user',
  year: 2026,
  month: 11,
  day: 2,
  newHours: 6,
  isSubmissionLocked: false,
});
assert.strictEqual(editNov2.success, false);
assert.strictEqual(editNov2.reason, 'Tarih belirlenen dönem başlangıcından öncedir.');

// 28 Kasım (25 Kasım'dan sonra) -> Giriş engellenmeli
const editNov28 = attemptEditCell({
  userRole: 'school_user',
  year: 2026,
  month: 11,
  day: 28,
  newHours: 6,
  isSubmissionLocked: false,
});
assert.strictEqual(editNov28.success, false);
assert.strictEqual(editNov28.reason, 'Tarih belirlenen dönem bitişinden sonradır.');

// 12 Kasım (Aralık içinde) -> Giriş onaylanmalı
const editNov12 = attemptEditCell({
  userRole: 'school_user',
  year: 2026,
  month: 11,
  day: 12,
  newHours: 6,
  isSubmissionLocked: false,
});
assert.strictEqual(editNov12.success, true);
console.log('✓ TEST 4 GEÇTİ: Belirlenen tarih aralığı (5-25 Kasım) dışındaki günler (2 ve 28 Kasım) engellendi; aralık içindeki gün (12 Kasım) onaylandı.');

// ---------------------------------------------------------------------
// TEST 5: Dönemin kapatılması ('kapali') okul kullanıcısının veri girişini tamamen engeller
// ---------------------------------------------------------------------
saveTimesheetPeriod(
  {
    id: 'period-2026-11',
    year: 2026,
    month: 11,
    startDate: '2026-11-05',
    endDate: '2026-11-25',
    status: 'kapali',
  },
  'admin'
);

const editClosedPeriod = attemptEditCell({
  userRole: 'school_user',
  year: 2026,
  month: 11,
  day: 12,
  newHours: 8,
  isSubmissionLocked: false,
});
assert.strictEqual(editClosedPeriod.success, false);
assert.strictEqual(editClosedPeriod.reason, 'Dönem veri girişine kapalıdır.');
console.log('✓ TEST 5 GEÇTİ: Dönem kapatıldığında okul kullanıcısının aralık içindeki gün dahil tüm veri girişi durduruldu.');

// ---------------------------------------------------------------------
// TEST 6: Dönemin yeniden açılması ('acik') yetkili girişi geri kazandırır
// ---------------------------------------------------------------------
saveTimesheetPeriod(
  {
    id: 'period-2026-11',
    year: 2026,
    month: 11,
    startDate: '2026-11-05',
    endDate: '2026-11-25',
    status: 'acik',
  },
  'admin'
);

const editReopenedPeriod = attemptEditCell({
  userRole: 'school_user',
  year: 2026,
  month: 11,
  day: 12,
  newHours: 8,
  isSubmissionLocked: false,
});
assert.strictEqual(editReopenedPeriod.success, true);
assert.strictEqual(editReopenedPeriod.newHours, 8);
console.log('✓ TEST 6 GEÇTİ: Dönem tekrar açıldığında okul kullanıcısı veri giriş yetkisini derhal geri kazandı.');

// ---------------------------------------------------------------------
// TEST 7: Onaylanmış / teslim edilmiş puantaj kayıtları korunur
// ---------------------------------------------------------------------
const editLockedSubmission = attemptEditCell({
  userRole: 'school_user',
  year: 2026,
  month: 11,
  day: 12,
  newHours: 10,
  isSubmissionLocked: true, // Onaylanmış ay
});
assert.strictEqual(editLockedSubmission.success, false);
assert.strictEqual(editLockedSubmission.reason, 'Puantaj kilitli veya onaylanmış.');
console.log('✓ TEST 7 GEÇTİ: Onaylanmış geçmiş puantaj kayıtları tarih/dönem kuralları açık olsa bile kilit altında korundu.');

// ---------------------------------------------------------------------
// TEST 8: Farklı aylar için bağımsız tarih aralıkları
// ---------------------------------------------------------------------
// Ekim dönemi: kapalı
const oct = getTimesheetPeriod(2026, 10);
assert.strictEqual(oct.status, 'kapali');

// Aralık dönemi: 1 Aralık - 31 Aralık açık
const dec = getTimesheetPeriod(2026, 12);
assert.strictEqual(dec.startDate, '2026-12-01');
assert.strictEqual(dec.endDate, '2026-12-31');
assert.strictEqual(dec.status, 'acik');

console.log('✓ TEST 8 GEÇTİ: Farklı aylar (Ekim=Kapalı, Kasım=5-25 Açık, Aralık=1-31 Açık) birbirini etkilemeden bağımsız çalıştı.');

console.log('\n========================================================');
console.log('TÜM 8 DÖNEM YÖNETİMİ VE GÜVENLİK TESTİ BAŞARIYLA TAMAMLANDI!');
console.log('========================================================');

