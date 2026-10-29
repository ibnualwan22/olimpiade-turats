import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";

// Template Excel impor soal. Hanya sheet pertama ("Soal") yang dibaca
// importer; sheet "Contoh" dan "Petunjuk" tidak ikut terimpor.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Soal");
  sheet.addRow([
    "Kategori",
    "Arah",
    "Bobot",
    "Soal",
    "Opsi A",
    "Opsi B",
    "Opsi C",
    "Opsi D",
    "Kunci",
    "Pembahasan",
  ]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [
    { width: 18 },
    { width: 10 },
    { width: 10 },
    { width: 50 },
    { width: 30 },
    { width: 30 },
    { width: 30 },
    { width: 30 },
    { width: 10 },
    { width: 40 },
  ];

  const example = workbook.addWorksheet("Contoh");
  example.addRow([
    "Kategori",
    "Arah",
    "Bobot",
    "Soal",
    "Opsi A",
    "Opsi B",
    "Opsi C",
    "Opsi D",
    "Kunci",
    "Pembahasan",
  ]);
  example.getRow(1).font = { bold: true };
  const row = example.addRow([
    "Nahwu",
    "RTL",
    2,
    "",
    "Kitab",
    "Pena",
    "Meja",
    "Rumah",
    "A",
    "Kata yang ditebalkan pada soal adalah kata yang ditanyakan.",
  ]);
  // Sel soal memakai rich text: kata "الكتاب" ditebalkan, sisanya biasa.
  row.getCell(4).value = {
    richText: [
      { text: "Apa arti kata ", font: {} },
      { text: "الكتاب", font: { bold: true } },
      { text: "?", font: {} },
    ],
  };
  example.columns = sheet.columns;

  const guide = workbook.addWorksheet("Petunjuk");
  guide.addRow(["Petunjuk impor soal"]);
  guide.addRow(["1. Isi sheet Soal. Kolom Soal, Opsi A, Opsi B, dan Kunci wajib diisi."]);
  guide.addRow(["2. Kunci diisi satu huruf: A, B, C, atau D, dan opsi tersebut harus terisi."]);
  guide.addRow(["3. Arah: RTL untuk soal Arab, LTR untuk soal Latin. Kosong berarti RTL."]);
  guide.addRow(["4. Bobot kosong berarti 10. Untuk lomba 50 soal total 100, isi bobot 2."]);
  guide.addRow(["5. Format tebal/garis bawah/miring pada sel akan ikut terimpor. Karakter liar hasil copy-paste dibersihkan otomatis; harakat dipertahankan."]);
  guide.addRow(["6. Kategori yang belum ada akan dibuat baru otomatis."]);
  guide.addRow(["7. Sheet Contoh hanya contoh dan tidak ikut terimpor."]);
  guide.columns = [{ width: 120 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-soal.xlsx"',
    },
  });
}
