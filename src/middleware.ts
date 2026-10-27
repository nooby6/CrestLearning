import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTE_ACCESS, isRoleSlug } from "@/lib/roles";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/api/webhooks(.*)", "/api/cron(.*)"]);
const isPending = createRouteMatcher(["/pending(.*)"]);

const guards = ROUTE_ACCESS.map(({ pattern, roles }) => ({
  match: createRouteMatcher([pattern]),
  roles,
}));

// Local preview without Clerk (see src/lib/auth.ts). Never true in production builds.
const devBypass =
  process.env.NODE_ENV === "development" && !!process.env.DEV_AUTH_USER_ID;

/** Pass the path to server components (layouts can't read it otherwise). */
const next = (req: NextRequest) => {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
};

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return next(req);

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  const role = sessionClaims?.metadata?.role;

  // Signed in, but an admin hasn't assigned a role yet.
  if (!isRoleSlug(role)) {
    return isPending(req) ? next(req) : NextResponse.redirect(new URL("/pending", req.url));
  }

  for (const { match, roles } of guards) {
    if (match(req) && !roles.includes(role)) {
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }
  }
  return next(req);
});

export default devBypass ? next : withClerk;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
