import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/env";
import { OAUTH_COOKIE, startGoogle } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/sign-in", req.url));
  const { url, cookie } = startGoogle();
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  return res;
}
