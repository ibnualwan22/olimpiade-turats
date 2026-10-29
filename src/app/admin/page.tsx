"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarClock,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalCategories: 0,
    totalSessions: 0,
    activeSessions: 0,
    totalParticipants: 0,
    totalAdmins: 0,
    totalAttempts: 0,
    inProgressAttempts: 0,
    finishedAttempts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 403 || res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const cards = [
    {
      title: "Total Bank Soal",
      value: stats.totalQuestions,
      sub: `${stats.totalCategories} Kategori Materi`,
      href: "/admin/questions",
      icon: BookOpen,
      color: "bg-zinc-100 text-zinc-700",
    },
    {
      title: "Sesi Perlombaan",
      value: stats.totalSessions,
      sub: `${stats.activeSessions} Sesi Aktif`,
      href: "/admin/sessions",
      icon: CalendarClock,
      color: "bg-orange-100 text-orange-800",
    },
    {
      title: "Peserta Terdaftar",
      value: stats.totalParticipants,
      sub: `${stats.totalAdmins} Admin Panitia`,
      href: "/admin/participants",
      icon: Users,
      color: "bg-zinc-100 text-zinc-700",
    },
    {
      title: "Monitoring Ujian",
      value: stats.inProgressAttempts,
      sub: `${stats.finishedAttempts} Peserta Selesai`,
      href: "/admin/monitoring",
      icon: Activity,
      color: "bg-zinc-100 text-zinc-700",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
          Dashboard Pusat Olimpiade Turats
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kelola bank soal berbahasa Arab, atur sesi &amp; token ujian, pantau
          peserta secara real-time, dan lihat peringkat otomatis.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs hover:border-orange-400 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <div className="text-3xl font-black text-zinc-900">
                  {loading ? "..." : c.value}
                </div>
                <div className="text-sm font-bold text-zinc-700 mt-0.5">
                  {c.title}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{c.sub}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-zinc-800 font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <h2>Alur Persiapan Perlombaan</h2>
          </div>
          <ol className="space-y-3 text-sm text-zinc-600 list-decimal list-inside">
            <li>
              Tambahkan kategori materi &amp; soal pilihan ganda berbahasa Arab
              beserta bobot poinnya di menu{" "}
              <Link
                href="/admin/questions"
                className="text-orange-700 font-semibold underline"
              >
                Bank Soal &amp; Bobot
              </Link>
              .
            </li>
            <li>
              Buat sesi ujian, atur durasi, **Token Sesi**, tata tertib, dan
              aturan penilaian kecepatan di menu{" "}
              <Link
                href="/admin/sessions"
                className="text-orange-700 font-semibold underline"
              >
                Manajemen Sesi
              </Link>
              .
            </li>
            <li>
              Daftarkan akun peserta di menu{" "}
              <Link
                href="/admin/participants"
                className="text-orange-700 font-semibold underline"
              >
                Daftar Peserta
              </Link>
              .
            </li>
            <li>
              Pantau waktu pengerjaan peserta dan lihat papan peringkat otomatis
              di menu{" "}
              <Link
                href="/admin/monitoring"
                className="text-orange-700 font-semibold underline"
              >
                Monitoring &amp; Peringkat
              </Link>
              .
            </li>
          </ol>
        </div>

        <div className="bg-zinc-900 text-white rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-300">
              <Clock className="w-4 h-4" /> Regulasi Fleksibel
            </div>
            <h2 className="text-xl font-bold">
              Siap Menyesuaikan Regulasi Olimpiade Kapan Saja
            </h2>
            <p className="text-xs sm:text-sm text-zinc-200/80 leading-relaxed">
              Setiap sesi memiliki pengaturan independen untuk: Bobot per Soal,
              Penalti Jawaban Salah (Sistem Minus), Acak Soal, serta Mode Skor
              Kecepatan (Bonus Poin Proporsional atau Penentu Seri / Tie-Breaker).
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800 flex flex-wrap gap-3">
            <Link
              href="/admin/sessions"
              className="px-4 py-2 rounded-xl bg-orange-400 hover:bg-orange-300 text-zinc-950 font-bold text-xs transition"
            >
              Atur Sesi &amp; Token
            </Link>
            <Link
              href="/admin/monitoring"
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition"
            >
              Buka Live Monitoring
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

