import { BranchCategory, BranchItem } from '../types';

export interface BranchCategoryConfig {
  id: BranchCategory;
  title: string;
  maasKarsiligiHours: number;
  hazirlikRuleText: string;
  hazirlikFixedHours?: number; // Sabit saat varsa (örn: Sınıf 1, Okul Öncesi 1, Atölye 2)
  hazirlikPerTenHours: boolean; // Her 10 saate 1 saat kuralı
  maxHazirlikHours: number;
  maxWeeklyAdditionalHours: number; // Azami ek ders sınırı
}

export const BRANCH_CATEGORY_CONFIGS: Record<BranchCategory, BranchCategoryConfig> = {
  genel_bilgi_ve_brans: {
    id: 'genel_bilgi_ve_brans',
    title: 'Genel Bilgi ve Branş Öğretmeni',
    maasKarsiligiHours: 15,
    hazirlikRuleText: 'Her 10 saate +1 saat (Maks. 3 saat)',
    hazirlikPerTenHours: true,
    maxHazirlikHours: 3,
    maxWeeklyAdditionalHours: 20, // +2 saat sınıf rehberliği ile 22
  },
  sinif: {
    id: 'sinif',
    title: 'Sınıf Öğretmeni',
    maasKarsiligiHours: 18,
    hazirlikRuleText: '1 Saat Hazırlık',
    hazirlikFixedHours: 1,
    hazirlikPerTenHours: false,
    maxHazirlikHours: 1,
    maxWeeklyAdditionalHours: 18,
  },
  okul_oncesi: {
    id: 'okul_oncesi',
    title: 'Okul Öncesi Öğretmeni',
    maasKarsiligiHours: 18,
    hazirlikRuleText: '1 Saat Hazırlık',
    hazirlikFixedHours: 1,
    hazirlikPerTenHours: false,
    maxHazirlikHours: 1,
    maxWeeklyAdditionalHours: 18,
  },
  atolye_laboratuvar: {
    id: 'atolye_laboratuvar',
    title: 'Atölye ve Laboratuvar Öğretmeni',
    maasKarsiligiHours: 20,
    hazirlikRuleText: '2 Saat Hazırlık',
    hazirlikFixedHours: 2,
    hazirlikPerTenHours: false,
    maxHazirlikHours: 2,
    maxWeeklyAdditionalHours: 24,
  },
};

export const INITIAL_BRANCH_LIST: BranchItem[] = [
  // Genel Bilgi ve Branş
  { id: 'b-matematik', name: 'Matematik', category: 'genel_bilgi_ve_brans' },
  { id: 'b-turkce', name: 'Türkçe', category: 'genel_bilgi_ve_brans' },
  { id: 'b-edebiyat', name: 'Türk Dili ve Edebiyatı', category: 'genel_bilgi_ve_brans' },
  { id: 'b-fizik', name: 'Fizik', category: 'genel_bilgi_ve_brans' },
  { id: 'b-kimya', name: 'Kimya', category: 'genel_bilgi_ve_brans' },
  { id: 'b-biyoloji', name: 'Biyoloji', category: 'genel_bilgi_ve_brans' },
  { id: 'b-tarih', name: 'Tarih', category: 'genel_bilgi_ve_brans' },
  { id: 'b-cografya', name: 'Coğrafya', category: 'genel_bilgi_ve_brans' },
  { id: 'b-ingilizce', name: 'İngilizce', category: 'genel_bilgi_ve_brans' },
  { id: 'b-din', name: 'Din Kültürü ve Ahlak Bilgisi', category: 'genel_bilgi_ve_brans' },
  { id: 'b-felsefe', name: 'Felsefe', category: 'genel_bilgi_ve_brans' },
  { id: 'b-muzik', name: 'Müzik', category: 'genel_bilgi_ve_brans' },
  { id: 'b-resim', name: 'Görsel Sanatlar / Resim', category: 'genel_bilgi_ve_brans' },
  { id: 'b-beden', name: 'Beden Eğitimi ve Spor', category: 'genel_bilgi_ve_brans' },
  { id: 'b-teknoloji-tasarim', name: 'Teknoloji ve Tasarım', category: 'genel_bilgi_ve_brans' },
  { id: 'b-ozel-egitim', name: 'Özel Eğitim / Destek Eğitimi', category: 'genel_bilgi_ve_brans' },
  { id: 'b-arapca', name: 'Arapça', category: 'genel_bilgi_ve_brans' },
  { id: 'b-nakis', name: 'El Sanatları / Nakış', category: 'genel_bilgi_ve_brans' },
  { id: 'b-giyim', name: 'Giyim Üretim Teknolojisi', category: 'genel_bilgi_ve_brans' },

  // Sınıf Öğretmenliği
  { id: 'b-sinif', name: 'Sınıf Öğretmenliği', category: 'sinif' },

  // Okul Öncesi
  { id: 'b-okul-oncesi', name: 'Okul Öncesi Öğretmenliği', category: 'okul_oncesi' },

  // Atölye ve Laboratuvar
  { id: 'b-bilisim', name: 'Bilişim Teknolojileri (Atölye/Lab)', category: 'atolye_laboratuvar' },
  { id: 'b-elektrik', name: 'Elektrik-Elektronik Teknolojisi', category: 'atolye_laboratuvar' },
  { id: 'b-makine', name: 'Makine Teknolojisi', category: 'atolye_laboratuvar' },
  { id: 'b-metal', name: 'Metal Teknolojisi', category: 'atolye_laboratuvar' },
  { id: 'b-motor', name: 'Motorlu Araçlar Teknolojisi', category: 'atolye_laboratuvar' },
  { id: 'b-muhasebe', name: 'Muhasebe ve Finansman', category: 'atolye_laboratuvar' },
  { id: 'b-saglik', name: 'Sağlık Hizmetleri', category: 'atolye_laboratuvar' },
];

const BRANCH_STORAGE_KEY = 'meb_puantaj_custom_branches';

export function getStoredBranches(): BranchItem[] {
  try {
    const raw = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (!raw) return INITIAL_BRANCH_LIST;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Branş listesi yüklenemedi:', err);
  }
  return INITIAL_BRANCH_LIST;
}

export function saveStoredBranches(branches: BranchItem[]): void {
  try {
    localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branches));
  } catch (err) {
    console.warn('Branş listesi kaydedilemedi:', err);
  }
}

/**
 * Branş adına göre varsayılan kategoriyi bulur
 */
export function inferBranchCategory(branchName: string): BranchCategory {
  const lower = (branchName || '').toLowerCase();
  if (lower.includes('sınıf') || lower.includes('sinif')) return 'sinif';
  if (lower.includes('okul öncesi') || lower.includes('okul oncesi') || lower.includes('anaokul')) return 'okul_oncesi';
  if (
    lower.includes('atölye') ||
    lower.includes('laboratuvar') ||
    lower.includes('bilişim') ||
    lower.includes('elektrik') ||
    lower.includes('makine') ||
    lower.includes('metal') ||
    lower.includes('motor')
  ) {
    return 'atolye_laboratuvar';
  }
  return 'genel_bilgi_ve_brans';
}

