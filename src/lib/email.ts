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

// Escape nilai dari database sebelum disisipkan ke HTML email.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface CredentialsInput {
  to: string;
  name: string;
  username: string;
  password: string;
}

// Versi HTML: header logo + kotak kredensial + jadwal + kontak panitia.
// Gaya inline semua (klien email mengabaikan stylesheet eksternal).
// Logo diambil dari situs sendiri agar tidak perlu lampiran file.
export function buildCredentialsHtml(
  input: CredentialsInput,
  appUrl: string
): string {
  const name = escapeHtml(input.name);
  const username = escapeHtml(input.username);
  const password = escapeHtml(input.password);
  const loginUrl = `${appUrl}/login`;
  const logoUrl = `${appUrl}/images/logo-markaz-turats.jpg`;
  return (
    `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">` +
    `<tr><td align="center" style="padding:24px 12px;">` +
    `<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">` +
    `<tr><td align="center" style="padding:28px 24px 8px;">` +
    `<img src="${logoUrl}" alt="Logo Markaz Turats" width="120" style="display:block;width:120px;height:auto;" />` +
    `<div style="font-size:20px;font-weight:bold;color:#a16207;margin-top:16px;">Olimpiade Nahwu Shorof Nasional 2026</div>` +
    `<div style="font-size:14px;color:#71717a;margin-top:4px;">Markaz Turats</div>` +
    `</td></tr>` +
    `<tr><td style="padding:20px 28px;font-size:15px;line-height:1.6;color:#18181b;">` +
    `<p style="margin:0 0 12px;">Assalamu'alaikum ${name},</p>` +
    `<p style="margin:0 0 16px;">Akun ujian Olimpiade Nahwu Shorof Nasional 2026 sudah dibuat untuk Anda. Silakan masuk dengan kredensial berikut:</p>` +
    `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:8px;">` +
    `<tr><td style="padding:16px 20px;font-size:15px;line-height:1.8;">` +
    `Username: <b style="font-family:monospace;">${username}</b><br />` +
    `Password: <b style="font-family:monospace;">${password}</b>` +
    `</td></tr></table>` +
    `<p style="margin:20px 0 4px;text-align:center;">` +
    `<a href="${loginUrl}" style="display:inline-block;background-color:#a16207;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:8px;">Masuk ke Halaman Login</a>` +
    `</p>` +
    `<p style="margin:0 0 16px;text-align:center;font-size:13px;color:#71717a;">atau buka tautan ini: ${loginUrl}</p>` +
    `<p style="margin:0 0 8px;font-weight:bold;">Jadwal:</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;">` +
    `<li>Simulasi: 3 November 2026, 13.00-14.30 WIB</li>` +
    `<li>Pelaksanaan: 4 November 2026, 13.00-14.30 WIB</li>` +
    `</ul>` +
    `<p style="margin:0 0 16px;">Lomba terdiri dari 50 soal dengan nilai maksimal 100. Peserta boleh melihat referensi saat mengerjakan.</p>` +
    `<p style="margin:0 0 16px;"><b>Jangan bagikan username dan password ini kepada siapa pun.</b></p>` +
    `<p style="margin:0;">Bila ada kendala login, hubungi panitia: Instagram @markaz_turats atau WhatsApp 08197982788.</p>` +
    `</td></tr>` +
    `<tr><td align="center" style="padding:16px 24px 24px;font-size:13px;color:#71717a;border-top:1px solid #e4e4e7;">` +
    `Panitia Olimpiade Nahwu Shorof Nasional 2026<br />${appUrl}` +
    `</td></tr>` +
    `</table></td></tr></table>`
  );
}

// Versi teks: cadangan untuk klien email yang tidak menampilkan HTML.
// Isinya mencerminkan versi HTML (tanpa logo dan tombol).
export function buildCredentialsText(
  input: CredentialsInput,
  appUrl: string
): string {
  return (
    `Assalamu'alaikum ${input.name},\n\n` +
    `Akun ujian Olimpiade Nahwu Shorof Nasional 2026 sudah dibuat untuk Anda. Silakan masuk dengan kredensial berikut:\n\n` +
    `Username: ${input.username}\n` +
    `Password: ${input.password}\n\n` +
    `Masuk lewat: ${appUrl}/login\n\n` +
    `Jadwal:\n` +
    `- Simulasi: 3 November 2026, 13.00-14.30 WIB\n` +
    `- Pelaksanaan: 4 November 2026, 13.00-14.30 WIB\n\n` +
    `Lomba terdiri dari 50 soal dengan nilai maksimal 100. Peserta boleh melihat referensi saat mengerjakan.\n\n` +
    `Jangan bagikan username dan password ini kepada siapa pun.\n` +
    `Bila ada kendala login, hubungi panitia: Instagram @markaz_turats atau WhatsApp 08197982788.\n\n` +
    `Panitia Olimpiade Nahwu Shorof Nasional 2026\n` +
    `${appUrl}`
  );
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
  const appUrl = getAppUrl();
  const { data, error } = await resend.emails.send({
    from: getEmailFrom(),
    to: [input.to],
    subject: "Akun Ujian Olimpiade Nahwu Shorof Nasional 2026",
    html: buildCredentialsHtml(input, appUrl),
    text: buildCredentialsText(input, appUrl),
  });
  if (error) {
    throw new Error(error.message || "Gagal mengirim email lewat Resend.");
  }
  if (!data?.id) {
    throw new Error("Resend tidak mengembalikan ID email.");
  }
  return data.id;
}
