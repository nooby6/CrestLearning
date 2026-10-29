import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ExternalLink, FolderOpen, Hand, MessageSquare } from "lucide-react";
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { dbDateKey } from "@/lib/schedule";
import { labelledEnrollments, threadFor, workForParent, workForStudent, type StudentWorkItem } from "@/lib/work-queries";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { FileChip } from "./FileChip";
import { KindIcon, WorkStateBadge, dueLabel } from "./bits";
import { CommentThread } from "./CommentThread";
import { RequestWorksheet } from "./RequestWorksheet";
import { Feedback, TurnInPanel } from "./TurnInPanel";

type Viewer = "student" | "parent";

function WorkRow({ item, href }: { item: StudentWorkItem; href: string }) {
  const due = item.kind === "WORKSHEET" && item.state !== "reviewed" && item.state !== "submitted" ? dueLabel(item.dueDate) : null;
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-ivory sm:px-5">
        <KindIcon kind={item.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy-900 group-hover:underline group-hover:decoration-gold-400 group-hover:underline-offset-4">{item.title}</p>
          <p className="truncate text-xs text-navy-400">
            {item.subject.name}
            {item.uploadedBy && ` · from ${fullName(item.uploadedBy)}`}
            {due && <span className={clsx(item.state === "overdue" ? "font-medium text-rose-600" : "")}> · {due}</span>}
          </p>
        </div>
        {item.comments > 0 && (
          <span className="hidden items-center gap-1 text-xs text-navy-400 sm:flex">
            <MessageSquare className="h-3.5 w-3.5" /> {item.comments}
          </span>
        )}
        {item.state ? <WorkStateBadge state={item.state} mark={item.submission?.mark} /> : <Badge tone="navy">Document</Badge>}
        <ArrowRight className="hidden h-4 w-4 shrink-0 text-navy-200 transition group-hover:translate-x-0.5 group-hover:text-gold-500 sm:block" />
      </Link>
    </li>
  );
}

