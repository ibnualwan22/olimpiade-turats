import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(req: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    const examSession = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!examSession || !examSession.isActive) {
      return NextResponse.json(
        { error: "Sesi ujian tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // GELOMBANG 2: tegakkan jendela waktu bila diisi admin
    // (cerminan cek di verify-token).
    const nowWindow = new Date();
    if (examSession.startTime && nowWindow < examSession.startTime) {
      return NextResponse.json(
        { error: "Sesi ujian belum dibuka sesuai jadwal." },
        { status: 403 }
      );
    }
    if (examSession.endTime && nowWindow > examSession.endTime) {
      return NextResponse.json(
        { error: "Sesi ujian sudah ditutup sesuai jadwal." },
        { status: 403 }
      );
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        userId_sessionId: {
          userId: userSession.userId,
          sessionId,
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Anda belum memasukkan token untuk sesi ini" },
        { status: 403 }
      );
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Anda sudah menyelesaikan sesi ujian ini" },
        { status: 400 }
      );
    }

    // Jika sudah pernah klik mulai sebelumnya, kembalikan waktu yang sudah berjalan (anti-refresh reset)
    if (attempt.startedAt && attempt.expiresAt) {
      return NextResponse.json({
        attempt,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
      });
    }

    const now = new Date();
    const totalMinutes = examSession.durationMinutes + attempt.extraMinutes;
    const expiresAt = new Date(now.getTime() + totalMinutes * 60 * 1000);

    const rawQuestionIds = examSession.questions.map((sq) => sq.questionId);
    const orderedIds = examSession.shuffleQuestions
      ? shuffleArray(rawQuestionIds)
      : rawQuestionIds;

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        startedAt: now,
        expiresAt,
        questionOrder: orderedIds,
      },
    });

    return NextResponse.json({
      attempt: updatedAttempt,
      startedAt: updatedAttempt.startedAt,
      expiresAt: updatedAttempt.expiresAt,
    });
  } catch (error) {
    console.error("Start exam error:", error);
    return NextResponse.json(
      { error: "Gagal memulai waktu ujian" },
      { status: 500 }
    );
  }
}

