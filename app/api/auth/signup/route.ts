import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per hour
  const { allowed, retryAfter } = rateLimit(
    `signup:${getClientIp(req)}`,
    5,
    60 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const { name, email, password, kdfSalt, vaultPin } = body;

    if (!name || !email || !password || !kdfSalt || !vaultPin) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (typeof vaultPin !== "string" || vaultPin.length !== 4) {
      return NextResponse.json({ error: "Vault PIN must be exactly 4 digits" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const [passwordHash, vaultPinHash] = await Promise.all([
      bcrypt.hash(password, 12),
      bcrypt.hash(vaultPin, 12),
    ]);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, kdfSalt, vaultPin: vaultPinHash },
    });

    return NextResponse.json(
      { message: "User created", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