function WorkSections({ items, hrefFor, viewer }: { items: StudentWorkItem[]; hrefFor: (i: StudentWorkItem) => string; viewer: Viewer }) {
  const byDue = (a: StudentWorkItem, b: StudentWorkItem) => (a.dueDate ? +a.dueDate : Infinity) - (b.dueDate ? +b.dueDate : Infinity);
  const todo = items.filter((i) => i.state === "todo" || i.state === "overdue").sort(byDue);
  const done = items.filter((i) => i.state === "submitted" || i.state === "reviewed");
  const docs = items.filter((i) => i.kind === "DOCUMENT");
  const you = viewer === "student";

  return (
    <div className="space-y-6">
      <Card
        title={
          <span className="flex items-center gap-2">
            Worksheets to do {todo.length > 0 && <Badge tone={todo.some((t) => t.state === "overdue") ? "rose" : "gold"}>{todo.length}</Badge>}
          </span>
        }
        bodyClassName="p-0"
      >
        {todo.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-5 text-sm text-navy-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {you ? "You’re all caught up." : "All caught up — nothing waiting to be turned in."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {todo.map((i) => (
              <WorkRow key={i.id} item={i} href={hrefFor(i)} />
            ))}
          </ul>
        )}
      </Card>
      {done.length > 0 && (
        <Card title="Turned in and marked" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {done.map((i) => (
              <WorkRow key={i.id} item={i} href={hrefFor(i)} />
            ))}
          </ul>
        </Card>
      )}
      <Card title="Documents" description="Notes, past papers and reading from teachers" bodyClassName="p-0">
        {docs.length === 0 ? (
          <p className="px-5 py-5 text-sm text-navy-400">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {docs.map((i) => (
              <WorkRow key={i.id} item={i} href={hrefFor(i)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Summary({ items }: { items: StudentWorkItem[] }) {
  const n = (s: string) => items.filter((i) => i.state === s).length;
  const tiles = [
    { label: "To do", value: n("todo"), cls: "bg-sky-600" },
    { label: "Overdue", value: n("overdue"), cls: "bg-rose-600" },
    { label: "Turned in", value: n("submitted"), cls: "bg-gold-500" },
    { label: "Marked", value: n("reviewed"), cls: "bg-emerald-600" },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="card relative overflow-hidden p-4">
          <span className={clsx("absolute inset-y-0 left-0 w-[3px]", t.cls)} />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">{t.label}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-navy-900">{t.value}</p>
        </div>
      ))}
    </div>
  );
}

async function RequestsCard({ enrollmentIds, viewer }: { enrollmentIds: number[]; viewer: Viewer }) {
  if (!enrollmentIds.length) return null;
  const reqs = await prisma.workComment.findMany({
    where: { kind: "REQUEST", enrollmentId: { in: enrollmentIds } },
    include: { enrollment: { select: { subject: { select: { name: true } }, student: { select: { user: { select: { firstName: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  if (!reqs.length) return null;
  return (
    <Card title={viewer === "student" ? "Your worksheet requests" : "Worksheet requests"} bodyClassName="p-0">
      <ul className="divide-y divide-line">
        {reqs.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-5 py-3">
            <span className={clsx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center", r.resolvedAt ? "bg-emerald-50 text-emerald-600" : "bg-gold-50 text-gold-600")}>
              {r.resolvedAt ? <CheckCircle2 className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-navy-400">
                {viewer === "parent" && `${r.enrollment.student.user.firstName} · `}
                {r.enrollment.subject.name} · {formatDate(r.createdAt, { year: undefined })}
              </p>
              <p className="line-clamp-2 text-sm text-navy-800">{r.body}</p>
            </div>
            <span className={clsx("shrink-0 text-[11px] font-medium", r.resolvedAt ? "text-emerald-700" : "text-gold-700")}>{r.resolvedAt ? "Done" : "Waiting"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ student */

export async function StudentWorkPage({ me }: { me: CurrentUser }) {
  const [items, options] = await Promise.all([workForStudent(me.id), labelledEnrollments({ studentId: me.id })]);
  return (
    <>
      <PageHeader
        eyebrow="Worksheets & files"
        title="Your work"
        description="Worksheets to complete and turn in, and notes from your teachers."
        actions={<RequestWorksheet options={options.map((o) => ({ id: o.id, label: `${o.subject} · ${o.teacher}` }))} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nothing here yet">
          When your teachers share worksheets or notes, they appear here.
        </EmptyState>
      ) : (
        <>
          <Summary items={items} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <WorkSections items={items} hrefFor={(i) => `/student/work/${i.id}`} viewer="student" />
            <RequestsCard enrollmentIds={options.map((o) => o.id)} viewer="student" />
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ parent */

export async function ParentWorkPage({ me }: { me: CurrentUser }) {
  const groups = await workForParent(me.id);
  const options = await labelledEnrollments({ student: { guardians: { some: { parentId: me.id } } } });
  return (
    <>
      <PageHeader
        eyebrow="Worksheets & files"
        title="Schoolwork"
        description="What each student has been given, what they’ve turned in, and their teachers’ feedback."
        actions={<RequestWorksheet label="Ask for more worksheets" options={options.map((o) => ({ id: o.id, label: `${o.student} · ${o.subject}` }))} />}
      />
      {groups.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet">
          Once your students are enrolled, their worksheets and notes appear here.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {groups.map(({ student, items }) => (
            <section key={student.id}>
              <div className="mb-3 flex items-center gap-3">
                <Avatar person={student.user} />
                <h2 className="font-display text-lg font-semibold text-navy-900">{fullName(student.user)}</h2>
              </div>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-navy-400">Nothing shared with {student.user.firstName} yet.</p>
              ) : (
                <>
                  <Summary items={items} />
                  <WorkSections items={items} hrefFor={(i) => `/parent/work/${i.id}?student=${student.id}`} viewer="parent" />
                </>
              )}
            </section>
          ))}
          <RequestsCard enrollmentIds={options.map((o) => o.id)} viewer="parent" />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ detail (student or parent) */

export async function LearnerResourceDetail({ me, viewer, id, studentId }: { me: CurrentUser; viewer: Viewer; id: number; studentId: string }) {
  if (viewer === "parent") {
    const link = await prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId: me.id, studentId } } });
    if (!link) notFound();
  }
  const item = (await workForStudent(studentId)).find((i) => i.id === id);
  if (!item) notFound();
  const [submission, thread, student] = await Promise.all([
    prisma.submission.findUnique({
      where: { resourceId_studentId: { resourceId: id, studentId } },
      include: { files: { include: { file: { select: { id: true, name: true, mimeType: true, sizeBytes: true } } } }, reviewedBy: { select: { firstName: true, lastName: true } } },
    }),
    threadFor(item.enrollmentId, id),
    prisma.user.findUnique({ where: { id: studentId }, select: { firstName: true } }),
  ]);
  const view = submission
    ? {
        status: submission.status,
        note: submission.note,
        submittedAt: submission.submittedAt.toISOString(),
        feedback: submission.feedback,
        mark: submission.mark,
        reviewedAt: submission.reviewedAt?.toISOString() ?? null,
        reviewedBy: submission.reviewedBy ? fullName(submission.reviewedBy) : null,
        files: submission.files.map((f) => f.file),
      }
    : null;
  const due = item.kind === "WORKSHEET" ? dueLabel(item.dueDate) : null;
  const back = viewer === "student" ? "/student/work" : "/parent/work";
  const name = student?.firstName ?? "the student";

  return (
    <>
      <Link href={back} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> {viewer === "student" ? "Your work" : "Schoolwork"}
      </Link>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="crest-navy h-2" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <KindIcon kind={item.kind} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.state ? <WorkStateBadge state={item.state} mark={item.submission?.mark} /> : <Badge tone="navy">Document</Badge>}
                    {due && item.state !== "reviewed" && <Badge tone={item.state === "overdue" ? "rose" : "slate"}>{due}</Badge>}
                  </div>
                  <h1 className="mt-1.5 font-display text-xl font-semibold text-navy-900">{item.title}</h1>
                  <p className="mt-0.5 text-sm text-navy-500">
                    {item.subject.name}
                    {item.uploadedBy && ` · from ${fullName(item.uploadedBy)}`} · {formatDate(item.createdAt, { year: undefined })}
                  </p>
                </div>
              </div>
              {item.description && <p className="mt-4 whitespace-pre-wrap text-sm text-navy-700">{item.description}</p>}
              <div className="mt-4 grid gap-2">
                {item.file && <FileChip file={item.file} />}
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm text-navy-800 transition hover:border-gold-300"
                  >
                    <ExternalLink className="h-4 w-4 text-gold-600" /> <span className="truncate">{item.linkUrl.replace(/^https:\/\//, "")}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <Card title="Comments" description={viewer === "student" ? "Questions about this? Ask here." : `With ${name}’s teacher`}>
            <CommentThread
              comments={thread}
              enrollmentId={item.enrollmentId}
              resourceId={id}
              meId={me.id}
              canRequest
              placeholder={viewer === "student" ? "Ask your teacher a question…" : "Leave a comment for the teacher…"}
            />
          </Card>
        </div>

        {item.kind === "WORKSHEET" && (
          <Card title={viewer === "student" ? "Your work" : `${name}’s work`} className="lg:sticky lg:top-24">
            {viewer === "student" ? (
              <TurnInPanel resourceId={id} submission={view} overdue={item.state === "overdue"} />
            ) : view ? (
              <div className="space-y-4">
                <Feedback s={view} />
                <p className="flex items-center gap-2 text-sm text-navy-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Turned in {formatDate(view.submittedAt, { year: undefined, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                  {item.dueDate && dbDateKey(new Date(view.submittedAt)) > dbDateKey(item.dueDate) && <Badge tone="rose">Late</Badge>}
                </p>
                {view.files.map((f) => (
                  <FileChip key={f.id} file={f} />
                ))}
                {view.note && <p className="whitespace-pre-wrap rounded-lg bg-ivory px-3 py-2.5 text-sm text-navy-700">{view.note}</p>}
              </div>
            ) : (
              <p className="text-sm text-navy-500">Not turned in yet{due ? ` · ${due.toLowerCase()}` : ""}.</p>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
