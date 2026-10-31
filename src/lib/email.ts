// Pengirim dibaca dari env agar pindah domain tinggal ganti konfigurasi.
// Domain pengirim harus sudah diautentikasi di Brevo (kode TXT + DKIM).
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

function getBrevoKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error("BREVO_API_KEY belum dipasang di environment aplikasi.");
  }
  return key;
}

// EMAIL_FROM berbentuk "Nama <email@domain>" atau email polos.
// Brevo meminta sender sebagai { name, email } terpisah.
function parseEmailFrom(value: string): { name: string; email: string } {
  const match = value.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "", email: value.trim() };
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
  const apiKey = getBrevoKey();
  // PENTING: password hanya ada di isi email ini. Jangan pernah me-log
  // nilai ini dan jangan pernah mengembalikannya lewat API.
  const appUrl = getAppUrl();
  const sender = parseEmailFrom(getEmailFrom());
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: sender.name ? sender : { email: sender.email },
      to: [{ email: input.to }],
      subject: "Akun Ujian Olimpiade Nahwu Shorof Nasional 2026",
      htmlContent: buildCredentialsHtml(input, appUrl),
      textContent: buildCredentialsText(input, appUrl),
    }),
  });
  // Brevo mengembalikan { messageId } saat sukses; { message, code } saat gagal.
  const body = (await res.json().catch(() => null)) as {
    messageId?: string;
    message?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.message || "Gagal mengirim email lewat Brevo.");
  }
  if (!body?.messageId) {
    throw new Error("Brevo tidak mengembalikan ID email.");
  }
  // ID ini disimpan pemanggil ke EmailLog.resendId. Kolom itu dipakai
  // ulang sebagai ID pesan provider (dulu ID Resend, kini messageId
  // Brevo) agar tidak perlu migrasi skema.
  return body.messageId;
}

export interface CombinedAccount {
  name: string;
  username: string;
  password: string;
}

// Satu alamat email boleh dipakai bersama beberapa peserta (satu email
// institusi). Email gabungan ini mencantumkan kredensial tiap peserta
// dalam satu pesan, supaya penerima bisa meneruskan masing-masing.
// Tampilannya memakai kerangka yang sama dengan email tunggal.
export function buildCombinedCredentialsHtml(
  accounts: CombinedAccount[],
  appUrl: string
): string {
  const loginUrl = `${appUrl}/login`;
  const logoUrl = `${appUrl}/images/logo-markaz-turats.jpg`;
  const boxes = accounts
    .map((a) => {
      const name = escapeHtml(a.name);
      const username = escapeHtml(a.username);
      const password = escapeHtml(a.password);
      return (
        `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:8px;margin:0 0 12px;">` +
        `<tr><td style="padding:16px 20px;font-size:15px;line-height:1.8;">` +
        `Nama: <b>${name}</b><br />` +
        `Username: <b style="font-family:monospace;">${username}</b><br />` +
        `Password: <b style="font-family:monospace;">${password}</b>` +
        `</td></tr></table>`
      );
    })
    .join("");
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
    `<p style="margin:0 0 12px;">Assalamu'alaikum,</p>` +
    `<p style="margin:0 0 16px;">Akun ujian Olimpiade Nahwu Shorof Nasional 2026 sudah dibuat untuk peserta berikut. Karena alamat email ini dipakai bersama, kredensial tiap peserta tercantum di bawah — mohon teruskan kredensial masing-masing kepada peserta yang bersangkutan:</p>` +
    boxes +
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
    `<p style="margin:0 0 16px;"><b>Jangan bagikan username dan password ini kepada siapa pun selain pemiliknya masing-masing.</b></p>` +
    `<p style="margin:0;">Bila ada kendala login, hubungi panitia: Instagram @markaz_turats atau WhatsApp 08197982788.</p>` +
    `</td></tr>` +
    `<tr><td align="center" style="padding:16px 24px 24px;font-size:13px;color:#71717a;border-top:1px solid #e4e4e7;">` +
    `Panitia Olimpiade Nahwu Shorof Nasional 2026<br />${appUrl}` +
    `</td></tr>` +
    `</table></td></tr></table>`
  );
}

// Versi teks email gabungan, mencerminkan versi HTML-nya.
export function buildCombinedCredentialsText(
  accounts: CombinedAccount[],
  appUrl: string
): string {
  const blocks = accounts
    .map(
      (a) =>
        `Nama: ${a.name}\nUsername: ${a.username}\nPassword: ${a.password}`
    )
    .join("\n\n");
  return (
    `Assalamu'alaikum,\n\n` +
    `Akun ujian Olimpiade Nahwu Shorof Nasional 2026 sudah dibuat untuk peserta berikut. Karena alamat email ini dipakai bersama, kredensial tiap peserta tercantum di bawah — mohon teruskan kredensial masing-masing kepada peserta yang bersangkutan:\n\n` +
    blocks +
    `\n\nMasuk lewat: ${appUrl}/login\n\n` +
    `Jadwal:\n` +
    `- Simulasi: 3 November 2026, 13.00-14.30 WIB\n` +
    `- Pelaksanaan: 4 November 2026, 13.00-14.30 WIB\n\n` +
    `Lomba terdiri dari 50 soal dengan nilai maksimal 100. Peserta boleh melihat referensi saat mengerjakan.\n\n` +
    `Jangan bagikan username dan password ini kepada siapa pun selain pemiliknya masing-masing.\n` +
    `Bila ada kendala login, hubungi panitia: Instagram @markaz_turats atau WhatsApp 08197982788.\n\n` +
    `Panitia Olimpiade Nahwu Shorof Nasional 2026\n` +
    `${appUrl}`
  );
}

// Kirim satu email gabungan ke alamat bersama. Mengembalikan messageId
// Brevo yang sama untuk semua akun dalam grup (disimpan tiap akun ke
// EmailLog.resendId masing-masing).
export async function sendCombinedCredentialsEmail(input: {
  to: string;
  accounts: CombinedAccount[];
}): Promise<string> {
  const apiKey = getBrevoKey();
  // PENTING: password hanya ada di isi email ini. Jangan pernah me-log
  // nilai ini dan jangan pernah mengembalikannya lewat API.
  const appUrl = getAppUrl();
  const sender = parseEmailFrom(getEmailFrom());
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: sender.name ? sender : { email: sender.email },
      to: [{ email: input.to }],
      subject:
        "Akun Ujian Olimpiade Nahwu Shorof Nasional 2026 — Beberapa Peserta",
      htmlContent: buildCombinedCredentialsHtml(input.accounts, appUrl),
      textContent: buildCombinedCredentialsText(input.accounts, appUrl),
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    messageId?: string;
    message?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.message || "Gagal mengirim email lewat Brevo.");
  }
  if (!body?.messageId) {
    throw new Error("Brevo tidak mengembalikan ID email.");
  }
  return body.messageId;
}
