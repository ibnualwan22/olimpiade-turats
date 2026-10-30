"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, KeyRound, User, ArrowRight } from "lucide-react";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Site key tertanam saat build (NEXT_PUBLIC_). Tanpa ini widget tidak
  // dirender dan server akan menolak login dengan pesan yang jelas.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // Muat skrip Turnstile sekali, lalu render widget secara eksplisit.
  // Token hanya berlaku sekali: setiap login gagal me-reset widget
  // supaya percobaan berikutnya mendapat token baru.
  useEffect(() => {
    if (!siteKey) return;
    const renderWidget = () => {
      const turnstile = (window as unknown as { turnstile?: TurnstileApi })
        .turnstile;
      if (
        turnstile &&
        widgetRef.current &&
        !widgetRef.current.hasChildNodes()
      ) {
        widgetIdRef.current = turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
        });
      }
    };
    const existing = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) {
        renderWidget();
      } else {
        existing.addEventListener("load", renderWidget);
      }
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.body.appendChild(script);
  }, [siteKey]);

  function resetTurnstile() {
    setTurnstileToken(null);
    const turnstile = (window as unknown as { turnstile?: TurnstileApi })
      .turnstile;
    if (turnstile) {
      turnstile.reset(widgetIdRef.current ?? undefined);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        setLoading(false);
        resetTurnstile();
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white text-zinc-900">
      {/* Left Hero Panel */}
      <div className="order-2 lg:order-1 lg:w-7/12 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-white border-b lg:border-b-0 lg:border-r border-zinc-200">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-medium mb-8">
            <BookOpen className="w-4 h-4" />
            <span>Computer-Based Test (CBT) • Olimpiade Turats 2026</span>
          </div>

          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight mb-6">
            Olimpiade Nahwu &amp; Shorof{" "}
            <span className="text-yellow-700">Nasional</span>
          </h1>

          <p className="text-zinc-600 text-base lg:text-lg max-w-xl leading-relaxed">
            Sistem ujian pilihan ganda berbasis kitab kuning untuk satu bidang lomba Nahwu Shorof (Kitab Al-Jurumiyah dan Amtsilatu Tasrifiyyah), dengan sistem token sesi, hitung mundur waktu server, 50 soal pilihan ganda, dan nilai maksimal 100.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-yellow-700 font-bold text-sm mb-1">
              1. Login &amp; Token
            </div>
            <p className="text-xs text-zinc-600">
              Masuk dengan akun peserta lalu masukkan token sesi perlombaan.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-yellow-700 font-bold text-sm mb-1">
              2. Baca Tata Tertib
            </div>
            <p className="text-xs text-zinc-600">
              Pahami jumlah soal dan durasi sesi sebelum menekan tombol Mulai Ujian.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-yellow-700 font-bold text-sm mb-1">
              3. Skor Tertinggi
            </div>
            <p className="text-xs text-zinc-600">
              Nilai tertinggi menang; nilai sama ditentukan peserta yang lebih dulu selesai.
            </p>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="order-1 lg:order-2 lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-zinc-50 text-zinc-900">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-zinc-200/80 p-8">
          <img
            src="/images/logo-markaz-turats.jpg"
            alt="Logo Markaz Turats"
            className="h-16 w-auto mx-auto mb-4"
          />
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
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username / nomor peserta"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none text-sm transition"
                />
              </div>
            </div>

            {siteKey ? (
              <div id="turnstile-widget" ref={widgetRef} className="flex justify-center" />
            ) : (
              <p className="text-xs text-red-600 text-center">
                Verifikasi keamanan belum dikonfigurasi — hubungi panitia.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 transition cursor-pointer"
            >
              <span>{loading ? "Memverifikasi..." : "Masuk Sekarang"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

