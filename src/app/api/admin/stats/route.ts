import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [
    totalQuestions,
    totalCategories,
    totalSessions,
    activeSessions,
    totalParticipants,
    totalAdmins,
    totalAttempts,
    inProgressAttempts,
    finishedAttempts,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.questionCategory.count(),
    prisma.examSession.count(),
    prisma.examSession.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.examAttempt.count(),
    prisma.examAttempt.count({ where: { status: "IN_PROGRESS" } }),
    prisma.examAttempt.count({
      where: { status: { in: ["SUBMITTED", "TIME_UP"] } },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalQuestions,
      totalCategories,
      totalSessions,
      activeSessions,
      totalParticipants,
      totalAdmins,
      totalAttempts,
      inProgressAttempts,
      finishedAttempts,
    },
  });
}

