import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { BRAND } from "./brand";

/**
 * The school wallet. Money is added when it reaches the school's payment account, and teacher pay is taken from it.
 * The balance is always the sum of the entries, so it can be traced line by line.
 */
export async function walletBalance(db: Prisma.TransactionClient | typeof prisma = prisma) {
  const r = await db.walletEntry.aggregate({ _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

/** Serialises wallet changes so two payments can't both spend the same shillings. */
export const lockWallet = (tx: Prisma.TransactionClient) => tx.$executeRaw`SELECT pg_advisory_xact_lock(724001)`;

/** Which payment provider the wallet is linked to. Until one is connected, the office records money in and out. */
export function walletProvider() {
  const name = process.env.WALLET_PROVIDER?.toLowerCase();
  if (name === "intasend" && process.env.INTASEND_SECRET_KEY) return { connected: true as const, name: "IntaSend" };
  if (name === "paystack" && process.env.PAYSTACK_SECRET_KEY) return { connected: true as const, name: "Paystack" };
  return { connected: false as const, name: null };
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
