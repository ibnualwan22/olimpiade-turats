import ExcelJS from "exceljs";

// Satu sel Excel, dalam dua bentuk: teks polos (untuk nama/email/angka)
// dan HTML aman (untuk soal/opsi/pembahasan yang memakai format).
export type CellValue = { plain: string; html: string };

type RichRun = {
  text: string;
  font?: { bold?: boolean; underline?: boolean | string; italic?: boolean };
};

function isRichTextValue(
  v: unknown
): v is { richText: RichRun[] } {
  return (
    !!v &&
    typeof v === "object" &&
    Array.isArray((v as { richText?: unknown }).richText)
  );
}

// Bersihkan karakter liar hasil copy-paste Word/Excel: karakter kontrol,
// karakter tak terlihat (zero-width, BOM), spasi non-standar -> spasi biasa,
// spasi ganda -> satu spasi. Harakat Arab dipertahankan (bukan karakter liar).
export function cleanText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Potongan berformat (bold/underline/italic) -> HTML dengan whitelist ketat.
// Hanya <strong>, <u>, <em> yang dihasilkan; semua teks di-escape dulu.
export function richTextToSafeHtml(runs: RichRun[]): string {
  return runs
    .map((run) => {
      let t = escapeHtml(run.text);
      if (run.font?.italic) t = `<em>${t}</em>`;
      if (run.font?.underline) t = `<u>${t}</u>`;
      if (run.font?.bold) t = `<strong>${t}</strong>`;
      return t;
    })
    .join("");
}

export function cellToValue(value: unknown): CellValue {
  if (value === null || value === undefined) return { plain: "", html: "" };
  if (isRichTextValue(value)) {
    const plain = cleanText(
      value.richText.map((r) => r.text).join("")
    );
    return { plain, html: richTextToSafeHtml(value.richText) };
  }
  if (typeof value === "object") {
    const withText = value as { text?: unknown };
    if (typeof withText.text === "string") {
      const plain = cleanText(withText.text);
      return { plain, html: escapeHtml(plain) };
    }
    return { plain: "", html: "" };
  }
  const plain = cleanText(String(value));
  return { plain, html: escapeHtml(plain) };
}

// Baca sheet pertama workbook. Baris 1 = header. Baris yang seluruh selnya
// kosong dilewati. Kunci baris = teks header yang sudah dibersihkan.
// Buffer diterima sebagai Uint8Array (Buffer adalah Uint8Array) agar tidak
// berbenturan dengan tiping Buffer exceljs vs @types/node proyek.
export async function parseExcel(buffer: Uint8Array): Promise<{
  headers: string[];
  rows: Record<string, CellValue>[];
}> {
  const workbook = new ExcelJS.Workbook();
  const loadXlsx = workbook.xlsx.load.bind(workbook.xlsx) as unknown as (
    data: Uint8Array
  ) => Promise<ExcelJS.Workbook>;
  await loadXlsx(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headers: string[] = [];
  const rows: Record<string, CellValue>[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: CellValue[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellToValue(cell.value);
    });
    if (rowNumber === 1) {
      for (const c of cells) headers.push(c?.plain ?? "");
      return;
    }
    const record: Record<string, CellValue> = {};
    let anyFilled = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const v = cells[i] ?? { plain: "", html: "" };
      if (v.plain) anyFilled = true;
      record[h] = v;
    });
    if (anyFilled) rows.push(record);
  });

  return { headers, rows };
}

// Cari kolom berdasarkan daftar alias (perbandingan tanpa memperhatikan
// kapital dan spasi). Mengembalikan nama header asli atau null.
export function findColumn(
  headers: string[],
  aliases: string[]
): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const wanted = new Set(aliases.map(norm));
  for (const h of headers) {
    if (wanted.has(norm(h))) return h;
  }
  return null;
}
