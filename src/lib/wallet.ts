import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { BRAND } from "./brand";
import { unstable_cache } from "next/cache";
import { bankCodes, intasendConfigured, intasendTestMode } from "./intasend";

/**
 * The school wallet. Money is added when it reaches the school's payment account, and teacher pay is taken from it.
 * The balance is always the sum of the entries, so it can be traced line by line.
 */
export async function walletBalance(db: Prisma.TransactionClient | typeof prisma = prisma) {
  // Confirmed money, minus payments still on their way (that money is already spoken for).
  const [done, sending] = await Promise.all([
    db.walletEntry.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    db.walletEntry.aggregate({ _sum: { amount: true }, where: { status: "PENDING", amount: { lt: 0 } } }),
  ]);
  return (done._sum.amount ?? 0) + (sending._sum.amount ?? 0);
}

/** How much an entry counts towards the balance right now. */
export const effectiveAmount = (e: { amount: number; status: "PENDING" | "COMPLETED" | "FAILED" }) =>
  e.status === "COMPLETED" || (e.status === "PENDING" && e.amount < 0) ? e.amount : 0;

/** Serialises wallet changes so two payments can't both spend the same shillings. */
export const lockWallet = (tx: Prisma.TransactionClient) => tx.$executeRaw`SELECT pg_advisory_xact_lock(724001)`;

/** Which payment provider the wallet is linked to. Until one is connected, the office records money in and out. */
export function walletProvider() {
  if (intasendConfigured()) return { connected: true as const, name: "IntaSend", test: intasendTestMode() };
  return { connected: false as const, name: null, test: false };
}

export const walletAccountName = () => process.env.WALLET_ACCOUNT_NAME || BRAND.name;

export const WALLET_IN_METHODS = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
] as const;

export const walletMethodLabel = (m: string | null) => WALLET_IN_METHODS.find((x) => x.value === m)?.label ?? (m || "—");

export const WALLET_KIND_LABEL = {
  DEPOSIT: "Money added",
  TEACHER_PAYMENT: "Teacher payment",
  REVERSAL: "Payment reversed",
  WITHDRAWAL: "Money taken out",
} as const;

/** Kenyan banks IntaSend can pay into, cached for a day. Null when IntaSend isn't connected or can't be reached. */
export const cachedBankCodes = unstable_cache(
  async () => {
    if (!intasendConfigured()) return null;
    try {
      return await bankCodes();
    } catch {
      return null;
    }
  },
  ["intasend-bank-codes"],
  { revalidate: 86_400 },
);
