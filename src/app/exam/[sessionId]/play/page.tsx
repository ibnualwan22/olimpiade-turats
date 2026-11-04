"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { renderRichText } from "@/lib/safeHtml";
import { getTextDirection } from "@/lib/text-direction";
import { useRouter } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Zap,
  ArrowLeft,
  Type,
} from "lucide-react";

interface OptionItem {
  id: string;
  label: string;
  content: string;
  direction: "RTL" | "LTR";
}

interface QuestionItem {
  id: string;
  content: string;
  direction: "RTL" | "LTR";
  weight: number;
  category?: { name: string } | null;
  options: OptionItem[];
}

interface AnswerState {
  selectedOptionId: string | null;
  isDoubtful: boolean;
}

// Cadangan jawaban di perangkat peserta (pelajaran dari ujian Usbu'i Siakad:
// jawaban yang gagal terkirim tidak boleh hilang saat tab ditutup).
// Satu entri per soal; `saved:false` berarti belum dikonfirmasi server.
interface LocalAnswerEntry {
  selectedOptionId: string | null;
  isDoubtful: boolean;
  saved: boolean;
  updatedAt: number;
}

const localAnswersKey = (attemptId: string) =>
  `olimpiade-answers:${attemptId}`;

function readLocalAnswers(
  attemptId: string
): Record<string, LocalAnswerEntry> {
  try {
    const raw = window.localStorage.getItem(localAnswersKey(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, LocalAnswerEntry>;
  } catch {
    return {};
  }
}

function writeLocalAnswers(
  attemptId: string,
  data: Record<string, LocalAnswerEntry>
) {
  try {
    window.localStorage.setItem(localAnswersKey(attemptId), JSON.stringify(data));
  } catch {
    // Kuota penuh / mode privat: cadangan lokal dilewati, alur server tetap jalan.
  }
}

// Kirim ulang semua jawaban tertunda untuk satu attempt. Idempotent (upsert
// per soal di server), jadi kirim ganda tidak merusak data. Melewati entri
// yang sudah diubah lagi sejak snapshot supaya kiriman lama tidak menimpa
// jawaban baru. Mengembalikan true bila tidak ada lagi yang tertunda.
async function flushPendingForAttempt(attemptId: string): Promise<boolean> {
  const pending = Object.entries(readLocalAnswers(attemptId)).filter(
    ([, e]) => e && !e.saved
  );
  for (const [questionId, entry] of pending) {
    const current = readLocalAnswers(attemptId)[questionId];
    if (!current || current.saved || current.updatedAt !== entry.updatedAt) {
      continue;
    }
    try {
      const res = await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedOptionId: entry.selectedOptionId,
          isDoubtful: entry.isDoubtful,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.timeUp) {
          window.location.reload();
          return false;
        }
        continue; // tetap tertunda, dicoba lagi pada pemicu berikutnya
      }
      const after = readLocalAnswers(attemptId);
      const afterEntry = after[questionId];
      if (afterEntry && afterEntry.updatedAt === entry.updatedAt) {
        afterEntry.saved = true;
        writeLocalAnswers(attemptId, after);
      }
    } catch {
      continue;
    }
  }
  return !Object.values(readLocalAnswers(attemptId)).some(
    (e) => e && !e.saved
  );
}

