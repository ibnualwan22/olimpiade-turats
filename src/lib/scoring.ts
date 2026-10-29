import { prisma } from "./prisma";

export async function calculateAndSaveAttemptScore(
  attemptId: string,
  statusOverride?: "SUBMITTED" | "TIME_UP"
) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      session: {
        include: {
          questions: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    throw new Error("Attempt tidak ditemukan");
  }

  const now = new Date();
  const startedAt = attempt.startedAt || attempt.tokenVerifiedAt;
  const expiresAt = attempt.expiresAt || now;

  const totalAllowedSeconds =
    (attempt.session.durationMinutes + attempt.extraMinutes) * 60;

  // Hitung waktu pengerjaan aktual (dibatasi maksimal totalAllowedSeconds)
  const rawElapsedSeconds = Math.max(
    1,
    Math.floor((now.getTime() - startedAt.getTime()) / 1000)
  );
  const timeSpentSeconds =
    attempt.timeSpentSeconds ??
    Math.min(totalAllowedSeconds, rawElapsedSeconds);

  // Hitung total bobot maksimal di sesi ini
  let maxPossibleRawScore = 0;
  let rawScore = 0;
  let penaltyScore = 0;

  const answerMap = new Map(
    attempt.answers.map((ans) => [ans.questionId, ans.selectedOptionId])
  );

  for (const sq of attempt.session.questions) {
    const q = sq.question;
    maxPossibleRawScore += q.weight;

    const selectedOptionId = answerMap.get(q.id);
    if (!selectedOptionId) {
      // Tidak dijawab: 0 poin
      continue;
    }

    const correctOption = q.options.find((opt) => opt.isCorrect);
    if (correctOption && correctOption.id === selectedOptionId) {
      rawScore += q.weight;
    } else if (attempt.session.wrongPenalty > 0) {
      penaltyScore += attempt.session.wrongPenalty;
    }
  }

  // Hitung Speed Bonus
  let speedBonus = 0;
  const remainingSeconds = Math.max(0, totalAllowedSeconds - timeSpentSeconds);
  const remainingRatio =
    totalAllowedSeconds > 0 ? remainingSeconds / totalAllowedSeconds : 0;
  const accuracyRatio =
    maxPossibleRawScore > 0
      ? Math.max(0, (rawScore - penaltyScore) / maxPossibleRawScore)
      : 0;

  // Speed bonus tetap dihitung proporsional terhadap ketepatan jawaban
  const calculatedBonus = Number(
    (
      remainingRatio *
      attempt.session.maxSpeedBonus *
      accuracyRatio
    ).toFixed(2)
  );

  if (attempt.session.speedScoringMode === "BONUS_POINTS") {
    speedBonus = calculatedBonus;
  } else {
    speedBonus = 0;
  }

  const netScore = Math.max(0, rawScore - penaltyScore);
  const finalScore = Number((netScore + speedBonus).toFixed(2));

  const newStatus =
    statusOverride ||
    (attempt.status === "IN_PROGRESS"
      ? now > expiresAt
        ? "TIME_UP"
        : "SUBMITTED"
      : attempt.status);

  // GELOMBANG 2: untuk TIME_UP, "waktu selesai" adalah tenggat pribadi
  // (expiresAt), bukan waktu admin/peserta kebetulan memicu finalisasi.
  // Tanpa ini, semua TIME_UP yang difinalisasi bersamaan (mis. saat
  // monitoring dibuka) akan punya finishedAt yang sama persis, sehingga
  // tie-break "paling dulu selesai" menjadi ngawur.
  const finishedAt =
    attempt.finishedAt ??
    (newStatus === "TIME_UP" ? (attempt.expiresAt ?? now) : now);

  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: newStatus,
      finishedAt,
      timeSpentSeconds,
      rawScore: Number(rawScore.toFixed(2)),
      penaltyScore: Number(penaltyScore.toFixed(2)),
      speedBonus,
      finalScore,
    },
  });

  return updated;
}

