import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return NextResponse.json(
      { error: "Silakan login terlebih dahulu" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { token } = body;

    if (!token?.trim()) {
      return NextResponse.json(
        { error: "Token ujian wajib diisi" },
        { status: 400 }
      );
    }

    const cleanToken = token.trim().toUpperCase();
    const examSession = await prisma.examSession.findUnique({
      where: { accessToken: cleanToken },
      include: {
        _count: { select: { questions: true } },
      },
    });

    if (!examSession) {
      return NextResponse.json(
        { error: "Token ujian tidak ditemukan. Periksa kembali token Anda." },
        { status: 404 }
      );
    }

    if (!examSession.isActive) {
      return NextResponse.json(
        { error: "Sesi ujian ini belum dibuka atau sudah ditutup oleh panitia." },
        { status: 403 }
      );
    }

    if (examSession._count.questions === 0) {
      return NextResponse.json(
        { error: "Sesi ujian ini belum memiliki soal aktif." },
        { status: 400 }
      );
    }

    // Buat atau ambil attempt peserta (startedAt masih null sampai peserta klik 'Mulai' di halaman Tata Tertib)
    const attempt = await prisma.examAttempt.upsert({
      where: {
        userId_sessionId: {
          userId: userSession.userId,
          sessionId: examSession.id,
        },
      },
      update: {},
      create: {
        userId: userSession.userId,
        sessionId: examSession.id,
        status: "IN_PROGRESS",
        tokenVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      sessionId: examSession.id,
      attemptId: attempt.id,
      alreadyStarted: Boolean(attempt.startedAt),
      status: attempt.status,
    });
  } catch (error) {
    console.error("Verify token error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memverifikasi token" },
      { status: 500 }
    );
  }
}

