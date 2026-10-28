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

    // Update soal beserta opsi jawaban
    await prisma.questionOption.deleteMany({
      where: { questionId: id },
    });

    const question = await prisma.question.update({
      where: { id },
      data: {
        categoryId: categoryId || null,
        content: content.trim(),
        direction: direction === "LTR" ? "LTR" : "RTL",
        weight: Number(weight) || 10,
        explanation: explanation?.trim() || null,
        options: {
          create: (options || []).map(
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
    console.error("Update question error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui soal" },
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
  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

