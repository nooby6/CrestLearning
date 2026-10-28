import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { databaseConfigured } from "@/lib/env";
import { ensureBootstrapAdmin } from "@/lib/bootstrap";
import { Wordmark } from "@/components/brand/Logo";

export const metadata = { title: "System status" };
export const dynamic = "force-dynamic";

/** Public health check for whoever runs the deployment. Shows no personal data. */
export default async function SetupPage() {
  await ensureBootstrapAdmin();
  let reachable = false;
  let migrated = false;
  let admins = 0;
  let subjects = 0;
  if (databaseConfigured()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      reachable = true;
      [admins, subjects] = await Promise.all([prisma.user.count({ where: { role: "ADMIN" } }), prisma.subject.count()]);
      migrated = true;
    } catch {
      /* not reachable or tables missing */
    }
  }
  const checks = [
    { label: "Database connected", ok: reachable },
    { label: "Database tables created", ok: migrated },
    { label: "Administrator account exists", ok: admins > 0 },
    { label: "Subjects and levels loaded", ok: subjects > 0 },
  ];
  return (
    <div className="min-h-screen bg-ivory px-6 py-12">
      <div className="mx-auto max-w-md">
        <Wordmark className="mb-10" />
        <p className="eyebrow">System status</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">Crest Learning</h1>
        <ol className="card mt-6 divide-y divide-line">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-navy-900">
              {c.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-500" />}
              {c.label}
            </li>
          ))}
        </ol>
        <Link href="/sign-in" className="btn-primary mt-6 w-full">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
