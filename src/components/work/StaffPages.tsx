import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, BookOpen, ChevronLeft, ClipboardCheck, ExternalLink, Hand, MessageSquare, Plus, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { hasAdminAccess } from "@/lib/roles";
import { dateKey, dbDateKey } from "@/lib/schedule";
import { recipientsOf, workState } from "@/lib/work";
import {
  audienceLabel,
  labelledEnrollments,
  openRequests,
  resourceInclude,
  staffResources,
  submissionsToMark,
  threadFor,
  type Portal,
} from "@/lib/work-queries";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { FileChip } from "./FileChip";
import { KindIcon, WorkStateBadge, dueLabel } from "./bits";
import { CommentThread } from "./CommentThread";
import { ResolveButton } from "./ResolveButton";
import { ResourceControls } from "./ResourceControls";
import { ResourceForm, type SubjectOption } from "./ResourceForm";
import { ReviewPanel } from "./ReviewPanel";

const ago = (d: Date) => {
  const mins = Math.round((Date.now() - +d) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
};

/* ------------------------------------------------------------------ list */

export async function StaffResourcesPage({ portal, me, kind }: { portal: Portal; me: CurrentUser; kind?: string }) {
  const filter = kind === "worksheets" ? "WORKSHEET" : kind === "documents" ? "DOCUMENT" : undefined;
  const [items, toMark, requests] = await Promise.all([
    staffResources(portal, me.id, { kind: filter }),
    submissionsToMark(portal, me.id, 8),
    openRequests(portal, me.id, 8),
  ]);
  const base = `/${portal}/resources`;
  const tabs = [
    { key: undefined, label: "Everything" },
    { key: "worksheets", label: "Worksheets" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Documents & worksheets"
        description={
          portal === "admin"
            ? "Everything shared with students. Upload for one student, or for everyone taking a subject."
            : "Share notes and worksheets with your students, mark what they turn in, and answer their requests."
        }
        actions={
          <Link href={`${base}/new`} className="btn-primary">
            <Plus className="h-4 w-4" /> Share a document or worksheet
          </Link>
        }
      />

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-gold-500" /> To mark {toMark.length > 0 && <Badge tone="gold">{toMark.length}</Badge>}
            </span>
          }
          description="Worksheets students have turned in"
          bodyClassName="p-0"
        >
          {toMark.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">Nothing waiting — all turned-in work is marked.</p>
          ) : (
            <ul className="divide-y divide-line">
              {toMark.map((s) => (
                <li key={s.id}>
                  <Link href={`${base}/${s.resource.id}?student=${s.enrollmentId}`} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-ivory">
                    <Avatar person={s.student.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-900">{s.resource.title}</p>
                      <p className="truncate text-xs text-navy-400">
                        {fullName(s.student.user)} · {s.enrollment.subject.name} · {ago(s.submittedAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-navy-200 transition group-hover:translate-x-0.5 group-hover:text-gold-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Hand className="h-4 w-4 text-gold-500" /> Worksheet requests {requests.length > 0 && <Badge tone="gold">{requests.length}</Badge>}
            </span>
          }
          description="Students asking for more practice"
          bodyClassName="p-0"
        >
          {requests.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No open requests.</p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <Avatar person={r.author} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-navy-400">
                        <span className="font-medium text-navy-800">{fullName(r.enrollment.student.user)}</span> · {r.enrollment.subject.name} · {ago(r.createdAt)}
                        {r.author.role === "PARENT" && ` · from ${r.author.firstName} (parent)`}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-navy-800">{r.body}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Link
                          href={`${base}/new?enrollment=${r.enrollment.id}&request=${r.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gold-700 transition hover:bg-gold-50"
                        >
                          <Plus className="h-3.5 w-3.5" /> Share a worksheet
                        </Link>
                        <ResolveButton id={r.id} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="card overflow-hidden">
        <div className="flex gap-1 border-b border-line px-3 pt-2 sm:px-4">
          {tabs.map((t) => {
            const active = t.key === kind || (!t.key && !kind);
            return (
              <Link
                key={t.label}
                href={t.key ? `${base}?kind=${t.key}` : base}
                className={clsx(
                  "-mb-px border-b-2 px-3 py-2.5 text-sm transition",
                  active ? "border-gold-500 font-medium text-navy-900" : "border-transparent text-navy-500 hover:text-navy-800",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={BookOpen}
              title="Nothing shared yet"
              action={
                <Link href={`${base}/new`} className="btn-primary">
                  <Plus className="h-4 w-4" /> Share the first one
                </Link>
              }
            >
              Upload a worksheet or notes for one student, or for everyone taking a subject.
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((r) => {
              const due = r.kind === "WORKSHEET" ? dueLabel(r.dueDate) : null;
              return (
                <li key={r.id}>
                  <Link href={`${base}/${r.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-ivory sm:px-5">
                    <KindIcon kind={r.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900 group-hover:underline group-hover:decoration-gold-400 group-hover:underline-offset-4">{r.title}</p>
                      <p className="truncate text-xs text-navy-400">
                        {r.subject.name} · {audienceLabel(r, portal === "teacher")}
                        {portal === "admin" && r.uploadedBy && ` · by ${fullName(r.uploadedBy)}`}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      {r.kind === "WORKSHEET" ? (
                        <>
                          <p className="text-sm tabular-nums text-navy-800">
                            <b>{r.submitted}</b>
                            <span className="text-navy-400"> / {r.recipients} turned in</span>
                          </p>
                          <p className="text-[11px] text-navy-400">
                            {r.toMark > 0 ? <span className="font-medium text-gold-700">{r.toMark} to mark</span> : due ?? "No due date"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-navy-800">
                            <Users className="mr-1 inline h-3.5 w-3.5 text-navy-300" />
                            {r.recipients} {r.recipients === 1 ? "student" : "students"}
                          </p>
                          <p className="text-[11px] text-navy-400">{formatDate(r.createdAt, { year: undefined })}</p>
                        </>
                      )}
                    </div>
                    {r._count.comments > 0 && (
                      <span className="hidden items-center gap-1 text-xs text-navy-400 md:flex">
                        <MessageSquare className="h-3.5 w-3.5" /> {r._count.comments}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 shrink-0 text-navy-200 transition group-hover:translate-x-0.5 group-hover:text-gold-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ new */

export async function StaffNewResourcePage({ portal, me, enrollment, request }: { portal: Portal; me: CurrentUser; enrollment?: string; request?: string }) {
  const options = await labelledEnrollments(portal === "admin" ? {} : { teacherId: me.id });
  const subjectMap = new Map<number, SubjectOption>();
  if (portal === "admin") {
    const [subjects, levels] = await Promise.all([
      prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.level.findMany({ orderBy: [{ curriculum: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true } }),
    ]);
    for (const s of subjects) subjectMap.set(s.id, { id: s.id, name: s.name, levels });
  } else {
    for (const o of options) {
      const s = subjectMap.get(o.subjectId) ?? { id: o.subjectId, name: o.subject, levels: [] };
      if (o.level && !s.levels.some((l) => l.id === o.level!.id)) s.levels.push(o.level);
      subjectMap.set(o.subjectId, s);
    }
  }
  const req = request
    ? await prisma.workComment.findFirst({
        where: { id: Number(request) || 0, kind: "REQUEST", ...(portal === "teacher" ? { enrollment: { teacherId: me.id } } : {}) },
        select: { id: true, body: true, enrollmentId: true },
      })
    : null;
  const initial = Number(enrollment) || req?.enrollmentId;

  return (
    <>
      <Link href={`/${portal}/resources`} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Documents & worksheets
      </Link>
      <PageHeader eyebrow="Resources" title="Share a document or worksheet" description="Students see it in their portal straight away; parents can follow along." />
      <div className="max-w-3xl">
        {options.length === 0 ? (
          <EmptyState icon={Users} title={portal === "admin" ? "No enrollments yet" : "You have no students yet"}>
            {portal === "admin" ? "Enroll a student in a subject first." : "Once the office enrolls students with you, you can share work with them."}
          </EmptyState>
        ) : (
          <ResourceForm
            portal={portal}
            enrollments={options}
            subjects={[...subjectMap.values()].sort((a, b) => a.name.localeCompare(b.name))}
            initialEnrollmentId={initial && options.some((o) => o.id === initial) ? initial : undefined}
            requestId={req?.id}
            requestText={req?.body}
          />
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ detail */

export async function StaffResourceDetail({ portal, me, id, student }: { portal: Portal; me: CurrentUser; id: number; student?: string }) {
  const r = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!r) notFound();
  const all = await recipientsOf(r);
  const recipients = portal === "admin" ? all : all.filter((e) => e.teacherId === me.id);
  const allowed = portal === "admin" || r.uploadedById === me.id || r.teacherId === me.id || recipients.length > 0;
  if (!allowed) notFound();
  const canEdit = hasAdminAccess(me) ? portal === "admin" || r.uploadedById === me.id : r.uploadedById === me.id || r.teacherId === me.id;

  const ids = recipients.map((e) => e.id);
  const [enrollments, submissions, commentCounts] = await Promise.all([
    prisma.enrollment.findMany({
      where: { id: { in: ids } },
      select: { id: true, student: { select: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } }, subject: { select: { name: true } } },
    }),
    prisma.submission.findMany({
      where: { resourceId: id, enrollmentId: { in: ids } },
      include: { files: { include: { file: { select: { id: true, name: true, mimeType: true, sizeBytes: true } } } }, reviewedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.workComment.groupBy({ by: ["enrollmentId"], where: { resourceId: id, enrollmentId: { in: ids } }, _count: true }),
  ]);
  const subBy = new Map(submissions.map((s) => [s.enrollmentId, s]));
  const comBy = new Map(commentCounts.map((c) => [c.enrollmentId, c._count]));
  const rows = enrollments
    .map((e) => {
      const s = subBy.get(e.id);
      return { e, s, state: r.kind === "WORKSHEET" ? workState(r.dueDate, s) : null, comments: comBy.get(e.id) ?? 0 };
    })
    .sort((a, b) => {
      const order = { submitted: 0, overdue: 1, todo: 2, reviewed: 3 } as const;
      return (a.state ? order[a.state] : 0) - (b.state ? order[b.state] : 0) || a.e.student.user.firstName.localeCompare(b.e.student.user.firstName);
    });

  const selectedId = Number(student) || rows[0]?.e.id;
  const sel = rows.find((x) => x.e.id === selectedId);
  const thread = sel ? await threadFor(sel.e.id, id) : [];
  const due = r.kind === "WORKSHEET" ? dueLabel(r.dueDate) : null;
  const base = `/${portal}/resources`;
  const done = rows.filter((x) => x.s).length;

  return (
    <>
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Documents & worksheets
      </Link>

      <div className="card mb-6 overflow-hidden">
        <div className="crest-navy h-2" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <KindIcon kind={r.kind} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.kind === "WORKSHEET" ? "gold" : "navy"}>{r.kind === "WORKSHEET" ? "Worksheet" : "Document"}</Badge>
                {due && <Badge tone={r.dueDate && dbDateKey(r.dueDate) < dateKey(new Date()) ? "rose" : "slate"}>{due}</Badge>}
              </div>
              <h1 className="mt-1.5 font-display text-xl font-semibold text-navy-900">{r.title}</h1>
              <p className="mt-0.5 text-sm text-navy-500">
                {r.subject.name} · {audienceLabel(r, portal === "teacher")}
                {r.uploadedBy && ` · shared by ${fullName(r.uploadedBy)} on ${formatDate(r.createdAt, { year: undefined })}`}
              </p>
              {r.description && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-navy-700">{r.description}</p>}
              <div className="mt-4 grid gap-2 sm:max-w-xl">
                {r.file && <FileChip file={r.file} />}
                {r.linkUrl && (
                  <a
                    href={r.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm text-navy-800 transition hover:border-gold-300"
                  >
                    <ExternalLink className="h-4 w-4 text-gold-600" /> <span className="truncate">{r.linkUrl.replace(/^https:\/\//, "")}</span>
                  </a>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="shrink-0 sm:max-w-sm">
                <ResourceControls
                  id={r.id}
                  portal={portal}
                  kind={r.kind}
                  title={r.title}
                  description={r.description}
                  dueDate={r.dueDate ? dbDateKey(r.dueDate) : null}
                  submissions={submissions.length}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card
          title="Students"
          description={r.kind === "WORKSHEET" ? `${done} of ${rows.length} turned in` : `Shared with ${rows.length} ${rows.length === 1 ? "student" : "students"}`}
          bodyClassName="p-0"
        >
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-400">No current students match this audience.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map(({ e, s, state, comments }) => (
                <li key={e.id}>
                  <Link
                    href={`${base}/${r.id}?student=${e.id}`}
                    scroll={false}
                    className={clsx(
                      "flex items-center gap-3 px-5 py-3 transition",
                      e.id === selectedId ? "bg-gradient-to-r from-gold-50 to-transparent shadow-[inset_3px_0_0_#C69A3A]" : "hover:bg-ivory",
                    )}
                  >
                    <Avatar person={e.student.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-900">{fullName(e.student.user)}</p>
                      <p className="truncate text-xs text-navy-400">{s ? `Turned in ${ago(s.submittedAt)}` : e.subject.name}</p>
                    </div>
                    {comments > 0 && (
                      <span className="flex items-center gap-1 text-xs text-navy-400">
                        <MessageSquare className="h-3.5 w-3.5" /> {comments}
                      </span>
                    )}
                    {state && <WorkStateBadge state={state} mark={s?.mark} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {sel ? (
          <div className="space-y-6">
            {r.kind === "WORKSHEET" && (
              <Card title={`${sel.e.student.user.firstName}’s work`}>
                {sel.s ? (
                  <ReviewPanel
                    submissionId={sel.s.id}
                    studentName={sel.e.student.user.firstName}
                    late={!!r.dueDate && dbDateKey(sel.s.submittedAt) > dbDateKey(r.dueDate)}
                    submission={{
                      status: sel.s.status,
                      note: sel.s.note,
                      submittedAt: sel.s.submittedAt.toISOString(),
                      feedback: sel.s.feedback,
                      mark: sel.s.mark,
                      reviewedAt: sel.s.reviewedAt?.toISOString() ?? null,
                      reviewedBy: sel.s.reviewedBy ? fullName(sel.s.reviewedBy) : null,
                      files: sel.s.files.map((f) => f.file),
                    }}
                  />
                ) : (
                  <p className="text-sm text-navy-500">
                    Not turned in yet{due ? ` · ${due.toLowerCase()}` : ""}. Use the comments to nudge {sel.e.student.user.firstName} or answer questions.
                  </p>
                )}
              </Card>
            )}
            <Card title="Comments" description={`About this ${r.kind === "WORKSHEET" ? "worksheet" : "document"}, with ${sel.e.student.user.firstName}`}>
              <CommentThread comments={thread} enrollmentId={sel.e.id} resourceId={r.id} meId={me.id} canResolve />
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
