import "server-only";
import type { Curriculum } from "@prisma/client";
import prisma from "./prisma";
import { LEVELS, SUBJECTS } from "./catalogue-data";

/** Loads subjects and levels once, when the catalogue is empty. Never adds demo people. */
export async function ensureCatalogue(): Promise<void> {
  if ((await prisma.subject.count()) > 0) return;
  await prisma.subject.createMany({ data: SUBJECTS.map(([name, code]) => ({ name, code })), skipDuplicates: true });
  await prisma.level.createMany({
    data: (Object.entries(LEVELS) as [Curriculum, string[]][]).flatMap(([curriculum, names]) =>
      names.map((name, i) => ({ curriculum, name, sortOrder: i })),
    ),
    skipDuplicates: true,
  });
  console.log("[bootstrap] subjects and levels loaded");
}
