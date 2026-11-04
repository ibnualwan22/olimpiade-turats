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
    const { attemptId } = await req.json();

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { session: { select: { resultsVisible: true } } },
    });

    if (!attempt || attempt.userId !== userSession.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // EMBARGO HASIL: respons submit pun tidak boleh membocorkan skor
    // selama sesi belum membuka hasil (halaman selesai mengambil skor
    // dari sini / dari state — keduanya harus ditahan).
    const stripScores = <T extends { timeSpentSeconds: unknown; rawScore: unknown; penaltyScore: unknown; speedBonus: unknown; finalScore: unknown }>(
      a: T
    ) =>
      attempt.session.resultsVisible
        ? a
        : {
            ...a,
            timeSpentSeconds: null,
            rawScore: null,
            penaltyScore: null,
            speedBonus: null,
            finalScore: null,
          };

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ attempt: stripScores(attempt) });
    }

    const finalized = await calculateAndSaveAttemptScore(
      attempt.id,
      "SUBMITTED"
    );

    return NextResponse.json({ attempt: stripScores(finalized) });
  } catch (error) {
    console.error("Submit exam error:", error);
    return NextResponse.json(
      { error: "Gagal mengumpulkan ujian" },
      { status: 500 }
    );
  }
}

