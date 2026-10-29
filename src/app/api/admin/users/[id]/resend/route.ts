import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomPassword, hashPassword } from "@/lib/akun";
import { sendCredentialsEmail } from "@/lib/email";

// Kirim ulang kredensial ke satu peserta: password BARU dibuat, dikirim,
// lalu hash-nya disimpan. Password lama tidak berlaku lagi setelah ini.
// Hanya untuk peserta (PARTICIPANT) yang aktif dan memiliki email.
// Password TIDAK PERNAH dikembalikan lewat respons ini.
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
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      email: true,
    },
  });

  if (!user || user.role !== "PARTICIPANT") {
    return NextResponse.json(
      { error: "Peserta tidak ditemukan" },
      { status: 404 }
    );
  }
  if (!user.isActive) {
    return NextResponse.json(
      { error: "Akun peserta nonaktif, aktifkan dulu sebelum kirim ulang" },
      { status: 400 }
    );
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Peserta belum memiliki email" },
      { status: 400 }
    );
  }

  const password = randomPassword();
  try {
    const resendId = await sendCredentialsEmail({
      to: user.email,
      name: user.name,
      username: user.username,
      password,
    });
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      }),
      prisma.emailLog.create({
        data: { userId: user.id, status: "SENT", resendId },
      }),
    ]);
    return NextResponse.json({ sent: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengirim email";
    await prisma.emailLog.create({
      data: { userId: user.id, status: "FAILED", error: message },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
