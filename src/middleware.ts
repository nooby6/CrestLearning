import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate only: no session cookie → sign-in page.
 * The real checks (valid session, active account, role) run on the server in requireRole/assertRole.
 */
const PUBLIC = ["/sign-in", "/setup", "/api/cron", "/api/webhooks"];
const SESSION_COOKIE = "crest_session";

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const headers = new Headers(req.headers);
  headers.set("x-pathname", path);
  const next = NextResponse.next({ request: { headers } });

  const devBypass = process.env.NODE_ENV === "development" && !!process.env.DEV_AUTH_USER_ID;
  if (devBypass || PUBLIC.some((p) => path === p || path.startsWith(p + "/"))) return next;
  if (req.cookies.has(SESSION_COOKIE)) return next;

  if (path.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.redirect(new URL("/sign-in", req.url));
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
