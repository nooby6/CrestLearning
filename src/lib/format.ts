export const fullName = (u: { firstName: string; lastName: string }) =>
  `${u.firstName} ${u.lastName}`.trim();

export const initials = (u: { firstName: string; lastName: string }) =>
  `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();

const kes = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

/** Money is stored in minor units (cents). */
export const formatMoney = (minor: number, currency = "KES") =>
  currency === "KES"
    ? kes.format(minor / 100)
    : new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(minor / 100);

const TZ = "Africa/Nairobi";

export const formatDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
    ...opts,
  }).format(new Date(d));

export const greeting = (now = new Date()) => {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(now),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export const ageFrom = (dob?: Date | null) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

/** Normalise Kenyan numbers to E.164: 0712 345 678 → +254712345678 */
export const normalisePhone = (raw?: string | null) => {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  if (/^[71]\d{8}$/.test(digits)) return `+254${digits}`;
  return digits;
};

export const prettyPhone = (e164?: string | null) => {
  if (!e164) return "—";
  const m = e164.match(/^\+254(\d{3})(\d{3})(\d{3})$/);
  return m ? `+254 ${m[1]} ${m[2]} ${m[3]}` : e164;
};

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;
