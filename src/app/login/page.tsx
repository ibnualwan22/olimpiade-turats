"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, KeyRound, User, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        setLoading(false);
        return;
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/exam");
      }
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server");
      setLoading(false);
    }
  }

  function fillDemo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-emerald-950 text-white">
      {/* Left Hero Panel */}
      <div className="lg:w-7/12 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 border-b lg:border-b-0 lg:border-r border-emerald-800/50">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-800/40 border border-emerald-600/30 text-amber-300 text-sm font-medium mb-8">
            <BookOpen className="w-4 h-4" />
            <span>Computer-Based Test (CBT) • Olimpiade Turats 2026</span>
          </div>

          <p
            dir="rtl"
            className="font-arabic text-3xl lg:text-4xl text-amber-300/90 mb-4"
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>

          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Portal Kompetisi &amp; Ujian{" "}
            <span className="text-amber-400">Olimpiade Turats</span>
          </h1>

          <p className="text-emerald-100/80 text-base lg:text-lg max-w-xl leading-relaxed">
            Sistem ujian pilihan ganda berbasis kitab kuning (Nahwu, Sharaf,
            Fiqih, &amp; Balaghah) dengan sistem token sesi, hitung mundur waktu
            server, dan penilaian kecepatan pengerjaan (*Speed Bonus*).
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-amber-400 font-bold text-sm mb-1">
              1. Login &amp; Token
            </div>
            <p className="text-xs text-emerald-100/70">
              Masuk dengan akun peserta lalu masukkan token sesi perlombaan.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-amber-400 font-bold text-sm mb-1">
              2. Baca Tata Tertib
            </div>
            <p className="text-xs text-emerald-100/70">
              Pahami aturan bobot soal sebelum menekan tombol Mulai Ujian.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-amber-400 font-bold text-sm mb-1">
              3. Skor + Kecepatan
            </div>
            <p className="text-xs text-emerald-100/70">
              Selesai lebih cepat dengan jawaban tepat memberikan nilai tambah.
            </p>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Masuk ke Akun Anda
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Gunakan Username / Nomor Peserta dan Password Anda
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Username / Nomor Peserta
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: peserta01 atau admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition cursor-pointer"
            >
              <span>{loading ? "Memverifikasi..." : "Masuk Sekarang"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credential Helper */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AKUN DEMO CEPAT (KLIK UNTUK ISI OTOMATIS):</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemo("peserta01", "peserta123")}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition cursor-pointer"
              >
                <div className="text-xs font-bold text-emerald-900">
                  Peserta 01
                </div>
                <div className="text-[11px] text-emerald-700">
                  peserta01 / peserta123
                </div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin", "admin123")}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-left transition cursor-pointer"
              >
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin Panitia
                </div>
                <div className="text-[11px] text-amber-800">
                  admin / admin123
                </div>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 text-center">
              Token Sesi Ujian Aktif:{" "}
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                TURATS2026
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

