import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Halaman ini membaca cookie sesi lalu redirect, jadi tidak bisa di-prerender.
// Panduan resmi Next.js (cache-components): tandai segmen ini boleh blocking.
export const instant = false;

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/exam");
}
