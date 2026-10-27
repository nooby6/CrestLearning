# Crest Learning

**Learn. Grow. Excel.** — the platform behind Crest Learning, Nairobi: one-to-one and small-group tuition across **Cambridge, Edexcel, CBE and IB**.

Student-centred by design: there are no "classes". Every teaching relationship is an **enrollment** — *Teacher A teaches Student B Mathematics* — with its own weekly slots, sessions, attendance, notes and billing.

Built with Next.js (App Router), Clerk, Prisma/Postgres and Tailwind.

---

## Status

| Module | Scope | State |
|---|---|---|
| **1. Auth, roles, families** | Clerk sign-in, 4 roles, role-guarded portals, admin people management, parent ↔ student links (many-to-many, primary contact) | ✅ Built |
| 2. Enrollments & schedule | Enrollments, weekly slots, session generation, timetables | Schema ready |
| 3. Join class & attendance | Jitsi/Daily embed, join/leave events → automatic attendance, manual override | Schema ready |
| 4. Notes, reports, resources | Progress notes, weekly/monthly parent reports, scoped resources | Schema ready |
| 5. Finance & announcements | Fee plans, invoices, M-Pesa / Flutterwave, teacher payouts from held sessions, targeted announcements | Schema ready |

The **full schema for all five modules** is in `prisma/schema.prisma` and the initial migration, so later modules add code, not structural migrations.

## Stack

- **Next.js 14.2.35** App Router, server actions
- **Clerk** for sign-in; role kept in `publicMetadata` and enforced in middleware, then re-checked against the database row (role + active flag) on every page and action
- **Prisma + Postgres**, Rust-free client (`engineType = "client"` + `@prisma/adapter-pg`)
- **Tailwind** with the Crest theme: navy `#0A1D4F` and gold `#C69A3A` from the logo, Montserrat for display type, Inter for text, ivory canvas; fonts self-hosted
- **zod**, **lucide-react**, **react-toastify**

## Getting started

```bash
cp .env.example .env              # fill in Clerk keys + DATABASE_URL (gitignored)
docker compose up -d db           # or use your own Postgres
npm install
npx prisma migrate deploy         # creates all tables
npm run db:seed                   # subjects, curriculum levels, demo families
npm run bootstrap:admin -- --username you.name --first You --last Name --password "Summit-Maple-482"
npm run dev
```

Open http://localhost:3000 and sign in with the admin you just created.

### Clerk setup (one time, in the Clerk dashboard)

1. **User & authentication → Username**: enable, and allow sign-in with username. Email optional.
2. **Restrictions → Sign-up mode: Restricted** — accounts are created by the Crest office only.
3. **Sessions → Customize session token**, add:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   The middleware reads `sessionClaims.metadata.role` to route each person to their portal.

### Preview without Clerk (local only)

Set `DEV_AUTH_USER_ID=seed_admin` (or `seed_parent_wanjiru`, `seed_teacher_achieng`, `seed_student_amani` …) in `.env` and run `npm run dev`. The app renders as that seeded user and shows a "Dev preview" badge. This is ignored in production builds.

## How Module 1 works

- **Creating people** (`/admin/people/new`): one form for all four roles. It creates the Clerk login *and* our profile in one step; if the database write fails the Clerk user is rolled back, so the two never drift. Usernames are suggested from the name, temporary passwords are generated (readable, e.g. `Cedar-Falcon-731`), and shown once with a copy button.
- **Families**: link from either side (parent page → Children, student page → Guardians). The first guardian becomes the **primary contact** (receives invoices and reports); there is always exactly one primary while a student has guardians, and removing the primary promotes the next.
- **Needs attention** on the admin overview lists students with no guardian and parents with no children.
- **Access**: pausing an account bans it in Clerk (signs them out everywhere) and flags it inactive here; reactivating reverses both. Admins can reset passwords.
- **Parent portal** shows only children reached through the link table. Placeholders for attendance, homework, notes and invoices sit where those features will land, so the layout won't shift.

## Project layout

```
prisma/schema.prisma            all entities, modules 1–5
prisma/seed.ts                  catalogue + demo data (ids prefixed seed_)
scripts/bootstrap-admin.ts      first real admin, in Clerk + DB
src/middleware.ts               sign-in + role routing
src/lib/auth.ts                 getCurrentUser / requireRole / assertRole
src/lib/actions/people.ts       create person, link/unlink, primary, pause, reset password
src/app/(dashboard)/…           admin, teacher, student, parent portals
src/components/                 brand, shell (sidebar/topbar), ui primitives
```

## Conventions

- Money: integers in minor units (KES cents) + `currency`. Format with `formatMoney`.
- Time: stored in UTC. Weekly slots store wall-clock `HH:mm` plus IANA timezone (default `Africa/Nairobi`).
- Phones: stored E.164 (`+2547…`) — needed for M-Pesa STK push.
- Idempotency: `@@unique([slotId, startsAt])` for session generation, `@@unique([provider, providerRef])` for payment webhooks, one `TeacherPayoutItem` per session so nothing is paid twice.
