// Hesovanje lozinki preko scrypt algoritma (ugradjen u Node.js 'crypto' modul, bez ikakvog paketa).
// Format zapisa u bazi: "salt:hash" (oba hex). Stare obicne-tekst lozinke NEMAJU ':' u sebi,
// pa se lako prepoznaju i automatski migriraju na prvoj sledecoj uspesnoj prijavi.

import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, KEY_LEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  const derivedKey = await scryptAsync(password, salt, KEY_LEN);
  const hashBuffer = Buffer.from(hashHex, 'hex');
  if (hashBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(hashBuffer, derivedKey);
}

// Da li je stara (nehesovana) lozinka - koristi se samo za jednokratnu automatsku migraciju
export function isPlaintext(stored) {
  return !!stored && !stored.includes(':');
}
