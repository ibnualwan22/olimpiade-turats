import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";

// GELOMBANG 2: acak opsi deterministik per peserta (benih = ID attempt +
// ID soal), supaya urutannya stabil di semua refresh tanpa kolom database
// baru. Dipakai hanya bila session.shuffleOptions aktif; bila nonaktif,
// opsi tetap urut label seperti sebelumnya. Penilaian tidak berubah
// karena pencocokan kunci memakai ID opsi, bukan posisinya.
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic<T>(arr: T[], seedStr: string): T[] {
  const copy = [...arr];
  const rand = mulberry32(hashSeed(seedStr));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

  // GELOMBANG 1: tahan isi soal sampai peserta klik "Mulai".
  // Halaman play sudah mengarahkan attempt yang belum mulai kembali ke
  // halaman Tata Tertib, dan halaman Tata Tertib memakai totalQuestions
  // (tetap dikirim dari questions.length) — jadi alur normal tidak berubah,
  // tapi soal tidak bisa dibaca/dikerjakan sebelum timer berjalan.
  const hasStarted = Boolean(attempt.startedAt);

  // GELOMBANG 2: bila shuffleOptions aktif, acak opsi per peserta di sini
  // (stabil per attempt+soal, lihat helper di atas). Soal yang ditahan
  // pra-mulai tetap [] — pengacakan hanya berlaku untuk soal yang
  // benar-benar dikirim.
  const visibleQuestions = !hasStarted
    ? []
    : attempt.session.shuffleOptions
      ? questions.map((q) =>
          q
            ? {
                ...q,
                options: shuffleDeterministic(
                  q.options,
                  `${attempt.id}:${q.id}`
                ),
              }
            : q
        )
      : questions;

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
    questions: visibleQuestions,
    answers: attempt.answers,
  });
}

