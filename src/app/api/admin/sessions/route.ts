import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GELOMBANG 2: jendela waktu sesi. Nilai kosong/invalid = null (tidak
// dibatasi jendela, hanya isActive yang berlaku). Form admin mengirim
// ISO dengan offset zona waktu, jadi new Date() di sini sudah tepat.
function parseOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sessions = await prisma.examSession.findMany({
    include: {
      questions: {
        include: {
          question: {
            select: {
              id: true,
              content: true,
              weight: true,
              direction: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
      _count: {
        select: { attempts: true, questions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
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
      startTime,
      endTime,
      questionIds = [],
    } = body;

    if (!title?.trim() || !accessToken?.trim()) {
      return NextResponse.json(
        { error: "Judul sesi dan Token wajib diisi" },
        { status: 400 }
      );
    }

    const cleanToken = accessToken.trim().toUpperCase();
    const existing = await prisma.examSession.findUnique({
      where: { accessToken: cleanToken },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Token sesi sudah digunakan sesi lain" },
        { status: 400 }
      );
    }

    const examSession = await prisma.examSession.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        rulesContent:
          rulesContent?.trim() ||
          "1. Berdoa sebelum memulai ujian.\n2. Kerjakan secara jujur dan mandiri.\n3. Perhatikan sisa waktu di bagian atas layar.",
        accessToken: cleanToken,
        durationMinutes: Number(durationMinutes) || 60,
        isActive: Boolean(isActive),
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        wrongPenalty: Number(wrongPenalty) || 0,
        speedScoringMode:
          speedScoringMode === "TIE_BREAKER" ? "TIE_BREAKER" : "BONUS_POINTS",
        maxSpeedBonus: Number(maxSpeedBonus) || 0,
        startTime: parseOptionalDate(startTime),
        endTime: parseOptionalDate(endTime),
        questions: {
          create: (questionIds as string[]).map((qId, idx) => ({
            questionId: qId,
            orderIndex: idx + 1,
          })),
        },
      },
    });

    return NextResponse.json({ session: examSession });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Gagal membuat sesi ujian" },
      { status: 500 }
    );
  }
}

