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
    });

    if (!attempt || attempt.userId !== userSession.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ attempt });
    }

    const finalized = await calculateAndSaveAttemptScore(
      attempt.id,
      "SUBMITTED"
    );

    return NextResponse.json({ attempt: finalized });
  } catch (error) {
    console.error("Submit exam error:", error);
    return NextResponse.json(
      { error: "Gagal mengumpulkan ujian" },
      { status: 500 }
    );
  }
}

