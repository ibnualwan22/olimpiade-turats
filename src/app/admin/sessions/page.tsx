"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Clock,
  Zap,
  RefreshCw,
  CheckSquare,
  X,
} from "lucide-react";

interface SessionItem {
  id: string;
  title: string;
  description: string | null;
  rulesContent: string;
  accessToken: string;
  durationMinutes: number;
  isActive: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  wrongPenalty: number;
  speedScoringMode: "BONUS_POINTS" | "TIE_BREAKER";
  maxSpeedBonus: number;
  questions: {
    questionId: string;
    question: {
      id: string;
      content: string;
      weight: number;
      category?: { name: string } | null;
    };
  }[];
  _count: {
    attempts: number;
    questions: number;
  };
}

interface BankQuestion {
  id: string;
  content: string;
  weight: number;
  direction: "RTL" | "LTR";
  category?: { name: string } | null;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rulesContent, setRulesContent] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [isActive, setIsActive] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [wrongPenalty, setWrongPenalty] = useState(0);
  const [speedScoringMode, setSpeedScoringMode] = useState<
    "BONUS_POINTS" | "TIE_BREAKER"
  >("BONUS_POINTS");
  const [maxSpeedBonus, setMaxSpeedBonus] = useState(20);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [sesRes, qRes] = await Promise.all([
        fetch("/api/admin/sessions"),
        fetch("/api/admin/questions"),
      ]);
      const sesData = await sesRes.json();
      const qData = await qRes.json();
      setSessions(sesData.sessions || []);
      setBankQuestions(qData.questions || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function generateRandomToken() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "TRT";
    for (let i = 0; i < 5; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessToken(token);
  }

  function openCreateModal() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setRulesContent(
      `1. Peserta wajib membaca Basmalah dan berdoa sebelum memulai perlombaan.\n2. Waktu pengerjaan dimulai otomatis saat tombol "Mulai Kerjakan Sekarang" ditekan.\n3. Setiap soal memiliki bobot nilai tersendiri.\n4. Peserta yang selesai lebih cepat dengan jawaban tepat akan mendapat Bonus Poin Kecepatan.\n5. Dilarang membuka kitab/kamus atau bekerja sama selama ujian.`
    );
    generateRandomToken();
    setDurationMinutes(45);
    setIsActive(true);
    setShuffleQuestions(true);
    setWrongPenalty(0);
    setSpeedScoringMode("BONUS_POINTS");
    setMaxSpeedBonus(20);
    setSelectedQuestionIds(bankQuestions.map((q) => q.id));
    setShowModal(true);
  }

  function openEditModal(s: SessionItem) {
    setEditingId(s.id);
    setTitle(s.title);
    setDescription(s.description || "");
    setRulesContent(s.rulesContent);
    setAccessToken(s.accessToken);
    setDurationMinutes(s.durationMinutes);
    setIsActive(s.isActive);
    setShuffleQuestions(s.shuffleQuestions);
    setWrongPenalty(s.wrongPenalty);
    setSpeedScoringMode(s.speedScoringMode);
    setMaxSpeedBonus(s.maxSpeedBonus);
    setSelectedQuestionIds(s.questions.map((sq) => sq.questionId));
    setShowModal(true);
  }

  function toggleQuestionSelection(qId: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  }

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/sessions/${editingId}`
        : "/api/admin/sessions";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          rulesContent,
          accessToken,
          durationMinutes: Number(durationMinutes),
          isActive,
          shuffleQuestions,
          wrongPenalty: Number(wrongPenalty),
          speedScoringMode,
          maxSpeedBonus: Number(maxSpeedBonus),
          questionIds: selectedQuestionIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan sesi");
        return;
      }

      setShowModal(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession(id: string) {
    if (!confirm("Yakin ingin menghapus sesi ujian ini beserta data pesertanya?"))
      return;
    await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Manajemen Sesi Ujian, Token &amp; Regulasi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Atur sesi perlombaan, kode token masuk, teks tata tertib, durasi,
            dan rumus penilaian kecepatan.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi Ujian Baru</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Memuat daftar sesi...
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
          Belum ada sesi ujian.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        s.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {s.isActive ? "Sesi Aktif / Dibuka" : "Ditutup"}
                    </span>
                    <span className="px-3 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-mono font-bold text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      TOKEN: {s.accessToken}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 pt-1">
                    {s.title}
                  </h2>
                  {s.description && (
                    <p className="text-xs sm:text-sm text-slate-500">
                      {s.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(s)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Sesi &amp; Soal
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="px-3.5 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Durasi Timer
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {s.durationMinutes} Menit
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> Soal Terhubung
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {s._count.questions} Soal ({s.shuffleQuestions ? "Diacak" : "Urut"})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="text-[11px] text-amber-800 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Mode Kecepatan
                  </div>
                  <div className="text-sm font-bold text-amber-950 mt-0.5">
                    {s.speedScoringMode === "BONUS_POINTS"
                      ? `Bonus Poin (Max +${s.maxSpeedBonus})`
                      : "Penentu Seri (Tie-Breaker)"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">
                    Peserta Mengikuti
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {s._count.attempts} Peserta
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Sesi */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Sesi Ujian & Regulasi" : "Buat Sesi Ujian Baru"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Sesi Perlombaan
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Babak Penyisihan Olimpiade Turats 2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Token Masuk Sesi
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={accessToken}
                      onChange={(e) =>
                        setAccessToken(e.target.value.toUpperCase())
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={generateRandomToken}
                      title="Acak Token"
                      className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Sesi
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat sesi ujian"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {/* Pengaturan Waktu & Regulasi Skor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Durasi Waktu (Menit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mode Penilaian Kecepatan
                  </label>
                  <select
                    value={speedScoringMode}
                    onChange={(e) =>
                      setSpeedScoringMode(
                        e.target.value as "BONUS_POINTS" | "TIE_BREAKER"
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  >
                    <option value="BONUS_POINTS">
                      Bonus Poin Kecepatan Proporsional
                    </option>
                    <option value="TIE_BREAKER">
                      Tie-Breaker (Penentu Saat Skor Seri)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maksimal Bonus Kecepatan
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={maxSpeedBonus}
                    onChange={(e) => setMaxSpeedBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pengurangan Jawaban Salah (Minus)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={wrongPenalty}
                    onChange={(e) => setWrongPenalty(Number(e.target.value))}
                    placeholder="0 = Tanpa Minus"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>Acak Urutan Soal per Peserta</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>Buka / Aktifkan Sesi Ini</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teks Tata Tertib (Ditampilkan sebelum Peserta klik Mulai)
                </label>
                <textarea
                  rows={4}
                  required
                  value={rulesContent}
                  onChange={(e) => setRulesContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>

              {/* Pilih Soal untuk Sesi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Soal yang Dimasukkan ke Sesi Ini (
                    {selectedQuestionIds.length} dari {bankQuestions.length} soal
                    dipilih)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedQuestionIds(
                        selectedQuestionIds.length === bankQuestions.length
                          ? []
                          : bankQuestions.map((q) => q.id)
                      )
                    }
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {selectedQuestionIds.length === bankQuestions.length
                      ? "Hapus Semua Pilihan"
                      : "Pilih Semua Soal"}
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {bankQuestions.map((q) => {
                    const checked = selectedQuestionIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className="p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleQuestionSelection(q.id)}
                          className="w-4 h-4 accent-emerald-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-emerald-700">
                              {q.category?.name || "Umum"}
                            </span>
                            <span>•</span>
                            <span>Bobot {q.weight} Poin</span>
                          </div>
                          <div
                            dir={q.direction === "RTL" ? "rtl" : "ltr"}
                            className={`truncate text-slate-800 ${
                              q.direction === "RTL"
                                ? "font-arabic text-lg"
                                : "text-xs"
                            }`}
                          >
                            {q.content}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Sesi Ujian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

