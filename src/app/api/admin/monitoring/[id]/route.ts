import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";
import { countAnswers } from "@/lib/monitoring";

// Detail per peserta (ADMIN ONLY): seluruh jawaban beserta kunci, untuk
// transparansi bila ada peserta yang mempertanyakan nilainya. Kunci
// jawaban tidak pernah dikirim ke rute peserta — hanya rute admin ini.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const attempt = await prisma.examAttempt.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, username: true, name: true, institution: true },
      },
      session: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          _count: { select: { questions: true } },
        },
      },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              content: true,
              category: { select: { name: true } },
              options: {
                select: {
                  id: true,
                  label: true,
                  content: true,
                  isCorrect: true,
                },
                orderBy: { label: "asc" },
              },
            },
          },
          selectedOption: {
            select: { id: true, label: true, content: true },
          },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json(
      { error: "Data ujian peserta tidak ditemukan" },
      { status: 404 }
    );
  }

  // Nomor soal = posisi dalam urutan sesi (1..N), SAMA seperti tab
  // Statistik Soal. Nilai orderIndex yang tersimpan di DB sudah 1-based,
  // jadi tidak boleh ditambah 1 lagi (itu yang sempat membuat detail
  // bernomor 2..7 sementara statistik bernomor 1..6).
  const orderMap = new Map<string, number>();
  const sessionQuestions = await prisma.sessionQuestion.findMany({
    where: { sessionId: attempt.sessionId },
    select: { questionId: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  });
  sessionQuestions.forEach((sq, idx) =>
    orderMap.set(sq.questionId, idx)
  );

  // countAnswers butuh selectedOption.isCorrect; di rute detail ini
  // selectedOption tidak membawa isCorrect, jadi turunkan dari daftar
  // opsi soal (kunci yang sama dipakai kolom Hasil di bawah).
  const counts = countAnswers(
    attempt.answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isDoubtful: a.isDoubtful,
      answeredAt: a.answeredAt,
      selectedOption: a.selectedOptionId
        ? {
            isCorrect:
              a.question.options.find((o) => o.id === a.selectedOptionId)
                ?.isCorrect ?? false,
          }
        : null,
    }))
  );
  const totalQuestions = attempt.session._count.questions;
  const answers = [...attempt.answers]
    .sort((a, b) => {
      const oa = orderMap.get(a.questionId) ?? 9999;
      const ob = orderMap.get(b.questionId) ?? 9999;
      return oa - ob;
    })
    .map((a) => ({
      questionId: a.questionId,
      order: (orderMap.get(a.questionId) ?? 0) + 1,
      content: a.question.content,
      category: a.question.category?.name ?? null,
      options: a.question.options,
      selectedOptionId: a.selectedOptionId,
      selectedOption: a.selectedOption,
      isCorrect: a.selectedOptionId
        ? (a.question.options.find((o) => o.id === a.selectedOptionId)
            ?.isCorrect ?? null)
        : null,
      isDoubtful: a.isDoubtful,
      answeredAt: a.answeredAt,
    }));

  const { answers: _answers, ...attemptBase } = attempt;
  return NextResponse.json({
    attempt: {
      ...attemptBase,
      answeredCount: counts.answered,
      correctCount: counts.correct,
      wrongCount: counts.wrong,
      doubtfulCount: counts.doubtful,
      unansweredCount: Math.max(0, totalQuestions - counts.answered),
      lastAnsweredAt: counts.lastAnsweredAt,
    },
    answers,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, extraMinutes = 5 } = body;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Data ujian peserta tidak ditemukan" },
        { status: 404 }
      );
    }

    if (action === "ADD_TIME") {
      const addMins = Number(extraMinutes) || 5;
      const newExtra = attempt.extraMinutes + addMins;
      const baseExpiry = attempt.expiresAt
        ? new Date(attempt.expiresAt.getTime())
        : new Date();
      const now = new Date();
      const effectiveStart = baseExpiry > now ? baseExpiry : now;
      const newExpiresAt = new Date(
        effectiveStart.getTime() + addMins * 60 * 1000
      );

      const updated = await prisma.examAttempt.update({
        where: { id },
        data: {
          extraMinutes: newExtra,
          expiresAt: newExpiresAt,
          status: "IN_PROGRESS",
          finishedAt: null,
        },
      });
      return NextResponse.json({ attempt: updated });
    }

    if (action === "FORCE_SUBMIT" || action === "RECALCULATE") {
      const updated = await calculateAndSaveAttemptScore(
        id,
        action === "FORCE_SUBMIT" ? "SUBMITTED" : undefined
      );
      return NextResponse.json({ attempt: updated });
    }

    if (action === "RESET") {
      await prisma.examAttempt.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error) {
    console.error("Monitoring action error:", error);
    return NextResponse.json(
      { error: "Gagal memproses aksi monitoring" },
      { status: 500 }
    );
  }
}

