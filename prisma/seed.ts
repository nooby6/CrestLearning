/**
 * Seed: catalogue (subjects, curriculum levels) + a small demo family set.
 * Safe to re-run (upserts). Demo users have ids prefixed "seed_" and no Clerk
 * login — use DEV_AUTH_USER_ID locally to view the app as one of them, and
 * `npm run bootstrap:admin` to create your real admin sign-in.
 */
import "dotenv/config";
import { PrismaClient, type Curriculum, type GuardianRelationship, type Role, type Weekday } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { addDaysKey, dateKey, meetingRoomName, mondayOf, occurrences } from "../src/lib/schedule";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const SUBJECTS: [string, string][] = [
  ["Mathematics", "MATH"],
  ["English", "ENG"],
  ["Kiswahili", "KIS"],
  ["Physics", "PHY"],
  ["Chemistry", "CHEM"],
  ["Biology", "BIO"],
  ["Integrated Science", "ISCI"],
  ["Computer Science", "CS"],
  ["Business Studies", "BUS"],
  ["Economics", "ECON"],
  ["Geography", "GEO"],
  ["History", "HIST"],
  ["French", "FRE"],
];

const LEVELS: Record<Curriculum, string[]> = {
  CAMBRIDGE: [
    "Primary Stage 4", "Primary Stage 5", "Primary Stage 6",
    "Lower Secondary Stage 7", "Lower Secondary Stage 8", "Lower Secondary Stage 9",
    "IGCSE Year 10", "IGCSE Year 11", "AS Level", "A Level",
  ],
  EDEXCEL: [
    "iPrimary", "iLowerSecondary",
    "International GCSE Year 10", "International GCSE Year 11",
    "International AS Level", "International A Level",
  ],
  CBE: [
    "Grade 4", "Grade 5", "Grade 6",
    "Grade 7 (Junior School)", "Grade 8 (Junior School)", "Grade 9 (Junior School)",
    "Grade 10 (Senior School)", "Grade 11 (Senior School)", "Grade 12 (Senior School)",
  ],
  IB: ["PYP", "MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP1", "DP2"],
};

type Person = { id: string; role: Role; first: string; last: string; phone?: string; email?: string };

const people: Person[] = [
  { id: "seed_admin", role: "ADMIN", first: "Faith", last: "Njeri", email: "office@crestlearning.example" },
  { id: "seed_teacher_achieng", role: "TEACHER", first: "Achieng", last: "Otieno", phone: "+254711000101" },
  { id: "seed_teacher_kamau", role: "TEACHER", first: "David", last: "Kamau", phone: "+254711000102" },
  { id: "seed_teacher_wambui", role: "TEACHER", first: "Grace", last: "Wambui", phone: "+254711000103" },
  { id: "seed_parent_wanjiru", role: "PARENT", first: "Wanjiru", last: "Mwangi", phone: "+254722000201" },
  { id: "seed_parent_ahmed", role: "PARENT", first: "Ahmed", last: "Hassan", phone: "+254722000202" },
  { id: "seed_parent_priya", role: "PARENT", first: "Priya", last: "Shah", phone: "+254722000203" },
  { id: "seed_parent_brian", role: "PARENT", first: "Brian", last: "Kiprop", phone: "+254722000204" },
  { id: "seed_student_amani", role: "STUDENT", first: "Amani", last: "Mwangi" },
  { id: "seed_student_zawadi", role: "STUDENT", first: "Zawadi", last: "Mwangi" },
  { id: "seed_student_yusuf", role: "STUDENT", first: "Yusuf", last: "Hassan" },
  { id: "seed_student_aarav", role: "STUDENT", first: "Aarav", last: "Shah" },
  { id: "seed_student_imani", role: "STUDENT", first: "Imani", last: "Odhiambo" },
];

const studentProfiles: Record<string, { curriculum: Curriculum; level: string; dob: string; school?: string }> = {
  seed_student_amani: { curriculum: "CAMBRIDGE", level: "IGCSE Year 10", dob: "2011-03-14", school: "Homeschooled" },
  seed_student_zawadi: { curriculum: "CBE", level: "Grade 7 (Junior School)", dob: "2013-08-02" },
  seed_student_yusuf: { curriculum: "EDEXCEL", level: "International AS Level", dob: "2009-11-21" },
  seed_student_aarav: { curriculum: "IB", level: "DP1", dob: "2009-05-09" },
  seed_student_imani: { curriculum: "CAMBRIDGE", level: "Lower Secondary Stage 8", dob: "2012-12-01" },
};

const teacherProfiles: Record<string, { subjects: string[]; rateKes: number; capacity: number; bio: string }> = {
  seed_teacher_achieng: { subjects: ["MATH", "PHY"], rateKes: 1800, capacity: 24, bio: "IGCSE & A Level Maths, 9 years." },
  seed_teacher_kamau: { subjects: ["CHEM", "BIO", "ISCI"], rateKes: 1600, capacity: 20, bio: "Sciences across Cambridge and CBE." },
  seed_teacher_wambui: { subjects: ["ENG", "KIS"], rateKes: 1400, capacity: 18, bio: "Languages; IB English A specialist." },
};

