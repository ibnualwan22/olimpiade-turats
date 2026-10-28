import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  BookOpen,
  KeyRound,
  BookMarked,
  Timer,
  Trophy,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// Halaman ini membaca cookie sesi lalu redirect, jadi tidak bisa di-prerender.
// Panduan resmi Next.js (cache-components): tandai segmen ini boleh blocking.
export const instant = false;

const FIELDS = [
  {
    name: "Nahwu",
    arabic: "النَّحْوُ",
    desc: "Kaidah i'rab, marfu'at, manshubat, dan syarah Alfiyah Ibnu Malik.",
  },
  {
    name: "Sharaf",
    arabic: "الصَّرْفُ",
    desc: "Tasrif dan pembentukan kata dalam bahasa Arab.",
  },
  {
    name: "Fiqih",
    arabic: "الْفِقْهُ",
    desc: "Ketentuan ibadah dan muamalah dari kitab-kitab fikih.",
  },
  {
    name: "Balaghah",
    arabic: "الْبَلَاغَةُ",
    desc: "Keindahan dan ketepatan berbahasa Arab.",
  },
];

const STEPS = [
  {
    no: "01",
    title: "Login & Token",
    desc: "Masuk dengan akun peserta, lalu masukkan token sesi yang diberikan panitia.",
  },
  {
    no: "02",
    title: "Baca Tata Tertib",
    desc: "Pahami aturan bobot soal, durasi, dan tata tertib sebelum menekan tombol mulai.",
  },
  {
    no: "03",
    title: "Kerjakan & Dinilai",
    desc: "Jawaban tepat menambah skor, dan kecepatan pengerjaan memberikan nilai tambah.",
  },
];

const SCORING = [
  {
    icon: BookMarked,
    title: "Bobot per Soal",
    desc: "Setiap soal memiliki bobot poin yang diatur panitia pada tiap sesi.",
  },
  {
    icon: Timer,
    title: "Penalti Jawaban Salah",
    desc: "Sistem minus dapat diaktifkan per sesi sebagai penalti jawaban yang salah.",
  },
  {
    icon: Trophy,
    title: "Bonus Kecepatan",
    desc: "Menyelesaikan ujian lebih cepat dengan jawaban tepat memberikan nilai tambah.",
  },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.role === "ADMIN") {
      redirect("/admin");
    }
    redirect("/exam");
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      {/* Navigasi */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-bold tracking-tight">
                Olimpiade Turats
              </span>
              <span className="block text-xs text-zinc-500">
                CBT Kitab Kuning
              </span>
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a href="#bidang" className="hover:text-zinc-900">
              Bidang
            </a>
            <a href="#alur" className="hover:text-zinc-900">
              Alur
            </a>
            <a href="#penilaian" className="hover:text-zinc-900">
              Penilaian
            </a>
          </nav>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm transition"
          >
            Masuk
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-zinc-900 text-white border-t-2 border-amber-400">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Computer-Based Test &bull; Olimpiade Turats 2026
            </p>
            <p
              dir="rtl"
              className="font-arabic text-2xl sm:text-3xl text-amber-300/90 mt-6"
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mt-4">
              Olimpiade Turats
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mt-4">
              Kompetisi dan ujian berbasis komputer untuk kitab kuning —
              Nahwu, Sharaf, Fiqih, dan Balaghah — dengan sistem token sesi,
              hitung mundur waktu server, dan penilaian kecepatan pengerjaan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/login"
                className="px-6 py-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                Masuk ke Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#alur"
                className="px-6 py-3.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-white font-semibold text-sm flex items-center justify-center transition"
              >
                Lihat Alur Ujian
              </a>
            </div>
          </div>
        </section>

        {/* Bidang */}
        <section id="bidang" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
            Bidang yang Diujikan
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Empat bidang ilmu alat dan syariah
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 mt-2 max-w-2xl">
            Soal pilihan ganda berbahasa Arab, dalam dua jenjang: Ulya
            (Tingkat Atas) dan Wustha (Tingkat Menengah).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {FIELDS.map((f) => (
              <div
                key={f.name}
                className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-amber-400 transition"
              >
                <p dir="rtl" className="font-arabic text-2xl text-amber-600">
                  {f.arabic}
                </p>
                <h3 className="font-bold mt-3">{f.name}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Alur */}
        <section id="alur" className="bg-zinc-50 border-y border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              Alur Mengikuti
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
              Tiga langkah menuju ruang ujian
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {STEPS.map((s) => (
                <div
                  key={s.no}
                  className="rounded-xl border border-zinc-200 bg-white p-5"
                >
                  <div className="text-2xl font-black text-amber-500">
                    {s.no}
                  </div>
                  <h3 className="font-bold mt-2 flex items-center gap-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-zinc-500 mt-6 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              Token sesi dibagikan oleh panitia dan hanya berlaku untuk sesi
              yang sedang aktif.
            </p>
          </div>
        </section>

        {/* Penilaian */}
        <section
          id="penilaian"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
            Sistem Penilaian
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Nilai akhir yang transparan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {SCORING.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="rounded-xl border border-zinc-200 bg-white p-5"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold mt-3">{s.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
          <ul className="mt-6 space-y-2 text-sm text-zinc-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              Waktu pengerjaan dihitung dari server, bukan dari perangkat
              peserta.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              Jawaban tersimpan otomatis selama ujian berlangsung.
            </li>
          </ul>
        </section>

        {/* CTA penutup */}
        <section className="bg-zinc-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Siap mengikuti olimpiade?
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Masuk dengan akun peserta dan token sesi dari panitia.
              </p>
            </div>
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition shrink-0"
            >
              Masuk ke Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            Olimpiade Turats — Sistem Ujian &amp; Kompetisi Kitab Kuning (CBT)
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-amber-700 hover:text-amber-600"
          >
            Masuk
          </Link>
        </div>
      </footer>
    </div>
  );
}
