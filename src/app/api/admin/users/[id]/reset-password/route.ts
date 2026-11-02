import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomPassword, hashPassword } from "@/lib/akun";

// Reset sandi peserta oleh admin: sandi BARU dibuat dan dikembalikan
// SEKALI lewat respons ini untuk ditampilkan ke admin. Sandi TIDAK
// dikirim lewat email (untuk peserta yang emailnya tidak sampai) dan
// TIDAK PERNAH bisa dilihat lagi setelah modal ditutup — server hanya
// menyimpan hash-nya, dan sandi polos tidak ditulis ke log. Menutup
// modal tanpa mencatat berarti harus reset lagi (sandi baru lagi).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, isActive: true },
  });

  if (!user || user.role !== "PARTICIPANT") {
    return NextResponse.json(
      { error: "Peserta tidak ditemukan" },
      { status: 404 }
    );
  }
  if (!user.isActive) {
    return NextResponse.json(
      { error: "Akun peserta nonaktif, aktifkan dulu sebelum reset sandi" },
      { status: 400 }
    );
  }

  try {
    const password = randomPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
    return NextResponse.json({ username: user.username, password });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Gagal mereset sandi" },
      { status: 500 }
    );
  }
}
