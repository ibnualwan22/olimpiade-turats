"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Clock,
  Trophy,
  Zap,
  PlusCircle,
  CheckCircle2,
  RotateCcw,
  Activity,
  Search,
  Download,
  Eye,
  X,
  BarChart3,
} from "lucide-react";

interface MonitoringAttempt {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "TIME_UP";
  tokenVerifiedAt: string;
  startedAt: string | null;
  expiresAt: string | null;
  extraMinutes: number;
  finishedAt: string | null;
  timeSpentSeconds: number | null;
  rawScore: number;
  penaltyScore: number;
  speedBonus: number;
  finalScore: number;
  lastSeenAt: string | null;
  lastAnsweredAt: string | null;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  doubtfulCount: number;
  unansweredCount: number;
  user: {
    id: string;
    username: string;
    name: string;
    institution: string | null;
  };
  session: {
    id: string;
    title: string;
    durationMinutes: number;
    _count: { questions: number };
  };
}

interface Summary {
  totalParticipants: number;
  notStarted: number;
  rules: number;
  working: number;
  finished: number;
}

interface QuestionStat {
  questionId: string;
  order: number;
  content: string;
  category: string | null;
  correct: number;
  wrong: number;
  unanswered: number;
  denominator: number;
}

interface DetailAnswer {
  questionId: string;
  order: number;
  content: string;
  category: string | null;
  options: { id: string; label: string; content: string; isCorrect: boolean }[];
  selectedOptionId: string | null;
  selectedOption: { id: string; label: string; content: string } | null;
  isCorrect: boolean | null;
  isDoubtful: boolean;
  answeredAt: string;
}

