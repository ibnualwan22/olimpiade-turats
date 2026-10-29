import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomPassword, hashPassword } from "@/lib/akun";
import { sendCredentialsEmail } from "@/lib/email";

// Kirim kredensial ke peserta yang belum pernah terkirim (tidak ada baris
// EmailLog SENT), yang aktif, dan yang memiliki email. Urutan: yang paling
// dulu dibuat. Password dibuat saat kirim, dikirim dulu, baru hash-nya
// disimpan — jadi bila kirim gagal, password lama tetap berlaku.
// Password TIDAK PERNAH dikembalikan lewat respons ini.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let limit = 50;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number") {
      limit = Math.max(1, Math.min(200, Math.floor(body.limit)));
    }
  } catch {
    // tanpa body -> pakai default 50
  }

  const targets = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      isActive: true,
      email: { not: null },
      emailLogs: { none: { status: "SENT" } },
    },
    select: { id: true, username: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  const failed: { username: string; error: string }[] = [];

  for (const user of targets) {
    const email = user.email as string;
    const password = randomPassword();
    try {
      const resendId = await sendCredentialsEmail({
        to: email,
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
      sent++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mengirim email";
      await prisma.emailLog.create({
        data: { userId: user.id, status: "FAILED", error: message },
      });
      failed.push({ username: user.username, error: message });
    }
  }

  return NextResponse.json({
    total: targets.length,
    sent,
    failed: failed.length,
    failedUsers: failed,
  });
}
