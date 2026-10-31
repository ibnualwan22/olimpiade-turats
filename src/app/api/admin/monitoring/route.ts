import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";
import { countAnswers } from "@/lib/monitoring";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  const sessions = await prisma.examSession.findMany({
    select: {
      id: true,
      title: true,
      accessToken: true,
      durationMinutes: true,
      speedScoringMode: true,
      maxSpeedBonus: true,
      wrongPenalty: true,
      isActive: true,
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const targetSessionId = sessionId || sessions[0]?.id;

  if (!targetSessionId) {
    return NextResponse.json({
      sessions: [],
      attempts: [],
      summary: null,
      questionStats: [],
      serverTime: new Date().toISOString(),
    });
  }

  // Periksa jika ada attempt IN_PROGRESS yang sudah melewati expiresAt -> auto-finalize
  const now = new Date();
  const expiredAttempts = await prisma.examAttempt.findMany({
    where: {
      sessionId: targetSessionId,
      status: "IN_PROGRESS",
      expiresAt: { lt: now },
    },
    select: { id: true },
  });

  for (const exp of expiredAttempts) {
    await calculateAndSaveAttemptScore(exp.id, "TIME_UP");
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { sessionId: targetSessionId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          institution: true,
        },
      },
      session: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          speedScoringMode: true,
          _count: { select: { questions: true } },
        },
      },
      answers: {
        select: {
          questionId: true,
          selectedOptionId: true,
          isDoubtful: true,
          answeredAt: true,
          selectedOption: { select: { isCorrect: true } },
        },
      },
    },
    // GELOMBANG 2: penentu seri sesuai aturan yang diiklankan —
    // nilai tertinggi, lalu paling dulu selesai (finishedAt), lalu
    // durasi tercepat; tokenVerifiedAt hanya penentu terakhir supaya
    // urutan deterministik.
    orderBy: [
      { finalScore: "desc" },
      { finishedAt: "asc" },
      { timeSpentSeconds: "asc" },
      { tokenVerifiedAt: "asc" },
    ],
  });

  const totalQuestions =
    sessions.find((s) => s.id === targetSessionId)?._count.questions ?? 0;

  // Hitungan benar/salah dihitung di server supaya payload polling
  // tetap ringan (baris jawaban tidak ikut dikirim ke klien).
  const attemptRows = attempts.map((a) => {
    const counts = countAnswers(a.answers);
    const { answers: _answers, ...rest } = a;
    return {
      ...rest,
      answeredCount: counts.answered,
      correctCount: counts.correct,
      wrongCount: counts.wrong,
      doubtfulCount: counts.doubtful,
      unansweredCount: Math.max(0, totalQuestions - counts.answered),
      lastAnsweredAt: counts.lastAnsweredAt,
    };
  });

  // Ringkasan sesi: peserta yang belum memasukkan token = akun peserta
  // aktif tanpa attempt pada sesi ini (termasuk akun contoh bila masih
  // ada — panitia perlu tahu angka ini apa adanya).
  const totalParticipants = await prisma.user.count({
    where: { role: "PARTICIPANT", isActive: true },
  });
  const summary = {
    totalParticipants,
    notStarted: Math.max(0, totalParticipants - attempts.length),
    rules: attempts.filter(
      (a) => a.status === "IN_PROGRESS" && !a.startedAt
    ).length,
    working: attempts.filter(
      (a) => a.status === "IN_PROGRESS" && a.startedAt
    ).length,
    finished: attempts.filter((a) => a.status !== "IN_PROGRESS").length,
  };

  // Statistik per soal. Penyebut = peserta yang sudah klik mulai
  // (yang belum mulai tidak dihitung sebagai "kosong" untuk semua soal).
  const startedAttempts = attempts.filter((a) => a.startedAt);
  const sessionQuestions = await prisma.sessionQuestion.findMany({
    where: { sessionId: targetSessionId },
    include: {
      question: {
        select: {
          id: true,
          content: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { orderIndex: "asc" },
  });
  const perQuestion = new Map<
    string,
    { correct: number; wrong: number; answered: number }
  >();
  for (const a of startedAttempts) {
    for (const ans of a.answers) {
      if (!ans.selectedOptionId) continue;
      const entry = perQuestion.get(ans.questionId) ?? {
        correct: 0,
        wrong: 0,
        answered: 0,
      };
      entry.answered += 1;
      if (ans.selectedOption?.isCorrect) entry.correct += 1;
      else entry.wrong += 1;
      perQuestion.set(ans.questionId, entry);
    }
  }
  const questionStats = sessionQuestions.map((sq, idx) => {
    const entry = perQuestion.get(sq.questionId) ?? {
      correct: 0,
      wrong: 0,
      answered: 0,
    };
    return {
      questionId: sq.questionId,
      order: idx + 1,
      content: sq.question.content,
      category: sq.question.category?.name ?? null,
      correct: entry.correct,
      wrong: entry.wrong,
      unanswered: Math.max(0, startedAttempts.length - entry.answered),
      denominator: startedAttempts.length,
    };
  });

  return NextResponse.json({
    sessions,
    selectedSessionId: targetSessionId,
    attempts: attemptRows,
    summary,
    questionStats,
    serverTime: now.toISOString(),
  });
}
