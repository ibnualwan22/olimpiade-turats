import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// GELOMBANG 2: tidak ada lagi secret cadangan hardcode. Dulu, bila
// JWT_SECRET kosong, siapa pun yang membaca repo bisa menempa token
// ADMIN. Sekarang secret wajib ada: kalau tidak, login gagal total
// (fail closed) dan verifikasi sesi mengembalikan null.
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET tidak diset di environment");
  }
  return new TextEncoder().encode(secret);
}

export const COOKIE_NAME = "turats_session";

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: "ADMIN" | "PARTICIPANT";
  institution?: string | null;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

