// GELOMBANG 2: pembatas percobaan login gagal per IP (in-memory,
// per proses server). Hanya kegagalan yang dihitung, supaya satu
// jaringan yang loginnya berhasil (mis. lab sekolah dengan satu IP
// publik) tidak ikut terblokir.
const buckets = new Map<string, { failures: number; resetAt: number }>();

const MAX_FAILURES = 20;
const WINDOW_MS = 15 * 60 * 1000;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function isLoginRateLimited(ip: string): boolean {
  const bucket = buckets.get(ip);
  if (!bucket) return false;
  if (Date.now() > bucket.resetAt) {
    buckets.delete(ip);
    return false;
  }
  return bucket.failures >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { failures: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.failures += 1;
  // Bersihkan entri kedaluwarsa sesekali supaya map tidak membengkak.
  if (buckets.size > 1000) {
    for (const [key, value] of buckets) {
      if (now > value.resetAt) buckets.delete(key);
    }
  }
}
