# Cebu Eastern College — School Portal

The CEC school portal: a public site with enrollment, a student/faculty portal that
reads live institutional records, and the registrar's administration console.

| | |
|---|---|
| **Public site** | https://kennethperas15-cpu.github.io/cec-school-portal-1/ |
| **Portal (students, faculty, registrar)** | https://kennethperas15-cpu.github.io/cec-school-portal-1/template/ |
| **API** | https://cec-portal-api-5i1q.onrender.com/api/portal/health |

Everything on those screens is read from the live database. When a table is empty
the screen says so — there is no sample data anywhere in the product.

---

## What is in this repository

| Path | What it is |
|---|---|
| `clients/` | The public site **and** the registrar console. Plain React + TypeScript + CSS (no Tailwind, no component library), Lucide icons. |
| `student-portal-template/` | The portal the student, faculty and registrar sign in to: dashboard, class schedule, enrolled courses, grades, attendance, chat. Tailwind + Recharts. |
| `server/` | The API: Express + TypeScript + Sequelize over PostgreSQL (Supabase), JWT sessions, Socket.io for chat. |
| `database/` | The schema blueprint (`cec_portal_schema_live.sql`). |
| `docs/` | Older notes: API documentation, Google login setup, module flows, setup guide. Partly superseded by this README. |
| `.github/workflows/deploy-pages.yml` | Builds both front-ends and publishes them to GitHub Pages on every push to `main`. |

One origin serves both front-ends: locally the template's dev server serves the
landing page too, which is what lets a sign-in on the landing page be picked up by
the portal.

---

## Identity and accounts

* School IDs are **7 digits and assigned, never generated randomly**:
  students `2xxxxxx`, teachers `3xxxxxx`, administrators `4xxxxxx`.
* An account's username is its CEC email: `firstname.lastname.<id6>@cec.edu.ph`.
* Accounts are issued with a temporary password and the holder is expected to
  change it after signing in. Login is school-accounts only — there is no Google
  sign-in and no role picker; the role comes from the account.
* A registrar can add a student, add a teacher, create an administrator, and
  activate or deactivate any account from the console. Deactivating blocks sign-in
  immediately, and an administrator cannot deactivate their own account.

---

## The enrollment flow (cash payments)

1. The applicant fills the public enrollment form and enters the **Official
   Receipt / accounting reference number** issued by the EDP office — payment is
   made physically in cash. No online gateway is involved.
2. The application appears in **Enrollment Management** as *pending*, with its
   payment reference, program and year level.
3. The registrar approves or rejects it.
   * **Approve** provisions the account in one step: a `users` row, the `students`
     row, a reserved `2xxxxxx` school number, and an email to the applicant
     containing **the school account, the student ID and the temporary password**
     (plus the sign-in address and a reminder to change it).
   * **Reject** closes the application; the applicant sees the decision when they
     track it.
4. If the mail could not be sent, the response hands the temporary password back
   to the registrar, so the credentials can still be given over in person — and
   the console says which of the two happened.

Credential email needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and
`EMAIL_FROM` set where the API runs. Without them approval still works; the
password is returned to the registrar instead of being mailed.

---

## What each role can do

**Student** — dashboard, class schedule, enrolled courses, grades, attendance, the
tuition receipt with a QR code the EDP office verifies, a document-stage tracker
that only the registrar can advance, certificate-of-enrollment requests, and chat.

**Faculty** — class roster, grade encoding and an attendance tracker; publishes one
record per student and term, and can retract what they posted.

**Registrar / administrator** — the twelve administration screens:

> Dashboard · Student Management · Teacher Management · Course Management ·
> Class Schedule · Enrollment Management · Grades Management · Attendance
> Management · User Accounts · Announcements · Settings · Activity Logs

with real writes behind them: register a student, add a teacher, create a course
(and close or remove it), publish and withdraw bulletins, approve enrollments,
retract posted grades, publish or withdraw a section's timetable, edit the stored
term configuration, and activate or deactivate accounts. Every administrative
change is written to the audit trail with the actor, the target and the values
before and after.

