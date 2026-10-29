import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";

// Template Excel impor peserta. Sheet pertama hanya berisi header (tanpa
// baris contoh, supaya tidak ada akun contoh yang ikut terimpor). Sheet
// kedua berisi petunjuk pengisian.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Peserta");
  sheet.addRow(["Nama Lengkap", "Email", "Asal Instansi"]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [{ width: 30 }, { width: 32 }, { width: 34 }];

  const guide = workbook.addWorksheet("Petunjuk");
  guide.addRow(["Petunjuk impor peserta"]);
  guide.addRow(["1. Isi sheet Peserta. Kolom Nama Lengkap dan Email wajib diisi."]);
  guide.addRow(["2. Asal Instansi boleh kosong."]);
  guide.addRow(["3. Satu email hanya untuk satu peserta. Email yang sudah terdaftar akan dilewati."]);
  guide.addRow(["4. Username dibuat otomatis dari nama. Password dibuat acak saat kirim email, bukan saat impor."]);
  guide.addRow(["5. Setelah impor, kirim kredensial lewat tombol Kirim Batch di halaman peserta."]);
  guide.addRow(["6. Kirim ulang berarti password baru; password lama tidak berlaku lagi."]);
  guide.columns = [{ width: 110 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-peserta.xlsx"',
    },
  });
}
