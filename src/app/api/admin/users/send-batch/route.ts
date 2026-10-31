import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomPassword, hashPassword } from "@/lib/akun";
import {
  sendCredentialsEmail,
  sendCombinedCredentialsEmail,
} from "@/lib/email";

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

  // Kelompokkan target per alamat email (case-insensitive): satu alamat
  // boleh dipakai bersama beberapa peserta (satu email institusi). Grup
  // berisi lebih dari satu akun menerima SATU email berisi semua
  // kredensial; grup satu akun memakai email tunggal seperti biasa.
  // Urutan grup mengikuti createdAt anggota pertamanya.
  const groups = new Map<string, typeof targets>();
  for (const user of targets) {
    const key = (user.email as string).toLowerCase();
    const list = groups.get(key);
    if (list) list.push(user);
    else groups.set(key, [user]);
  }

  let sent = 0;
  let emails = 0;
  const failed: { username: string; error: string }[] = [];

  for (const [, members] of groups) {
    const email = members[0].email as string;
    const passwords = members.map(() => randomPassword());
    try {
      let resendId: string;
      if (members.length === 1) {
        const user = members[0];
        resendId = await sendCredentialsEmail({
          to: email,
          name: user.name,
          username: user.username,
          password: passwords[0],
        });
      } else {
        resendId = await sendCombinedCredentialsEmail({
          to: email,
          accounts: members.map((user, i) => ({
            name: user.name,
            username: user.username,
            password: passwords[i],
          })),
        });
      }
      // Satu transaksi untuk seluruh grup: semua password baru + semua
      // EmailLog SENT memakai messageId yang sama. Bila email gagal,
      // tidak ada password yang berubah (password lama tetap berlaku).
      const hashes = await Promise.all(
        passwords.map((password) => hashPassword(password))
      );
      await prisma.$transaction(
        members.flatMap((user, i) => [
          prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashes[i] },
          }),
          prisma.emailLog.create({
            data: { userId: user.id, status: "SENT", resendId },
          }),
        ])
      );
      sent += members.length;
      emails += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mengirim email";
      for (const user of members) {
        await prisma.emailLog.create({
          data: { userId: user.id, status: "FAILED", error: message },
        });
        failed.push({ username: user.username, error: message });
      }
    }
  }

  // total/sent/failed tetap dihitung per AKUN (sesuai tampilan admin);
  // emails = jumlah pesan yang benar-benar terkirim (lebih kecil dari
  // sent bila ada alamat bersama). Kuota Brevo dihitung per pesan.
  return NextResponse.json({
    total: targets.length,
    sent,
    failed: failed.length,
    failedUsers: failed,
    emails,
  });
}