const links: [string, string, GuardianRelationship, boolean][] = [
  ["seed_parent_wanjiru", "seed_student_amani", "MOTHER", true],
  ["seed_parent_wanjiru", "seed_student_zawadi", "MOTHER", true],
  ["seed_parent_ahmed", "seed_student_yusuf", "FATHER", true],
  ["seed_parent_priya", "seed_student_aarav", "MOTHER", true],
  // seed_student_imani and seed_parent_brian are intentionally unlinked → "Needs attention".
];

type Slot = [Weekday, string, number]; // day, HH:mm (Nairobi), minutes
const enrollments: [string, string, string, Slot[]][] = [
  ["seed_teacher_achieng", "seed_student_amani", "MATH", [["MONDAY", "10:00", 90], ["THURSDAY", "10:00", 60]]],
  ["seed_teacher_kamau", "seed_student_amani", "CHEM", [["TUESDAY", "11:00", 60]]],
  ["seed_teacher_wambui", "seed_student_amani", "ENG", [["WEDNESDAY", "14:00", 60]]],
  ["seed_teacher_kamau", "seed_student_zawadi", "ISCI", [["MONDAY", "16:00", 60], ["WEDNESDAY", "16:00", 60]]],
  ["seed_teacher_wambui", "seed_student_zawadi", "KIS", [["FRIDAY", "15:00", 45]]],
  ["seed_teacher_achieng", "seed_student_yusuf", "PHY", [["TUESDAY", "16:30", 90], ["SATURDAY", "09:00", 90]]],
  ["seed_teacher_wambui", "seed_student_aarav", "ENG", [["THURSDAY", "16:30", 60]]],
];

async function main() {
  for (const [name, code] of SUBJECTS) {
    await prisma.subject.upsert({ where: { code }, update: { name }, create: { name, code } });
  }
  for (const [curriculum, names] of Object.entries(LEVELS) as [Curriculum, string[]][]) {
    for (const [i, name] of names.entries()) {
      await prisma.level.upsert({
        where: { curriculum_name: { curriculum, name } },
        update: { sortOrder: i },
        create: { curriculum, name, sortOrder: i },
      });
    }
  }

  const subjectByCode = Object.fromEntries((await prisma.subject.findMany()).map((s) => [s.code, s.id]));
  const levelKey = (c: string, n: string) => `${c}:${n}`;
  const levelByKey = Object.fromEntries((await prisma.level.findMany()).map((l) => [levelKey(l.curriculum, l.name), l]));

  for (const p of people) {
    const username = `${p.first}.${p.last}`.toLowerCase();
    await prisma.user.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, role: p.role, username, firstName: p.first, lastName: p.last, phone: p.phone, email: p.email },
    });

    if (p.role === "STUDENT") {
      const sp = studentProfiles[p.id];
      const level = levelByKey[levelKey(sp.curriculum, sp.level)];
      await prisma.student.upsert({
        where: { id: p.id },
        update: {},
        create: { id: p.id, curriculum: sp.curriculum, levelId: level.id, dateOfBirth: new Date(sp.dob), school: sp.school },
      });
    }
    if (p.role === "PARENT") {
      await prisma.parent.upsert({ where: { id: p.id }, update: {}, create: { id: p.id, address: "Nairobi" } });
    }
    if (p.role === "TEACHER") {
      const tp = teacherProfiles[p.id];
      await prisma.teacher.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          bio: tp.bio,
          hourlyRate: tp.rateKes * 100,
          weeklyCapacityHours: tp.capacity,
          subjects: { create: tp.subjects.map((c) => ({ subjectId: subjectByCode[c] })) },
        },
      });
    }
  }

  for (const [parentId, studentId, relationship, isPrimary] of links) {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: {},
      create: { parentId, studentId, relationship, isPrimary },
    });
  }

  // Sessions from this week's Monday to six weeks ahead (so the current week is populated).
  const weekStart = mondayOf(dateKey(new Date()));
  const horizon = addDaysKey(weekStart, 6 * 7);
  for (const [teacherId, studentId, code, slots] of enrollments) {
    const sp = studentProfiles[studentId];
    const subjectId = subjectByCode[code];
    const enrollment = await prisma.enrollment.upsert({
      where: { teacherId_studentId_subjectId: { teacherId, studentId, subjectId } },
      update: {},
      create: {
        teacherId,
        studentId,
        subjectId,
        curriculum: sp.curriculum,
        levelId: levelByKey[levelKey(sp.curriculum, sp.level)].id,
        startDate: new Date(addDaysKey(weekStart, -21)),
      },
    });
    if (await prisma.sessionSlot.count({ where: { enrollmentId: enrollment.id } })) continue;
    for (const [weekday, startTime, durationMinutes] of slots) {
      const slot = await prisma.sessionSlot.create({
        data: { enrollmentId: enrollment.id, weekday, startTime, durationMinutes, validFrom: new Date(addDaysKey(weekStart, -21)) },
      });
      await prisma.sessionInstance.createMany({
        data: occurrences(slot, weekStart, horizon).map((o) => ({
          enrollmentId: enrollment.id,
          slotId: slot.id,
          ...o,
          meetingRoom: meetingRoomName(code),
        })),
        skipDuplicates: true,
      });
    }
  }

  const counts = await Promise.all([
    prisma.subject.count(),
    prisma.level.count(),
    prisma.user.count(),
    prisma.enrollment.count(),
    prisma.sessionInstance.count(),
  ]);
  console.log(
    `Seeded: ${counts[0]} subjects, ${counts[1]} levels, ${counts[2]} users, ${counts[3]} enrollments, ${counts[4]} sessions.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
