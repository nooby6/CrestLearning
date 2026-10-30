import clsx from "clsx";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ROLE_LABEL, type RoleSlug } from "@/lib/roles";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-banner">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-white">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-navy-100">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-3.5">
          <div>
            {title && (
              <h2 className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wide text-navy-900">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-gold-500" />
                {title}
              </h2>
            )}
            {description && <p className="mt-1 pl-[18px] text-xs text-navy-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={clsx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const TONES = {
  navy: "bg-navy-100 text-navy-900 ring-navy-300",
  gold: "bg-gold-100 text-gold-900 ring-gold-400",
  green: "bg-emerald-100 text-emerald-900 ring-emerald-400",
  amber: "bg-amber-100 text-amber-900 ring-amber-400",
  rose: "bg-rose-100 text-rose-900 ring-rose-400",
  slate: "bg-slate-100 text-slate-800 ring-slate-300",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "navy", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
      "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const AVATAR_TINTS = [
  "bg-navy-800 text-gold-300",
  "bg-gold-500 text-navy-950",
  "bg-navy-100 text-navy-800",
  "bg-gold-100 text-gold-800",
  "bg-navy-600 text-white",
];

export function Avatar({
  person,
  size = "md",
}: {
  person: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-base" }[size];
  const tint = AVATAR_TINTS[[...person.id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  if (person.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={person.avatarUrl} alt="" className={clsx(dims, "shrink-0 rounded-full object-cover")} />;
  }
  return (
    <span
      aria-hidden
      className={clsx(dims, tint, "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold")}
    >
      {`${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()}
    </span>
  );
}

const STAT_TONES = {
  navy: { bar: "border-t-navy-800", icon: "bg-navy-800 text-gold-400" },
  gold: { bar: "border-t-gold-500", icon: "bg-gold-500 text-navy-950" },
  teal: { bar: "border-t-teal-600", icon: "bg-teal-600 text-white" },
  sky: { bar: "border-t-sky-600", icon: "bg-sky-600 text-white" },
  rose: { bar: "border-t-rose-600", icon: "bg-rose-600 text-white" },
} as const;
export type StatTone = keyof typeof STAT_TONES;

/** A key figure: hairline box with a coloured left rule, caps label, large tabular number. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "navy",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  tone?: StatTone;
}) {
  const body = (
    <div className={clsx("card flex h-full items-start justify-between gap-3 border-t-4 px-5 py-4", STAT_TONES[tone].bar, href && "card-link")}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">{label}</p>
        <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tabular-nums text-navy-900">{value}</p>
        {hint && <p className="mt-2 truncate text-xs text-navy-400">{hint}</p>}
      </div>
      <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center", STAT_TONES[tone].icon)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line-strong bg-white px-6 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center border border-line text-navy-500">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="font-display text-sm font-semibold text-navy-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs text-navy-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{i.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-navy-900">{i.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ComingNext({ module, children }: { module: string; children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong bg-white p-5">
      <p className="eyebrow">{module}</p>
      <p className="mt-1.5 text-sm text-navy-600">{children}</p>
    </div>
  );
}

export function RoleBadge({ role }: { role: RoleSlug }) {
  const tone = { admin: "navy", teacher: "gold", student: "navy", parent: "slate" } as const;
  return <Badge tone={tone[role]}>{ROLE_LABEL[role]}</Badge>;
}
