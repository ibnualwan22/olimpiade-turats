import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const categories = await prisma.questionCategory.findMany({
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Nama kategori wajib diisi" },
      { status: 400 }
    );
  }

  const category = await prisma.questionCategory.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json({ category });
}

