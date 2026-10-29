"use client";

import { useEffect, useState, useCallback, use } from "react";
import { renderRichText } from "@/lib/safeHtml";
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
    rawScore: number;
    penaltyScore: number;
    speedBonus: number;
    finalScore: number;
  } | null>(null);

  const [sessionInfo, setSessionInfo] = useState<{
    id: string;
    title: string;
    durationMinutes: number;
    speedScoringMode: "BONUS_POINTS" | "TIE_BREAKER";
    maxSpeedBonus: number;
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

  const handleSubmitExam = useCallback(
    async (attemptIdToSubmit: string) => {
      if (submitting) return;
      setSubmitting(true);
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
        }
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
      handleSubmitExam(attempt.id);
      return;
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

  async function saveAnswerToServer(
    questionId: string,
    selectedOptionId: string | null,
    isDoubtful: boolean
  ) {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedOptionId, isDoubtful },
    }));
    setSavingStatus("saving");

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
        return;
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

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" /> Skor Bobot
                  Jawaban
                </div>
                <div className="text-xl font-bold text-zinc-900 mt-1">
                  {attempt.rawScore}
                  {attempt.penaltyScore > 0 && (
                    <span className="text-xs text-red-600 ml-1">
                      (-{attempt.penaltyScore})
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-xs text-amber-800 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> Bonus Kecepatan
                </div>
                <div className="text-xl font-bold text-amber-900 mt-1">
                  +{attempt.speedBonus}
                </div>
              </div>
            </div>

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
                  ? "Gagal simpan otomatis"
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
                    dir={currentQuestion.direction === "RTL" ? "rtl" : "ltr"}
                    className={`p-6 rounded-xl bg-amber-50/40 border border-amber-200/60 text-zinc-900 whitespace-pre-line ${
                      currentQuestion.direction === "RTL"
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
                          onClick={() =>
                            saveAnswerToServer(
                              currentQuestion.id,
                              opt.id,
                              currentAnswer.isDoubtful
                            )
                          }
                          className={`w-full p-4 rounded-xl border-2 transition flex items-center gap-4 text-left cursor-pointer ${
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
                            dir={opt.direction === "RTL" ? "rtl" : "ltr"}
                            className={`flex-1 ${
                              opt.direction === "RTL"
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
                  onClick={() =>
                    saveAnswerToServer(
                      currentQuestion.id,
                      currentAnswer.selectedOptionId,
                      !currentAnswer.isDoubtful
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 border transition cursor-pointer ${
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
              <span>Info Penilaian Kecepatan</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Semakin cepat Anda menyelesaikan ujian dengan jawaban yang{" "}
              <strong>tepat</strong>, semakin besar tambahan poin kecepatan yang
              Anda peroleh.
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

