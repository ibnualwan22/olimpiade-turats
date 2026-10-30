import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import {
  getClientIp,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, turnstileToken } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    // GELOMBANG 2: batasi percobaan login gagal per IP (20 per 15 menit).
    // Pesan kegagalan tetap sama untuk semua kasus supaya tidak bisa
    // dipakai menebak username mana yang terdaftar.
    const clientIp = getClientIp(req);
    if (isLoginRateLimited(clientIp)) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak percobaan login gagal dari jaringan ini. Coba lagi dalam 15 menit.",
        },
        { status: 429 }
      );
    }

    // Turnstile: token diverifikasi server-side SEBELUM memeriksa
    // kredensial, supaya bot tidak bisa membanjiri percobaan login.
    // Kegagalan verifikasi ikut dihitung sebagai percobaan gagal.
    const turnstile = await verifyTurnstileToken(turnstileToken);
    if (!turnstile.ok) {
      recordLoginFailure(clientIp);
      return NextResponse.json(
        { error: turnstile.error || "Verifikasi keamanan gagal." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      recordLoginFailure(clientIp);
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      recordLoginFailure(clientIp);
      return NextResponse.json(
        { error: "Akun Anda sedang dinonaktifkan oleh panitia" },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      recordLoginFailure(clientIp);
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      institution: user.institution,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        institution: user.institution,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

