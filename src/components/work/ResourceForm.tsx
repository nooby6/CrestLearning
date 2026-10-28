"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { ClipboardList, FileText, Link2, Loader2, User, Users } from "lucide-react";
import { createResource } from "@/lib/actions/work";
import { FileDrop } from "./FileDrop";
import type { FileInfo } from "./FileChip";

export type EnrollmentOption = {
  id: number;
  subjectId: number;
  subject: string;
  student: string;
  teacher: string;
  level: { id: number; name: string } | null;
};
export type SubjectOption = {
  id: number;
  name: string;
  levels: { id: number; name: string }[];
};

export function ResourceForm({
  portal,
  enrollments,
  subjects,
  initialEnrollmentId,
  requestId,
  requestText,
}: {
  portal: "admin" | "teacher";
  enrollments: EnrollmentOption[];
  subjects: SubjectOption[];
  initialEnrollmentId?: number;
  requestId?: number;
  requestText?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"WORKSHEET" | "DOCUMENT">("WORKSHEET");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [audience, setAudience] = useState<"enrollment" | "subject">(initialEnrollmentId || !subjects.length ? "enrollment" : "subject");
  const [enrollmentId, setEnrollmentId] = useState<string>(initialEnrollmentId ? String(initialEnrollmentId) : "");
  const [subjectId, setSubjectId] = useState<string>(subjects.length === 1 ? String(subjects[0].id) : "");
  const [levelId, setLevelId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const levels = useMemo(() => subjects.find((s) => String(s.id) === subjectId)?.levels ?? [], [subjects, subjectId]);
  const reach = useMemo(() => {
    if (audience === "enrollment") return enrollmentId ? 1 : 0;
    return enrollments.filter((e) => String(e.subjectId) === subjectId && (!levelId || String(e.level?.id) === levelId)).length;
  }, [audience, enrollmentId, enrollments, subjectId, levelId]);

  const submit = () => {
    setErrors({});
    start(async () => {
      const res = await createResource({
        as: portal,
        title,
        description: description || undefined,
        kind,
        fileId: files[0]?.id,
        linkUrl: linkUrl || undefined,
        dueDate: kind === "WORKSHEET" && dueDate ? dueDate : undefined,
        audience:
          audience === "enrollment"
            ? { type: "enrollment", enrollmentId: Number(enrollmentId) || 0 }
            : {
                type: "subject",
                subjectId: Number(subjectId) || 0,
                levelId: levelId ? Number(levelId) : undefined,
              },
        requestId,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/${portal}/resources/${res.data!.id}`);
    });
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {requestText && (
        <div className="rounded-xl border border-gold-200 bg-gold-50/60 px-4 py-3 text-sm text-navy-800">
          <p className="eyebrow mb-1">Answering a request</p>“{requestText}”
          <p className="mt-1 text-xs text-navy-500">Sharing this marks the request as done.</p>
        </div>
      )}

      <section className="card space-y-5 p-5 sm:p-6">
        <div>
          <p className="label">What are you sharing?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  k: "WORKSHEET",
                  icon: ClipboardList,
                  title: "Worksheet",
                  text: "Students complete it and turn it in. You mark it.",
                },
                {
                  k: "DOCUMENT",
                  icon: FileText,
                  title: "Document",
                  text: "Notes, past papers or reading to view and download.",
                },
              ] as const
            ).map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setKind(o.k)}
                aria-pressed={kind === o.k}
                className={clsx(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition",
                  kind === o.k ? "border-gold-400 bg-gold-50/60 ring-2 ring-gold-200" : "border-line hover:border-gold-300 hover:bg-ivory",
                )}
              >
                <span
                  className={clsx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    kind === o.k ? "bg-gold-500 text-white" : "bg-navy-50 text-navy-600",
                  )}
                >
                  <o.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy-900">{o.title}</span>
                  <span className="block text-xs text-navy-500">{o.text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "WORKSHEET" ? "e.g. Quadratic equations — practice set 2" : "e.g. Chapter 4 notes: Cell structure"}
              maxLength={140}
            />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
          </div>
          {kind === "WORKSHEET" && (
            <div>
              <label className="label" htmlFor="due">
                Due date <span className="font-normal text-navy-400">optional</span>
              </label>
              <input id="due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="desc">
            Instructions <span className="font-normal text-navy-400">optional</span>
          </label>
          <textarea
            id="desc"
            className="input min-h-[88px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              kind === "WORKSHEET" ? "e.g. Answer questions 1–10. Show your working. Photos of handwritten work are fine." : "What it is and how to use it"
            }
          />
        </div>

        <div>
          <p className="label">File</p>
          <FileDrop purpose="resource" value={files} onChange={setFiles} onBusyChange={setBusy} />
          {errors.fileId && <p className="mt-1 text-xs text-rose-600">{errors.fileId}</p>}
          {showLink ? (
            <div className="mt-3">
              <label className="label" htmlFor="link">
                Link <span className="font-normal text-navy-400">e.g. a video or online exercise</span>
              </label>
              <input id="link" className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
              {errors.linkUrl && <p className="mt-1 text-xs text-rose-600">{errors.linkUrl}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-navy-500 hover:text-navy-800"
            >
              <Link2 className="h-3.5 w-3.5" /> Add a link instead of (or as well as) a file
            </button>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-sm font-semibold text-navy-900">Who gets it?</h2>
          <p className="text-xs text-navy-500">Students see it straight away. Their parents can see it too.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                k: "enrollment",
                icon: User,
                title: "One student",
                text: "For one student’s subject",
              },
              {
                k: "subject",
                icon: Users,
                title: portal === "admin" ? "Everyone taking a subject" : "All my students in a subject",
                text: portal === "admin" ? "Optionally only one level" : "Optionally only one level",
              },
            ] as const
          ).map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => setAudience(o.k)}
              aria-pressed={audience === o.k}
              disabled={o.k === "subject" && !subjects.length}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition disabled:opacity-50",
                audience === o.k ? "border-navy-700 bg-navy-50/60 ring-2 ring-navy-100" : "border-line hover:border-navy-200 hover:bg-ivory",
              )}
            >
              <span
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  audience === o.k ? "bg-navy-800 text-gold-300" : "bg-navy-50 text-navy-600",
                )}
              >
                <o.icon className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-navy-900">{o.title}</span>
                <span className="block text-xs text-navy-500">{o.text}</span>
              </span>
            </button>
          ))}
        </div>

        {audience === "enrollment" ? (
          <div>
            <label className="label" htmlFor="enr">
              Student and subject
            </label>
            <select id="enr" className="input" value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)}>
              <option value="">Choose…</option>
              {enrollments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.student} · {e.subject}
                  {portal === "admin" ? ` (${e.teacher})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sub">
                Subject
              </label>
              <select
                id="sub"
                className="input"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setLevelId("");
                }}
              >
                <option value="">Choose…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="lvl">
                Level
              </label>
              <select id="lvl" className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!levels.length}>
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <p className="text-xs text-navy-500">
          {reach ? (
            <>
              Reaches <b className="text-navy-800">{reach}</b> {reach === 1 ? "student" : "students"} now
              {audience === "subject" && " — and anyone who joins later"}.
            </>
          ) : (
            "Choose who should get it."
          )}
        </p>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link href={`/${portal}/resources`} className="btn-ghost">
          Cancel
        </Link>
        <button type="submit" className="btn-primary" disabled={pending || busy}>
          {(pending || busy) && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Uploading…" : kind === "WORKSHEET" ? "Share worksheet" : "Share document"}
        </button>
      </div>
    </form>
  );
}
