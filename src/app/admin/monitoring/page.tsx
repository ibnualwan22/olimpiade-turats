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
  user: {
    id: string;
    username: string;
    name: string;
    institution: string | null;
    category: string | null;
  };
  session: {
    id: string;
    title: string;
    durationMinutes: number;
    _count: { questions: number };
  };
  _count: {
    answers: number;
  };
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"MONITORING" | "LEADERBOARD">(
    "MONITORING"
  );

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

  function formatTimeSpent(sec: number | null) {
    if (!sec) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}d`;
  }

  const finishedRankings = [...attempts]
    .filter((a) => a.status !== "IN_PROGRESS")
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (a.timeSpentSeconds || 999999) - (b.timeSpentSeconds || 999999);
    });

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
            onClick={() => loadMonitoring(selectedSessionId)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-3">
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
      </div>

      {activeTab === "MONITORING" ? (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          {attempts.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              Belum ada peserta yang memasukkan token pada sesi ini.
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
                    <th className="p-4">Waktu / Durasi</th>
                    <th className="p-4">Nilai Sementara / Akhir</th>
                    <th className="p-4 text-right">Aksi Kontrol Panitia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {attempts.map((a) => {
                    const totalQ = a.session._count.questions;
                    const answered = a._count.answers;

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
                        </td>

                        <td className="p-4">
                          {a.status === "IN_PROGRESS" ? (
                            a.startedAt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" /> Sedang
                                Mengerjakan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                                Di Halaman Tata Tertib
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-zinc-800 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai (
                              {a.status})
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-zinc-800 text-xs">
                            {answered} / {totalQ} Soal
                          </div>
                          <div className="w-28 h-2 bg-zinc-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{
                                width: `${totalQ > 0
                                  ? Math.min(100, (answered / totalQ) * 100)
                                  : 0
                                  }%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="p-4 text-xs text-zinc-600">
                          {a.status === "IN_PROGRESS" ? (
                            <div>
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
                              Selesai dalam {formatTimeSpent(a.timeSpentSeconds)}
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
                                  onClick={() => handleAction(a.id, "ADD_TIME")}
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
              {attempts.map((a) => {
                const totalQ = a.session._count.questions;
                const answered = a._count.answers;
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
                        {answered} / {totalQ} soal
                      </span>
                      {a.status !== "IN_PROGRESS" ? (
                        <span className="ml-2">
                          {a.finalScore} poin (Soal {a.rawScore} | Speed +
                          {a.speedBonus})
                        </span>
                      ) : a.expiresAt ? (
                        <span className="ml-2">
                          Batas{" "}
                          {new Date(a.expiresAt).toLocaleTimeString("id-ID")}
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
                    <div className="flex gap-2 pt-1">
                      {a.status === "IN_PROGRESS" && a.startedAt && (
                        <>
                          <button
                            onClick={() => handleAction(a.id, "ADD_TIME")}
                            className="flex-1 px-3 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" /> +5m
                          </button>
                          <button
                            onClick={() => handleAction(a.id, "FORCE_SUBMIT")}
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
      ) : (
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
      )}
    </div>
  );
}

