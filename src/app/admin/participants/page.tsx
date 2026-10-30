"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, Users } from "lucide-react";

interface ParticipantUser {
  id: string;
  username: string;
  name: string;
  institution: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  emailLogs: { status: string; createdAt: string }[];
  _count: { attempts: number };
}

interface PreviewRow {
  index: number;
  name: string;
  email: string;
  institution: string;
  username: string;
  status: string;
  userId?: string;
  errors: string[];
}

function sendStatus(p: ParticipantUser): string {
  const latest = p.emailLogs?.[0];
  if (!latest) return "Belum dikirim";
  return latest.status === "SENT" ? "Terkirim" : "Gagal";
}

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const [batchLimit, setBatchLimit] = useState(50);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?role=PARTICIPANT");
      const data = await res.json();
      setParticipants(data.users || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal() {
    setEditingId(null);
    setUsername(`peserta0${participants.length + 1}`);
    setName("");
    setPassword("peserta123");
    setInstitution("");
    setEmail("");
    setPhone("");
    setIsActive(true);
    setShowModal(true);
  }

  function openEditModal(p: ParticipantUser) {
    setEditingId(p.id);
    setUsername(p.username);
    setName(p.name);
    setPassword("");
    setInstitution(p.institution || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setIsActive(p.isActive);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/users/${editingId}`
        : "/api/admin/users";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          name,
          password,
          role: "PARTICIPANT",
          institution,
          email,
          phone,
          isActive,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan peserta");
        return;
      }

      setShowModal(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus akun peserta ini?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await loadData();
  }

  async function handlePreviewUpload() {
    if (!importFile) return;
    setImporting(true);
    setPreviewError("");
    setImportResult("");
    try {
      const form = new FormData();
      form.append("file", importFile);
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || "Gagal membaca file Excel");
        setPreviewRows(null);
        return;
      }
      setPreviewRows(data.rows || []);
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmImport() {
    if (!previewRows) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: previewRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mengimpor peserta");
        return;
      }
      const skippedText =
        data.skipped?.length > 0
          ? `, dilewati ${data.skipped.length}`
          : "";
      setImportResult(
        `Impor selesai: ${data.created} dibuat, ${data.updated} email ditambahkan${skippedText}.`
      );
      setPreviewRows(null);
      setImportFile(null);
      await loadData();
    } finally {
      setImporting(false);
    }
  }

  async function handleSendBatch() {
    setSendingBatch(true);
    setBatchResult("");
    try {
      const res = await fetch("/api/admin/users/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: batchLimit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchResult(data.error || "Gagal mengirim batch");
        return;
      }
      const failedText =
        data.failed > 0
          ? ` Gagal: ${data.failed} (${data.failedUsers
              .map((f: { username: string }) => f.username)
              .join(", ")}).`
          : "";
      setBatchResult(
        `Batch selesai: ${data.sent} dari ${data.total} terkirim.${failedText}`
      );
      await loadData();
    } finally {
      setSendingBatch(false);
    }
  }

  async function handleResend(id: string, username: string) {
    if (
      !confirm(
        `Kirim ulang kredensial ke ${username}? Password baru akan dibuat dan password lama tidak berlaku lagi.`
      )
    )
      return;
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/resend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mengirim ulang");
        return;
      }
      alert("Kredensial baru berhasil dikirim ke email peserta.");
      await loadData();
    } finally {
      setResendingId(null);
    }
  }

  const filtered = participants.filter(
    (p) =>
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.institution || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">
            Daftar Peserta Olimpiade
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Kelola akun login peserta, asal pesantren/instansi, dan kategori
            perlombaan.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Peserta Baru</span>
        </button>
      </div>

      {/* Impor & Kirim */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-extrabold text-zinc-900">
            Impor Peserta dari Excel &amp; Kirim Kredensial
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Impor hanya membuat akun (username, email, asal). Password acak
            dibuat saat kirim email, bukan saat impor, dan tidak bisa dilihat
            lagi setelah terkirim. Kirim ulang berarti password baru; password
            lama tidak berlaku lagi. Hanya akun aktif yang dikirim.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="/api/admin/users/import-template"
            className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold text-center cursor-pointer"
          >
            Unduh Template Excel
          </a>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] || null);
              setPreviewRows(null);
              setPreviewError("");
            }}
            className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs"
          />
          <button
            onClick={handlePreviewUpload}
            disabled={!importFile || importing}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {importing ? "Memproses..." : "Pratinjau Impor"}
          </button>
        </div>

        {previewError && (
          <p className="text-xs font-bold text-red-600">{previewError}</p>
        )}
        {importResult && (
          <p className="text-xs font-bold text-emerald-700">{importResult}</p>
        )}

        {previewRows && (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-500">
                    <th className="p-2.5">Baris</th>
                    <th className="p-2.5">Nama</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Asal</th>
                    <th className="p-2.5">Username</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      <td className="p-2.5">{r.index}</td>
                      <td className="p-2.5 font-bold">{r.name || "-"}</td>
                      <td className="p-2.5">{r.email || "-"}</td>
                      <td className="p-2.5">{r.institution || "-"}</td>
                      <td className="p-2.5 font-mono">{r.username || "-"}</td>
                      <td className="p-2.5">
                        {r.status === "baru" && "Baru"}
                        {r.status === "sudah_ada" && "Sudah ada (dilewati)"}
                        {r.status === "tambah_email" &&
                          "Tambah email ke akun lama"}
                        {r.status === "error" && (
                          <span className="text-red-600 font-bold">
                            {r.errors.join("; ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPreviewRows(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {importing ? "Mengimpor..." : "Konfirmasi & Buat Akun"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-zinc-200 pt-4">
          <label className="text-xs font-bold text-zinc-700">
            Kirim batch (yang belum terkirim):
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={batchLimit}
            onChange={(e) => setBatchLimit(Number(e.target.value) || 50)}
            className="w-24 px-3 py-2 rounded-xl border border-zinc-200 text-xs"
          />
          <button
            onClick={handleSendBatch}
            disabled={sendingBatch}
            className="px-4 py-2 rounded-xl bg-yellow-700 hover:bg-yellow-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {sendingBatch ? "Mengirim..." : "Kirim Batch"}
          </button>
        </div>
        {batchResult && (
          <p className="text-xs font-bold text-zinc-700">{batchResult}</p>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -tranzinc-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama peserta, username, atau asal pesantren/sekolah..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 text-sm outline-none focus:border-yellow-500"
          />
        </div>
        <div className="text-xs font-bold text-zinc-500 px-2 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-yellow-700" />
          <span>{filtered.length} Peserta</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            Memuat daftar peserta...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            Tidak ada peserta yang ditemukan.
          </div>
        ) : (
          <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <th className="p-4">Username / No. Peserta</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Asal Pesantren / Instansi</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status Kirim</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi CRUD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/80">
                    <td className="p-4 font-mono font-bold text-zinc-800">
                      {p.username}
                    </td>
                    <td className="p-4 font-bold text-zinc-900">{p.name}</td>
                    <td className="p-4 text-zinc-600">
                      {p.institution || "-"}
                    </td>
                    <td className="p-4 text-zinc-600">{p.email || "-"}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sendStatus(p) === "Terkirim"
                            ? "bg-emerald-100 text-emerald-800"
                            : sendStatus(p) === "Gagal"
                              ? "bg-red-100 text-red-700"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {sendStatus(p)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.isActive
                            ? "bg-emerald-100 text-zinc-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleResend(p.id, p.username)}
                          disabled={
                            resendingId === p.id || !p.email || !p.isActive
                          }
                          title={
                            !p.email
                              ? "Belum ada email"
                              : !p.isActive
                                ? "Akun nonaktif"
                                : "Kirim ulang (password baru)"
                          }
                          className="px-3 py-1.5 rounded-lg border border-yellow-700/30 hover:bg-yellow-50 text-yellow-800 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {resendingId === p.id
                            ? "Mengirim..."
                            : "Kirim Ulang"}
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-zinc-100">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 truncate">
                        {p.name}
                      </div>
                      <div className="font-mono text-xs font-bold text-zinc-600">
                        {p.username}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {p.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {p.institution || "-"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {p.email || "Belum ada email"} · Kirim: {sendStatus(p)}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleResend(p.id, p.username)}
                      disabled={
                        resendingId === p.id || !p.email || !p.isActive
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-yellow-700/30 text-yellow-800 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {resendingId === p.id ? "Mengirim..." : "Kirim Ulang"}
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
          )}
      </div>

      {/* Modal Peserta */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h2 className="text-lg font-bold text-zinc-900">
                {editingId ? "Edit Data Peserta" : "Tambah Peserta Baru"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Username / Nomor Peserta
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Password{" "}
                    {editingId && (
                      <span className="font-normal text-zinc-400">
                        (Kosongkan jika tetap)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required={!editingId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      editingId ? "Ketik untuk ganti password" : "Password login"
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Nama Lengkap Peserta
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap sesuai identitas"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Asal Pondok Pesantren / Sekolah / Instansi
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: PP. Lirboyo Kediri"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Email Peserta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    No. WhatsApp / Kontak
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-zinc-700"
                />
                <span>Izinkan Peserta Ini Login (Status Aktif)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Peserta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

