import "server-only";
import prisma from "./prisma";
import { IntaSendError, intasendConfigured, paymentStatus, sendStatus } from "./intasend";

let lastRun = 0;

/**
 * Asks IntaSend about every top-up and teacher payment still waiting, and settles the ones it has finished.
 * Called when the wallet or payments pages open (at most every 15 seconds) and from IntaSend's webhook.
 * The portal never trusts a webhook body on its own: it always re-checks with IntaSend.
 */
export async function syncWallet(opts: { force?: boolean; ref?: string } = {}) {
  if (!intasendConfigured()) return { settled: 0 };
  if (!opts.force && !opts.ref && Date.now() - lastRun < 15_000) return { settled: 0 };
  lastRun = Date.now();

  const pending = await prisma.walletEntry.findMany({
    where: { status: "PENDING", provider: "intasend", providerRef: opts.ref ? opts.ref : { not: null } },
    take: 50,
  });
  let settled = 0;
  for (const e of pending) {
    try {
      if (e.kind === "DEPOSIT") {
        const s = await paymentStatus(e.providerRef!);
        if (s.state === "COMPLETE") {
          await prisma.walletEntry.update({ where: { id: e.id }, data: { status: "COMPLETED", reference: s.reference ?? e.reference } });
          settled++;
        } else if (s.state === "FAILED" || (s.state === "PENDING" && Date.now() - +e.createdAt > 60 * 60_000)) {
          await prisma.walletEntry.update({ where: { id: e.id }, data: { status: "FAILED", note: [e.note, s.failedReason ?? "Not paid"].filter(Boolean).join(" · ") } });
          settled++;
        }
      } else if (e.kind === "TEACHER_PAYMENT") {
        const s = await sendStatus(e.providerRef!);
        if (!s.done) continue;
        if (s.ok) {
          await prisma.$transaction([
            prisma.walletEntry.update({ where: { id: e.id }, data: { status: "COMPLETED", reference: s.reference } }),
            ...(e.payoutId ? [prisma.teacherPayout.update({ where: { id: e.payoutId }, data: { status: "PAID", reference: s.reference, paidAt: new Date() } })] : []),
          ]);
        } else {
          // The money didn't leave: the lessons become owed again and the wallet keeps the money.
          await prisma.$transaction([
            prisma.walletEntry.update({ where: { id: e.id }, data: { status: "FAILED", note: [e.note, s.reason].filter(Boolean).join(" · ") } }),
            ...(e.payoutId ? [prisma.teacherPayout.delete({ where: { id: e.payoutId } })] : []),
          ]);
        }
        settled++;
      }
    } catch (err) {
      if (!(err instanceof IntaSendError)) console.error("[syncWallet]", e.id, err);
    }
  }
  return { settled };
}
