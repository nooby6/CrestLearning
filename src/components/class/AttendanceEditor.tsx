"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Loader2, Pencil } from "lucide-react";
import { overrideAttendance } from "@/lib/actions/lessons";
import { ATTENDANCE_LABEL } from "@/lib/classroom";
import { Avatar, Badge } from "@/components/ui/primitives";

type Status = keyof typeof ATTENDANCE_LABEL;
const TONE: Record<Status, "green" | "amber" | "rose" | "slate"> = { PRESENT: "green", LATE: "amber", ABSENT: "rose", EXCUSED: "slate" };

export type AttendanceRow = {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roleLabel: string; // "Student" | "Teacher"
  status: Status | null;
  source: "AUTO" | "MANUAL" | null;
  detail: string; // "Joined 16:32 · 54 min"
  reason: string | null;
  editable: boolean;
};

export function AttendanceEditor({ sessionId, rows, canEdit }: { sessionId: number; rows: AttendanceRow[]; canEdit: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <Row key={r.userId} sessionId={sessionId} row={r} canEdit={canEdit && r.editable} />
      ))}
    </ul>
  );
}

function Row({ sessionId, row, canEdit }: { sessionId: number; row: AttendanceRow; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>(row.status ?? "PRESENT");
  const [reason, setReason] = useState(row.reason ?? "");
  const [pending, start] = useTransition();

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Avatar person={{ id: row.userId, ...row }} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-navy-900">
            {row.firstName} {row.lastName} <span className="font-normal text-navy-400">· {row.roleLabel}</span>
          </p>
          <p className="truncate text-xs text-navy-400">
            {row.detail}
            {row.source === "MANUAL" && " · set manually"}
            {row.reason && ` · ${row.reason}`}
          </p>
        </div>
        {row.status ? <Badge tone={TONE[row.status]}>{ATTENDANCE_LABEL[row.status]}</Badge> : <Badge tone="slate">Not yet recorded</Badge>}
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="rounded-md p-1.5 text-navy-300 hover:bg-navy-50 hover:text-navy-700" aria-label={`Change attendance for ${row.firstName}`}>
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-ivory/60 p-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Attendance">
            {(Object.keys(ATTENDANCE_LABEL) as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  status === s ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-navy-600 hover:border-navy-200",
                )}
              >
                {ATTENDANCE_LABEL[s]}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Reason (optional), e.g. connection problems — taught by phone" value={reason} onChange={(e) => setReason(e.target.value)} />
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
                  const r = await overrideAttendance(sessionId, { userId: row.userId, status, reason });
                  if (r.ok) {
                    toast.success(r.message);
                    setEditing(false);
                  } else toast.error(r.error);
                })
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
