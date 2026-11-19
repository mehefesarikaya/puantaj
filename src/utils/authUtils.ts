import { UserAccount } from '../types';

const SALT = 'meb_puantaj_secure_salt_2026';

/**
 * Computes SHA-256 hash with salt for secure password storage
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + SALT);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous hash helper for initial static seed data
 */
function simpleSeedHash(str: string): string {
  let hash = 0;
  const full = str + SALT;
  for (let i = 0; i < full.length; i++) {
    const char = full.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin123
    role: 'admin',
    fullName: 'İlçe Milli Eğitim Şube Müdürü',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-school-1',
    username: '752140',
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // okul123
    role: 'school_user',
    schoolId: 'school-1',
    fullName: 'Atatürk AL Yetkilisi',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-school-2',
    username: '758920',
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // okul123
    role: 'school_user',
    schoolId: 'school-2',
    fullName: 'Cumhuriyet İO Yetkilisi',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-school-3',
    username: '761045',
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // okul123
    role: 'school_user',
    schoolId: 'school-3',
    fullName: 'Halk Eğitimi Merkezi Yetkilisi',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-school-4',
    username: '764312',
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // okul123
    role: 'school_user',
    schoolId: 'school-4',
    fullName: 'Şehit Ömer Halisdemir İHO Yetkilisi',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-school-5',
    username: '768910',
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // okul123
    role: 'school_user',
    schoolId: 'school-5',
    fullName: 'Gölbaşı Özel Eğitim Yetkilisi',
    isActive: true,
    createdAt: '2026-09-01T08:00:00Z',
  },
];

