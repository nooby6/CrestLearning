import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Authentication only. Role checks happen on the server against the database
 * (requireRole in every page and action), so no Clerk session-token customisation is needed.
 */
const isPublic = createRouteMatcher(["/sign-in(.*)", "/setup(.*)", "/api/webhooks(.*)", "/api/cron(.*)"]);

/** Pass the path to server components (layouts can't read it otherwise). */
const next = (req: NextRequest) => {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
};

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return next(req);
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
  return next(req);
});

// Local preview without Clerk (see src/lib/auth.ts). Never true in production builds.
const devBypass = process.env.NODE_ENV === "development" && !!process.env.DEV_AUTH_USER_ID;

/** Before Clerk is configured, every page shows the setup checklist instead of crashing. */
const setupOnly = (req: NextRequest) => {
  const p = req.nextUrl.pathname;
  if (p.startsWith("/setup") || p.startsWith("/api/cron")) return next(req);
  return NextResponse.redirect(new URL("/setup", req.url));
};

const clerkReady = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default devBypass ? next : clerkReady ? withClerk : setupOnly;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
