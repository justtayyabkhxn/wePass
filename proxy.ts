import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only run on login / signup
  if (!AUTH_PAGES.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.next();

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    // Token is valid — bounce to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    // Invalid / expired token — let them through to login/signup
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/login", "/signup"],
};
