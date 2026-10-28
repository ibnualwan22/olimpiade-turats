"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Clock,
  FileQuestion,
  Zap,
  Play,
  ArrowLeft,
  CheckSquare,
} from "lucide-react";

export default function ExamRulesPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [sessionData, setSessionData] = useState<{
    id: string;
    title: string;
    description: string | null;
    rulesContent: string;
    durationMinutes: number;
    wrongPenalty: number;
    speedScoringMode: "BONUS_POINTS" | "TIE_BREAKER";
    maxSpeedBonus: number;
    totalQuestions: number;
  } | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exam/state?sessionId=${sessionId}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          router.push("/exam");
          return;
        }
        const data = await res.json();
        if (data.attempt.startedAt) {
          // Jika timer sudah berjalan, langsung arahkan ke halaman ujian
          router.replace(`/exam/${sessionId}/play`);
          return;
        }
        setSessionData(data.session);
      } catch {
        setError("Gagal memuat tata tertib sesi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, router]);

  async function handleStartExam() {
    if (!agreed) return;
    setStarting(true);
    setError("");

    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memulai ujian");
        setStarting(false);
        return;
      }

      router.push(`/exam/${sessionId}/play`);
    } catch {
      setError("Gagal menghubungi server");
      setStarting(false);
    }
  }

  if (loading || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-500 animate-pulse">
          Memuat halaman Tata Tertib...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 sm:p-8 border-b border-zinc-800">
          <button
            onClick={() => router.push("/exam")}
            className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-white mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Portal Peserta
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            {sessionData.title}
          </h1>
          {sessionData.description && (
            <p className="text-sm text-zinc-200/80 mt-2">
              {sessionData.description}
            </p>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 bg-zinc-50 border-b border-zinc-200">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-zinc-800">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Durasi Pengerjaan</div>
              <div className="text-sm font-bold text-zinc-900">
                {sessionData.durationMinutes} Menit
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-700">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Jumlah Soal</div>
              <div className="text-sm font-bold text-zinc-900">
                {sessionData.totalQuestions} Pilihan Ganda
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Skor Kecepatan</div>
              <div className="text-sm font-bold text-zinc-900">
                {sessionData.speedScoringMode === "BONUS_POINTS"
                  ? `Bonus s/d +${sessionData.maxSpeedBonus} Poin`
                  : "Penentu Peringkat Seri"}
              </div>
            </div>
          </div>
        </div>

        {/* Rules Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-amber-800 font-bold text-base mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Tata Tertib &amp; Ketentuan Perlombaan</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 text-sm text-zinc-800 whitespace-pre-line leading-relaxed">
              {sessionData.rulesContent}
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Checkbox Persetujuan */}
          <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-zinc-700 rounded cursor-pointer"
            />
            <div className="text-xs sm:text-sm text-zinc-700">
              <span className="font-bold text-zinc-900 block mb-0.5">
                Saya telah membaca dan menyetujui seluruh Tata Tertib di atas.
              </span>
              Saya memahami bahwa begitu tombol{" "}
              <strong>&ldquo;Mulai Kerjakan Sekarang&rdquo;</strong> ditekan,
              hitungan waktu mundur ({sessionData.durationMinutes} menit) akan
              langsung berjalan dan tidak dapat dijeda.
            </div>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={!agreed || starting}
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-zinc-700/25 transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {starting
                  ? "Memulai Waktu Ujian..."
                  : "Mulai Kerjakan Sekarang"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

