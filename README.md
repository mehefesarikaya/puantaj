# MEB Ders Ücreti Karşılığında Görevlendirilenler Aylık Puantaj Yönetim Sistemi (Merkezi Yönetici Paneli)

Bu uygulama, Milli Eğitim Bakanlığı (MEB) bünyesinde ders ücreti karşılığında görevlendirilen ücretli öğretmen ve usta öğreticilerin aylık ders saatleri puantajlarını, vergi matrahlarını ve ek ders ödemelerini merkezi olarak yöneten, denetleyen ve onaylayan **tamamen bağımsız (standalone) bir Yönetici Paneli** uygulamasıdır.

Sistem, resmi **"Ders Ücreti Karşılığında Görevlendirilenlerin Ekim Ayı Ders Saatleri Puantajı Şablonu.xlsx"** dosyasının 31 günlük hücre yapısını, T.C. Kimlik, IBAN, Açıklama/Ayrılış ve Başka İşveren Vergi Matrahı sütunlarını birebir dijitalleştirir.

---

## 🏗️ 1. Mimari ve Kapsam

- **Yalnızca Yönetici Paneli (Admin Panel Only):** İl/İlçe Milli Eğitim Müdürlüğü veya kurum üst yöneticisinin tüm okulları, öğretmenleri ve aylık puantajları izlediği, denetlediği ve onayladığı merkezi kontrol paneli.
- **Geleceğe Hazır Çoklu Okul İzolasyonu (Multi-Tenant):** İleride geliştirilecek olan Okul Paneli (School Panel) doğrudan aynı bağımsız PostgreSQL/Supabase veritabanına bağlanacak şekilde tasarlanmıştır. Her okul yalnızca kendi öğretmenlerini ve ders saatlerini görebilecek şekilde veri izolasyonu sağlanmıştır.
- **Tamamen Bağımsız:** Atlas veya Moders projeleriyle hiçbir bağımlılık içermez; kendi veritabanı şemasına ([`supabase_schema.sql`](file:///Users/bcr/Desktop/puantaj/supabase_schema.sql)) ve durum yönetimine sahiptir.

---

## 📌 2. Yönetici Paneli Modülleri

### 1. Genel Bakış (Dashboard)
- Kayıtlı okul sayısı, toplam görevli personel sayısı, seçilen aya ait gerçekleşen fiili ders saati, 5'e 1 hazırlık ilavesi dahil ödenecek saat ve toplam tahakkuk bütçesi.
- Okulların aylık puantaj teslim durumu: **Onaylanan**, **İncelemede**, **Eksik Veri** ve **Gönderim Bekleniyor**.
- Seçilen Ay/Yıl filtresine göre tüm istatistiklerin anlık güncellenmesi.

### 2. Okullar (School Management)
- İlçe bünyesindeki okulların kurum kodu (örn: `752140`), müdür bilgisi, türü ve iletişim bilgileri.
- Her okulun kayıtlı öğretmen sayısı ve seçilen döneme ait teslim/onay durumu.
- Okul ekleme, düzenleme ve okul bazında puantaja tek tıkla geçiş.

### 3. Öğretmenler (Teacher Management)
- T.C. Kimlik No, Ad Soyad, Görevli Olduğu Okul, Branş, Görevlendirme Türü (Ücretli Öğretmen / Usta Öğretici), IBAN, Açıklama, Başka Bir İşverende Çalışma Durumu ve Diğer İşveren Aylık Vergi Matrahı.
- KVKK ve gizlilik gereği üst çubuktan tek tıkla **TC & IBAN Maskeleme (Gizli / Açık)** desteği.

### 4. Aylık Puantaj Cetveli (Core Feature)
- Orijinal Excel şablonunun birebir web karşılığı:
  - `T.C. KİMLİK NO` (Yatay kaydırmada sabit / sticky)
  - `ADI SOYADI` (Yatay kaydırmada sabit / sticky)
  - `1..31 Günlük Hücreler` (Ders saati girilen günler, boş günler ve hafta sonları renk kodlu)
  - `TOPLAM SAAT`
  - `5'e 1 İLAVESİ` (Her 5 derse 1 saat hazırlık)
  - `ÖDENECEK SAAT`
  - `IBAN`
  - `AÇIKLAMA / AYRILIŞ TARİHİ` (Örn: `USTAÖĞRETİCİ`)
  - `BAŞKACA BİR İŞVERENDE ÇALIŞIYOR MU?` (`EVET` / `HAYIR`)
  - `BAŞKACA İŞVERENDE ÇALIŞIYORSA AYLIK VERGİ MATRAHI`
  - `TAHAKKUK EDEN TUTAR (TL)`
- Ayın gün sayısına göre (28, 29, 30, 31 gün) dinamik sütun üretimi.
- Yetkili yöneticinin herhangi bir güne tıklayarak doğrudan ders saatini güncelleyebilmesi.
- Gün bazında dikey toplamlar ve genel toplam satırı.

### 5. Kayıt Kontrolü ve Onay Merkezi
- Okul ve öğretmen bazında detaylı puantaj incelemesi.
- Eksik ders girilmiş veya hiç ders girilmemiş öğretmenlerin otomatik tespiti ve uyarı kutusu.
- Resmî durum yönetimi:
  - `Bekleniyor`
  - `Eksik Veri`
  - `İncelemede`
  - `Onaylandı`
  - `Reddedildi` (Gerekçe / red notu girilerek iade etme)

### 6. MEB Ödeme ve Tahakkuk Hesaplamaları
- Ders saati birim ücreti (örn: 140.00 TL).
- MEB 5'e 1 hazırlık ve planlama ilavesi hesabı.
- Gelir vergisi (%15) ve damga vergisi (binde 7.59) kesintileri.
- Başka işverenden gelen vergi matrahının kümülatif vergi matrahına etkisi.

### 7. Raporlama ve Excel İthalat/İhracat
- **Orijinal Şablonu İndir:** Orijinal Excel formatında boş veya örnek şablon indirme.
- **Excel'e Aktar:** Seçili okulun veya tüm okulların puantajını orijinal Excel şablonunun sütun düzeninde dışa aktarma.
- **Excel İçe Aktar:** Okullardan gelen doldurulmuş Excel dosyalarını yükleme, satır satır doğrulama, TC ve IBAN kontrolü, mükerrer kayıt tespiti ve önizleme sonrası sisteme aktarma.
- Yazdırma ve PDF desteği.

### 8. Sistem ve MEB Mevzuat Ayarları
- Saat ücreti ve vergi katsayılarını panelden güncelleme.
- Bağımsız Supabase / PostgreSQL veritabanı bağlantı formu.
- Yapılan tüm değişiklikleri kaydeden Merkezi Denetim Günlüğü (Audit Log).
- Orijinal Ekim ayı şablon verilerine tek tıkla sıfırlama (`resetToDefaults`).

---

## 🚀 Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Canlı üretim derlemesi (Build)
npm run build

# Doğrulama testlerini çalıştırın
node test_excel_puantaj.js
```
