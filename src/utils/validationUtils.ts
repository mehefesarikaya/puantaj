/**
 * T.C. Kimlik No, Yabancı Kimlik No ve Türkiye IBAN Doğrulama Yardımcıları
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Türk Vatandaşları için 11 haneli T.C. Kimlik No Doğrulaması
 * Resmi Algoritma:
 * - 11 hanelidir ve tümü rakamdır.
 * - İlk hane 0 olamaz.
 * - 1, 3, 5, 7 ve 9. hanelerin toplamının 7 katından; 2, 4, 6 ve 8. hanelerin toplamı çıkarıldığında,
 *   elde edilen sonucun 10'a bölümünden kalan 10. haneyi vermelidir.
 * - İlk 10 hanenin toplamının 10'a bölümünden kalan 11. haneyi vermelidir.
 */
export function validateTurkishId(id: string): ValidationResult {
  const clean = id.trim().replace(/\s+/g, '');

  if (!clean) {
    return { isValid: false, error: 'T.C. Kimlik Numarası zorunludur.' };
  }

  if (!/^\d{11}$/.test(clean)) {
    return {
      isValid: false,
      error: `T.C. Kimlik Numarası tam 11 haneli rakamlardan oluşmalıdır (Şu an: ${clean.length} hane).`,
    };
  }

  if (clean[0] === '0') {
    return {
      isValid: false,
      error: 'T.C. Kimlik Numarasının ilk hanesi 0 olamaz.',
    };
  }

  const digits = clean.split('').map(Number);

  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const calculatedD10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  if (calculatedD10 !== digits[9]) {
    return {
      isValid: false,
      error: 'Geçersiz T.C. Kimlik Numarası (kontrol hanesi doğrulanamadı).',
    };
  }

  const sumFirst10 = digits.slice(0, 10).reduce((acc, val) => acc + val, 0);
  const calculatedD11 = sumFirst10 % 10;
  if (calculatedD11 !== digits[10]) {
    return {
      isValid: false,
      error: 'Geçersiz T.C. Kimlik Numarası (sağlama toplamı doğrulanamadı).',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Yabancı Uyruklular için 11 haneli Yabancı Kimlik No (YKN) Doğrulaması
 * Resmi Kural (NVİ):
 * - 11 hanelidir ve rakamlardan oluşur.
 * - Türkiye'deki yabancı kimlik numaraları 98 veya 99 ile başlar.
 * - Mod-10 kontrol haneleri algoritması sağlanmalıdır.
 */
export function validateForeignId(id: string): ValidationResult {
  const clean = id.trim().replace(/\s+/g, '');

  if (!clean) {
    return { isValid: false, error: 'Yabancı Kimlik Numarası zorunludur.' };
  }

  if (!/^\d{11}$/.test(clean)) {
    return {
      isValid: false,
      error: `Yabancı Kimlik Numarası 11 haneli olmalıdır (Şu an: ${clean.length} hane).`,
    };
  }

  if (!clean.startsWith('98') && !clean.startsWith('99')) {
    return {
      isValid: false,
      error: 'Yabancı Kimlik Numarası 98 veya 99 ile başlamalıdır.',
    };
  }

  const digits = clean.split('').map(Number);

  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const calculatedD10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  if (calculatedD10 !== digits[9]) {
    return {
      isValid: false,
      error: 'Geçersiz Yabancı Kimlik Numarası (10. kontrol hanesi hatalı).',
    };
  }

  const sumFirst10 = digits.slice(0, 10).reduce((acc, val) => acc + val, 0);
  const calculatedD11 = sumFirst10 % 10;
  if (calculatedD11 !== digits[10]) {
    return {
      isValid: false,
      error: 'Geçersiz Yabancı Kimlik Numarası (11. sağlama hanesi hatalı).',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Türkiye IBAN Doğrulaması (ISO 7064 MOD-97-10 Kuralı)
 * - TR ile başlar.
 * - Toplam 26 karakterdir (TR + 24 rakam).
 * - İlk 4 karakter (TR + 2 kontrol hanesi) sona alınır: T=29, R=27 dönüştürülür.
 * - BigInt(sayisalDizi) % 97n === 1n olmalıdır.
 */
export function validateTurkishIban(iban: string): ValidationResult & { normalizedIban: string } {
  const normalizedIban = iban.replace(/\s+/g, '').toUpperCase();

  if (!normalizedIban) {
    return {
      isValid: false,
      error: 'IBAN alanı zorunludur.',
      normalizedIban,
    };
  }

  if (!normalizedIban.startsWith('TR')) {
    return {
      isValid: false,
      error: 'Türkiye IBAN numarası "TR" ile başlamalıdır.',
      normalizedIban,
    };
  }

  if (normalizedIban.length !== 26) {
    return {
      isValid: false,
      error: `Geçersiz IBAN uzunluğu. Türkiye IBAN numarası tam 26 karakter olmalıdır (Şu an: ${normalizedIban.length} karakter).`,
      normalizedIban,
    };
  }

  const digitsPart = normalizedIban.slice(2);
  if (!/^\d{24}$/.test(digitsPart)) {
    return {
      isValid: false,
      error: 'Geçersiz IBAN. TR kodundan sonraki 24 karakter yalnızca rakamlardan oluşmalıdır.',
      normalizedIban,
    };
  }

  // MOD-97 Sağlaması
  // İlk 4 karakteri (TR + 2 hane) sona taşı
  const rearranged = normalizedIban.slice(4) + normalizedIban.slice(0, 4);

  // Harfleri sayıya çevir (T -> 29, R -> 27)
  const numericString = rearranged
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return (code - 55).toString(); // A=10, ..., T=29, R=27
      }
      return ch;
    })
    .join('');

  try {
    const remainder = BigInt(numericString) % 97n;
    if (remainder !== 1n) {
      return {
        isValid: false,
        error: 'Geçersiz IBAN. Lütfen IBAN numarasını kontrol edin.',
        normalizedIban,
      };
    }
  } catch {
    return {
      isValid: false,
      error: 'Geçersiz IBAN. Lütfen IBAN numarasını kontrol edin.',
      normalizedIban,
    };
  }

  return {
    isValid: true,
    error: null,
    normalizedIban,
  };
}

/**
 * IBAN'ı 4'erli bloklar halinde biçimlendiren yardımcı (Örn: TR00 0000 0000 ...)
 */
export function formatIbanDisplay(iban: string): string {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    chunks.push(clean.slice(i, i + 4));
  }
  return chunks.join(' ');
}

