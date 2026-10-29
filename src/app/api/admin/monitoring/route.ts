import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";

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
          category: true,
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
      _count: {
        select: { answers: true },
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

  return NextResponse.json({
    sessions,
    selectedSessionId: targetSessionId,
    attempts,
    serverTime: now.toISOString(),
  });
}

