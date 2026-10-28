import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAndSaveAttemptScore } from "@/lib/scoring";

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

