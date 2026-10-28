import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";

export async function GET(req: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    // Kembalikan daftar attempt milik peserta
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: userSession.userId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            description: true,
            durationMinutes: true,
            speedScoringMode: true,
            maxSpeedBonus: true,
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      user: userSession,
      attempts,
      serverTime: new Date().toISOString(),
    });
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: {
      userId_sessionId: {
        userId: userSession.userId,
        sessionId,
      },
    },
    include: {
      session: {
        include: {
          questions: {
            include: {
              question: {
                select: {
                  id: true,
                  content: true,
                  direction: true,
                  weight: true,
                  category: { select: { name: true } },
                  options: {
                    select: {
                      id: true,
                      label: true,
                      content: true,
                      direction: true,
                      // PENTING: Jangan sertakan isCorrect ke peserta!
                    },
                    orderBy: { label: "asc" },
                  },
                },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    return NextResponse.json(
      { error: "Akses belum terverifikasi. Masukkan token terlebih dahulu." },
      { status: 403 }
    );
  }

  const now = new Date();
  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.expiresAt &&
    now > attempt.expiresAt
  ) {
    const finalized = await calculateAndSaveAttemptScore(attempt.id, "TIME_UP");
    attempt.status = finalized.status;
    attempt.rawScore = finalized.rawScore;
    attempt.penaltyScore = finalized.penaltyScore;
    attempt.speedBonus = finalized.speedBonus;
    attempt.finalScore = finalized.finalScore;
    attempt.timeSpentSeconds = finalized.timeSpentSeconds;
    attempt.finishedAt = finalized.finishedAt;
  }

  // Susun urutan soal sesuai questionOrder milik peserta
  const questionMap = new Map(
    attempt.session.questions.map((sq) => [sq.question.id, sq.question])
  );

  const orderedIds = Array.isArray(attempt.questionOrder)
    ? (attempt.questionOrder as string[])
    : attempt.session.questions.map((sq) => sq.question.id);

  const questions = orderedIds
    .map((id) => questionMap.get(id))
    .filter(Boolean);

  // Jika ada soal baru yang ditambahkan admin ke sesi setelah peserta mulai
  for (const sq of attempt.session.questions) {
    if (!orderedIds.includes(sq.question.id)) {
      questions.push(sq.question);
    }
  }

  return NextResponse.json({
    serverTime: now.toISOString(),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      tokenVerifiedAt: attempt.tokenVerifiedAt,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      extraMinutes: attempt.extraMinutes,
      finishedAt: attempt.finishedAt,
      timeSpentSeconds: attempt.timeSpentSeconds,
      rawScore: attempt.rawScore,
      penaltyScore: attempt.penaltyScore,
      speedBonus: attempt.speedBonus,
      finalScore: attempt.finalScore,
    },
    session: {
      id: attempt.session.id,
      title: attempt.session.title,
      description: attempt.session.description,
      rulesContent: attempt.session.rulesContent,
      durationMinutes: attempt.session.durationMinutes,
      wrongPenalty: attempt.session.wrongPenalty,
      speedScoringMode: attempt.session.speedScoringMode,
      maxSpeedBonus: attempt.session.maxSpeedBonus,
      totalQuestions: questions.length,
    },
    questions,
    answers: attempt.answers,
  });
}

