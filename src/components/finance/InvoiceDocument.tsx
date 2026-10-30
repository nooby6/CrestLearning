import { Wordmark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/primitives";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { STATUS_LABEL, STATUS_TONE, balanceOf, displayStatus, providerLabel, type InvoiceFull } from "@/lib/finance";

const d = (x: Date) => formatDate(x, { day: "numeric", month: "short", year: "numeric" });

/** The invoice as a document — the same for the office and parents, and it prints cleanly. */
export function InvoiceDocument({ inv, instructions, staffView = false }: { inv: InvoiceFull; instructions: string; staffView?: boolean }) {
  const status = displayStatus(inv);
  const balance = balanceOf(inv);
  const paid = inv.payments.filter((p) => p.status === "SUCCEEDED");
  return (
    <article className="card overflow-hidden print:border-0">
      <header className="flex flex-col gap-6 border-b border-line px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 text-xs text-navy-500">Crest Learning · Nairobi, Kenya</p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-bold tracking-wide text-navy-900">INVOICE</p>
          <p className="font-mono text-sm text-navy-700">{inv.number}</p>
          <div className="mt-2">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
          </div>
        </div>
      </header>

      <div className="grid gap-6 border-b border-line px-6 py-5 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Billed to</p>
          {inv.billTo ? (
            <>
              <p className="mt-1 font-medium text-navy-900">{fullName(inv.billTo.user)}</p>
              {staffView && inv.billTo.user.phone && <p className="text-sm text-navy-600">{inv.billTo.user.phone}</p>}
              {staffView && inv.billTo.user.email && <p className="text-sm text-navy-600">{inv.billTo.user.email}</p>}
            </>
          ) : (
            <p className="mt-1 text-sm text-navy-500">—</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Student</p>
          <p className="mt-1 font-medium text-navy-900">{fullName(inv.student.user)}</p>
          <p className="text-sm text-navy-600">{[curriculumLabel(inv.student.curriculum), inv.student.level?.name].filter((x) => x && x !== "—").join(" · ")}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:text-right">
          <dt className="text-navy-500">Period</dt>
          <dd className="font-medium text-navy-900">
            {formatDate(inv.periodStart, { day: "numeric", month: "short" })} – {d(inv.periodEnd)}
          </dd>
          <dt className="text-navy-500">Issued</dt>
          <dd className="font-medium text-navy-900">{inv.issuedAt ? d(inv.issuedAt) : "Not yet"}</dd>
          <dt className="text-navy-500">Due</dt>
          <dd className={status === "OVERDUE" ? "font-semibold text-rose-700" : "font-medium text-navy-900"}>{d(inv.dueDate)}</dd>
        </dl>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="table-head">
            <th className="px-6 py-2.5 sm:px-8">Description</th>
            <th className="px-3 py-2.5 text-right">Qty</th>
            <th className="px-3 py-2.5 text-right">Unit</th>
            <th className="px-6 py-2.5 text-right sm:px-8">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {inv.lines.map((l) => (
            <tr key={l.id}>
              <td className="px-6 py-3 sm:px-8">{l.description}</td>
              <td className="px-3 py-3 text-right tabular-nums">{l.quantity}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatMoney(l.unitAmount, inv.currency)}</td>
              <td className="px-6 py-3 text-right font-medium tabular-nums sm:px-8">{formatMoney(l.amount, inv.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t border-line px-6 py-4 sm:px-8">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-navy-500">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(inv.subtotal, inv.currency)}</dd>
          </div>
          {inv.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-navy-500">Discount</dt>
              <dd className="tabular-nums">−{formatMoney(inv.discount, inv.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(inv.total, inv.currency)}</dd>
          </div>
          {inv.amountPaid > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Paid</dt>
              <dd className="tabular-nums">−{formatMoney(inv.amountPaid, inv.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-navy-800 pt-2 font-display text-base font-bold text-navy-900">
            <dt>Balance due</dt>
            <dd className="tabular-nums">{formatMoney(balance, inv.currency)}</dd>
          </div>
        </dl>
      </div>

      {paid.length > 0 && (
        <div className="border-t border-line px-6 py-4 sm:px-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Payments received</p>
          <ul className="space-y-1 text-sm">
            {paid.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {p.paidAt ? d(p.paidAt) : ""} · {providerLabel(p.provider)}
                  {p.receipt && <span className="font-mono text-navy-600"> · {p.receipt}</span>}
                  {staffView && p.recordedBy && <span className="text-navy-400"> · recorded by {fullName(p.recordedBy)}</span>}
                </span>
                <span className="font-medium tabular-nums text-emerald-700">{formatMoney(p.amount, p.currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(inv.notes || (balance > 0 && inv.status !== "VOID")) && (
        <div className="border-t border-line bg-ivory px-6 py-4 text-sm text-navy-700 sm:px-8">
          {inv.notes && <p className="mb-2 whitespace-pre-wrap">{inv.notes}</p>}
          {balance > 0 && inv.status !== "VOID" && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">How to pay</p>
              <p className="mt-1 whitespace-pre-wrap">{instructions}</p>
              <p className="mt-1 text-xs text-navy-500">
                Reference: <b className="font-mono">{inv.number}</b>
              </p>
            </>
          )}
        </div>
      )}
    </article>
  );
}
