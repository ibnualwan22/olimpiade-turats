import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";

export async function POST(req: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { attemptId, questionId, selectedOptionId, isDoubtful } = body;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.userId !== userSession.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Waktu ujian telah selesai atau jawaban sudah dikumpulkan" },
        { status: 400 }
      );
    }

    // GELOMBANG 1: tolak jawaban sebelum peserta klik "Mulai".
    // Tanpa ini, attempt yang baru verifikasi token (startedAt null,
    // expiresAt null) bisa dijawab sepuasnya tanpa timer berjalan.
    if (!attempt.startedAt) {
      return NextResponse.json(
        {
          error:
            "Ujian belum dimulai. Klik 'Mulai' di halaman Tata Tertib terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    if (attempt.expiresAt && now > attempt.expiresAt) {
      await calculateAndSaveAttemptScore(attempt.id, "TIME_UP");
      return NextResponse.json(
        { error: "Waktu pengerjaan telah habis", timeUp: true },
        { status: 400 }
      );
    }

    const answer = await prisma.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        ...(selectedOptionId !== undefined ? { selectedOptionId } : {}),
        ...(isDoubtful !== undefined ? { isDoubtful: Boolean(isDoubtful) } : {}),
        answeredAt: now,
      },
      create: {
        attemptId,
        questionId,
        selectedOptionId: selectedOptionId || null,
        isDoubtful: Boolean(isDoubtful),
        answeredAt: now,
      },
    });

    // Sinyal aktivitas untuk monitoring (pelengkap heartbeat 30 detik).
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { lastSeenAt: now },
    });

    return NextResponse.json({ answer, serverTime: now.toISOString() });
  } catch (error) {
    console.error("Save answer error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan jawaban" },
      { status: 500 }
    );
  }
}