The study load builder — the screen that builds a section's week and publishes it
to the portals — is reached from **Class Schedule**.

---

## How the systems share data

Published records live in `portal_items`, one document per thing that is published:

| module | one row per | written by | read by |
|---|---|---|---|
| `schedule` | section + term | study load builder / faculty edit | all three portals |
| `grade` | student + term, per faculty owner | faculty (registrar may retract) | the student's Grades page |
| `attendance` | student + term, per faculty owner | faculty | the student's Attendance page |
| `receipt` | tuition receipt raised | student | student tracker + EDP verification |

Announcements live in `announcements`, institutional settings in `system_config`,
and the audit trail in `audit_logs`. Students and faculty never read a copy: they
read the same published document the registrar wrote.

---

## Running it locally

Requirements: Node 20+, a PostgreSQL database (the project runs against Supabase),
and — for the credential email — an SMTP account.

```bash
# API  (port 4000, chat socket on 4001)
cd server
npm install
# .env: PORT, JWT_SECRET, DATABASE_URL, CLIENT_URL, SMTP_HOST, SMTP_PORT,
#       SMTP_USER, SMTP_PASSWORD, EMAIL_FROM, ENROLLMENT_APPROVAL_SECRET
npx tsx src/index.ts

# One dev server for the whole site (port 5173)
cd student-portal-template
npm install
npx vite        # landing at /cec-school-portal-1/, portal at /cec-school-portal-1/template/
```

`clients/` also builds and runs on its own (`npm run dev`, `npm run build`) when the
portal is not needed. Locally the front-end calls `/api` through the Vite proxy;
the Pages build calls the Render API directly (see `clients/.env.production`).

---

## Deployment

* **GitHub Pages** — `.github/workflows/deploy-pages.yml` builds `clients/` and
  `student-portal-template/` on every push to `main`. The built copies are also
  committed (root `index.html` + `assets/`, and `template/`) so the site still
  works if the workflow is unavailable; **rebuild them with any UI change**.
* **Render** — `render.yaml` runs the API. Set the same environment variables there
  as in `server/.env`, including the SMTP block for credential email.
* Work happens on `second-branch` and is fast-forwarded onto `main`, which triggers
  the Pages deploy.

---

## Testing

* `npx tsc -b` in `clients/` and `npx tsc --noEmit` in `server/` must be clean.
* End-to-end runs drive a real Chrome over the DevTools protocol against the local
  stack: a walk-through of all twelve administration screens (registering a
  student, editing the record, opening/closing/removing a course, saving a
  configuration value, publishing and withdrawing a bulletin), the study load
  builder publishing and withdrawing a timetable, and a live-site check of the
  shared link. The assertions treat an empty table as a valid outcome and check the
  honest empty state instead of assuming data.

---

## Ground rules the code follows

* **No fabricated data.** A screen that shows nothing is a screen whose table is
  empty, and it says so.
* **Cash only.** Payments are filed physically at the EDP office against a
  reference number; there is no online payment gateway in the product.
* **Google Classroom is the LMS** — the portal deep-links to it rather than
  duplicating coursework.
* **Authorization is server-side.** Every write is role-gated and audited; the UI
  is never the gate.
* **Deliberately absent** (the design shows them, the data behind them does not
  exist): delivery/open-rate figures for announcements, RFID/biometric terminal
  telemetry, cryptographic hash attestations on audit rows, prerequisite and
  credit-load checks, and section capacity modelling.

## Known gaps

* The `departments` table is empty, so faculty cannot be assigned to a department
  yet, and buildings/rooms are free text rather than a register.
* The financial screens are not part of the administration console: the EDP office
  keeps its own billing system, and the portal only handles what a student files
  and what accounting verifies.
* Some notes under `docs/` predate the current implementation.
