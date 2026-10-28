# Crest Learning

**Learn. Grow. Excel.** — the platform behind Crest Learning, Nairobi: one-to-one and small-group tuition across **Cambridge, Edexcel, CBE and IB**.

Student-centred by design: there are no "classes". Every teaching relationship is an **enrollment** — *Teacher A teaches Student B Mathematics* — with its own weekly slots, sessions, attendance, notes and billing.

Built with Next.js (App Router), Prisma/Postgres and Tailwind, with its own username-and-password sign-in.

---

## Status

| Module | Scope | State |
|---|---|---|
| **1. Auth, roles, families** | Built-in sign-in, 4 roles, role-guarded portals, admin people management, parent ↔ student links (many-to-many, primary contact) | ✅ Built |
| **2. Enrollments & schedule** | Enrollments with weekly times, sessions generated 6 weeks ahead, clash detection, move/cancel a single session, teacher load, timetables for every role | ✅ Built |
| **3. Online lessons, attendance, lesson records, weekly reports** | Google Meet link per enrollment behind a Join button; attendance captured from joins (present / late / absent), manual corrections; mandatory lesson record after every lesson (blocks sign-out); weekly teacher reports read by parents for every linked student | ✅ Built |
| 4. Resources | Uploads scoped to an enrollment, or to a subject and level | Schema ready |
| 5. Finance & announcements | Fee plans, invoices, M-Pesa / Flutterwave, teacher payouts from held sessions, targeted announcements | Schema ready |

The **full schema for all five modules** is in `prisma/schema.prisma` and the initial migration, so later modules add code, not structural migrations.

## Stack

- **Next.js 14.2.35** App Router, server actions
- **Built-in sign-in**: passwords hashed with scrypt; sessions stored in the database (httpOnly cookie, 30 days); 8 wrong attempts lock the account for 15 minutes; everyone sets their own password at first sign-in. Role and active flag are read from the database on every page and action.
- **Prisma + Postgres**, Rust-free client (`engineType = "client"` + `@prisma/adapter-pg`)
- **Tailwind** with the Crest theme: navy `#0A1D4F` and gold `#C69A3A` from the logo, Montserrat for display type, Inter for text, ivory canvas; fonts self-hosted
- **zod**, **lucide-react**, **react-toastify**

## Deploying on Vercel

Everything deploys from **`main`**. The build never needs secrets to succeed: with nothing configured the site deploys and shows a setup checklist.

1. **Import** the repo in Vercel (framework: Next.js, detected automatically). Leave build settings at their defaults — `vercel.json` runs `npm run vercel-build`.
2. **Database:** Vercel → your project → **Storage → Create Database → Neon (Postgres)** → connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically. (Supabase or any Postgres also works: set `DATABASE_URL`, and `DIRECT_URL` for the unpooled connection.)
3. **Environment variables** (Vercel → Settings → Environment Variables):
   | Name | Value |
   |---|---|
   | `BOOTSTRAP_ADMIN_USERNAME` | the first administrator's username (default `admin`) |
   | `BOOTSTRAP_ADMIN_PASSWORD` | their first password — changed at first sign-in |
   | `CRON_SECRET` | any long random string (daily housekeeping job) |
4. **Redeploy**. Database tables are created during the build. On the first visit to `/sign-in`, the subjects and levels are loaded and the administrator is created (only while no administrator exists, so changing the variables later never resets anyone).
5. Open **`https://<your-site>/setup`** to confirm every check is green, then sign in and add teachers, parents and students from **People**.

**If a build fails**, open the deployment's *Building* log. The build prints a boxed message for database problems (wrong URL, unreachable database, or a pooled URL without an unpooled one).

**Demo data** (`npm run db:seed`) is for local development; don't run it against the live database.

## Getting started

```bash
cp .env.example .env              # set DATABASE_URL and BOOTSTRAP_ADMIN_PASSWORD (gitignored)
docker compose up -d db           # or use your own Postgres
npm install
npx prisma migrate deploy         # creates all tables
npm run db:seed                   # optional: demo families (subjects load automatically)
npm run dev
```

Open http://localhost:3000/sign-in and sign in as `admin` with the password from `.env`.

### Preview as a demo user (local only)

Set `DEV_AUTH_USER_ID=seed_admin` (or `seed_parent_wanjiru`, `seed_teacher_achieng`, `seed_student_amani` …) in `.env` and run `npm run dev`. The app renders as that seeded user and shows a "Dev preview" badge. This is ignored in production builds.

## How Module 1 works

- **Creating people** (`/admin/people/new`): one form for all four roles. It creates the login and profile in one step. Usernames are suggested from the name, temporary passwords are generated (readable, e.g. `Cedar-Falcon-731`), and shown once with a copy button.
- **Families**: link from either side (parent page → Students, student page → Guardians). The first guardian becomes the **primary contact** (receives invoices and reports); there is always exactly one primary while a student has guardians, and removing the primary promotes the next.
- **Needs attention** on the admin overview lists students with no guardian and parents with no students.
- **Access**: pausing an account signs them out everywhere and blocks sign-in; reactivating reverses it. Admins can reset passwords (the person picks a new one at next sign-in).
- **Parent portal** shows only students reached through the link table. Placeholders for attendance, homework, notes and invoices sit where those features will land, so the layout won't shift.

## How Module 2 works

