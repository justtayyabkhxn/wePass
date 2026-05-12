import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token) as { userId: string; email: string } | null;
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vaults = await prisma.vault.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    // Return raw ciphertext — decryption happens client-side only
    return NextResponse.json(
      vaults.map((v) => ({
        id: v.id,
        title: v.title,
        username: v.username,
        encryptedPassword: v.encryptedPassword,
        iv: v.iv,
        category: v.category,
        createdAt: v.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Client sends already-encrypted ciphertext — server never sees plaintext
    const { title, username, encryptedPassword, iv, category } = await req.json();

    if (!title || !username || !encryptedPassword || !iv) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const VALID_CATEGORIES = ["Social", "Work", "Banking", "Shopping", "Gaming", "Other"];
    const safeCategory = VALID_CATEGORIES.includes(category) ? category : "Other";

    const vault = await prisma.vault.create({
      data: { title, username, encryptedPassword, iv, category: safeCategory, userId: user.userId },
    });

    return NextResponse.json(
      { id: vault.id, title: vault.title, username: vault.username, createdAt: vault.createdAt },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