export default function ExamPlayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{
    id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "TIME_UP";
    startedAt: string | null;
    expiresAt: string | null;
    timeSpentSeconds: number | null;
    rawScore: number | null;
    penaltyScore: number | null;
    speedBonus: number | null;
    finalScore: number | null;
  } | null>(null);

  const [sessionInfo, setSessionInfo] = useState<{
    id: string;
    title: string;
    durationMinutes: number;
    speedScoringMode: "BONUS_POINTS" | "TIE_BREAKER";
    maxSpeedBonus: number;
    resultsVisible: boolean;
  } | null>(null);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [fontScale, setFontScale] = useState<"normal" | "large" | "xlarge">(
    "large"
  );
  const [savingStatus, setSavingStatus] = useState<
    "saved" | "saving" | "error"
  >("saved");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  // Auto-submit saat waktu habis hanya boleh jalan sekali (tanpa pengulangan
  // otomatis — pengulangan tanpa jeda pernah membebani VPS di ujian Siakad).
  const autoSubmitRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const flushingRef = useRef(false);

  const handleSubmitExam = useCallback(
    async (attemptIdToSubmit: string) => {
      if (submitting) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId: attemptIdToSubmit }),
        });
        if (res.ok) {
          const data = await res.json();
          setAttempt(data.attempt);
          setShowConfirmModal(false);
          try {
            window.localStorage.removeItem(
              localAnswersKey(attemptIdToSubmit)
            );
          } catch {
            // abaikan
          }
        } else {
          setSubmitError(
            "Gagal mengumpulkan ujian. Periksa koneksi Anda lalu klik Kumpulkan lagi."
          );
        }
      } catch {
        setSubmitError(
          "Gagal mengumpulkan ujian. Periksa koneksi Anda lalu klik Kumpulkan lagi."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [submitting]
  );

  // Load initial exam state
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
        if (data.attempt.status === "IN_PROGRESS" && !data.attempt.startedAt) {
          router.replace(`/exam/${sessionId}/rules`);
          return;
        }

        setAttempt(data.attempt);
        setSessionInfo(data.session);
        setQuestions(data.questions || []);

        const ansMap: Record<string, AnswerState> = {};
        for (const a of data.answers || []) {
          ansMap[a.questionId] = {
            selectedOptionId: a.selectedOptionId,
            isDoubtful: a.isDoubtful,
          };
        }
        setAnswers(ansMap);

        // Gabung cadangan lokal: jawaban yang belum terkirim (mis. tab
        // tertutup setelah gagal simpan) dipakai lagi dan dikirim ulang.
        // Cadangan lokal hanya menimpa soal yang statusnya tertunda; soal
        // yang sudah tersimpan tetap mengikuti server.
        if (
          data.attempt.status === "IN_PROGRESS" &&
          data.attempt.startedAt
        ) {
          const local = readLocalAnswers(data.attempt.id);
          const pendingEntries = Object.entries(local).filter(
            ([, e]) => e && !e.saved
          );
          if (pendingEntries.length > 0) {
            setAnswers((prev) => {
              const merged = { ...prev };
              for (const [qid, e] of pendingEntries) {
                merged[qid] = {
                  selectedOptionId: e.selectedOptionId,
                  isDoubtful: e.isDoubtful,
                };
              }
              return merged;
            });
            void flushPendingForAttempt(data.attempt.id);
          }
        }

        if (data.attempt.status === "IN_PROGRESS" && data.attempt.expiresAt) {
          const serverNow = new Date(data.serverTime).getTime();
          const expiry = new Date(data.attempt.expiresAt).getTime();
          const diffSec = Math.max(0, Math.floor((expiry - serverNow) / 1000));
          setRemainingSeconds(diffSec);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, router]);

  // Attempt baru (id berubah) -> reset penanda waktu habis & auto-submit.
  useEffect(() => {
    autoSubmitRef.current = false;
    setIsTimeUp(false);
    setSubmitError(null);
  }, [attempt?.id]);

  // Countdown Timer Effect
  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "IN_PROGRESS" ||
      remainingSeconds === null
    ) {
      return;
    }

    if (remainingSeconds <= 0) {
      // Waktu habis: kunci jawaban (server juga menolak jawaban baru) dan
      // coba kumpulkan SEKALI dengan jeda acak 0-15 detik supaya 500 peserta
      // tidak menembak submit di detik yang sama. Kalau gagal, TIDAK diulang
      // otomatis — peserta memakai tombol Kumpulkan manual di banner.
      setIsTimeUp(true);
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true;
        const jitter = Math.floor(Math.random() * 15000);
        autoSubmitTimerRef.current = setTimeout(() => {
          void handleSubmitExam(attempt.id);
        }, jitter);
      }
      return () => {
        if (autoSubmitTimerRef.current) {
          clearTimeout(autoSubmitTimerRef.current);
        }
      };
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, remainingSeconds, handleSubmitExam]);

  // Heartbeat aktivitas untuk monitoring: kirim tiap 30 detik selama
  // ujian berjalan, supaya panitia tahu peserta masih online. Gagal
  // diam-diam (tidak mengganggu peserta) dan berhenti saat ujian selesai.
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS" || !attempt.startedAt) {
      return;
    }
    let stopped = false;
    const ping = () => {
      if (stopped) return;
      fetch("/api/exam/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.id }),
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 30000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [attempt]);

  // Kirim ulang jawaban tertunda: saat kembali online, saat tab kembali
  // terlihat, dan berkala. Tanpa beban ekstra: bila tidak ada yang tertunda,
  // tidak ada request sama sekali (hanya baca localStorage).
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS" || !attempt.startedAt) {
      return;
    }
    const flush = () => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      void flushPendingForAttempt(attempt.id)
        .then((allSent) => {
          setSavingStatus(allSent ? "saved" : "error");
        })
        .finally(() => {
          flushingRef.current = false;
        });
    };
    const onOnline = () => flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(flush, 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [attempt]);

  // Bersihkan cadangan lokal begitu attempt selesai (terkumpul / waktu habis
  // terfinalisasi) supaya tidak ada sisa jawaban di perangkat.
  useEffect(() => {
    if (!attempt || attempt.status === "IN_PROGRESS") return;
    try {
      window.localStorage.removeItem(localAnswersKey(attempt.id));
    } catch {
      // abaikan
    }
  }, [attempt]);

  async function saveAnswerToServer(
    questionId: string,
    selectedOptionId: string | null,
    isDoubtful: boolean
  ) {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    if (isTimeUp) return; // waktu habis: jawaban dikunci

    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedOptionId, isDoubtful },
    }));
    setSavingStatus("saving");

    // Tulis cadangan lokal DULU (saved:false), baru kirim ke server.
    const now = Date.now();
    const local = readLocalAnswers(attempt.id);
    local[questionId] = {
      selectedOptionId,
      isDoubtful,
      saved: false,
      updatedAt: now,
    };
    writeLocalAnswers(attempt.id, local);

    try {
      const res = await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          questionId,
          selectedOptionId,
          isDoubtful,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.timeUp) {
          window.location.reload();
          return;
        }
        setSavingStatus("error");
        return; // tetap tertunda di localStorage untuk kirim ulang
      }

      // Tandai sudah tersimpan — hanya bila entri lokal belum diubah lagi
      // oleh klik yang lebih baru (klik baru menangani pengirimannya sendiri).
      const after = readLocalAnswers(attempt.id);
      const entry = after[questionId];
      if (
        entry &&
        entry.selectedOptionId === selectedOptionId &&
        entry.isDoubtful === isDoubtful &&
        entry.updatedAt <= now
      ) {
        entry.saved = true;
        writeLocalAnswers(attempt.id, after);
      }

      setSavingStatus("saved");
    } catch {
      setSavingStatus("error");
    }
  }

  function formatCountdown(sec: number | null) {
    if (sec === null) return "--:--";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (loading || !attempt || !sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-sm font-medium text-zinc-500 animate-pulse">
          Menyiapkan lembar soal ujian...
        </div>
      </div>
    );
  }

  // JIKA UJIAN SUDAH SELESAI -> TAMPILKAN RINGKASAN HASIL & SKOR KECEPATAN
  if (attempt.status !== "IN_PROGRESS") {
    const mins = attempt.timeSpentSeconds
      ? Math.floor(attempt.timeSpentSeconds / 60)
      : 0;
    const secs = attempt.timeSpentSeconds ? attempt.timeSpentSeconds % 60 : 0;

    return (
      <div className="min-h-screen bg-zinc-100 py-10 px-4 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-900 text-white p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-zinc-800/80 border border-amber-400/40 flex items-center justify-center mx-auto mb-4 text-amber-300">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <p dir="rtl" className="font-arabic text-2xl text-amber-300 mb-1">
              الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
            </p>
            <h1 className="text-2xl font-extrabold">
              Ujian Telah Diselesaikan!
            </h1>
            <p className="text-xs text-zinc-300 mt-1">
              {sessionInfo.title}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {sessionInfo.resultsVisible ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                    Total Nilai Akhir Anda
                  </div>
                  <div className="text-5xl font-black text-zinc-900">
                    {attempt.finalScore}
                  </div>
                  <div className="text-xs text-amber-700 mt-2">
                    Diselesaikan dalam waktu{" "}
                    <strong>
                      {mins} menit {secs} detik
                    </strong>
                  </div>
                </div>

                <div
                  className={`grid gap-3 text-sm ${
                    sessionInfo?.speedScoringMode === "TIE_BREAKER"
                      ? "grid-cols-1"
                      : "grid-cols-2"
                  }`}
                >
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div className="text-xs text-zinc-500 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" /> Skor Bobot
                      Jawaban
                    </div>
                    <div className="text-xl font-bold text-zinc-900 mt-1">
                      {attempt.rawScore}
                      {attempt.penaltyScore !== null &&
                        attempt.penaltyScore > 0 && (
                          <span className="text-xs text-red-600 ml-1">
                            (-{attempt.penaltyScore})
                          </span>
                        )}
                    </div>
                  </div>

                  {sessionInfo?.speedScoringMode !== "TIE_BREAKER" && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div className="text-xs text-amber-800 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600" /> Bonus Kecepatan
                      </div>
                      <div className="text-xl font-bold text-amber-900 mt-1">
                        +{attempt.speedBonus}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-zinc-700 leading-relaxed">
                  Terima kasih atas partisipasi Anda dalam Olimpiade Nahwu
                  Shorof Nasional 2026. Semoga Anda mendapatkan hasil yang
                  maksimal.
                </p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Transkrip nilai dan peringkat akan ditampilkan setelah
                  pengumuman resmi pada tanggal 5 November 2026.
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/exam")}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Portal Peserta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  // Arah tulisan dideteksi otomatis dari isi soal (helper yang sama dengan
  // halaman manajemen soal), bukan dari field direction tersimpan.
  const questionDirection = currentQuestion
    ? getTextDirection(currentQuestion.content)
    : "LTR";
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] || {
        selectedOptionId: null,
        isDoubtful: false,
      }
    : { selectedOptionId: null, isDoubtful: false };

  const answeredCount = Object.values(answers).filter(
    (a) => a.selectedOptionId
  ).length;
  const doubtfulCount = Object.values(answers).filter((a) => a.isDoubtful)
    .length;

  const arabicSizeClass =
    fontScale === "xlarge"
      ? "text-3xl sm:text-4xl"
      : fontScale === "large"
      ? "text-2xl sm:text-3xl"
      : "text-xl sm:text-2xl";

  const optionArabicSizeClass =
    fontScale === "xlarge"
      ? "text-2xl sm:text-3xl"
      : fontScale === "large"
      ? "text-xl sm:text-2xl"
      : "text-lg sm:text-xl";

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      {/* Sticky Exam Top Bar */}
      <header className="sticky top-0 z-30 bg-zinc-900 text-white border-b border-zinc-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base truncate">
              {sessionInfo.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-amber-300">
              <span>
                Terjawab: {answeredCount}/{questions.length}
              </span>
              <span>•</span>
              <span>
                {savingStatus === "saving"
                  ? "Menyimpan..."
                  : savingStatus === "error"
                  ? "Gagal simpan, mencoba ulang otomatis"
                  : "Tersimpan otomatis"}
              </span>
            </div>
          </div>

          {/* Server Synced Countdown Timer */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl font-mono font-black text-base sm:text-lg flex items-center gap-2 border ${
                remainingSeconds !== null && remainingSeconds < 300
                  ? "bg-red-600 text-white border-red-400 animate-pulse"
                  : "bg-zinc-800/90 text-amber-300 border-amber-400/30"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatCountdown(remainingSeconds)}</span>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Selesai &amp; Kumpulkan</span>
              <span className="sm:hidden">Selesai</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Card (Left 8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {isTimeUp && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
              <p className="font-bold text-sm text-red-800">
                Waktu habis. Jawaban Anda sudah tersimpan.
              </p>
              {submitError ? (
                <>
                  <p className="text-sm text-red-700">{submitError}</p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitExam(attempt.id)}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
                  >
                    {submitting ? "Mengumpulkan..." : "Kumpulkan Sekarang"}
                  </button>
                </>
              ) : (
                <p className="text-xs text-red-700">
                  Nilai Anda sedang difinalisasi. Bila halaman ini tidak
                  berubah, klik tombol Selesai &amp; Kumpulkan di atas.
                </p>
              )}
            </div>
          )}
          {currentQuestion && (
            <div className="bg-white rounded-xl shadow-xs border border-zinc-200 overflow-hidden flex-1 flex flex-col justify-between">
              <div>
                {/* Question Header Bar */}
                <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-xs">
                      SOAL NO. {currentIdx + 1}
                    </span>
                    {currentQuestion.category && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-xs">
                        {currentQuestion.category.name}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-xs">
                      Bobot: {currentQuestion.weight} Poin
                    </span>
                  </div>

                  {/* Font Size Adjuster */}
                  <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                    <Type className="w-3.5 h-3.5 text-zinc-400 mx-1.5" />
                    <button
                      type="button"
                      onClick={() => setFontScale("normal")}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        fontScale === "normal"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontScale("large")}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        fontScale === "large"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontScale("xlarge")}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        fontScale === "xlarge"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* Question Content */}
                <div className="p-6 sm:p-8">
                  <div
                    dir={questionDirection === "RTL" ? "rtl" : "ltr"}
                    className={`p-6 rounded-xl bg-amber-50/40 border border-amber-200/60 text-zinc-900 whitespace-pre-line ${
                      questionDirection === "RTL"
                        ? `font-arabic ${arabicSizeClass} text-right`
                        : "text-base sm:text-lg leading-relaxed"
                    }`}
                  >
                    {renderRichText(currentQuestion.content)}
                  </div>

                  {/* Options List */}
                  <div className="mt-6 space-y-3">
                    {currentQuestion.options.map((opt) => {
                      const isSelected =
                        currentAnswer.selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isTimeUp}
                          onClick={() =>
                            saveAnswerToServer(
                              currentQuestion.id,
                              opt.id,
                              currentAnswer.isDoubtful
                            )
                          }
                          className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-4 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSelected
                              ? "border-amber-500 bg-amber-50/70 shadow-xs"
                              : "border-zinc-200 hover:border-amber-300 bg-white"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "bg-zinc-900 text-white"
                                : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {opt.label}
                          </div>

                          <div
                            dir={getTextDirection(opt.content) === "RTL" ? "rtl" : "ltr"}
                            className={`flex-1 ${
                              getTextDirection(opt.content) === "RTL"
                                ? `font-arabic ${optionArabicSizeClass} text-right`
                                : "text-sm sm:text-base text-zinc-800"
                            }`}
                          >
                            {renderRichText(opt.content)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Navigation Controls */}
              <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Soal Sebelumnya</span>
                </button>

                <button
                  type="button"
                  disabled={isTimeUp}
                  onClick={() =>
                    saveAnswerToServer(
                      currentQuestion.id,
                      currentAnswer.selectedOptionId,
                      !currentAnswer.isDoubtful
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    currentAnswer.isDoubtful
                      ? "bg-amber-400 text-zinc-950 border-amber-500"
                      : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  <span>
                    {currentAnswer.isDoubtful
                      ? "Ditandai Ragu-ragu"
                      : "Ragu-ragu"}
                  </span>
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                    }
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Soal Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Selesai Ujian</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Number Grid Sidebar (Right 4/12) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-zinc-200 p-5">
            <h2 className="font-bold text-sm text-zinc-900 mb-3">
              Navigasi Nomor Soal
            </h2>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIdx;
                const isAnswered = Boolean(ans?.selectedOptionId);
                const isDoubt = Boolean(ans?.isDoubtful);

                let btnStyle =
                  "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200";
                if (isDoubt) {
                  btnStyle = "bg-amber-400 text-zinc-950 border-amber-500";
                } else if (isAnswered) {
                  btnStyle = "bg-zinc-900 text-white border-zinc-800";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-11 rounded-xl font-bold text-xs border-2 transition flex flex-col items-center justify-center cursor-pointer ${btnStyle} ${
                      isCurrent ? "ring-2 ring-offset-2 ring-amber-500" : ""
                    }`}
                  >
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-2 text-xs text-zinc-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-900 inline-block" />
                <span>Terjawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                <span>Ragu ({doubtfulCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-200 inline-block" />
                <span>Kosong ({questions.length - answeredCount})</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 text-white rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>
                {sessionInfo?.speedScoringMode === "TIE_BREAKER"
                  ? "Penentu Peringkat Seri"
                  : "Info Penilaian Kecepatan"}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {sessionInfo?.speedScoringMode === "TIE_BREAKER"
                ? "Bila ada nilai yang sama, peserta yang selesai lebih dulu menempati peringkat lebih tinggi."
                : "Semakin cepat Anda menyelesaikan ujian dengan jawaban yang tepat, semakin besar tambahan poin kecepatan yang Anda peroleh."}
            </p>
          </div>
        </div>
      </main>

      {/* Modal Konfirmasi Selesai Ujian */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-bold text-zinc-900">
                Kumpulkan Jawaban Sekarang?
              </h3>
            </div>

            <div className="text-sm text-zinc-600 space-y-2">
              <p>
                Anda telah menjawab{" "}
                <strong className="text-zinc-900">
                  {answeredCount} dari {questions.length} soal
                </strong>
                .
              </p>
              {questions.length - answeredCount > 0 && (
                <p className="text-red-600 font-medium">
                  Masih ada {questions.length - answeredCount} soal yang belum
                  dijawab!
                </p>
              )}
              {doubtfulCount > 0 && (
                <p className="text-amber-700 font-medium">
                  Masih ada {doubtfulCount} soal yang ditandai Ragu-ragu.
                </p>
              )}
              <p className="text-xs text-zinc-500 pt-1">
                Setelah dikumpulkan, waktu pengerjaan Anda akan dikunci dan skor
                akhir beserta bonus kecepatan langsung dihitung.
              </p>
            </div>

            {submitError && (
              <p className="text-red-600 font-medium text-sm">{submitError}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitExam(attempt.id)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
              >
                {submitting ? "Mengumpulkan..." : "Ya, Selesai & Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

