"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createEnrollment } from "@/lib/actions/schedule";
import type { Conflict } from "@/lib/sessions";
import { CURRICULA } from "@/lib/roles";
import { hoursLabel } from "@/lib/schedule";
import { PersonPicker, type PickerOption } from "@/components/ui/PersonPicker";
import { ConflictList, SlotFields, emptySlot, type SlotDraft } from "@/components/schedule/SlotFields";

export type TeacherOption = PickerOption & { subjectIds: number[]; loadMinutes: number; capacityHours: number };
export type StudentOption = PickerOption & { curriculum: string | null; levelId: number | null };

export function EnrollmentForm({
  students,
  teachers,
  subjects,
  levels,
  initialStudentId,
}: {
  students: StudentOption[];
  teachers: TeacherOption[];
  subjects: { id: number; name: string }[];
  levels: { id: number; curriculum: string; name: string }[];
  initialStudentId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [studentIds, setStudentIds] = useState<string[]>(initialStudentId ? [initialStudentId] : []);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [teacherId, setTeacherId] = useState<string>("");
  const initial = students.find((s) => s.id === initialStudentId);
  const [curriculum, setCurriculum] = useState(initial?.curriculum ?? "");
  const [levelId, setLevelId] = useState<string>(initial?.levelId ? String(initial.levelId) : "");
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()]);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const eligible = useMemo(
    () => (subjectId === "" ? [] : teachers.filter((t) => t.subjectIds.includes(subjectId))),
    [teachers, subjectId],
  );
  const weeklyMinutes = slots.reduce((a, s) => a + s.durationMinutes, 0);

  const pickStudent = (ids: string[]) => {
    setStudentIds(ids);
    const s = students.find((x) => x.id === ids[0]);
    setCurriculum(s?.curriculum ?? "");
    setLevelId(s?.levelId ? String(s.levelId) : "");
    setConflicts([]);
  };

  const submit = (force: boolean) => {
    setErrors({});
    start(async () => {
      const res = await createEnrollment({
        studentId: studentIds[0] ?? "",
        subjectId: subjectId === "" ? (undefined as unknown as number) : subjectId,
        teacherId,
        curriculum: (curriculum || undefined) as "CAMBRIDGE" | undefined,
        levelId: levelId ? Number(levelId) : undefined,
        slots,
        meetingUrl,
        force,
      });
      if (!res.ok) {
        setConflicts(res.conflicts ?? []);
        setErrors(res.fieldErrors ?? {});
        if (!res.conflicts?.length) toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/admin/enrollments/${res.data!.id}`);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-6"
    >
      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-navy-900">Who and what</h2>
        <div>
          <label className="label">Student</label>
          <PersonPicker single options={students} value={studentIds} onChange={pickStudent} placeholder="Search students…" />
          {errors.studentId && <p className="mt-1 text-xs text-rose-600">{errors.studentId}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Subject</label>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value ? Number(e.target.value) : "");
                setTeacherId("");
                setConflicts([]);
              }}
            >
              <option value="">Choose…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.subjectId && <p className="mt-1 text-xs text-rose-600">{errors.subjectId}</p>}
          </div>
          <div>
            <label className="label">Level</label>
            <div className="grid grid-cols-[1fr_1.5fr] gap-2">
              <select
                className="input"
                value={curriculum}
                onChange={(e) => {
                  setCurriculum(e.target.value);
                  setLevelId("");
                }}
                aria-label="Curriculum"
              >
                <option value="">Curriculum</option>
                {CURRICULA.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select className="input" value={levelId} disabled={!curriculum} onChange={(e) => setLevelId(e.target.value)} aria-label="Level">
                <option value="">Level</option>
                {levels
                  .filter((l) => l.curriculum === curriculum)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-navy-400">Defaults to the student’s own level.</p>
          </div>
        </div>

        <div>
          <label className="label">Teacher</label>
          {subjectId === "" ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-navy-400">Choose a subject to see who teaches it.</p>
          ) : eligible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-3 text-sm text-amber-800">
              No teacher has this subject yet. Add it on a teacher’s profile first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {eligible.map((t) => {
                const after = t.loadMinutes + (teacherId === t.id ? weeklyMinutes : 0);
                const pct = Math.min(100, (after / (t.capacityHours * 60)) * 100);
                const over = after > t.capacityHours * 60;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setTeacherId(t.id);
                      setConflicts([]);
                    }}
                    aria-pressed={teacherId === t.id}
                    className={clsx(
                      "rounded-xl border p-3 text-left transition",
                      teacherId === t.id ? "border-navy-800 ring-2 ring-navy-800/10" : "border-line hover:border-navy-200",
                    )}
                  >
                    <p className="text-sm font-medium text-navy-900">
                      {t.firstName} {t.lastName}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-50">
                      <div className={clsx("h-full rounded-full", over ? "bg-rose-500" : "bg-gold-500")} style={{ width: `${pct}%` }} />
                    </div>
                    <p className={clsx("mt-1 text-[11px] tabular-nums", over ? "text-rose-600" : "text-navy-400")}>
                      {hoursLabel(after)} of {t.capacityHours} h a week{teacherId === t.id && weeklyMinutes ? " incl. this" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {errors.teacherId && <p className="mt-1 text-xs text-rose-600">{errors.teacherId}</p>}
        </div>
      </section>

      <section className="card space-y-3 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-navy-900">Weekly times</h2>
          <span className="text-xs tabular-nums text-navy-400">{hoursLabel(weeklyMinutes)} a week · Nairobi time</span>
        </div>
        {slots.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <SlotFields
                value={s}
                onChange={(v) => {
                  setSlots(slots.map((x, j) => (j === i ? v : x)));
                  setConflicts([]);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setSlots(slots.filter((_, j) => j !== i))}
              className="mt-1.5 rounded-md p-1.5 text-navy-300 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove time"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {slots.length < 7 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const last = slots[slots.length - 1];
              setSlots([...slots, last ? { ...last, weekday: nextDay(last.weekday) } : emptySlot()]);
            }}
          >
            <Plus className="h-4 w-4" /> Add another time
          </button>
        )}
        {slots.length === 0 && <p className="text-xs text-navy-400">No weekly time — you can add one later. No sessions will be created yet.</p>}
        {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
      </section>

      <section className="card space-y-2 p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-navy-900">Online lesson link</h2>
        <input
          className="input"
          placeholder="https://meet.google.com/abc-defg-hij"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          aria-label="Google Meet link"
        />
        {errors.meetingUrl ? (
          <p className="text-xs text-rose-600">{errors.meetingUrl}</p>
        ) : (
          <p className="text-xs text-navy-400">
            Optional now, required before the first lesson. One Google Meet link is used for every lesson; students and the teacher reach it through
            Join, which records attendance.
          </p>
        )}
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-6">
        <Link href="/admin/enrollments" className="btn-ghost">
          Cancel
        </Link>
        {conflicts.length > 0 && (
          <button type="button" className="btn-ghost" disabled={pending} onClick={() => submit(true)}>
            Save anyway
          </button>
        )}
        <button type="submit" className="btn-primary min-w-[150px]" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create enrollment"}
        </button>
      </div>
    </form>
  );
}

const ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const nextDay = (d: SlotDraft["weekday"]) => ORDER[(ORDER.indexOf(d) + 2) % 7]; // e.g. Mon → Wed
