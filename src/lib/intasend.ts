import "server-only";

/**
 * IntaSend API client (https://developers.intasend.com). Plain fetch, no SDK.
 * Test keys (ISSecretKey_test_…) talk to the sandbox, where no real money moves; live keys talk to production.
 * Keys come only from environment variables and are never sent to the browser.
 */

const secret = () => process.env.INTASEND_SECRET_KEY ?? "";
const publishable = () => process.env.INTASEND_PUBLISHABLE_KEY ?? "";

export const intasendConfigured = () => !!secret() && !!publishable();
export const intasendTestMode = () => !secret().startsWith("ISSecretKey_live");
// INTASEND_BASE_URL is only for local testing against a stand-in server.
const base = () => process.env.INTASEND_BASE_URL || (intasendTestMode() ? "https://sandbox.intasend.com" : "https://payment.intasend.com");

export class IntaSendError extends Error {}

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: Record<string, unknown>; withSecret?: boolean } = {}): Promise<T> {
  const method = init.method ?? "POST";
  const headers: Record<string, string> = { "Content-Type": "application/json", INTASEND_PUBLIC_API_KEY: publishable() };
  if (init.withSecret !== false) headers.Authorization = `Bearer ${secret()}`;
  const res = await fetch(base() + path, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify({ ...(init.body ?? {}), public_key: publishable() }) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    console.error("[intasend]", method, path, res.status, text.slice(0, 500));
    throw new IntaSendError(readableError(data) ?? `IntaSend returned an error (${res.status}).`);
  }
  return data as T;
}

/** Pulls the first human-readable message out of IntaSend's error formats. */
function readableError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.errors) && d.errors.length) {
    const e = d.errors[0] as Record<string, unknown>;
    if (typeof e?.detail === "string") return e.detail;
  }
  for (const v of Object.values(d)) {
    if (typeof v === "string") return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  }
  return null;
}

/** 07xx / 01xx / +254… → 2547xxxxxxxx, the format IntaSend expects. */
export function kenyanMsisdn(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`;
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;
  return null;
}

type WalletRow = { wallet_id: string; label?: string; wallet_type?: string; currency?: string; available_balance?: number | string; current_balance?: number | string };

export async function listWallets(): Promise<WalletRow[]> {
  const r = await call<{ results?: WalletRow[] } | WalletRow[]>("/api/v1/wallets/", { method: "GET" });
  return Array.isArray(r) ? r : (r?.results ?? []);
}

/** Money available in the school's IntaSend KES settlement wallet, in KES cents. */
export async function availableBalance(): Promise<number> {
  const wallets = await listWallets();
  const w = wallets.find((x) => x.wallet_type === "SETTLEMENT" && (x.currency ?? "KES") === "KES") ?? wallets.find((x) => (x.currency ?? "KES") === "KES");
  return w ? Math.round(Number(w.available_balance ?? 0) * 100) : 0;
}

type Invoice = { invoice_id?: string; state?: string; mpesa_reference?: string | null; failed_reason?: string | null; value?: string | number };

/** Sends an M-Pesa prompt to the phone. The money lands in the school's IntaSend account. */
export async function mpesaStkPush(input: { amountKes: number; phone: string; apiRef: string; narrative: string }) {
  const r = await call<{ invoice?: Invoice; id?: string }>("/api/v1/payment/mpesa-stk-push/", {
    body: { amount: input.amountKes, phone_number: input.phone, api_ref: input.apiRef, narrative: input.narrative, method: "M-PESA", currency: "KES" },
  });
  return { invoiceId: r.invoice?.invoice_id ?? r.id ?? null, state: r.invoice?.state ?? "PENDING" };
}

export async function paymentStatus(invoiceId: string) {
  const r = await call<{ invoice?: Invoice }>("/api/v1/payment/status/", { body: { invoice_id: invoiceId } });
  return { state: r.invoice?.state ?? "PENDING", reference: r.invoice?.mpesa_reference ?? null, failedReason: r.invoice?.failed_reason ?? null };
}

type SendTx = { status?: string; status_code?: string; transaction_id?: string; request_reference_id?: string; failed_reason?: string | null; account?: string };
type SendBatch = { tracking_id?: string; status?: string; status_code?: string; transactions?: SendTx[]; failed_reason?: string | null };

/**
 * Sends money from the school's IntaSend account to one person (M-Pesa B2C or a bank account via PesaLink).
 * `requires_approval: "NO"` because approval already happened in the portal.
 */
export async function sendMoney(input: { kind: "MPESA"; phone: string; name: string; amountKes: number; narrative: string } | { kind: "BANK"; account: string; bankCode: string; name: string; amountKes: number; narrative: string }) {
  const tx =
    input.kind === "MPESA"
      ? { name: input.name, account: input.phone, amount: input.amountKes, narrative: input.narrative }
      : { name: input.name, account: input.account, bank_code: input.bankCode, amount: input.amountKes, narrative: input.narrative };
  const r = await call<SendBatch>("/api/v1/send-money/initiate/", {
    body: { provider: input.kind === "MPESA" ? "MPESA-B2C" : "PESALINK", currency: "KES", requires_approval: "NO", transactions: [tx] },
  });
  if (!r.tracking_id) throw new IntaSendError("IntaSend didn’t return a tracking number for this payment.");
  return { trackingId: r.tracking_id, statusCode: r.status_code ?? "" };
}

export type SendOutcome = { done: false } | { done: true; ok: true; reference: string | null } | { done: true; ok: false; reason: string };

/** Batch codes starting BF or BE, and transaction codes TF103, TF106 and TC108, are failures; BC100 with TS100 is success. */
export async function sendStatus(trackingId: string): Promise<SendOutcome> {
  const r = await call<SendBatch>("/api/v1/send-money/status/", { body: { tracking_id: trackingId } });
  const code = r.status_code ?? "";
  const tx = r.transactions?.[0];
  if (/^B[FE]/.test(code)) return { done: true, ok: false, reason: r.failed_reason || tx?.failed_reason || r.status || "IntaSend couldn’t process the payment." };
  if (code !== "BC100") return { done: false };
  if (tx?.status_code === "TS100") return { done: true, ok: true, reference: tx.transaction_id ?? null };
  if (tx?.status_code && ["TF103", "TF106", "TC108"].includes(tx.status_code)) return { done: true, ok: false, reason: tx.failed_reason || tx.status || "The payment failed." };
  return { done: false };
}

export async function bankCodes(): Promise<{ name: string; code: string }[]> {
  const r = await call<{ bank_name: string; bank_code: string | number }[]>("/api/v1/send-money/bank-codes/ke/", { method: "GET" });
  return (Array.isArray(r) ? r : []).map((b) => ({ name: b.bank_name, code: String(b.bank_code) })).sort((a, b) => a.name.localeCompare(b.name));
}
