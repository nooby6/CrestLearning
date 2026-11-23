"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, Pencil } from "lucide-react";
import { setTeacherSubjects } from "@/lib/actions/subjects";
import { CheckList } from "@/components/ui/CheckList";

/** Which subjects a teacher teaches. Subjects they still have students in stay ticked. */
export function TeacherSubjectsEditor({
  teacherId,
  firstName,
  subjects,
  current,
  busy,
}: {
  teacherId: string;
  firstName: string;
  subjects: { id: number; name: string }[];
  current: number[];
  /** subjectId → students they currently teach it to */
  busy: Record<number, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();

  if (!editing)
    return (
      <button
        type="button"
        className="btn-ghost px-3 py-1.5 text-xs"
        onClick={() => {
          setValue(current);
          setEditing(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" /> Edit subjects
      </button>
    );

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <p className="text-xs text-navy-500">
        Tick every subject {firstName} can teach. Only these teachers are offered when a student is enrolled in a subject.{" "}
        <Link href="/admin/subjects" className="font-medium text-navy-800 underline underline-offset-4">
          Add a new subject
        </Link>
      </p>
      <CheckList
        options={subjects.map((s) => ({
          id: s.id,
          label: s.name,
          lockedReason: busy[s.id] ? `Teaching ${busy[s.id]} ${busy[s.id] === 1 ? "student" : "students"} now` : undefined,
        }))}
        value={value}
        onChange={setValue}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const ids = [...new Set([...value, ...Object.keys(busy).map(Number)])];
              const r = await setTeacherSubjects(teacherId, ids);
              if (!r.ok) return void toast.error(r.error);
              toast.success(r.message);
              setEditing(false);
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save subjects
        </button>
      </div>
    </div>
  );
}
