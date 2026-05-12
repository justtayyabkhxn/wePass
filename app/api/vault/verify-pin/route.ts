import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = verifyToken(token) as { userId: string } | null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 5 pin attempts per user per 15 min — then lock out
  const { allowed, retryAfter } = rateLimit(
    `pin:${payload.userId}`,
    5,
    15 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${retryAfter}s.`, locked: true },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const { pin } = await req.json();
  if (!pin || typeof pin !== "string" || pin.length !== 4) {
    return NextResponse.json({ valid: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { vaultPin: true },
  });

  if (!user?.vaultPin) {
    return NextResponse.json({ valid: false });
  }

  const valid = await bcrypt.compare(pin, user.vaultPin);
  return NextResponse.json({ valid });
}
