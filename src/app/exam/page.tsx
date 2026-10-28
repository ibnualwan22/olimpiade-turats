"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  KeyRound,
  LogOut,
  Clock,
  CheckCircle2,
  PlayCircle,
  Trophy,
  Zap,
} from "lucide-react";

interface AttemptItem {
  id: string;
  sessionId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "TIME_UP";
  startedAt: string | null;
  expiresAt: string | null;
  timeSpentSeconds: number | null;
  rawScore: number;
  penaltyScore: number;
  speedBonus: number;
  finalScore: number;
  session: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    speedScoringMode: "BONUS_POINTS" | "TIE_BREAKER";
    maxSpeedBonus: number;
    _count: { questions: number };
  };
}

export default function ParticipantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    username: string;
    institution?: string | null;
    role: string;
  } | null>(null);
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingToken, setSubmittingToken] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/exam/state");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setAttempts(data.attempts || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleVerifyToken(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmittingToken(true);

    try {
      const res = await fetch("/api/exam/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Token tidak valid");
        setSubmittingToken(false);
        return;
      }

      if (data.status !== "IN_PROGRESS") {
        router.push(`/exam/${data.sessionId}/play`);
      } else if (data.alreadyStarted) {
        router.push(`/exam/${data.sessionId}/play`);
      } else {
        router.push(`/exam/${data.sessionId}/rules`);
      }
    } catch {
      setError("Gagal memverifikasi token");
      setSubmittingToken(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function formatDuration(sec: number | null) {
    if (!sec) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}d`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-zinc-500 text-sm font-medium animate-pulse">
          Memuat portal peserta...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-zinc-900 text-white border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base tracking-tight">
                Olimpiade Turats CBT
              </div>
              <div className="text-xs text-amber-300">
                Portal Peserta Perlombaan
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white">
                  {user.name}
                </div>
                <div className="text-xs text-amber-300">
                  {user.username} {user.institution ? `• ${user.institution}` : ""}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-900/70 border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Card Input Token Ujian */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-900 p-6 sm:p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full mb-3">
                  <KeyRound className="w-3.5 h-3.5" /> Akses Ruang Ujian
                </span>
                <h1 className="text-2xl font-bold">
                  Masukkan Token Sesi Perlombaan
                </h1>
                <p className="text-sm text-zinc-200/80 mt-1">
                  Masukkan kode token yang diberikan oleh panitia untuk membaca
                  Tata Tertib dan memulai ujian.
                </p>
              </div>
              <div
                dir="rtl"
                className="font-arabic text-2xl sm:text-3xl text-amber-300/90 hidden md:block"
              >
                بِالتَّوْفِيقِ وَالنَّجَاحِ
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form
              onSubmit={handleVerifyToken}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="KETIK TOKEN UJIAN (Contoh: TURATS2026)"
                className="flex-1 px-4 py-3.5 rounded-xl border-2 border-zinc-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none font-mono text-lg font-bold tracking-widest uppercase text-zinc-900 transition"
              />
              <button
                type="submit"
                disabled={submittingToken}
                className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {submittingToken
                    ? "Memeriksa Token..."
                    : "Masuk Sesi Ujian"}
                </span>
              </button>
            </form>

            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Tips Demo: Klik untuk mengisi token contoh{" "}
                <button
                  type="button"
                  onClick={() => setToken("TURATS2026")}
                  className="font-mono font-bold text-amber-700 underline cursor-pointer"
                >
                  TURATS2026
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* Riwayat Sesi Ujian yang Diikuti */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-4">
            Riwayat &amp; Status Sesi Ujian Anda
          </h2>

          {attempts.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-500 text-sm">
              Anda belum memasuki sesi ujian mana pun. Silakan masukkan Token
              Sesi di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="bg-white rounded-xl border border-zinc-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          att.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-zinc-800"
                        }`}
                      >
                        {att.status === "IN_PROGRESS"
                          ? att.startedAt
                            ? "Sedang Dikerjakan"
                            : "Menunggu Klik Mulai"
                          : "Selesai Dikerjakan"}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Durasi {att.session.durationMinutes} Menit (
                        {att.session._count.questions} Soal)
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900">
                      {att.session.title}
                    </h3>

                    {att.status !== "IN_PROGRESS" && (
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          Skor Akhir: {att.finalScore}
                        </span>
                        <span>Skor Jawaban: {att.rawScore}</span>
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <Zap className="w-3.5 h-3.5" />
                          Bonus Kecepatan: +{att.speedBonus}
                        </span>
                        <span>
                          Waktu Selesai: {formatDuration(att.timeSpentSeconds)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    {att.status === "IN_PROGRESS" ? (
                      <button
                        onClick={() =>
                          router.push(
                            att.startedAt
                              ? `/exam/${att.sessionId}/play`
                              : `/exam/${att.sessionId}/rules`
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>
                          {att.startedAt
                            ? "Lanjutkan Mengerjakan"
                            : "Baca Tata Tertib & Mulai"}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          router.push(`/exam/${att.sessionId}/play`)
                        }
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Lihat Ringkasan Hasil</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

