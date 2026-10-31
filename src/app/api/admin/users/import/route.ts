import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseExcel, findColumn } from "@/lib/excel";
import {
  slugUsername,
  uniqueUsername,
  placeholderHash,
} from "@/lib/akun";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session && session.role === "ADMIN";
}

type PreviewRow = {
  index: number;
  name: string;
  email: string;
  institution: string;
  username: string;
  status:
    | "baru"
    | "sudah_ada"
    | "tambah_email"
    | "error"
    | "perbarui"
    | "sudah_terisi"
    | "tidak_cocok";
  userId?: string;
  // Mode perbarui saja: instansi akun saat ini (untuk ditampilkan di pratinjau).
  currentInstitution?: string;
  errors: string[];
};

// POST multipart (file .xlsx) -> pratinjau, tanpa menulis apa pun.
// POST JSON { rows: PreviewRow[] } -> konfirmasi: buat akun yang valid.
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      return await handlePreview(req);
    }
    return await handleConfirm(req);
  } catch (error) {
    console.error("Import peserta error:", error);
    return NextResponse.json(
      { error: "Gagal memproses impor peserta" },
      { status: 500 }
    );
  }
}

async function handlePreview(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "File Excel (.xlsx) wajib diunggah" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file melebihi 5MB" },
      { status: 400 }
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Hanya file .xlsx yang didukung" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { headers, rows } = await parseExcel(buffer);
  const mode = form.get("mode") === "update" ? "update" : "create";

  const nameCol = findColumn(headers, ["nama lengkap", "nama"]);
  const emailCol = findColumn(headers, ["email", "e-mail", "alamat email"]);
  const instCol = findColumn(headers, [
    "asal instansi",
    "asal pesantren / instansi",
    "asal pesantren",
    "instansi",
    "asal",
  ]);
  const missing: string[] = [];
  if (!nameCol) missing.push("Nama Lengkap");
  if (!emailCol) missing.push("Email");
  // Mode perbarui: instansi adalah inti perbaikan, jadi wajib ada.
  // Ini mencegah terulangnya kasus instansi hilang diam-diam karena header salah.
  if (mode === "update" && !instCol) missing.push("Asal Instansi");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}`,
        headers,
      },
      { status: 400 }
    );
  }

  // Mode perbarui: hanya isi instansi yang masih kosong, tanpa membuat
  // akun baru dan tanpa mengubah field lain. Kunci cocok = pasangan
  // (nama, email), sama dengan aturan dedup impor biasa.
  if (mode === "update") {
    const seenPairs = new Set<string>();
    const preview: PreviewRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameCol as string]?.plain ?? "";
      const email = row[emailCol as string]?.plain ?? "";
      const institution = instCol ? row[instCol]?.plain ?? "" : "";
      const errors: string[] = [];
      if (!name) errors.push("Nama kosong");
      if (!email) errors.push("Email kosong");
      else if (!EMAIL_RE.test(email)) errors.push("Format email tidak valid");
      if (!institution) errors.push("Instansi kosong di file");
      const key = `${name.toLowerCase()}|${email.toLowerCase()}`;
      if (name && email && seenPairs.has(key)) {
        errors.push("Nama dan email ganda dalam file");
      }
      if (name && email) seenPairs.add(key);

      let status: PreviewRow["status"] = "perbarui";
      let userId: string | undefined;
      let username = "";
      let currentInstitution: string | undefined;
      if (errors.length === 0) {
        const matches = await prisma.user.findMany({
          where: {
            role: "PARTICIPANT",
            name: { equals: name, mode: "insensitive" },
            email: { equals: email, mode: "insensitive" },
          },
          select: { id: true, username: true, institution: true },
        });
        if (matches.length === 0) {
          status = "tidak_cocok";
        } else if (matches.length > 1) {
          status = "error";
          errors.push(
            "Ditemukan lebih dari satu akun dengan nama dan email ini, periksa manual"
          );
        } else {
          const match = matches[0];
          userId = match.id;
          username = match.username;
          currentInstitution = match.institution ?? "";
          if (match.institution) {
            status = "sudah_terisi";
          }
        }
      } else {
        status = "error";
      }

      preview.push({
        index: i + 2,
        name,
        email,
        institution,
        username,
        status,
        userId,
        currentInstitution,
        errors,
      });
    }
    return NextResponse.json({ rows: preview });
  }

  // Kunci dedup = pasangan (nama, email): satu alamat email boleh dipakai
  // bersama beberapa peserta (satu email institusi). Yang dilarang hanya
  // pasangan nama+email yang sama persis. Map menyimpan username akun
  // yang sudah ada, agar pratinjau bisa menampilkannya.
  const dbPairs = new Map<string, string>();
  for (const u of await prisma.user.findMany({
    where: { email: { not: null } },
    select: { name: true, email: true, username: true },
  })) {
    dbPairs.set(
      `${u.name.toLowerCase()}|${(u.email as string).toLowerCase()}`,
      u.username
    );
  }
  const pairKey = (name: string, email: string) =>
    `${name.toLowerCase()}|${email.toLowerCase()}`;
  const dbUsernames = new Set(
    (
      await prisma.user.findMany({ select: { username: true } })
    ).map((u) => u.username)
  );

  const seenPairs = new Set<string>();
  const preview: PreviewRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameCol as string]?.plain ?? "";
    const email = row[emailCol as string]?.plain ?? "";
    const institution = instCol ? row[instCol]?.plain ?? "" : "";
    const errors: string[] = [];
    if (!name) errors.push("Nama kosong");
    if (!email) errors.push("Email kosong");
    else if (!EMAIL_RE.test(email)) errors.push("Format email tidak valid");
    const key = pairKey(name, email);
    if (name && email && seenPairs.has(key)) {
      errors.push("Nama dan email ganda dalam file");
    }
    if (name && email) seenPairs.add(key);

    let status: PreviewRow["status"] = "baru";
    let userId: string | undefined;
    let username = "";
    if (errors.length === 0) {
      const existingUsername = dbPairs.get(key);
      if (existingUsername) {
        status = "sudah_ada";
        username = existingUsername;
      } else {
        const nameMatches = await prisma.user.findMany({
          where: {
            role: "PARTICIPANT",
            name: { equals: name, mode: "insensitive" },
          },
          select: { id: true, email: true, username: true },
        });
        const emptyEmailMatches = nameMatches.filter((m) => !m.email);
        if (emptyEmailMatches.length === 1) {
          status = "tambah_email";
          userId = emptyEmailMatches[0].id;
          username = emptyEmailMatches[0].username;
        } else if (emptyEmailMatches.length > 1) {
          status = "error";
          errors.push("Nama ditemukan lebih dari satu tanpa email, periksa manual");
        }
        if (status === "baru") {
          username = await uniqueUsername(
            slugUsername(name),
            async (u) => dbUsernames.has(u)
          );
          dbUsernames.add(username);
        }
      }
    } else {
      status = "error";
    }

    preview.push({
      index: i + 2,
      name,
      email,
      institution,
      username,
      status,
      userId,
      errors,
    });
  }

  return NextResponse.json({ rows: preview });
}

async function handleConfirm(req: Request) {
  const body = await req.json();
  const inputRows: PreviewRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (inputRows.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada baris untuk diimpor" },
      { status: 400 }
    );
  }

  // Mode perbarui: hanya isi instansi yang masih kosong. Tidak membuat
  // akun baru, tidak mengubah field lain, tidak menimpa instansi yang
  // sudah terisi (dicek ulang di sini agar pratinjau yang basi tetap aman).
  if (body?.mode === "update") {
    let updated = 0;
    const skipped: { index: number; reason: string }[] = [];
    for (const row of inputRows) {
      if (row.status === "tidak_cocok") {
        skipped.push({ index: row.index, reason: "Akun tidak ditemukan, tidak dibuat" });
        continue;
      }
      if (row.status === "sudah_terisi") {
        skipped.push({ index: row.index, reason: "Instansi sudah terisi" });
        continue;
      }
      if (
        row.status !== "perbarui" ||
        !row.userId ||
        !row.name ||
        !row.email ||
        !row.institution
      ) {
        skipped.push({ index: row.index, reason: "Baris bermasalah, dilewati" });
        continue;
      }
      const target = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { institution: true },
      });
      if (!target) {
        skipped.push({ index: row.index, reason: "Akun tidak ditemukan" });
        continue;
      }
      if (target.institution) {
        skipped.push({ index: row.index, reason: "Instansi sudah terisi" });
        continue;
      }
      await prisma.user.update({
        where: { id: row.userId },
        data: { institution: row.institution },
      });
      updated++;
    }
    return NextResponse.json({ created: 0, updated, skipped });
  }

  let created = 0;
  let updated = 0;
  const skipped: { index: number; reason: string }[] = [];
  const usedUsernames = new Set(
    (
      await prisma.user.findMany({ select: { username: true } })
    ).map((u) => u.username)
  );

  for (const row of inputRows) {
    if (row.status === "error" || !row.name || !row.email) {
      skipped.push({ index: row.index, reason: "Baris bermasalah, dilewati" });
      continue;
    }
    if (row.status === "sudah_ada") {
      skipped.push({ index: row.index, reason: "Nama dan email sudah terdaftar" });
      continue;
    }
    if (row.status === "tambah_email") {
      if (!row.userId) {
        skipped.push({ index: row.index, reason: "Akun tujuan tidak ditemukan" });
        continue;
      }
      const target = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { id: true, email: true, name: true },
      });
      if (!target || target.email) {
        skipped.push({ index: row.index, reason: "Akun tujuan sudah memiliki email" });
        continue;
      }
      // Email boleh dipakai bersama; yang dilarang hanya pasangan
      // (nama akun tujuan, email) yang sudah ada di akun lain.
      const clash = await prisma.user.findFirst({
        where: {
          name: { equals: target.name, mode: "insensitive" },
          email: { equals: row.email, mode: "insensitive" },
          id: { not: target.id },
        },
        select: { id: true },
      });
      if (clash) {
        skipped.push({ index: row.index, reason: "Nama dan email sudah terdaftar" });
        continue;
      }
      await prisma.user.update({
        where: { id: target.id },
        data: { email: row.email, institution: row.institution || undefined },
      });
      updated++;
      continue;
    }
    // status "baru": tolak hanya bila pasangan (nama, email) sudah ada.
    // Email yang sama dengan nama berbeda diizinkan (email institusi bersama).
    const clash = await prisma.user.findFirst({
      where: {
        name: { equals: row.name, mode: "insensitive" },
        email: { equals: row.email, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (clash) {
      skipped.push({ index: row.index, reason: "Nama dan email sudah terdaftar" });
      continue;
    }
    const username = await uniqueUsername(
      slugUsername(row.name),
      async (u) =>
        usedUsernames.has(u) ||
        !!(await prisma.user.findUnique({ where: { username: u } }))
    );
    usedUsernames.add(username);
    await prisma.user.create({
      data: {
        username,
        name: row.name,
        email: row.email,
        institution: row.institution || null,
        passwordHash: await placeholderHash(),
        role: "PARTICIPANT",
        isActive: true,
      },
    });
    created++;
  }

  return NextResponse.json({ created, updated, skipped });
}
