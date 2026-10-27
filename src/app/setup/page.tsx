import Link from "next/link";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { clerkConfigured, databaseConfigured } from "@/lib/env";
import { Wordmark } from "@/components/brand/Logo";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean | null; help: string };

async function databaseState(): Promise<{ reachable: boolean; migrated: boolean; admins: number }> {
  if (!databaseConfigured()) return { reachable: false, migrated: false, admins: 0 };
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return { reachable: false, migrated: false, admins: 0 };
  }
  try {
    return { reachable: true, migrated: true, admins: await prisma.user.count({ where: { role: "ADMIN" } }) };
  } catch {
    return { reachable: true, migrated: false, admins: 0 };
  }
}

/**
 * Deployment checklist + first-administrator creation.
 * Public, but creating an admin needs ADMIN_SETUP_TOKEN and is disabled once one exists.
 */
export default async function SetupPage() {
  const db = await databaseState();
  const clerk = clerkConfigured();
  const token = !!process.env.ADMIN_SETUP_TOKEN;

  const checks: Check[] = [
    {
      label: "Database connected",
      ok: db.reachable,
      help: databaseConfigured()
        ? "DATABASE_URL is set but the database can’t be reached. Check the URL (it usually needs ?sslmode=require)."
        : "Vercel → your project → Storage → Create Database (Neon) and connect it. It adds DATABASE_URL for you. Then redeploy.",
    },
    {
      label: "Database tables created",
      ok: db.reachable ? db.migrated : null,
      help: "Redeploy — migrations run automatically during the build once the database is connected.",
    },
    {
      label: "Sign-in service (Clerk) configured",
      ok: clerk,
      help: "Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY (Clerk dashboard → API keys) in Vercel → Settings → Environment Variables, then redeploy.",
    },
    {
      label: "Setup token set",
      ok: token,
      help: "Add ADMIN_SETUP_TOKEN with any long secret value (you’ll type it below once), then redeploy.",
    },
  ];
  const ready = checks.every((c) => c.ok);

  return (
    <div className="min-h-screen bg-ivory px-6 py-12">
      <div className="mx-auto max-w-xl">
        <Wordmark className="mb-10" />
        {db.admins > 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-3 font-display text-xl font-semibold text-navy-900">Crest Learning is set up</h1>
            <p className="mt-1 text-sm text-navy-500">An administrator exists. Further accounts are created from the admin portal.</p>
            <Link href="/sign-in" className="btn-primary mt-6">
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="eyebrow">First-time setup</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">Set up Crest Learning</h1>
            <p className="mt-1 text-sm text-navy-500">Complete the checklist, then create the first administrator account.</p>

            <ol className="card mt-6 divide-y divide-line">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-3 px-5 py-4">
                  {c.ok === true ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : c.ok === false ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-navy-200" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-navy-900">{c.label}</p>
                    {c.ok !== true && <p className="mt-0.5 text-xs text-navy-500">{c.help}</p>}
                  </div>
                </li>
              ))}
            </ol>

            {ready && (
              <section className="card mt-6 p-6">
                <h2 className="mb-4 font-display text-base font-semibold text-navy-900">Create the first administrator</h2>
                <SetupForm />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
