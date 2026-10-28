import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
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
    const {
      title,
      description,
      rulesContent,
      accessToken,
      durationMinutes = 60,
      isActive = true,
      shuffleQuestions = true,
      shuffleOptions = false,
      wrongPenalty = 0,
      speedScoringMode = "BONUS_POINTS",
      maxSpeedBonus = 20,
      questionIds,
    } = body;

    const cleanToken = accessToken?.trim().toUpperCase();

    if (Array.isArray(questionIds)) {
      await prisma.sessionQuestion.deleteMany({
        where: { sessionId: id },
      });
    }

    const updated = await prisma.examSession.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
        rulesContent: rulesContent?.trim(),
        accessToken: cleanToken,
        durationMinutes: Number(durationMinutes) || 60,
        isActive: Boolean(isActive),
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        wrongPenalty: Number(wrongPenalty) || 0,
        speedScoringMode:
          speedScoringMode === "TIE_BREAKER" ? "TIE_BREAKER" : "BONUS_POINTS",
        maxSpeedBonus: Number(maxSpeedBonus) || 0,
        ...(Array.isArray(questionIds)
          ? {
            questions: {
              create: (questionIds as string[]).map((qId, idx) => ({
                questionId: qId,
                orderIndex: idx + 1,
              })),
            },
          }
          : {}),
      },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui sesi ujian" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.examSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

