import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Rate limit: 20 salt lookups per IP per 15 min
  const { allowed, retryAfter } = rateLimit(
    `salt:${getClientIp(req)}`,
    20,
    15 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ salt: null });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { kdfSalt: true },
  });

  // Always return 200 — don't reveal whether the email exists
  return NextResponse.json({ salt: user?.kdfSalt || null });
}
