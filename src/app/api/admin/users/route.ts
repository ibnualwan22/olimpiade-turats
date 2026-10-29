import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");

  const users = await prisma.user.findMany({
    where:
      roleFilter === "ADMIN" || roleFilter === "PARTICIPANT"
        ? { role: roleFilter }
        : undefined,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      institution: true,
      phone: true,
      category: true,
      email: true,
      isActive: true,
      createdAt: true,
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, createdAt: true },
      },
      _count: {
        select: { attempts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      username,
      name,
      password,
      role = "PARTICIPANT",
      institution,
      phone,
      category,
      isActive = true,
    } = body;

    if (!username?.trim() || !name?.trim() || !password) {
      return NextResponse.json(
        { error: "Username, nama lengkap, dan password wajib diisi" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    const exists = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Username / Nomor Peserta sudah terdaftar" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: name.trim(),
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "PARTICIPANT",
        institution: institution?.trim() || null,
        phone: phone?.trim() || null,
        category: category?.trim() || null,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        institution: user.institution,
        category: user.category,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan user" },
      { status: 500 }
    );
  }
}

