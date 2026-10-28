"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteResource, updateResource } from "@/lib/actions/work";

/** Edit the title, instructions and due date, or remove the item (with everything turned in for it). */
export function ResourceControls({
  id,
  portal,
  kind,
  title,
  description,
  dueDate,
  submissions,
}: {
  id: number;
  portal: "admin" | "teacher";
  kind: "DOCUMENT" | "WORKSHEET";
  title: string;
  description: string | null;
  dueDate: string | null;
  submissions: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description ?? "");
  const [due, setDue] = useState(dueDate ?? "");

  const save = () =>
    start(async () => {
      const r = await updateResource(id, {
        title: t,
        description: d || undefined,
        dueDate: due,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setEditing(false);
      router.refresh();
    });
  const remove = () => {
    const warn = submissions
      ? `Remove “${title}”? ${submissions} turned-in ${submissions === 1 ? "piece of work" : "pieces of work"} and all comments on it will be deleted too.`
      : `Remove “${title}”? Students will no longer see it.`;
    if (!confirm(warn)) return;
    start(async () => {
      const r = await deleteResource(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.push(`/${portal}/resources`);
    });
  };

  if (!editing) {
    return (
      <div className="flex gap-2">
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button type="button" className="btn-danger px-3 py-1.5 text-xs" onClick={remove} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remove
        </button>
      </div>
    );
  }
  return (
    <form
      className="w-full space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input className="input" value={t} onChange={(e) => setT(e.target.value)} aria-label="Title" maxLength={140} />
      <textarea className="input min-h-[80px]" value={d} onChange={(e) => setD(e.target.value)} aria-label="Instructions" placeholder="Instructions" />
      {kind === "WORKSHEET" && (
        <label className="block">
          <span className="label">Due date</span>
          <input type="date" className="input sm:w-56" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </form>
  );
}
