// Verifikasi token Cloudflare Turnstile secara server-side.
// Prinsip fail-closed: bila secret belum dipasang, token tidak ada,
// verifikasi gagal, atau Cloudflare tidak bisa dihubungi, login ditolak.
// Pesan error dibuat generik supaya tidak membocorkan detail internal.
export async function verifyTurnstileToken(
  token: string | null | undefined
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return {
      ok: false,
      error: "Verifikasi keamanan belum dikonfigurasi di server.",
    };
  }
  if (!token) {
    return {
      ok: false,
      error: "Verifikasi keamanan belum diselesaikan. Silakan coba lagi.",
    };
  }
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ secret, response: token }),
      }
    );
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
    } | null;
    if (data?.success) {
      return { ok: true };
    }
    return {
      ok: false,
      error: "Verifikasi keamanan gagal. Silakan coba lagi.",
    };
  } catch {
    return {
      ok: false,
      error: "Verifikasi keamanan gagal. Silakan coba lagi.",
    };
  }
}
