"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  FolderPlus,
  Search,
  X,
} from "lucide-react";

interface OptionForm {
  label: string;
  content: string;
  direction: "RTL" | "LTR";
  isCorrect: boolean;
}

interface QuestionRecord {
  id: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  content: string;
  direction: "RTL" | "LTR";
  weight: number;
  explanation: string | null;
  options: {
    id: string;
    label: string;
    content: string;
    direction: "RTL" | "LTR";
    isCorrect: boolean;
  }[];
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; description: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");

  // Modal Question Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [direction, setDirection] = useState<"RTL" | "LTR">("RTL");
  const [weight, setWeight] = useState(10);
  const [content, setContent] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<OptionForm[]>([
    { label: "A", content: "", direction: "RTL", isCorrect: true },
    { label: "B", content: "", direction: "RTL", isCorrect: false },
    { label: "C", content: "", direction: "RTL", isCorrect: false },
    { label: "D", content: "", direction: "RTL", isCorrect: false },
  ]);
  const [saving, setSaving] = useState(false);

  // New Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/questions");
      const data = await res.json();
      setQuestions(data.questions || []);
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal() {
    setEditingId(null);
    setCategoryId(categories[0]?.id || "");
    setDirection("RTL");
    setWeight(10);
    setContent("");
    setExplanation("");
    setOptions([
      { label: "A", content: "", direction: "RTL", isCorrect: true },
      { label: "B", content: "", direction: "RTL", isCorrect: false },
      { label: "C", content: "", direction: "RTL", isCorrect: false },
      { label: "D", content: "", direction: "RTL", isCorrect: false },
    ]);
    setShowModal(true);
  }

  function openEditModal(q: QuestionRecord) {
    setEditingId(q.id);
    setCategoryId(q.categoryId || "");
    setDirection(q.direction);
    setWeight(q.weight);
    setContent(q.content);
    setExplanation(q.explanation || "");
    setOptions(
      q.options.map((o) => ({
        label: o.label,
        content: o.content,
        direction: o.direction,
        isCorrect: o.isCorrect,
      }))
    );
    setShowModal(true);
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/questions/${editingId}`
        : "/api/admin/questions";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          direction,
          weight: Number(weight),
          content,
          explanation,
          options: options.map((o, idx) => ({
            ...o,
            label: String.fromCharCode(65 + idx),
            direction,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan soal");
        return;
      }

      setShowModal(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Yakin ingin menghapus soal ini dari Bank Soal?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    await loadData();
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    });
    if (res.ok) {
      setNewCatName("");
      setNewCatDesc("");
      setShowCatModal(false);
      await loadData();
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchCat = filterCat === "ALL" || q.categoryId === filterCat;
    const matchSearch =
      !search.trim() ||
      q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.category?.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Manajemen Bank Soal &amp; Bobot
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola soal pilihan ganda berbahasa Arab (RTL) maupun Indonesia
            (LTR) beserta opsi dan bobot nilainya.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCatModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-emerald-700" />
            <span>Kategori Materi</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari teks soal atau nama kategori..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-600"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-emerald-600"
        >
          <option value="ALL">Semua Kategori ({questions.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Memuat bank soal...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
          Belum ada soal pada filter ini. Klik &ldquo;Tambah Soal Baru&rdquo;
          untuk membuat soal.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
                    #{idx + 1}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                    {q.category?.name || "Tanpa Kategori"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
                    Bobot: {q.weight} Poin
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-mono">
                    {q.direction}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(q)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>

              <div
                dir={q.direction === "RTL" ? "rtl" : "ltr"}
                className={`p-4 rounded-xl bg-amber-50/40 border border-amber-200/60 text-slate-900 whitespace-pre-line ${q.direction === "RTL"
                  ? "font-arabic text-2xl text-right"
                  : "text-sm sm:text-base"
                  }`}
              >
                {q.content}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${opt.isCorrect
                      ? "bg-emerald-50 border-emerald-400 text-emerald-950"
                      : "bg-slate-50/70 border-slate-200 text-slate-700"
                      }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${opt.isCorrect
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {opt.label}
                    </span>
                    <span
                      dir={opt.direction === "RTL" ? "rtl" : "ltr"}
                      className={`flex-1 ${opt.direction === "RTL"
                        ? "font-arabic text-xl text-right"
                        : "text-xs sm:text-sm"
                        }`}
                    >
                      {opt.content}
                    </span>
                    {opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah/Edit Soal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Soal Olimpiade" : "Tambah Soal Baru"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Materi
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Arah Teks &amp; Bahasa
                  </label>
                  <select
                    value={direction}
                    onChange={(e) =>
                      setDirection(e.target.value as "RTL" | "LTR")
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="RTL">RTL — Bahasa Arab (Kitab)</option>
                    <option value="LTR">LTR — Bahasa Indonesia / Latin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bobot Nilai Soal (Poin)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teks Pertanyaan Soal
                </label>
                <textarea
                  rows={4}
                  required
                  dir={direction === "RTL" ? "rtl" : "ltr"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    direction === "RTL"
                      ? "اكتب نص السؤال هنا..."
                      : "Ketik pertanyaan soal di sini..."
                  }
                  className={`w-full p-3.5 rounded-xl border border-slate-300 outline-none focus:border-emerald-600 ${direction === "RTL"
                    ? "font-arabic text-2xl text-right"
                    : "text-sm"
                    }`}
                />
              </div>

              {/* Opsi Jawaban */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Opsi Pilihan Ganda (Klik bulatan untuk menentukan Kunci
                    Jawaban Benar)
                  </label>
                  {options.length < 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) => [
                          ...prev,
                          {
                            label: String.fromCharCode(65 + prev.length),
                            content: "",
                            direction,
                            isCorrect: false,
                          },
                        ])
                      }
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      + Tambah Opsi E
                    </button>
                  )}
                </div>

                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${opt.isCorrect
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) =>
                          prev.map((o, i) => ({
                            ...o,
                            isCorrect: i === idx,
                          }))
                        )
                      }
                      className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer ${opt.isCorrect
                        ? "bg-emerald-700 text-white"
                        : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      title="Jadikan Kunci Jawaban"
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>

                    <input
                      type="text"
                      required
                      dir={direction === "RTL" ? "rtl" : "ltr"}
                      value={opt.content}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((o, i) =>
                            i === idx ? { ...o, content: e.target.value } : o
                          )
                        )
                      }
                      placeholder={`Teks opsi ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none ${direction === "RTL"
                        ? "font-arabic text-xl text-right"
                        : "text-sm"
                        }`}
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Ta&apos;bir Pembahasan (Opsional untuk Admin)
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Referensi kitab / penjelasan singkat jawaban benar"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kategori */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Tambah Kategori Materi (Fan Ilmu)
              </h3>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kategori / Fan
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: Ilmu Ushul Fiqih (أصول الفقه)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Kitab
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Deskripsi singkat"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Tambah Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

