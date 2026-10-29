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
  LogIn,
  ShieldCheck,
  Clock,
  Award,
} from "lucide-react";

// Halaman ini membaca cookie sesi lalu redirect, jadi tidak bisa di-prerender.
// Panduan resmi Next.js (cache-components): tandai segmen ini boleh blocking.
export const instant = false;

const FIELDS = [
  {
    code: "01",
    name: "Nahwu",
    level: "Ulya & Wustha",
    arabic: "النَّحْوُ",
    desc: "Kaidah i'rab, marfu'at, manshubat, serta syarah Alfiyah Ibnu Malik dan Jurumiyah.",
  },
  {
    code: "02",
    name: "Sharaf",
    level: "Ulya & Wustha",
    arabic: "الصَّرْفُ",
    desc: "Tasrif istilahi dan lughawi, bina', i'lal, serta pembentukan kata bahasa Arab.",
  },
  {
    code: "03",
    name: "Fiqih",
    level: "Ulya & Wustha",
    arabic: "الْفِقْهُ",
    desc: "Ketentuan thaharah, ibadah, dan muamalah berdasarkan kitab-kitab fikih mu'tabarah.",
  },
  {
    code: "04",
    name: "Balaghah",
    level: "Ulya & Wustha",
    arabic: "الْبَلَاغَةُ",
    desc: "Ilmu ma'ani, bayan, dan badi' untuk ketepatan serta keindahan sastra Arab.",
  },
];

const STEPS = [
  {
    no: "01",
    title: "Login Peserta & Token Sesi",
    desc: "Klik tombol Login Peserta, masuk menggunakan akun resmi, lalu verifikasi token sesi aktif dari panitia.",
  },
  {
    no: "02",
    title: "Verifikasi Tata Tertib",
    desc: "Periksa durasi sesi, jumlah soal, serta aturan bobot dan penalti sebelum memulai ujian.",
  },
  {
    no: "03",
    title: "Kerjakan Ujian & Raih Skor",
    desc: "Jawab soal pilihan ganda berbahasa Arab dengan tepat dan cepat untuk memperoleh Speed Bonus.",
  },
];

const SCORING = [
  {
    icon: BookMarked,
    metric: "+Poin Bobot",
    title: "Bobot Poin Terukur",
    desc: "Setiap butir soal memiliki bobot nilai yang dikonfigurasi secara transparan pada tiap sesi ujian.",
  },
  {
    icon: Timer,
    metric: "Server-Side",
    title: "Kontrol Waktu & Penalti",
    desc: "Hitung mundur berjalan di server untuk menjamin keadilan waktu, disertai opsi penalti jawaban salah.",
  },
  {
    icon: Trophy,
    metric: "+Speed Bonus",
    title: "Bonus Kecepatan",
    desc: "Peserta yang menyelesaikan ujian lebih cepat dengan akurasi tinggi memperoleh poin bonus tambahan.",
  },
];

