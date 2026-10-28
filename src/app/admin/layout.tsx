"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarClock,
  Activity,
  Users,
  ShieldCheck,
  LogOut,
  ExternalLink,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/questions", label: "Bank Soal & Bobot", icon: BookOpen },
  { href: "/admin/sessions", label: "Manajemen Sesi & Token", icon: CalendarClock },
  { href: "/admin/monitoring", label: "Monitoring & Peringkat", icon: Activity },
  { href: "/admin/participants", label: "Daftar Peserta", icon: Users },
  { href: "/admin/users", label: "Manajemen User / Admin", icon: ShieldCheck },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-emerald-950 text-white flex flex-col justify-between shrink-0 border-b lg:border-b-0 lg:border-r border-emerald-800">
        <div>
          <div className="p-5 border-b border-emerald-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight">
                  Olimpiade Turats
                </div>
                <div className="text-[11px] text-amber-300">
                  Panel Admin &amp; Panitia
                </div>
              </div>
            </div>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 whitespace-nowrap transition ${
                    isActive
                      ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                      : "text-emerald-100/80 hover:bg-emerald-900 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-emerald-800/80 hidden lg:block space-y-2">
          <Link
            href="/exam"
            className="w-full px-3.5 py-2 rounded-xl bg-emerald-900/70 hover:bg-emerald-900 text-emerald-200 text-xs font-medium flex items-center justify-between transition"
          >
            <span>Lihat Portal Peserta</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full px-3.5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

