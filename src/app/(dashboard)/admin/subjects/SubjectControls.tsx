"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import clsx from "clsx";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { createSubject, deleteSubject, renameSubject, setSubjectTeachers } from "@/lib/actions/subjects";
import { CheckList } from "@/components/ui/CheckList";

type Teacher = { id: string; name: string };

const codeFrom = (name: string) => {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words.length === 1 ? words[0].slice(0, 4) : words.map((w) => w.slice(0, 3)).join("").slice(0, 8);
};

export function NewSubjectForm({ teachers }: { teachers: Teacher[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const shownCode = codeTouched ? code : codeFrom(name);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createSubject({ name, code: shownCode || undefined, teacherIds });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          setName("");
          setCode("");
          setCodeTouched(false);
          setTeacherIds([]);
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="label">Subject name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Robotics" maxLength={60} required />
      </label>
      <label className="block">
        <span className="label">Short code</span>
        <input
          className="input font-mono uppercase tabular-nums"
          value={shownCode}
          onChange={(e) => {
            setCodeTouched(true);
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
          }}
          placeholder="ROBO"
        />
        <span className="mt-1 block text-[11px] text-navy-400">Used for the subject’s colour on timetables. Filled in for you.</span>
      </label>
      <div>
        <span className="label">Who teaches it</span>
        <CheckList
          options={teachers.map((t) => ({ id: t.id, label: t.name }))}
          value={teacherIds}
          onChange={setTeacherIds}
          empty="No teachers yet. Add them under People."
          columns={1}
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending || name.trim().length < 2}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add subject
      </button>
    </form>
  );
}

export function SubjectRow({
  subject,
  tint,
  teacherIds,
  teachers,
  students,
  busy,
  removable,
}: {
  subject: { id: number; name: string; code: string };
  tint: string;
  teacherIds: string[];
  teachers: Teacher[];
  students: number;
  busy: Record<string, number>;
  removable: boolean;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<null | "rename" | "teachers">(null);
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code);
  const [chosen, setChosen] = useState(teacherIds);
  const [pending, start] = useTransition();
  const names = teachers.filter((t) => teacherIds.includes(t.id)).map((t) => t.name);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setPanel(null);
      router.refresh();
    });

  return (
    <li id={`subject-${subject.id}`} className="scroll-mt-24 px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={clsx("h-9 w-1 shrink-0 border-l-[3px]", tint)} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="font-medium text-navy-900">{subject.name}</span>
            <span className="font-mono text-[11px] text-navy-400">{subject.code}</span>
          </p>
          <p className={clsx("truncate text-xs", names.length ? "text-navy-500" : "text-amber-700")}>
            {names.length ? names.join(", ") : "No teacher yet, so students can’t be enrolled"}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs tabular-nums text-navy-500" title="Students taking it now">
          <Users className="h-3.5 w-3.5" /> {students}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-ghost px-2.5 py-1 text-xs"
            onClick={() => {
              setChosen(teacherIds);
              setPanel(panel === "teachers" ? null : "teachers");
            }}
          >
            Teachers
          </button>
          <button
            type="button"
            className="p-1.5 text-navy-300 hover:bg-navy-50 hover:text-navy-700"
            aria-label={`Rename ${subject.name}`}
            onClick={() => {
              setName(subject.name);
              setCode(subject.code);
              setPanel(panel === "rename" ? null : "rename");
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!removable || pending}
            title={removable ? `Remove ${subject.name}` : "Has students or files on record, so it’s kept"}
            aria-label={`Remove ${subject.name}`}
            className="p-1.5 text-navy-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy-300"
            onClick={() => {
              if (!confirm(`Remove ${subject.name} from the subject list?`)) return;
              run(() => deleteSubject(subject.id));
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {panel === "rename" && (
        <form
          className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_120px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameSubject(subject.id, { name, code }));
          }}
        >
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Subject name" maxLength={60} />
          <input
            className="input font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            aria-label="Short code"
          />
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </form>
      )}

      {panel === "teachers" && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <CheckList
            options={teachers.map((t) => ({
              id: t.id,
              label: t.name,
              lockedReason: busy[t.id] ? `Teaching ${busy[t.id]} ${busy[t.id] === 1 ? "student" : "students"} now` : undefined,
            }))}
            value={chosen}
            onChange={setChosen}
            empty="No teachers yet. Add them under People."
          />
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin/people/new" className="text-xs font-medium text-navy-500 hover:text-navy-900">
              New teacher →
            </Link>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => setPanel(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() => run(() => setSubjectTeachers(subject.id, [...new Set([...chosen, ...Object.keys(busy)])]))}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save teachers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
