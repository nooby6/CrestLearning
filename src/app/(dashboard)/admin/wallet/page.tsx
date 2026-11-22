import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CircleAlert, PlugZap, ShieldCheck, Wallet } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { isEnded, lastEndedPeriod, periodLabel, periodSummary } from "@/lib/payouts";
import { WALLET_KIND_LABEL, effectiveAmount, walletAccountName, walletBalance, walletMethodLabel, walletProvider } from "@/lib/wallet";
import { syncWallet } from "@/lib/wallet-sync";
import { availableBalance } from "@/lib/intasend";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CheckWalletStatus, WalletMoneyForm } from "@/components/wallet/WalletControls";

export const metadata = { title: "School wallet" };

export default async function WalletPage() {
  await requireRole("admin");
  await syncWallet();
  const period = lastEndedPeriod();
  const [balance, entries, owedRows] = await Promise.all([
    walletBalance(),
    prisma.walletEntry.findMany({ orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 100, include: { createdBy: { select: { firstName: true, lastName: true } } } }),
    periodSummary(period),
  ]);
  const owed = owedRows.reduce((a, r) => a + (r.hourlyRate > 0 ? r.owed : 0), 0);
  const owedCount = owedRows.filter((r) => r.owed > 0 && r.hourlyRate > 0).length;
  const provider = walletProvider();
  const live = provider.connected ? await availableBalance().catch(() => null) : null;
  const waiting = entries.filter((e) => e.status === "PENDING").length;

  // Balance after each entry, working back from today's balance.
  let running = balance;
  const rows = entries.map((e) => {
    const after = running;
    running -= effectiveAmount(e);
    return { ...e, after };
  });

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="School wallet"
        description="Money set aside for teacher pay. Add money when it reaches the school’s account, then pay teachers straight from the wallet on the Teacher payments page."
      />

      <section className="mb-6 grid gap-px overflow-hidden border border-navy-900 bg-navy-900 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="relative bg-navy-900 px-6 py-7 text-white sm:px-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-gold-400">
            <Wallet className="h-4 w-4" /> Available balance
          </p>
          <p className="mt-2 font-display text-[clamp(34px,6vw,52px)] font-extrabold leading-none tabular-nums">{formatMoney(balance)}</p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-navy-300">Account name</dt>
              <dd className="mt-0.5 font-semibold">{walletAccountName()}</dd>
            </div>
            <div>
              <dt className="text-navy-300">Payment provider</dt>
              <dd className="mt-0.5 font-semibold">
                {provider.connected ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <ShieldCheck className="h-4 w-4" /> {provider.name} connected{provider.test ? " · test mode" : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gold-300">
                    <PlugZap className="h-4 w-4" /> Not connected yet
                  </span>
                )}
              </dd>
            </div>
            {provider.connected && (
              <div className="sm:col-span-2">
                <dt className="text-navy-300">Balance at IntaSend{provider.test ? " (sandbox)" : ""}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{live === null ? "Couldn’t reach IntaSend just now" : formatMoney(live)}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="bg-white px-6 py-7 sm:px-8">
          <p className="text-sm font-semibold text-navy-500">Owed to teachers · {periodLabel(period)}</p>
          <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-navy-900">{formatMoney(owed)}</p>
          {owed > 0 ? (
            balance >= owed ? (
              <p className="mt-3 text-sm text-emerald-700">The wallet covers this. {formatMoney(balance - owed)} will be left after paying.</p>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-sm text-rose-700">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Add {formatMoney(owed - balance)} to pay all {owedCount} {owedCount === 1 ? "teacher" : "teachers"}.
              </p>
            )
          ) : (
            <p className="mt-3 text-sm text-navy-500">Nobody is waiting to be paid for the last period{isEnded(period) ? "" : " yet"}.</p>
          )}
          <Link href={`/admin/payments?period=${period.start}`} className="btn-ghost mt-5 px-4 py-2 text-sm">
            Go to teacher payments <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {provider.connected && provider.test && (
        <div className="mb-6 flex gap-4 border border-gold-300 border-l-4 border-l-gold-500 bg-gold-50 px-5 py-4 text-sm text-navy-800">
          <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
          <div>
            <p className="font-semibold text-navy-900">Test mode: no real money moves</p>
            <p className="mt-1 leading-relaxed">
              IntaSend is connected with test keys, so top-ups and teacher payments run in IntaSend’s sandbox. Switch to the live keys in Vercel when you’re
              ready to pay teachers for real.
            </p>
          </div>
        </div>
      )}

      {!provider.connected && (
        <div className="mb-6 flex gap-4 border border-gold-300 border-l-4 border-l-gold-500 bg-gold-50 px-5 py-4 text-sm text-navy-800">
          <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
          <div>
            <p className="font-semibold text-navy-900">The wallet isn’t linked to a payment account yet</p>
            <p className="mt-1 leading-relaxed">
              Until it is, record money here when it reaches the school’s account. When you pay a teacher from the wallet, the portal deducts it and shows the
              teacher as paid, and you send the money to them yourself. Once a payment account in the school’s name is connected, top-ups and teacher payments
              will go through automatically.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        <Card title="Add or take out money">
          <div className="max-w-3xl">
            <WalletMoneyForm mpesa={provider.connected} />
          </div>
        </Card>

        <Card title="Wallet history" bodyClassName="p-0" action={waiting ? <CheckWalletStatus /> : undefined}>
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Wallet} title="No money in the wallet yet">
                Add money when it reaches the school’s account. Every top-up and teacher payment will be listed here.
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Details</th>
                    <th className="px-3 py-2.5 text-right">In</th>
                    <th className="px-3 py-2.5 text-right">Out</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy-600">{formatDate(e.occurredAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-navy-900">
                          {WALLET_KIND_LABEL[e.kind]}
                          {e.status === "PENDING" && <Badge tone="amber">{e.kind === "DEPOSIT" ? "Waiting for M-Pesa" : "Sending"}</Badge>}
                          {e.status === "FAILED" && <Badge tone="rose">Failed</Badge>}
                        </p>
                        <p className="text-xs text-navy-500">
                          {[e.note, e.method && walletMethodLabel(e.method), e.reference].filter(Boolean).join(" · ")}
                          {e.createdBy && <span className="text-navy-400"> · by {fullName(e.createdBy)}</span>}
                        </p>
                      </td>
                      <td className={clsx("px-3 py-3 text-right font-semibold tabular-nums", e.status === "COMPLETED" ? "text-emerald-700" : "text-navy-300", e.status === "FAILED" && "line-through")}>
                        {e.amount > 0 ? formatMoney(e.amount) : ""}
                      </td>
                      <td className={clsx("px-3 py-3 text-right font-semibold tabular-nums", e.status === "FAILED" ? "text-navy-300 line-through" : "text-navy-900")}>{e.amount < 0 ? formatMoney(-e.amount) : ""}</td>
                      <td className={clsx("px-4 py-3 text-right tabular-nums", e.after < 0 ? "text-rose-700" : "text-navy-600")}>{formatMoney(e.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
