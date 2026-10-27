"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Link2, Loader2, Star, Trash2, X } from "lucide-react";
import { linkGuardian, makePrimaryGuardian, unlinkGuardian } from "@/lib/actions/people";
import { RELATIONSHIPS, relationshipLabel } from "@/lib/roles";
import { Avatar, Badge, EmptyState } from "@/components/ui/primitives";
import { PersonPicker, type PickerOption } from "@/components/ui/PersonPicker";
import { HeartHandshake } from "lucide-react";

export type FamilyLink = {
  otherId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  meta?: string;
  relationship: string;
  isPrimary: boolean;
};

/**
 * Manages ParentStudent links from either side.
 *   mode="children"  → viewing a parent; links are their children
 *   mode="guardians" → viewing a student; links are their guardians
 */
export function FamilyLinks({
  mode,
  selfId,
  links,
  candidates,
}: {
  mode: "children" | "guardians";
  selfId: string;
  links: FamilyLink[];
  candidates: PickerOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const [relationship, setRelationship] = useState("GUARDIAN");
  const [primary, setPrimary] = useState(false);

  const ids = (otherId: string) =>
    mode === "children" ? { parentId: selfId, studentId: otherId } : { parentId: otherId, studentId: selfId };

  const run = (key: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => {
    setBusy(key);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (res.ok) toast.success(res.message ?? "Saved");
      else toast.error(res.error ?? "Something went wrong");
    });
  };

  const available = candidates.filter((c) => !links.some((l) => l.otherId === c.id));
  const noun = mode === "children" ? "student" : "parent or guardian";

  return (
    <div>
      {links.length === 0 && !adding ? (
        <EmptyState
          icon={HeartHandshake}
          title={mode === "children" ? "No students linked yet" : "No parent or guardian linked yet"}
          action={
            <button className="btn-gold" onClick={() => setAdding(true)}>
              <Link2 className="h-4 w-4" /> Link a {noun}
            </button>
          }
        >
          {mode === "children"
            ? "Link this parent to their students so they can see lessons, attendance, reports and invoices."
            : "A parent or guardian receives weekly reports and invoices for this student."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {links.map((l) => (
            <li key={l.otherId} className="flex items-center gap-3 py-3 first:pt-0">
              <Avatar person={{ id: l.otherId, ...l }} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/people/${l.otherId}`}
                  className="font-medium text-navy-900 hover:underline hover:decoration-gold-400 hover:underline-offset-4"
                >
                  {l.firstName} {l.lastName}
                </Link>
                <p className="truncate text-xs text-navy-400">
                  {mode === "guardians"
                    ? [relationshipLabel(l.relationship), l.meta].filter(Boolean).join(" · ")
                    : [l.meta, `Relationship: ${relationshipLabel(l.relationship)}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              {l.isPrimary ? (
                <Badge tone="gold">
                  <Star className="h-3 w-3 fill-current" /> Primary contact
                </Badge>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const { parentId, studentId } = ids(l.otherId);
                    run(`p-${l.otherId}`, () => makePrimaryGuardian(parentId, studentId));
                  }}
                  className="hidden rounded-md px-2 py-1 text-xs text-navy-400 hover:bg-navy-50 hover:text-navy-700 sm:block"
                >
                  {busy === `p-${l.otherId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Make primary"}
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Remove this link? Both accounts are kept; the parent will no longer see this student.`)) return;
                  const { parentId, studentId } = ids(l.otherId);
                  run(`u-${l.otherId}`, () => unlinkGuardian(parentId, studentId));
                }}
                className="rounded-md p-1.5 text-navy-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Unlink ${l.firstName}`}
                title="Unlink"
              >
                {busy === `u-${l.otherId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-navy-900">Link a {noun}</p>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setPick([]);
              }}
              className="rounded p-1 text-navy-400 hover:bg-white hover:text-navy-700"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <PersonPicker
              single
              options={available}
              value={pick}
              onChange={setPick}
              placeholder={mode === "children" ? "Search students…" : "Search parents…"}
              emptyText={available.length ? "No matches" : `Everyone is already linked`}
            />
            <select className="input" value={relationship} onChange={(e) => setRelationship(e.target.value)} aria-label="Relationship">
              {RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-navy-600">
              <input
                type="checkbox"
                checked={primary}
                onChange={(e) => setPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-line text-navy-800 focus:ring-gold-300"
              />
              Primary contact (receives invoices and reports)
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={!pick.length || pending}
              onClick={() => {
                const { parentId, studentId } = ids(pick[0]);
                run("add", async () => {
                  const res = await linkGuardian({
                    parentId,
                    studentId,
                    relationship: relationship as "GUARDIAN",
                    isPrimary: primary,
                  });
                  if (res.ok) {
                    setPick([]);
                    setPrimary(false);
                    setAdding(false);
                  }
                  return res;
                });
              }}
            >
              {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Link
            </button>
          </div>
        </div>
      ) : (
        links.length > 0 && (
          <button type="button" className="btn-ghost mt-4" onClick={() => setAdding(true)}>
            <Link2 className="h-4 w-4" /> Link another {noun}
          </button>
        )
      )}
    </div>
  );
}
