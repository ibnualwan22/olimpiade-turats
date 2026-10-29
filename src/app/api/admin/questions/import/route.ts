import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseExcel, findColumn } from "@/lib/excel";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const OPTION_LABELS = ["A", "B", "C", "D"];

async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session && session.role === "ADMIN";
}

type PreviewOption = { label: string; html: string; plain: string };
type PreviewRow = {
  index: number;
  category: string;
  categoryNew: boolean;
  direction: "RTL" | "LTR";
  weight: number;
  contentHtml: string;
  options: PreviewOption[];
  keyLetter: string;
  explanationHtml: string;
  status: "valid" | "error";
  errors: string[];
};

// POST multipart (file .xlsx) -> pratinjau, tanpa menulis apa pun.
// POST JSON { rows: PreviewRow[] } -> konfirmasi: buat soal yang valid.
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
    console.error("Import soal error:", error);
    return NextResponse.json(
      { error: "Gagal memproses impor soal" },
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

  const soalCol = findColumn(headers, ["soal", "pertanyaan", "teks soal"]);
  const kunciCol = findColumn(headers, [
    "kunci",
    "kunci jawaban",
    "jawaban benar",
  ]);
  const kategoriCol = findColumn(headers, [
    "kategori",
    "bab",
    "materi",
  ]);
  const arahCol = findColumn(headers, ["arah", "direction"]);
  const bobotCol = findColumn(headers, ["bobot", "nilai", "skor"]);
  const bahasCol = findColumn(headers, [
    "pembahasan",
    "penjelasan",
    "explanation",
  ]);
  const opsiCols: Record<string, string | null> = {};
  for (const label of OPTION_LABELS) {
    opsiCols[label] = findColumn(headers, [
      `opsi ${label.toLowerCase()}`,
      `pilihan ${label.toLowerCase()}`,
      label.toLowerCase(),
    ]);
  }

  const missing: string[] = [];
  if (!soalCol) missing.push("Soal");
  if (!kunciCol) missing.push("Kunci");
  if (!opsiCols.A || !opsiCols.B) missing.push("Opsi A dan Opsi B");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Kolom wajib tidak ditemukan: ${missing.join(", ")}`,
        headers,
      },
      { status: 400 }
    );
  }

  const categories = await prisma.questionCategory.findMany({
    select: { id: true, name: true },
  });
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c.id])
  );

  const preview: PreviewRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const contentCell = row[soalCol as string];
    const errors: string[] = [];
    if (!contentCell?.plain) errors.push("Soal kosong");

    const options: PreviewOption[] = [];
    for (const label of OPTION_LABELS) {
      const col = opsiCols[label];
      const cell = col ? row[col] : undefined;
      options.push({
        label,
        html: cell?.html ?? "",
        plain: cell?.plain ?? "",
      });
    }
    const filled = options.filter((o) => o.plain);
    if (filled.length < 2) errors.push("Minimal 2 opsi harus terisi");

    const keyLetter = (row[kunciCol as string]?.plain ?? "")
      .toUpperCase()
      .trim();
    if (!OPTION_LABELS.includes(keyLetter)) {
      errors.push("Kunci harus huruf A/B/C/D");
    } else {
      const keyOpt = options.find((o) => o.label === keyLetter);
      if (!keyOpt?.plain) errors.push(`Opsi ${keyLetter} yang jadi kunci kosong`);
    }

    let weight = 10;
    if (bobotCol) {
      const raw = row[bobotCol]?.plain ?? "";
      if (raw) {
        const parsed = Number(raw.replace(",", "."));
        if (!Number.isFinite(parsed) || parsed <= 0) {
          errors.push("Bobot harus angka lebih dari 0");
        } else {
          weight = parsed;
        }
      }
    }

    let direction: "RTL" | "LTR" = "RTL";
    if (arahCol) {
      const raw = (row[arahCol]?.plain ?? "").toLowerCase();
      if (["ltr", "latin", "indonesia"].includes(raw)) direction = "LTR";
      else if (["rtl", "arab"].includes(raw)) direction = "RTL";
      else if (raw) errors.push("Arah harus RTL atau LTR");
    }

    const categoryName = kategoriCol
      ? row[kategoriCol]?.plain ?? ""
      : "";
    const categoryNew =
      !!categoryName && !categoryByName.has(categoryName.toLowerCase());

    preview.push({
      index: i + 2,
      category: categoryName,
      categoryNew,
      direction,
      weight,
      contentHtml: contentCell?.html ?? "",
      options,
      keyLetter,
      explanationHtml: bahasCol ? row[bahasCol]?.html ?? "" : "",
      status: errors.length === 0 ? "valid" : "error",
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

  let created = 0;
  const skipped: { index: number; reason: string }[] = [];
  const categoryCache = new Map<string, string>();
  for (const c of await prisma.questionCategory.findMany({
    select: { id: true, name: true },
  })) {
    categoryCache.set(c.name.toLowerCase(), c.id);
  }

  for (const row of inputRows) {
    if (row.status !== "valid") {
      skipped.push({ index: row.index, reason: "Baris bermasalah, dilewati" });
      continue;
    }
    const filled = row.options.filter((o) => o.plain);
    if (filled.length < 2 || !row.contentHtml) {
      skipped.push({ index: row.index, reason: "Baris tidak valid" });
      continue;
    }
    let categoryId: string | null = null;
    if (row.category) {
      const key = row.category.toLowerCase();
      if (!categoryCache.has(key)) {
        const created_cat = await prisma.questionCategory.create({
          data: { name: row.category },
        });
        categoryCache.set(key, created_cat.id);
      }
      categoryId = categoryCache.get(key) as string;
    }
    await prisma.question.create({
      data: {
        categoryId,
        content: row.contentHtml,
        direction: row.direction,
        weight: row.weight,
        explanation: row.explanationHtml || null,
        options: {
          create: row.options
            .filter((o) => o.plain)
            .map((o) => ({
              label: o.label,
              content: o.html,
              direction: row.direction,
              isCorrect: o.label === row.keyLetter,
            })),
        },
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
