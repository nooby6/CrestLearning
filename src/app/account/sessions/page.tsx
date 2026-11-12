import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Laptop, Smartphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/roles";
import { activeSessions, currentSession, SESSION_HOURS } from "@/lib/session";
import { deviceLabel, isPhone } from "@/lib/device";
import { formatDate } from "@/lib/format";
import { formatTime } from "@/lib/schedule";
import { Wordmark } from "@/components/brand/Logo";
import { EndOthers, EndSession } from "./SessionButtons";

// Per-user page: always rendered on request.
export const dynamic = "force-dynamic";

export const metadata = { title: "Signed-in devices" };

export default async function SessionsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  const [list, cur] = await Promise.all([activeSessions(me.id), currentSession()]);
  const others = list.filter((s) => s.id !== cur?.id);
  const when = (d: Date) => `${formatDate(d, { weekday: "short", day: "numeric", month: "short", year: undefined })}, ${formatTime(d)}`;

  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-4 py-10 sm:px-6">
      <Wordmark className="mb-8" />
      <div className="card w-full max-w-2xl">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <Link href={homePath(me)} className="mb-3 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <p className="eyebrow">Account</p>
          <h1 className="mt-1.5 font-display text-xl font-semibold text-navy-900">Signed-in devices</h1>
          <p className="mt-1 text-sm text-navy-500">
            Everywhere you’re signed in as @{me.username}. Each sign-in ends on its own after {SESSION_HOURS} hours. Don’t recognise one? Sign it out and change
            your password.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {list.map((s) => {
            const Icon = isPhone(s.userAgent) ? Smartphone : Laptop;
            const mine = s.id === cur?.id;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-navy-800 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-navy-900">
                    {deviceLabel(s.userAgent)}
                    {mine && <span className="bg-gold-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-950">This device</span>}
                    {s.method === "google" && <span className="border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-600">Google</span>}
                  </p>
                  <p className="text-xs text-navy-500">
                    Signed in {when(s.createdAt)} · last active {when(s.lastSeenAt)} · ends {formatTime(s.endsAt)}
                  </p>
                </div>
                {!mine && <EndSession id={s.id} />}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ivory px-5 py-4 sm:px-6">
          <p className="text-sm text-navy-600">
            {others.length ? `${others.length} other ${others.length === 1 ? "device" : "devices"} signed in.` : "No other devices are signed in."}
          </p>
          {others.length > 0 && <EndOthers />}
        </div>
      </div>
    </div>
  );
}
