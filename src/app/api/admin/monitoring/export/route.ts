import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  countAnswers,
  compareRank,
  formatMenitDetik,
  slugify,
} from "@/lib/monitoring";

// Ekspor Excel rekap sesi (ADMIN ONLY): satu baris per peserta dengan
// status, waktu, hitungan benar/salah/kosong, dan nilai akhir, plus
// lembar ringkasan. Peringkat hanya untuk yang sudah selesai, dengan
// urutan yang sama seperti leaderboard.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sessionIdParam = searchParams.get("sessionId");

  const sessions = await prisma.examSession.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
  const targetSessionId = sessionIdParam || sessions[0]?.id;
  if (!targetSessionId) {
    return NextResponse.json(
      { error: "Belum ada sesi" },
      { status: 404 }
    );
  }

  const examSession = await prisma.examSession.findUnique({
    where: { id: targetSessionId },
    select: {
      id: true,
      title: true,
      _count: { select: { questions: true } },
    },
  });
  if (!examSession) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { sessionId: targetSessionId },
    include: {
      user: {
        select: { username: true, name: true, institution: true },
      },
      answers: {
        select: {
          questionId: true,
          selectedOptionId: true,
          isDoubtful: true,
          answeredAt: true,
          selectedOption: { select: { isCorrect: true } },
        },
      },
    },
  });

  const totalQuestions = examSession._count.questions;
  const totalParticipants = await prisma.user.count({
    where: { role: "PARTICIPANT", isActive: true },
  });
  const now = new Date();

  const finishedSorted = attempts
    .filter((a) => a.status !== "IN_PROGRESS")
    .sort(compareRank);
  const rankMap = new Map<string, number>();
  finishedSorted.forEach((a, idx) => rankMap.set(a.id, idx + 1));

  const fmtWaktu = (d: Date | null) =>
    d
      ? d.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";
  const statusText = (a: { status: string; startedAt: Date | null }) =>
    a.status === "IN_PROGRESS"
      ? a.startedAt
        ? "Sedang Mengerjakan"
        : "Halaman Tata Tertib"
      : `Selesai (${a.status})`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rekap");
  sheet.columns = [
    { header: "Peringkat", key: "rank", width: 10 },
    { header: "Nama", key: "name", width: 28 },
    { header: "Username", key: "username", width: 18 },
    { header: "Instansi", key: "institution", width: 28 },
    { header: "Status", key: "status", width: 22 },
    { header: "Mulai", key: "started", width: 20 },
    { header: "Selesai", key: "finished", width: 20 },
    { header: "Durasi", key: "duration", width: 12 },
    { header: "Dijawab", key: "answered", width: 10 },
    { header: "Benar", key: "correct", width: 10 },
    { header: "Salah", key: "wrong", width: 10 },
    { header: "Kosong", key: "unanswered", width: 10 },
    { header: "Ragu", key: "doubtful", width: 10 },
    { header: "Nilai Akhir", key: "finalScore", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const a of attempts) {
    const counts = countAnswers(a.answers);
    const duration =
      a.status !== "IN_PROGRESS"
        ? formatMenitDetik(a.timeSpentSeconds)
        : a.startedAt
          ? formatMenitDetik(
              Math.max(0, Math.floor((now.getTime() - a.startedAt.getTime()) / 1000))
            )
          : "-";
    sheet.addRow({
      rank: rankMap.get(a.id) ?? "-",
      name: a.user.name,
      username: a.user.username,
      institution: a.user.institution ?? "-",
      status: statusText(a),
      started: fmtWaktu(a.startedAt),
      finished: fmtWaktu(a.finishedAt),
      duration,
      answered: counts.answered,
      correct: counts.correct,
      wrong: counts.wrong,
      unanswered: Math.max(0, totalQuestions - counts.answered),
      doubtful: counts.doubtful,
      finalScore: a.status !== "IN_PROGRESS" ? a.finalScore : "-",
    });
  }

  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [
    { header: "Keterangan", key: "label", width: 28 },
    { header: "Nilai", key: "value", width: 40 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  const finished = attempts.filter((a) => a.status !== "IN_PROGRESS").length;
  const working = attempts.filter(
    (a) => a.status === "IN_PROGRESS" && a.startedAt
  ).length;
  const rules = attempts.filter(
    (a) => a.status === "IN_PROGRESS" && !a.startedAt
  ).length;
  const summaryRows: Array<[string, string | number]> = [
    ["Sesi", examSession.title],
    ["Total soal", totalQuestions],
    ["Total peserta aktif", totalParticipants],
    ["Belum masuk token", Math.max(0, totalParticipants - attempts.length)],
    ["Halaman tata tertib", rules],
    ["Sedang mengerjakan", working],
    ["Selesai", finished],
    ["Tanggal ekspor (WIB)", fmtWaktu(now)],
  ];
  for (const [label, value] of summaryRows) {
    summarySheet.addRow({ label, value });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = now
    .toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/[/:]/g, "")
    .replace(/[, ]/g, "-");
  const filename = `rekap-${slugify(examSession.title)}-${stamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
