import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { googleConfigured } from "@/lib/env";
import { OAUTH_COOKIE, finishGoogle } from "@/lib/google-auth";
import { createSession } from "@/lib/session";
import { homePath } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const back = (reason: string) => NextResponse.redirect(new URL(`/sign-in?google=${reason}`, req.url));
  if (!googleConfigured()) return back("off");

  const url = new URL(req.url);
  const saved = cookies().get(OAUTH_COOKIE)?.value;
  cookies().delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  let stored: { state?: string; verifier?: string } = {};
  try {
    stored = saved ? JSON.parse(saved) : {};
  } catch {
    stored = {};
  }
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return back("cancelled");
  if (!code || !stored.state || !stored.verifier || url.searchParams.get("state") !== stored.state) return back("failed");

  const email = await finishGoogle(code, stored.verifier);
  if (!email) return back("failed");
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) return back("nomatch");
  if (!user.active) return back("suspended");

  await prisma.user.update({ where: { id: user.id }, data: { failedSignIns: 0, lockedUntil: null, lastSignInAt: new Date() } });
  await createSession(user.id, "google");
  return NextResponse.redirect(new URL(user.mustChangePassword ? "/account/password?first=1" : homePath(user), req.url));
}
