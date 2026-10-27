import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { curriculumLabel, isRoleSlug } from "@/lib/roles";
import { PageHeader } from "@/components/ui/primitives";
import { CreatePersonForm } from "./CreatePersonForm";

export const metadata = { title: "Add person" };

export default async function NewPersonPage({ searchParams }: { searchParams: { role?: string } }) {
  await requireRole("admin");

  const [subjects, levels, parents, students] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.level.findMany({
      orderBy: [{ curriculum: "asc" }, { sortOrder: "asc" }],
      select: { id: true, curriculum: true, name: true },
    }),
    prisma.parent.findMany({
      where: { user: { active: true } },
      include: { user: true, _count: { select: { children: true } } },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.student.findMany({
      where: { user: { active: true } },
      include: { user: true, level: true },
      orderBy: { user: { firstName: "asc" } },
    }),
  ]);

  const initial = isRoleSlug(searchParams.role) ? (searchParams.role.toUpperCase() as "STUDENT") : "STUDENT";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/people" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> People
      </Link>
      <PageHeader
        eyebrow="Administration"
        title="Add a person"
        description="Creates their sign-in and profile together. Parents and children can be linked now or later."
      />
      <CreatePersonForm
        initialRole={initial}
        subjects={subjects}
        levels={levels}
        parents={parents.map((p) => ({
          id: p.id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          meta: `${p._count.children} ${p._count.children === 1 ? "child" : "children"} linked${p.user.phone ? ` · ${p.user.phone}` : ""}`,
        }))}
        students={students.map((s) => ({
          id: s.id,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          meta: [curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || undefined,
        }))}
      />
    </div>
  );
}
