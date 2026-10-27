"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import {
  Check,
  Copy,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Loader2,
  Presentation,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { createPerson } from "@/lib/actions/people";
import { generatePassword, suggestUsername } from "@/lib/password";
import { CURRICULA } from "@/lib/roles";
import { PersonPicker, type PickerOption } from "@/components/ui/PersonPicker";

type RoleValue = "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";

const ROLE_CARDS: { value: RoleValue; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "STUDENT", label: "Student", hint: "Joins classes, sees resources", icon: GraduationCap },
  { value: "PARENT", label: "Parent", hint: "Follows children, pays fees", icon: HeartHandshake },
  { value: "TEACHER", label: "Teacher", hint: "Teaches their own students", icon: Presentation },
  { value: "ADMIN", label: "Admin", hint: "Runs the centre", icon: ShieldCheck },
];

type Level = { id: number; curriculum: string; name: string };

export function CreatePersonForm({
  initialRole,
  subjects,
  levels,
  parents,
  students,
}: {
  initialRole: RoleValue;
  subjects: { id: number; name: string }[];
  levels: Level[];
  parents: PickerOption[];
  students: PickerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<RoleValue>(initialRole);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ id: string; name: string; username: string; password: string } | null>(null);

  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    // student
    curriculum: "" as string,
    levelId: "" as string,
    dateOfBirth: "",
    school: "",
    guardianIds: [] as string[],
    // parent
    occupation: "",
    address: "",
    childIds: [] as string[],
    // teacher
    subjectIds: [] as number[],
    hourlyRateKes: "",
    weeklyCapacityHours: "20",
    bio: "",
  });
  const [usernameTouched, setUsernameTouched] = useState(false);
  // Generated on the client only, so server and client HTML match.
  useEffect(() => setF((prev) => (prev.password ? prev : { ...prev, password: generatePassword() })), []);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (!usernameTouched && (k === "firstName" || k === "lastName")) {
        next.username = suggestUsername(next.firstName, next.lastName);
      }
      if (k === "curriculum") next.levelId = "";
      return next;
    });
    setErrors((e) => {
      const { [k as string]: _, ...rest } = e;
      return rest;
    });
  };

  const levelOptions = useMemo(() => levels.filter((l) => l.curriculum === f.curriculum), [levels, f.curriculum]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const common = {
      firstName: f.firstName,
      lastName: f.lastName,
      email: f.email,
      phone: f.phone,
      username: f.username,
      password: f.password,
    };
    const payload =
      role === "STUDENT"
        ? {
            ...common,
            role,
            curriculum: (f.curriculum || undefined) as "CAMBRIDGE" | undefined,
            levelId: f.levelId ? Number(f.levelId) : undefined,
            dateOfBirth: f.dateOfBirth,
            school: f.school,
            guardianIds: f.guardianIds,
          }
        : role === "PARENT"
          ? { ...common, role, occupation: f.occupation, address: f.address, childIds: f.childIds }
          : role === "TEACHER"
            ? {
                ...common,
                role,
                subjectIds: f.subjectIds,
                hourlyRateKes: Number(f.hourlyRateKes || 0),
                weeklyCapacityHours: Number(f.weeklyCapacityHours || 20),
                bio: f.bio,
              }
            : { ...common, role };

    startTransition(async () => {
      const res = await createPerson(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setDone({ id: res.data!.id, name: `${f.firstName} ${f.lastName}`, username: f.username, password: f.password });
      router.refresh();
    });
  };

  if (done) return <Credentials done={done} onAnother={() => window.location.reload()} />;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {/* Role */}
      <fieldset>
        <legend className="label">Who are you adding?</legend>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ROLE_CARDS.map((c) => {
            const active = role === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setRole(c.value)}
                aria-pressed={active}
                className={clsx(
                  "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                  active
                    ? "border-navy-800 bg-navy-800 text-white shadow-lift"
                    : "border-line bg-white text-navy-800 hover:border-navy-200",
                )}
              >
                <c.icon className={clsx("h-5 w-5", active ? "text-gold-400" : "text-navy-400")} strokeWidth={1.75} />
                <span className="font-display text-sm font-semibold">{c.label}</span>
                <span className={clsx("text-xs", active ? "text-navy-200" : "text-navy-400")}>{c.hint}</span>
                {active && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-navy-950">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Section title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName}>
            <input className="input" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus />
          </Field>
          <Field label="Last name" error={errors.lastName}>
            <input className="input" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
          <Field
            label="Phone"
            optional={role !== "PARENT"}
            hint={role === "PARENT" ? "Used for M-Pesa payment prompts" : undefined}
            error={errors.phone}
          >
            <input
              className="input tabular-nums"
              inputMode="tel"
              placeholder="0712 345 678"
              value={f.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Email" optional error={errors.email}>
            <input className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
      </Section>

      {role === "STUDENT" && (
        <Section title="Learning">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Curriculum" optional>
              <select className="input" value={f.curriculum} onChange={(e) => set("curriculum", e.target.value)}>
                <option value="">Not set</option>
                {CURRICULA.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Level" optional hint={!f.curriculum ? "Choose a curriculum first" : undefined}>
              <select
                className="input"
                value={f.levelId}
                disabled={!f.curriculum}
                onChange={(e) => set("levelId", e.target.value)}
              >
                <option value="">Not set</option>
                {levelOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth" optional>
              <input className="input" type="date" value={f.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Day school" optional hint="If they also attend a school">
              <input className="input" value={f.school} onChange={(e) => set("school", e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Guardians" optional hint="The first one you add becomes the primary contact for invoices and reports.">
              <PersonPicker
                options={parents}
                value={f.guardianIds}
                onChange={(v) => set("guardianIds", v)}
                placeholder="Search parents…"
                emptyText="No parent with that name — add the parent first, or link later."
              />
            </Field>
          </div>
        </Section>
      )}

      {role === "PARENT" && (
        <Section title="Family">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Occupation" optional>
              <input className="input" value={f.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </Field>
            <Field label="Area / address" optional>
              <input className="input" placeholder="e.g. Kileleshwa" value={f.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Children" optional hint="You can link more children, or change these, from the parent's profile.">
              <PersonPicker
                options={students}
                value={f.childIds}
                onChange={(v) => set("childIds", v)}
                placeholder="Search students…"
              />
            </Field>
          </div>
        </Section>
      )}

      {role === "TEACHER" && (
        <Section title="Teaching">
          <Field label="Subjects" optional hint="Enrollments in Module 2 are limited to these subjects.">
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = f.subjectIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set("subjectIds", on ? f.subjectIds.filter((x) => x !== s.id) : [...f.subjectIds, s.id])
                    }
                    className={clsx(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      on
                        ? "border-navy-800 bg-navy-800 text-white"
                        : "border-line bg-white text-navy-600 hover:border-navy-200",
                    )}
                  >
                    {on && <Check className="-ml-0.5 mr-1 inline h-3 w-3 text-gold-400" strokeWidth={3} />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Payout rate" optional hint="KES per hour taught — used for payouts" error={errors.hourlyRateKes}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-navy-400">
                  KES
                </span>
                <input
                  className="input pl-12 tabular-nums"
                  inputMode="numeric"
                  placeholder="1,500"
                  value={f.hourlyRateKes}
                  onChange={(e) => set("hourlyRateKes", e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </Field>
            <Field label="Weekly capacity" hint="Hours available — drives the utilization view" error={errors.weeklyCapacityHours}>
              <div className="relative">
                <input
                  className="input pr-14 tabular-nums"
                  inputMode="numeric"
                  value={f.weeklyCapacityHours}
                  onChange={(e) => set("weeklyCapacityHours", e.target.value.replace(/[^\d]/g, ""))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">
                  hrs/wk
                </span>
              </div>
            </Field>
          </div>
        </Section>
      )}

      <Section title="Login" icon={KeyRound}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" error={errors.username} hint="Lowercase, used to sign in">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-navy-300">@</span>
              <input
                className="input pl-7"
                value={f.username}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => {
                  setUsernameTouched(true);
                  set("username", e.target.value.toLowerCase().replace(/\s/g, ""));
                }}
              />
            </div>
          </Field>
          <Field label="Temporary password" error={errors.password} hint="You'll see it once more after saving">
            <div className="flex gap-2">
              <input
                className="input font-mono text-[13px]"
                value={f.password}
                spellCheck={false}
                onChange={(e) => set("password", e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost shrink-0 px-3"
                onClick={() => set("password", generatePassword())}
                aria-label="Generate a new password"
                title="Generate"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-6">
        <Link href="/admin/people" className="btn-ghost">
          Cancel
        </Link>
        <button type="submit" className="btn-primary min-w-[140px]" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${ROLE_CARDS.find((r) => r.value === role)!.label.toLowerCase()}`}
        </button>
      </div>
    </form>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-navy-900">
        {Icon && <Icon className="h-4 w-4 text-gold-500" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-navy-300">optional</span>}
      </label>
      <div className={clsx(error && "[&_.input]:border-rose-300 [&_.input]:ring-2 [&_.input]:ring-rose-100")}>{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>
      )}
    </div>
  );
}

function Credentials({
  done,
  onAnother,
}: {
  done: { id: string; name: string; username: string; password: string };
  onAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = () =>
    `Crest Learning sign-in\n${window.location.origin}/sign-in\nUsername: ${done.username}\nPassword: ${done.password}`;
  return (
    <div className="card mx-auto max-w-lg overflow-hidden">
      <div className="bg-navy-800 px-6 py-5 text-white">
        <p className="eyebrow text-gold-400">Account created</p>
        <h2 className="mt-1 font-display text-lg font-semibold">{done.name} can now sign in</h2>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm text-navy-500">
          Share these details privately. This is the only time the password is shown.
        </p>
        <dl className="divide-y divide-line rounded-lg border border-line">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-xs text-navy-400">Username</dt>
            <dd className="font-mono text-sm text-navy-900">{done.username}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-xs text-navy-400">Password</dt>
            <dd className="font-mono text-sm text-navy-900">{done.password}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-gold"
            onClick={async () => {
              await navigator.clipboard.writeText(text());
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy details"}
          </button>
          <Link href={`/admin/people/${done.id}`} className="btn-primary">
            Open profile
          </Link>
          <button type="button" className="btn-ghost" onClick={onAnother}>
            Add another
          </button>
        </div>
      </div>
    </div>
  );
}
