import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const questions = await prisma.question.findMany({
    include: {
      category: true,
      options: {
        orderBy: { label: "asc" },
      },
      _count: {
        select: { sessions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.questionCategory.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ questions, categories });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      categoryId,
      content,
      direction = "RTL",
      weight = 10,
      explanation,
      options,
    } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Teks soal wajib diisi" },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "Minimal harus ada 2 opsi jawaban" },
        { status: 400 }
      );
    }

    const hasCorrect = options.some((opt: { isCorrect?: boolean }) => opt.isCorrect);
    if (!hasCorrect) {
      return NextResponse.json(
        { error: "Pilih salah satu opsi sebagai kunci jawaban benar" },
        { status: 400 }
      );
    }

    const question = await prisma.question.create({
      data: {
        categoryId: categoryId || null,
        content: content.trim(),
        direction: direction === "LTR" ? "LTR" : "RTL",
        weight: Number(weight) || 10,
        explanation: explanation?.trim() || null,
        options: {
          create: options.map(
            (
              opt: {
                label?: string;
                content: string;
                direction?: string;
                isCorrect?: boolean;
              },
              idx: number
            ) => ({
              label: opt.label || String.fromCharCode(65 + idx),
              content: opt.content.trim(),
              direction:
                opt.direction === "LTR"
                  ? "LTR"
                  : opt.direction === "RTL"
                    ? "RTL"
                    : direction === "LTR"
                      ? "LTR"
                      : "RTL",
              isCorrect: Boolean(opt.isCorrect),
            })
          ),
        },
      },
      include: {
        category: true,
        options: { orderBy: { label: "asc" } },
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan soal" },
      { status: 500 }
    );
  }
}

