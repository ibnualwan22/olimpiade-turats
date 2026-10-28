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
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-900 text-white">
      {/* Left Hero Panel */}
      <div className="order-2 lg:order-1 lg:w-7/12 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-800/50">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm font-medium mb-8">
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

          <p className="text-zinc-200/80 text-base lg:text-lg max-w-xl leading-relaxed">
            Sistem ujian pilihan ganda berbasis kitab kuning (Nahwu, Sharaf,
            Fiqih, &amp; Balaghah) dengan sistem token sesi, hitung mundur waktu
            server, dan penilaian kecepatan pengerjaan (*Speed Bonus*).
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700">
            <div className="text-amber-400 font-bold text-sm mb-1">
              1. Login &amp; Token
            </div>
            <p className="text-xs text-zinc-200/70">
              Masuk dengan akun peserta lalu masukkan token sesi perlombaan.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700">
            <div className="text-amber-400 font-bold text-sm mb-1">
              2. Baca Tata Tertib
            </div>
            <p className="text-xs text-zinc-200/70">
              Pahami aturan bobot soal sebelum menekan tombol Mulai Ujian.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700">
            <div className="text-amber-400 font-bold text-sm mb-1">
              3. Skor + Kecepatan
            </div>
            <p className="text-xs text-zinc-200/70">
              Selesai lebih cepat dengan jawaban tepat memberikan nilai tambah.
            </p>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="order-1 lg:order-2 lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-zinc-50 text-zinc-900">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-zinc-200/80 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">
              Masuk ke Akun Anda
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Username / Nomor Peserta
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -tranzinc-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: peserta01 atau admin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -tranzinc-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition cursor-pointer"
            >
              <span>{loading ? "Memverifikasi..." : "Masuk Sekarang"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credential Helper */}
          <div className="mt-8 pt-6 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AKUN DEMO CEPAT (KLIK UNTUK ISI OTOMATIS):</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemo("peserta01", "peserta123")}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-emerald-100/70 text-left transition cursor-pointer"
              >
                <div className="text-xs font-bold text-zinc-900">
                  Peserta 01
                </div>
                <div className="text-xs text-amber-700">
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
                <div className="text-xs text-amber-800">
                  admin / admin123
                </div>
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500 text-center">
              Token Sesi Ujian Aktif:{" "}
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                TURATS2026
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