- **Enrollment** (`/admin/enrollments/new`): pick a student, a subject, and a teacher who teaches it — each teacher card shows their booked hours against capacity, including the lesson you're adding. Add one or more weekly times (day, start, length; the end time is shown). Saving creates the next six weeks of sessions immediately.
- **Clashes**: a new weekly time is checked against every active weekly time of both the teacher and the student. Clashes are listed by name and time; you can change the time or *Save anyway*.
- **One-off changes**: on an enrollment, *Move* or *Cancel* a single session. The weekly time is untouched; a moved session is linked to the one it replaced (kept as *Moved* for history). Teachers can do the same for their own sessions from *Today*.
- **Pause / End**: pausing removes upcoming sessions until you resume; ending stops the weekly times from today. Past sessions — and anything with attendance or notes — are never deleted.
- **Timetables**: admin week view with teacher/student filters and a teacher-load panel; teacher *Today*, *My students* (with each student's primary parent contact) and *Timetable*; student next-class card and timetable; parent timetable across all their children. On phones the week grid becomes a day-by-day agenda.
- **Time**: everything is shown in Nairobi time; sessions are stored in UTC. The scheduling maths is in `src/lib/schedule.ts` and covered by `npm test`.

## How Module 3 works

**Online lessons (Google Meet).** Each enrollment has one standing **Google Meet link**, set by the office on the enrollment page (or when creating the enrollment). Create it once in Google Calendar as a recurring event, or at meet.google.com → *New meeting → Create a meeting for later*, and paste it in. Zoom and Teams links are accepted too.

The link is **never shown** on any page. Students and the teacher press **Join lesson**, which goes to `/class/<id>/go`. That address checks who is asking (only that lesson's student and teacher), checks the lesson is open (10 minutes before the start, 15 for teachers, until 30 minutes after the end), records the join, and only then redirects to Meet in a new tab. The Crest tab becomes a lesson page; for teachers it holds the lesson record. Parents, other students and other teachers are turned away. Once someone is inside Meet the address bar does show the link, so in Google Meet's host controls keep **Host management** on and **Quick access** off, so that anyone outside the invite list has to be admitted by the teacher.

Lessons can run as long as needed (Meet allows up to 24 hours on Google Workspace; personal Google accounts are limited to 60 minutes for three or more people, while one-to-one calls run up to 24 hours).

*Optional:* an embedded classroom (JaaS or self-hosted Jitsi, via `JAAS_*` or `JITSI_DOMAIN`) is still supported for enrollments without a Meet link.

**Attendance.** Pressing *Join lesson* records the person as *Present*, or *Late* if more than 10 minutes after the start. Google Meet doesn't report back who stayed, so the teacher **confirms the student's attendance in every lesson record** (pre-filled from the join, changeable). With the embedded classroom, time in class is also measured. Fifteen minutes after a lesson ends it is closed off: *Held* if the teacher attended, *Not held* otherwise, and anyone who never joined is marked *Absent*. Teachers can correct a student's attendance; the office can correct anyone's. Corrections are labelled as manual.

**Lesson records (mandatory).** After every lesson the teacher confirms the student's attendance and records the topics covered, plus any homework and due date. The form is on the lesson page during the class. Until every held lesson has a record, the teacher portal only shows the *Lesson records* page and **sign-out is refused**. (Closing the browser can't be prevented, so the lock is applied at their next visit, and the office sees outstanding records on the overview.)

**Weekly reports.** Once a week, per student and subject, the teacher writes a short progress report (required), strengths, a focus for next week, and an effort rating — due by Sunday; overdue reports are flagged on the teacher's Today page and in the office view. Parents open *Weekly reports* and see **every linked student** on one page (or filter to one), each subject's report alongside that week's lessons, topics covered, homework and attendance. Reports print cleanly or save as PDF.

**Privacy.** Teachers never see parents' names or contact details; anything involving a parent goes through the office.

**Students and parents** see lessons, not hours: lessons left today and this week, today's lessons with times and teachers, and the weekly lesson pattern. Students also have a *Homework* page fed from lesson records.

## Project layout

```
prisma/schema.prisma            all entities, modules 1–5
prisma/seed.ts                  catalogue + demo data (ids prefixed seed_)
src/middleware.ts               sign-in + role routing
src/lib/auth.ts                 getCurrentUser / requireRole / assertRole
src/lib/actions/people.ts       create person, link/unlink, primary, pause, reset password
src/lib/actions/schedule.ts     enrollments, weekly times, move/cancel sessions
src/lib/schedule.ts             time-zone + recurrence maths (pure, tested)
src/lib/sessions.ts             session generation, clash checks, teacher load
src/app/api/cron/…              daily: close off ended sessions, generate upcoming ones
src/app/class/[id]              the online classroom
src/app/api/class/[id]/presence join / heartbeat / leave → attendance
src/lib/classroom.ts            join windows, lateness (pure, tested)
src/lib/attendance.ts           presence, finalisation, outstanding records
src/lib/video.ts                JaaS / Jitsi room config and signed tokens
src/lib/actions/lessons.ts      lesson records, attendance corrections, weekly reports
src/app/(dashboard)/…           admin, teacher, student, parent portals
src/components/                 brand, shell (sidebar/topbar), ui primitives
```

## Conventions

- Money: integers in minor units (KES cents) + `currency`. Format with `formatMoney`.
- Time: stored in UTC. Weekly slots store wall-clock `HH:mm` plus IANA timezone (default `Africa/Nairobi`).
- Phones: stored E.164 (`+2547…`) — needed for M-Pesa STK push.
- Idempotency: `@@unique([slotId, startsAt])` for session generation, `@@unique([provider, providerRef])` for payment webhooks, one `TeacherPayoutItem` per session so nothing is paid twice.