const STATS = [
  { label: "Bidang Kitab", value: "4 Cabang" },
  { label: "Jenjang Kompetisi", value: "Ulya & Wustha" },
  { label: "Sinkronisasi Waktu", value: "100% Server" },
  { label: "Standar Aksesibilitas", value: "WCAG 2.2 AA" },
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
    <div className="font-design-system min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)] flex flex-col selection:bg-[var(--color-surface-strong)] selection:text-[var(--color-surface-base)]">
      {/* Skip Link untuk aksesibilitas keyboard (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-[var(--space-1)] focus:py-3 focus:rounded-md focus:bg-[var(--color-surface-strong)] focus:text-[var(--color-surface-base)] focus:font-bold focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-text-tertiary)]"
      >
        Lewati ke konten utama
      </a>

      {/* Top Utility Bar (Consulotion Style) */}
      <div className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border-muted)]">
        <div className="max-w-6xl mx-auto px-[var(--space-1)] py-2.5 flex flex-wrap items-center justify-between gap-3 text-base">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--color-surface-strong)]"
              aria-hidden="true"
            />
            <span>
              Portal Resmi CBT Kitab Kuning &bull; Olimpiade Turats 2026
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-[var(--space-1)] text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Clock
                className="w-4 h-4 text-[var(--color-surface-strong)]"
                aria-hidden="true"
              />
              Server Time Sync Aktif
            </span>
            <span aria-hidden="true">|</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck
                className="w-4 h-4 text-[var(--color-surface-strong)]"
                aria-hidden="true"
              />
              Sistem Token Terenkripsi
            </span>
          </div>
        </div>
      </div>

      {/* Primary Navigation (Navigation 1 of 2 per DESIGN.md) */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface-base)]/95 backdrop-blur border-b border-[var(--color-border-muted)]">
        <div className="max-w-6xl mx-auto px-[var(--space-1)] min-h-[76px] flex items-center justify-between gap-[var(--space-1)]">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)] transition duration-[200ms]"
          >
            <span className="w-11 h-11 rounded-md bg-[var(--color-surface-strong)] text-[var(--color-surface-base)] flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-extrabold tracking-tight text-[var(--color-text-tertiary)] text-lg leading-tight">
                OLIMPIADE TURATS
              </span>
              <span className="block text-base text-[var(--color-text-secondary)] leading-tight">
                CBT Kitab Kuning Nasional
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-[var(--space-2)] text-base font-medium"
          >
            <a
              href="#bidang"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-tertiary)] active:text-[var(--color-surface-strong)] rounded-sm py-1 transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
            >
              Bidang Uji
            </a>
            <a
              href="#alur"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-tertiary)] active:text-[var(--color-surface-strong)] rounded-sm py-1 transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
            >
              Alur Pelaksanaan
            </a>
            <a
              href="#penilaian"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-tertiary)] active:text-[var(--color-surface-strong)] rounded-sm py-1 transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
            >
              Sistem Penilaian
            </a>
          </nav>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-[var(--space-1)] py-2.5 rounded-md bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-strong-hover)] active:bg-[var(--color-surface-strong-active)] text-[var(--color-surface-base)] font-bold text-base transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-tertiary)]"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Login Peserta</span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section
          aria-labelledby="hero-heading"
          className="relative bg-[var(--color-surface-base)] border-b border-[var(--color-border-muted)]"
        >
          <div className="max-w-6xl mx-auto px-[var(--space-1)] py-[var(--space-2)] lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--space-2)] items-center">
              {/* Left Column: Core Hero Content & "Login Peserta" Button */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-muted)] text-[var(--color-surface-strong)] font-semibold text-base">
                  <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Computer-Based Test (CBT) &bull; Edisi 2026</span>
                </div>

                <p
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-2xl sm:text-3xl text-[var(--color-surface-strong)] mt-[var(--space-1)]"
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>

                <h1
                  id="hero-heading"
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--color-text-tertiary)] leading-tight mt-3"
                >
                  Kompetisi &amp; Ujian{" "}
                  <span className="text-[var(--color-surface-strong)]">
                    Olimpiade Turats
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mt-[var(--space-1)]">
                  Platform evaluasi kitab kuning terstandarisasi untuk bidang{" "}
                  <strong className="text-[var(--color-text-tertiary)] font-semibold">
                    Nahwu, Sharaf, Fiqih, dan Balaghah
                  </strong>
                  . Dilengkapi validasi token sesi, sinkronisasi waktu server
                  secara real-time, dan kalkulasi nilai berbasis ketepatan serta
                  kecepatan pengerjaan.
                </p>

                {/* Primary Hero CTA: Tombol Login Peserta */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-[var(--space-1)] mt-[var(--space-2)]">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-md bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-strong-hover)] active:bg-[var(--color-surface-strong-active)] text-[var(--color-surface-base)] font-extrabold text-base tracking-wide shadow-lg transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-text-tertiary)]"
                  >
                    <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>Login Peserta</span>
                    <ArrowRight
                      className="w-5 h-5 shrink-0"
                      aria-hidden="true"
                    />
                  </Link>

                  <a
                    href="#alur"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-md bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-muted)]/40 active:bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] font-semibold text-base transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
                  >
                    <span>Lihat Panduan &amp; Alur Ujian</span>
                  </a>
                </div>

                {/* Quick Trust Indicators */}
                <div className="mt-[var(--space-2)] pt-[var(--space-1)] border-t border-[var(--color-border-muted)] grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-1)]">
                  {STATS.map((item) => (
                    <div key={item.label}>
                      <div className="text-lg font-extrabold text-[var(--color-text-tertiary)]">
                        {item.value}
                      </div>
                      <div className="text-base text-[var(--color-text-secondary)]">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Consulotion Structured Status Panel */}
              <div className="lg:col-span-5">
                <div className="rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] p-[var(--space-1)] sm:p-[var(--space-2)]">
                  <div className="flex items-center justify-between pb-[var(--space-1)] border-b border-[var(--color-border-muted)]">
                    <div>
                      <span className="text-base font-bold uppercase tracking-wider text-[var(--color-surface-strong)] block">
                        Akses Ruang Ujian
                      </span>
                      <h2 className="text-xl font-extrabold text-[var(--color-text-tertiary)] mt-1">
                        Kesiapan Sesi Peserta
                      </h2>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-[var(--color-surface-base)] border border-[var(--color-surface-strong)] text-[var(--color-surface-strong)] font-bold text-base">
                      Aktif
                    </span>
                  </div>

                  <ul className="space-y-4 my-[var(--space-1)]">
                    <li className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-5 h-5 text-[var(--color-surface-strong)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-bold text-[var(--color-text-tertiary)] text-base">
                          Akun Peserta Terdaftar
                        </div>
                        <p className="text-base text-[var(--color-text-secondary)]">
                          Gunakan username dan kata sandi yang diterbitkan oleh
                          panitia olimpiade.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <KeyRound
                        className="w-5 h-5 text-[var(--color-surface-strong)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-bold text-[var(--color-text-tertiary)] text-base">
                          Token Sesi Perlombaan
                        </div>
                        <p className="text-base text-[var(--color-text-secondary)]">
                          Token dimasukkan setelah berhasil login untuk membuka
                          soal sesuai gelombang.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Timer
                        className="w-5 h-5 text-[var(--color-surface-strong)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-bold text-[var(--color-text-tertiary)] text-base">
                          Penyimpanan Jawaban Otomatis
                        </div>
                        <p className="text-base text-[var(--color-text-secondary)]">
                          Setiap jawaban langsung tersimpan ke server tanpa
                          risiko hilang saat koneksi terputus.
                        </p>
                      </div>
                    </li>
                  </ul>

                  <div className="pt-[var(--space-1)] border-t border-[var(--color-border-muted)]">
                    <Link
                      href="/login"
                      className="w-full inline-flex items-center justify-center gap-2 px-[var(--space-1)] py-3.5 rounded-md bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-strong-hover)] active:bg-[var(--color-surface-strong-active)] text-[var(--color-surface-base)] font-extrabold text-base transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-tertiary)]"
                    >
                      <LogIn className="w-5 h-5" aria-hidden="true" />
                      <span>Login Peserta Sekarang</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bidang yang Diujikan */}
        <section
          id="bidang"
          aria-labelledby="bidang-heading"
          className="bg-[var(--color-surface-base)] border-b border-[var(--color-border-muted)]"
        >
          <div className="max-w-6xl mx-auto px-[var(--space-1)] py-[var(--space-2)] lg:py-16">
            <div className="max-w-2xl">
              <p className="text-base font-bold uppercase tracking-widest text-[var(--color-surface-strong)]">
                Bidang yang Diujikan
              </p>
              <h2
                id="bidang-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-tertiary)] mt-2"
              >
                Empat Disiplin Ilmu Alat &amp; Syariah
              </h2>
              <p className="text-base text-[var(--color-text-secondary)] mt-2">
                Seluruh naskah soal disajikan dalam teks Arab berharakat lengkap
                untuk menguji ketajaman analisis gramatikal dan pemahaman matan
                kitab kuning.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-1)] mt-[var(--space-2)]">
              {FIELDS.map((f) => (
                <article
                  key={f.name}
                  className="rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-muted)] hover:border-[var(--color-surface-strong)] p-[var(--space-1)] flex flex-col justify-between transition duration-[200ms]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-border-muted)]">
                      <span className="text-base font-bold text-[var(--color-surface-strong)]">
                        {f.code} &bull; {f.level}
                      </span>
                      <span
                        dir="rtl"
                        lang="ar"
                        className="font-arabic text-2xl text-[var(--color-text-tertiary)]"
                      >
                        {f.arabic}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text-tertiary)] mt-[var(--space-1)]">
                      {f.name}
                    </h3>
                    <p className="text-base text-[var(--color-text-secondary)] leading-relaxed mt-2">
                      {f.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Alur Mengikuti Ujian */}
        <section
          id="alur"
          aria-labelledby="alur-heading"
          className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border-muted)]"
        >
          <div className="max-w-6xl mx-auto px-[var(--space-1)] py-[var(--space-2)] lg:py-16">
            <div className="max-w-2xl">
              <p className="text-base font-bold uppercase tracking-widest text-[var(--color-surface-strong)]">
                Alur Pelaksanaan
              </p>
              <h2
                id="alur-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-tertiary)] mt-2"
              >
                Tiga Tahap Menuju Ruang Ujian
              </h2>
              <p className="text-base text-[var(--color-text-secondary)] mt-2">
                Prosedur terstruktur bagi seluruh peserta agar pelaksanaan ujian
                berjalan tertib, objektif, dan bebas kendala teknis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-1)] mt-[var(--space-2)]">
              {STEPS.map((s) => (
                <div
                  key={s.no}
                  className="rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] p-[var(--space-1)]"
                >
                  <div className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-[var(--color-surface-strong)] text-[var(--color-surface-base)] font-extrabold text-base">
                    Tahap {s.no}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-text-tertiary)] mt-[var(--space-1)]">
                    {s.title}
                  </h3>
                  <p className="text-base text-[var(--color-text-secondary)] leading-relaxed mt-2">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-[var(--space-2)] p-[var(--space-1)] rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-1)]">
              <p className="text-base text-[var(--color-text-secondary)] flex items-start sm:items-center gap-3">
                <KeyRound
                  className="w-5 h-5 text-[var(--color-surface-strong)] shrink-0 mt-0.5 sm:mt-0"
                  aria-hidden="true"
                />
                <span>
                  Token sesi diumumkan langsung oleh pengawas ruangan saat
                  jadwal ujian dimulai.
                </span>
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-[var(--space-1)] py-2.5 rounded-md bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-strong-hover)] active:bg-[var(--color-surface-strong-active)] text-[var(--color-surface-base)] font-bold text-base shrink-0 transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-tertiary)]"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Login Peserta</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Sistem Penilaian */}
        <section
          id="penilaian"
          aria-labelledby="penilaian-heading"
          className="bg-[var(--color-surface-base)] border-b border-[var(--color-border-muted)]"
        >
          <div className="max-w-6xl mx-auto px-[var(--space-1)] py-[var(--space-2)] lg:py-16">
            <div className="max-w-2xl">
              <p className="text-base font-bold uppercase tracking-widest text-[var(--color-surface-strong)]">
                Metodologi Evaluasi
              </p>
              <h2
                id="penilaian-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-tertiary)] mt-2"
              >
                Sistem Penilaian Transparan &amp; Akurat
              </h2>
              <p className="text-base text-[var(--color-text-secondary)] mt-2">
                Nilai akhir dihitung secara otomatis oleh sistem berdasarkan
                kombinasi ketepatan jawaban dan efisiensi waktu pengerjaan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-1)] mt-[var(--space-2)]">
              {SCORING.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-muted)] p-[var(--space-1)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-11 h-11 rounded-md bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] text-[var(--color-surface-strong)] flex items-center justify-center">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <span className="px-3 py-1 rounded-md bg-[var(--color-surface-base)] text-[var(--color-surface-strong)] font-bold text-base">
                        {s.metric}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text-tertiary)] mt-[var(--space-1)]">
                      {s.title}
                    </h3>
                    <p className="text-base text-[var(--color-text-secondary)] leading-relaxed mt-2">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section
          aria-labelledby="cta-heading"
          className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border-muted)]"
        >
          <div className="max-w-6xl mx-auto px-[var(--space-1)] py-[var(--space-2)] flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-1)]">
            <div>
              <h2
                id="cta-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-tertiary)]"
              >
                Siap Mengikuti Olimpiade Turats?
              </h2>
              <p className="text-base text-[var(--color-text-secondary)] mt-1">
                Masuk ke portal ujian menggunakan akun peserta Anda dan masukkan
                token sesi yang sedang berlangsung.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-md bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-strong-hover)] active:bg-[var(--color-surface-strong-active)] text-[var(--color-surface-base)] font-extrabold text-base shrink-0 transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-text-tertiary)]"
            >
              <LogIn className="w-5 h-5" aria-hidden="true" />
              <span>Login Peserta</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer Navigation (Navigation 2 of 2 per DESIGN.md) */}
      <footer className="bg-[var(--color-surface-base)]">
        <div className="max-w-6xl mx-auto px-[var(--space-1)] py-[var(--space-1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--space-1)]">
          <p className="text-base text-[var(--color-text-secondary)]">
            &copy; 2026 Olimpiade Turats &mdash; Sistem Ujian &amp; Kompetisi
            Kitab Kuning (CBT)
          </p>
          <nav
            aria-label="Navigasi Footer"
            className="flex items-center gap-[var(--space-1)] text-base"
          >
            <a
              href="#bidang"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-tertiary)] rounded-sm transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
            >
              Bidang
            </a>
            <a
              href="#alur"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-tertiary)] rounded-sm transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
            >
              Alur
            </a>
            <Link
              href="/login"
              className="font-bold text-[var(--color-surface-strong)] hover:underline rounded-sm transition duration-[200ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-surface-strong)]"
            >
              Login Peserta
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
