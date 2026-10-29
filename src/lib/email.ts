import { Resend } from "resend";

// Pengirim dibaca dari env agar pindah domain tinggal ganti konfigurasi.
// Nilai default = pengirim testing yang sudah terverifikasi di Resend.
export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    "Panitia Olimpiade Nahwu Shorof <panitia@markazarabiyah.site>"
  );
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL || "https://olimpiade-turats.markazarabiyah.site"
  );
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY belum dipasang di environment aplikasi."
    );
  }
  return new Resend(key);
}

export async function sendCredentialsEmail(input: {
  to: string;
  name: string;
  username: string;
  password: string;
}): Promise<string> {
  const resend = getResend();
  // PENTING: password hanya ada di isi email ini. Jangan pernah me-log
  // nilai ini dan jangan pernah mengembalikannya lewat API.
  const text =
    `Assalamu'alaikum ${input.name},\n\n` +
    `Akun ujian Olimpiade Nahwu Shorof Nasional 2026 sudah dibuat untuk Anda.\n\n` +
    `Username: ${input.username}\n` +
    `Password: ${input.password}\n\n` +
    `Masuk lewat: ${getAppUrl()}/login\n` +
    `Pelaksanaan: 4 November 2026, 13.00-14.30 WIB.\n\n` +
    `Jangan bagikan username dan password ini kepada siapa pun.\n` +
    `Bila ada kendala login, hubungi panitia lewat kontak resmi Markaz Turats.\n\n` +
    `Panitia Olimpiade Nahwu Shorof Nasional 2026`;
  const { data, error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [input.to],
    subject: "Akun Ujian Olimpiade Nahwu Shorof Nasional 2026",
    text,
  });
  if (error) {
    throw new Error(error.message || "Gagal mengirim email lewat Resend.");
  }
  if (!data?.id) {
    throw new Error("Resend tidak mengembalikan ID email.");
  }
  return data.id;
}
