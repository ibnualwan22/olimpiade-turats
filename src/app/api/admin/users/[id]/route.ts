import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      username,
      name,
      password,
      role,
      institution,
      phone,
      email,
      isActive,
    } = body;

    let cleanEmail: string | undefined;
    if (email !== undefined) {
      cleanEmail = email?.trim() || "";
      if (cleanEmail && !EMAIL_RE.test(cleanEmail)) {
        return NextResponse.json(
          { error: "Format email tidak valid" },
          { status: 400 }
        );
      }
      if (cleanEmail) {
        const emailTaken = await prisma.user.findFirst({
          where: {
            email: { equals: cleanEmail, mode: "insensitive" },
            id: { not: id },
          },
        });
        if (emailTaken) {
          return NextResponse.json(
            { error: "Email sudah dipakai akun lain" },
            { status: 400 }
          );
        }
      }
    }

    const updateData: Record<string, unknown> = {
      username: username?.trim(),
      name: name?.trim(),
      role: role === "ADMIN" ? "ADMIN" : "PARTICIPANT",
      institution: institution?.trim() || null,
      phone: phone?.trim() || null,
      ...(email !== undefined ? { email: cleanEmail || null } : {}),
      isActive: Boolean(isActive),
    };

    if (password && password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json(
      { error: "Tidak dapat menghapus akun yang sedang digunakan" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

