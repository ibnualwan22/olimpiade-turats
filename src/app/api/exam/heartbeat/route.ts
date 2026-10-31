import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Sinyal aktivitas peserta selama mengerjakan (dipanggil halaman ujian
// tiap 30 detik). Hanya memperbarui lastSeenAt; tidak menyentuh nilai,
// jawaban, atau timer. Gagal diam-diam di klien supaya tidak mengganggu
// peserta bila sinyal sesekali hilang.
export async function POST(req: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { attemptId } = body;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, status: true },
    });

    if (!attempt || attempt.userId !== userSession.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal mencatat aktivitas" }, { status: 500 });
  }
}