interface DetailData {
  attempt: MonitoringAttempt;
  answers: DetailAnswer[];
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function AdminMonitoringPage() {
  const [sessions, setSessions] = useState<
    {
      id: string;
      title: string;
      accessToken: string;
      durationMinutes: number;
      speedScoringMode: string;
      maxSpeedBonus: number;
      _count: { questions: number; attempts: number };
    }[]
  >([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [attempts, setAttempts] = useState<MonitoringAttempt[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "MONITORING" | "LEADERBOARD" | "STATS"
  >("MONITORING");

  // Jam server (offset terhadap jam perangkat) + detak 1 detik untuk
  // hitung mundur sisa waktu yang live.
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  // Diinisialisasi 0 (bukan Date.now()) supaya halaman tetap bisa
  // di-prerender statis (Next 16 melarang baca jam saat render awal);
  // nilai nyata diisi efek di bawah segera setelah mount.
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const serverNowMs = nowMs + serverOffsetMs;

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "WORKING" | "RULES" | "FINISHED"
  >("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "default" | "progress" | "remaining" | "score"
  >("default");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [exportError, setExportError] = useState("");

  const loadMonitoring = useCallback(async (sesId?: string) => {
    setLoading(true);
    try {
      const query = sesId ? `?sessionId=${sesId}` : "";
      const res = await fetch(`/api/admin/monitoring${query}`);
      const data = await res.json();
      setSessions(data.sessions || []);
      if (!sesId && data.selectedSessionId) {
        setSelectedSessionId(data.selectedSessionId);
      }
      setAttempts(data.attempts || []);
      setSummary(data.summary || null);
      setQuestionStats(data.questionStats || []);
      if (data.serverTime) {
        setServerOffsetMs(new Date(data.serverTime).getTime() - Date.now());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoring(selectedSessionId || undefined);
    const interval = setInterval(() => {
      loadMonitoring(selectedSessionId || undefined);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedSessionId, loadMonitoring]);

  async function handleAction(
    attemptId: string,
    action: "ADD_TIME" | "FORCE_SUBMIT" | "RESET"
  ) {
    if (
      action === "RESET" &&
      !confirm(
        "Yakin ingin me-reset ujian peserta ini? Semua jawaban peserta pada sesi ini akan dihapus dan peserta dapat mengulang dari awal."
      )
    ) {
      return;
    }

    if (
      action === "FORCE_SUBMIT" &&
      !confirm("Paksa selesaikan dan hitung nilai peserta ini sekarang?")
    ) {
      return;
    }

    await fetch(`/api/admin/monitoring/${attemptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, extraMinutes: 5 }),
    });

    await loadMonitoring(selectedSessionId);
  }

  async function openDetail(attemptId: string) {
    setDetailId(attemptId);
    setDetailData(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/monitoring/${attemptId}`);
      const data = await res.json();
      if (!res.ok) {
        setDetailError(data.error || "Gagal memuat detail");
        return;
      }
      setDetailData(data);
    } catch {
      setDetailError("Gagal terhubung ke server");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleExport() {
    setExportError("");
    try {
      const query = selectedSessionId
        ? `?sessionId=${selectedSessionId}`
        : "";
      const res = await fetch(`/api/admin/monitoring/export${query}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setExportError(data.error || "Gagal mengekspor");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match ? match[1] : "rekap.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError("Gagal mengekspor");
    }
  }

  function formatTimeSpent(sec: number | null) {
    if (!sec) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}d`;
  }

  function formatRemaining(expiresAt: string | null): string {
    if (!expiresAt || !serverNowMs) return "-";
    const sec = Math.floor(
      (new Date(expiresAt).getTime() - serverNowMs) / 1000
    );
    if (sec <= 0) return "Waktu habis";
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}j ${m}m`;
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}d`;
  }

  function lastSeenLabel(a: MonitoringAttempt): {
    text: string;
    stale: boolean;
  } {
    if (!serverNowMs) {
      return { text: "-", stale: false };
    }
    if (a.status !== "IN_PROGRESS" || !a.startedAt) {
      return { text: "-", stale: false };
    }
    if (!a.lastSeenAt) {
      return { text: "Belum ada sinyal", stale: true };
    }
    const diffSec = Math.floor(
      (serverNowMs - new Date(a.lastSeenAt).getTime()) / 1000
    );
    if (diffSec < 45) return { text: "Aktif baru saja", stale: false };
    if (diffSec < 120)
      return { text: `Aktif ${diffSec}d lalu`, stale: false };
    const m = Math.floor(diffSec / 60);
    return { text: `Tidak aktif >${m}m`, stale: true };
  }

  function isFreshlyFinished(a: MonitoringAttempt): boolean {
    if (!a.finishedAt) return false;
    const diffSec = Math.floor(
      (serverNowMs - new Date(a.finishedAt).getTime()) / 1000
    );
    return diffSec >= 0 && diffSec <= 90;
  }

  const filteredAttempts = attempts
    .filter((a) => {
      if (statusFilter === "WORKING")
        return a.status === "IN_PROGRESS" && !!a.startedAt;
      if (statusFilter === "RULES")
        return a.status === "IN_PROGRESS" && !a.startedAt;
      if (statusFilter === "FINISHED") return a.status !== "IN_PROGRESS";
      return true;
    })
    .filter((a) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        a.user.name.toLowerCase().includes(q) ||
        a.user.username.toLowerCase().includes(q) ||
        (a.user.institution || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "progress") return b.answeredCount - a.answeredCount;
      if (sortBy === "remaining") {
        const ea = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const eb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return ea - eb;
      }
      if (sortBy === "score") return b.finalScore - a.finalScore;
      return 0;
    });

  const finishedRankings = [...attempts]
    .filter((a) => a.status !== "IN_PROGRESS")
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (a.timeSpentSeconds || 999999) - (b.timeSpentSeconds || 999999);
    });

  const statusBadge = (a: MonitoringAttempt) => {
    if (a.status === "IN_PROGRESS") {
      if (a.startedAt) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" /> Sedang Mengerjakan
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
          Di Halaman Tata Tertib
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-zinc-800 text-xs font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" /> Selesai ({a.status})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">
            Live Monitoring &amp; Papan Peringkat
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Pantau progres pengerjaan peserta secara langsung, tambah waktu
            ekstra, dan lihat hasil nilai + kecepatan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs sm:text-sm font-semibold"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.accessToken})
              </option>
            ))}
          </select>

          <button
            onClick={handleExport}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => loadMonitoring(selectedSessionId)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>
      {exportError && (
        <p className="text-xs text-red-600 -mt-2">{exportError}</p>
      )}

      {/* Kartu ringkasan sesi */}
      {summary && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Total Peserta
              </div>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {summary.totalParticipants}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Belum Masuk Token
              </div>
              <div className="text-2xl font-black text-zinc-400 mt-1">
                {summary.notStarted}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Tata Tertib
              </div>
              <div className="text-2xl font-black text-zinc-700 mt-1">
                {summary.rules}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Mengerjakan
              </div>
              <div className="text-2xl font-black text-yellow-700 mt-1">
                {summary.working}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Selesai
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {summary.finished}
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Total peserta = akun peserta aktif (termasuk akun contoh bila
            belum dihapus). Data diperbarui tiap 10 detik; hitung mundur
            memakai jam server.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab("MONITORING")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${activeTab === "MONITORING"
            ? "bg-zinc-800 text-white"
            : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Monitoring Peserta ({attempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("LEADERBOARD")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${activeTab === "LEADERBOARD"
            ? "bg-yellow-500 text-zinc-950"
            : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Peringkat &amp; Skor Kecepatan ({finishedRankings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("STATS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${activeTab === "STATS"
            ? "bg-zinc-800 text-white"
            : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistik Soal ({questionStats.length})</span>
        </button>
      </div>

      {activeTab === "MONITORING" ? (
        <div className="space-y-4">
          {/* Filter / cari / urut */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "ALL" | "WORKING" | "RULES" | "FINISHED"
                )
              }
              className="px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs sm:text-sm font-semibold"
            >
              <option value="ALL">Semua status</option>
              <option value="WORKING">Sedang mengerjakan</option>
              <option value="RULES">Halaman tata tertib</option>
              <option value="FINISHED">Sudah selesai</option>
            </select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, username, atau instansi…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs sm:text-sm outline-none focus:border-yellow-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "default" | "progress" | "remaining" | "score"
                )
              }
              className="px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs sm:text-sm font-semibold"
            >
              <option value="default">Urutan bawaan</option>
              <option value="progress">Progres terbanyak</option>
              <option value="remaining">Sisa waktu tersingkat</option>
              <option value="score">Nilai tertinggi</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            {filteredAttempts.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                {attempts.length === 0
                  ? "Belum ada peserta yang memasukkan token pada sesi ini."
                  : "Tidak ada peserta yang cocok dengan filter."}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        <th className="p-4">Peserta &amp; Instansi</th>
                        <th className="p-4">Status Ujian</th>
                        <th className="p-4">Progres Soal</th>
                        <th className="p-4">Benar / Salah</th>
                        <th className="p-4">Waktu / Durasi</th>
                        <th className="p-4">Nilai Sementara / Akhir</th>
                        <th className="p-4 text-right">Aksi Kontrol Panitia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {filteredAttempts.map((a) => {
                        const totalQ = a.session._count.questions;
                        const seen = lastSeenLabel(a);
                        return (
                          <tr key={a.id} className="hover:bg-zinc-50/80">
                            <td className="p-4">
                              <div className="font-bold text-zinc-900">
                                {a.user.name}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {a.user.username}{" "}
                                {a.user.institution
                                  ? `• ${a.user.institution}`
                                  : ""}
                              </div>
                              <button
                                onClick={() => openDetail(a.id)}
                                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-yellow-700 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Detail jawaban
                              </button>
                            </td>

                            <td className="p-4">
                              {statusBadge(a)}
                              {isFreshlyFinished(a) && (
                                <div className="mt-1">
                                  <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                                    Baru selesai
                                  </span>
                                </div>
                              )}
                              <div
                                className={`text-xs mt-1 ${seen.stale
                                  ? "text-red-600 font-bold"
                                  : "text-zinc-500"
                                  }`}
                              >
                                {seen.text}
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="font-bold text-zinc-800 text-xs">
                                {a.answeredCount} / {totalQ} Soal
                              </div>
                              <div className="w-28 h-2 bg-zinc-100 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{
                                    width: `${totalQ > 0
                                      ? Math.min(
                                        100,
                                        (a.answeredCount / totalQ) * 100
                                      )
                                      : 0
                                      }%`,
                                  }}
                                />
                              </div>
                            </td>

                            <td className="p-4 text-xs">
                              <div className="font-bold text-zinc-800">
                                <span className="text-emerald-700">
                                  ✓ {a.correctCount} benar
                                </span>
                                {" • "}
                                <span className="text-red-600">
                                  ✗ {a.wrongCount} salah
                                </span>
                              </div>
                              <div className="text-zinc-500 mt-0.5">
                                Kosong {a.unansweredCount}
                                {a.doubtfulCount > 0 &&
                                  ` • Ragu ${a.doubtfulCount}`}
                                {a.status === "IN_PROGRESS" &&
                                  " • sementara"}
                              </div>
                            </td>

                            <td className="p-4 text-xs text-zinc-600">
                              {a.status === "IN_PROGRESS" ? (
                                <div>
                                  <div className="font-bold text-zinc-900">
                                    Sisa {formatRemaining(a.expiresAt)}
                                  </div>
                                  <div>
                                    Batas:{" "}
                                    {a.expiresAt
                                      ? new Date(a.expiresAt).toLocaleTimeString(
                                        "id-ID"
                                      )
                                      : "Belum klik mulai"}
                                  </div>
                                  {a.extraMinutes > 0 && (
                                    <span className="text-yellow-700 font-bold">
                                      +{a.extraMinutes}m ekstra
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-semibold text-zinc-900">
                                  Selesai dalam{" "}
                                  {formatTimeSpent(a.timeSpentSeconds)}
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              {a.status !== "IN_PROGRESS" ? (
                                <div>
                                  <div className="font-black text-zinc-800 text-base">
                                    {a.finalScore} Poin
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    Soal: {a.rawScore} | Speed: +{a.speedBonus}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">
                                  Menunggu selesai
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {a.status === "IN_PROGRESS" && a.startedAt && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleAction(a.id, "ADD_TIME")
                                      }
                                      title="Tambah Waktu +5 Menit"
                                      className="px-2.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" /> +5m
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleAction(a.id, "FORCE_SUBMIT")
                                      }
                                      title="Paksa Selesai & Hitung Skor"
                                      className="px-2.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold cursor-pointer"
                                    >
                                      Submit
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleAction(a.id, "RESET")}
                                  title="Reset Ujian Peserta"
                                  className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-zinc-100">
                  {filteredAttempts.map((a) => {
                    const totalQ = a.session._count.questions;
                    const seen = lastSeenLabel(a);
                    return (
                      <div key={a.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 truncate">
                              {a.user.name}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              {a.user.username}
                              {a.user.institution
                                ? ` • ${a.user.institution}`
                                : ""}
                            </div>
                          </div>
                          {a.status === "IN_PROGRESS" ? (
                            a.startedAt ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" /> Mengerjakan
                              </span>
                            ) : (
                              <span className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                                Tata Tertib
                              </span>
                            )
                          ) : (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600">
                          <span className="font-bold text-zinc-800">
                            {a.answeredCount} / {totalQ} soal
                          </span>
                          <span className="ml-2">
                            <span className="text-emerald-700 font-bold">
                              ✓ {a.correctCount}
                            </span>
                            {" / "}
                            <span className="text-red-600 font-bold">
                              ✗ {a.wrongCount}
                            </span>
                            <span className="text-zinc-500">
                              {" "}
                              • Kosong {a.unansweredCount}
                            </span>
                          </span>
                          {a.status !== "IN_PROGRESS" ? (
                            <span className="ml-2">
                              {a.finalScore} poin (Soal {a.rawScore} | Speed +
                              {a.speedBonus})
                            </span>
                          ) : a.expiresAt ? (
                            <span className="ml-2">
                              Sisa {formatRemaining(a.expiresAt)}
                            </span>
                          ) : (
                            <span className="ml-2">Belum klik mulai</span>
                          )}
                          {a.status === "IN_PROGRESS" && a.extraMinutes > 0 && (
                            <span className="ml-2 text-yellow-700 font-bold">
                              +{a.extraMinutes}m ekstra
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-xs ${seen.stale
                            ? "text-red-600 font-bold"
                            : "text-zinc-500"
                            }`}
                        >
                          {seen.text}
                          {isFreshlyFinished(a) && (
                            <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                              Baru selesai
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => openDetail(a.id)}
                            className="flex-1 px-3 py-2 rounded-lg bg-white text-zinc-800 border border-zinc-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                          {a.status === "IN_PROGRESS" && a.startedAt && (
                            <>
                              <button
                                onClick={() => handleAction(a.id, "ADD_TIME")}
                                className="flex-1 px-3 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" /> +5m
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(a.id, "FORCE_SUBMIT")
                                }
                                className="flex-1 px-3 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold cursor-pointer"
                              >
                                Submit
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleAction(a.id, "RESET")}
                            className="flex-1 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      ) : activeTab === "LEADERBOARD" ? (
        /* TAB LEADERBOARD */
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          {finishedRankings.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              Belum ada peserta yang menyelesaikan ujian pada sesi ini.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Peringkat</th>
                      <th className="p-4">Nama Peserta &amp; Utusan</th>
                      <th className="p-4">Skor Jawaban</th>
                      <th className="p-4">Bonus Kecepatan</th>
                      <th className="p-4">Waktu Penyelesaian</th>
                      <th className="p-4 text-right">Total Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {finishedRankings.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-yellow-50/30">
                        <td className="p-4">
                          <span
                            className={`w-8 h-8 rounded-xl font-black text-xs inline-flex items-center justify-center ${idx === 0
                              ? "bg-amber-400 text-zinc-950"
                              : idx === 1
                                ? "bg-zinc-300 text-zinc-900"
                                : idx === 2
                                  ? "bg-amber-700 text-white"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-zinc-900">
                            {r.user.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {r.user.institution || r.user.username}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-zinc-800">
                          {r.rawScore} Poin
                          {r.penaltyScore > 0 && (
                            <span className="text-xs text-red-600 ml-1">
                              (-{r.penaltyScore})
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900 font-bold text-xs">
                            <Zap className="w-3.5 h-3.5 text-yellow-600" /> +
                            {r.speedBonus}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs text-zinc-700">
                          {formatTimeSpent(r.timeSpentSeconds)}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-lg font-black text-zinc-800">
                            {r.finalScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-zinc-100">
                {finishedRankings.map((r, idx) => (
                  <div key={r.id} className="p-4 flex items-start gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg font-black text-xs inline-flex items-center justify-center shrink-0 ${idx === 0
                        ? "bg-amber-400 text-zinc-950"
                        : idx === 1
                          ? "bg-zinc-300 text-zinc-900"
                          : idx === 2
                            ? "bg-amber-700 text-white"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-zinc-900 truncate">
                        {r.user.name}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {r.user.institution || r.user.username}
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">
                        Skor {r.rawScore}
                        {r.penaltyScore > 0 && (
                          <span className="text-red-600">
                            {" "}
                            (-{r.penaltyScore})
                          </span>
                        )}{" "}
                        • Speed +{r.speedBonus} •{" "}
                        {formatTimeSpent(r.timeSpentSeconds)}
                      </div>
                    </div>
                    <div className="text-lg font-black text-zinc-900 shrink-0">
                      {r.finalScore}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* TAB STATISTIK SOAL */
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          {questionStats.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              Belum ada soal pada sesi ini.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      <th className="p-4">No.</th>
                      <th className="p-4">Soal</th>
                      <th className="p-4">Benar</th>
                      <th className="p-4">Salah</th>
                      <th className="p-4">Kosong</th>
                      <th className="p-4">% Benar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {questionStats.map((q) => {
                      const pct =
                        q.denominator > 0
                          ? Math.round((q.correct / q.denominator) * 100)
                          : 0;
                      return (
                        <tr key={q.questionId} className="hover:bg-zinc-50/80">
                          <td className="p-4 font-bold text-zinc-800">
                            {q.order}
                          </td>
                          <td className="p-4 max-w-md">
                            <div className="text-zinc-800 text-sm line-clamp-2">
                              {stripTags(q.content)}
                            </div>
                            {q.category && (
                              <div className="text-xs text-zinc-500 mt-0.5">
                                {q.category}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-bold text-emerald-700">
                            {q.correct}
                          </td>
                          <td className="p-4 font-bold text-red-600">
                            {q.wrong}
                          </td>
                          <td className="p-4 text-zinc-600">
                            {q.unanswered}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-zinc-700">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-400 p-4 border-t border-zinc-100">
                Penyebut = peserta yang sudah klik mulai (
                {questionStats[0]?.denominator ?? 0} orang). Peserta yang
                belum mulai tidak dihitung sebagai kosong.
              </p>
            </>
          )}
        </div>
      )}

      {/* Modal detail jawaban per peserta */}
      {detailId && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-zinc-900">
                  Detail Jawaban Peserta
                </h3>
                {detailData && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {detailData.attempt.user.name} •{" "}
                    {detailData.attempt.user.username}
                    {detailData.attempt.user.institution
                      ? ` • ${detailData.attempt.user.institution}`
                      : ""}{" "}
                    • {detailData.attempt.session.title}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="p-2 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {detailLoading && (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Memuat detail…
                </p>
              )}
              {detailError && (
                <p className="text-sm text-red-600 text-center py-8">
                  {detailError}
                </p>
              )}
              {detailData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <div className="text-xs font-bold text-zinc-500">
                        DIJAWAB
                      </div>
                      <div className="text-xl font-black text-zinc-900">
                        {detailData.attempt.answeredCount} /{" "}
                        {detailData.attempt.session._count.questions}
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <div className="text-xs font-bold text-emerald-700">
                        BENAR
                      </div>
                      <div className="text-xl font-black text-emerald-700">
                        {detailData.attempt.correctCount}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <div className="text-xs font-bold text-red-700">
                        SALAH
                      </div>
                      <div className="text-xl font-black text-red-700">
                        {detailData.attempt.wrongCount}
                      </div>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <div className="text-xs font-bold text-zinc-500">
                        NILAI AKHIR
                      </div>
                      <div className="text-xl font-black text-zinc-900">
                        {detailData.attempt.status !== "IN_PROGRESS"
                          ? `${detailData.attempt.finalScore} poin`
                          : "Belum selesai"}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div>
                      Token diverifikasi:{" "}
                      {new Date(
                        detailData.attempt.tokenVerifiedAt
                      ).toLocaleString("id-ID")}
                    </div>
                    <div>
                      Mulai:{" "}
                      {detailData.attempt.startedAt
                        ? new Date(
                          detailData.attempt.startedAt
                        ).toLocaleString("id-ID")
                        : "-"}
                    </div>
                    <div>
                      Jawaban terakhir:{" "}
                      {detailData.attempt.lastAnsweredAt
                        ? new Date(
                          detailData.attempt.lastAnsweredAt
                        ).toLocaleString("id-ID")
                        : "-"}
                    </div>
                    <div>
                      Aktivitas terakhir:{" "}
                      {detailData.attempt.lastSeenAt
                        ? new Date(
                          detailData.attempt.lastSeenAt
                        ).toLocaleString("id-ID")
                        : "-"}
                    </div>
                    <div>
                      Selesai:{" "}
                      {detailData.attempt.finishedAt
                        ? new Date(
                          detailData.attempt.finishedAt
                        ).toLocaleString("id-ID")
                        : "-"}
                    </div>
                    <div>
                      Durasi:{" "}
                      {detailData.attempt.status !== "IN_PROGRESS"
                        ? formatTimeSpent(
                          detailData.attempt.timeSpentSeconds
                        )
                        : "Masih mengerjakan"}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500">
                          <th className="p-3">No.</th>
                          <th className="p-3">Soal</th>
                          <th className="p-3">Jawaban Peserta</th>
                          <th className="p-3">Kunci</th>
                          <th className="p-3">Hasil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {detailData.answers.map((ans) => {
                          const correctOpt = ans.options.find(
                            (o) => o.isCorrect
                          );
                          return (
                            <tr key={ans.questionId}>
                              <td className="p-3 font-bold text-zinc-800">
                                {ans.order}
                              </td>
                              <td className="p-3 max-w-xs">
                                <div className="text-zinc-800 line-clamp-2">
                                  {stripTags(ans.content)}
                                </div>
                                {ans.category && (
                                  <div className="text-xs text-zinc-500">
                                    {ans.category}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                {ans.selectedOption ? (
                                  <span>
                                    <span className="font-bold">
                                      {ans.selectedOption.label}.{" "}
                                    </span>
                                    {stripTags(
                                      ans.selectedOption.content
                                    ).slice(0, 80)}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">
                                    Tidak dijawab
                                  </span>
                                )}
                                {ans.isDoubtful && (
                                  <span className="ml-1 inline-flex px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-bold">
                                    Ragu
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                {correctOpt ? (
                                  <span>
                                    <span className="font-bold">
                                      {correctOpt.label}.{" "}
                                    </span>
                                    {stripTags(correctOpt.content).slice(0, 80)}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </td>
                              <td className="p-3">
                                {ans.isCorrect === null ? (
                                  <span className="text-zinc-400 font-bold">
                                    -
                                  </span>
                                ) : ans.isCorrect ? (
                                  <span className="text-emerald-700 font-bold">
                                    ✓ Benar
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-bold">
                                    ✗ Salah
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Detail ini hanya untuk admin (transparansi nilai). Kunci
                    jawaban tidak pernah ditampilkan ke peserta lewat halaman
                    ini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
