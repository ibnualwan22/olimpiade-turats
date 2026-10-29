import bcrypt from "bcryptjs";
import { randomInt, randomUUID } from "node:crypto";

// Alfabet tanpa huruf/angka yang mudah tertukar (tanpa 0/O/1/l/I).
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function randomPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Hash placeholder untuk akun yang baru diimpor: hash bcrypt dari secret
// acak yang tidak diketahui siapa pun, sehingga akun belum bisa dipakai
// login sampai pengiriman kredensial menetapkan password asli.
export function placeholderHash(): Promise<string> {
  return bcrypt.hash(randomUUID(), 10);
}

// Username dari nama: huruf kecil, tanpa spasi dan tanda baca.
// "Ahmad Zaki Al-Faruq" -> "ahmadzakialfaruq".
export function slugUsername(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return slug || "peserta";
}

// Cari username yang belum dipakai: basis, basis2, basis3, ...
export async function uniqueUsername(
  base: string,
  exists: (username: string) => Promise<boolean>
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}${n}`;
    if (!(await exists(candidate))) return candidate;
  }
}
