# CEC School Portal — Module Flows (frontend → backend → database)

Legend: **MySQL** = shared database (works across devices) · **Local**
= browser `localStorage` (same-device demo layer, syncs when API is reachable).
API base `/api`. Roles: S student · T teacher · A admin.

## 1. Authentication
- **Apply — new enrollee** (`Register.tsx` → role pills student/teacher/admin):
  `POST /api/auth/enrollment` → `auth.service.submitEnrollment`
  → `users` + `enrollment_applications`(approved) + `students` rows.
  Returns school email + temp password + school ID (typed 7-digit kept:
  `2xxxxxx` S · `3xxxxxx` T · `4xxxxxx` A). Offline: same data to
  `cec:registrations`, `cec:a_accounts_v2`, `cec:a_enroll_v2`.
- **Apply — old student** (I AM A → Old Student): school ID + name + Gmail +
  phone + clearance → `POST /api/auth/claim` → matches `students` /
  `teachers` numbers + name → resets password → returns credentials.
  Offline: matches local `cec:registrations`.
- **Login** (`Login.tsx`, single form, 7-digit ID or school email + password):
  `POST /api/auth/login` (bcrypt, lockout after 5 fails, returns JWT +
  `schoolId`) → loadscreen → role dashboard. Offline: stored registrations.
- **Change password** (Profile pages, all roles): `POST /api/auth/change-password`
  (verifies current, bcrypt-hashes new). Offline: rotates local temp password.
- **Accounts & RBAC** (A → Account Creation): local CRUD `a_accounts_v2`
  with 7-digit validation; RBAC matrix gates UI areas; server JWT + RBAC
  middleware guard `/portal` writes and audit routes.

## 2. Enrollment
- **Online Enrollment** (S): program/year/sem → `POST /api/portal/enrollments`
  → `enrollment_applications`(pending) + local `cec:s_enroll_apps` +
  admin queue mirror `cec:a_enroll_v2`.
- **Walk-in** (A → Enrollment Approval → Enroll walk-in ✓): direct
  `POST /api/auth/enrollment` → account issued on the spot, credentials popup
  for hand-over. Offline: same locally. Queue-only variant also exists.
- **Schedule Selection / EDP** (S): COR offering table (EDP code, subject,
  descriptive, day/time Mon–Sat 7:30AM–9PM, room, Lec/Lab, units, live slots
  1–60, Regular/OPEN presets, re-click to clear) → saved picks
  `cec:s_picks` → tag Regular(section)/Irregular(OPEN) written back to both
  queues → Class Schedule auto-renders the COR table + total units.
- **Document Submission** (S): School Assessment upload popup + typed School
  ID → single Submit → auto-verification Submitted→Accepted; **admin sees
  nothing until submitted** (true empty state). Old flow: registrar Confirms
  in A → Document Verification (shared `cec:doc_stages`, MySQL mirror).
- **Status Tracker** (S): read-only, polls every 4s; stages move only via
  admin Docs ✓ → Approve → Enroll ✓ (row leaves queue only at Enroll/Reject).
- **Approval queue** (A): live MySQL pending + local mirror, search,
  Approve/Reject/Enroll ✓; Enroll writes `users`+`students` rows (full
  provisioning, temp password returned) and drops the student onto the
  teacher roster (`cec:t_roster_v2`).

## 3. Academic Records (S)
- **Profile Management**: editable 8-field profile, photo upload, persisted
  (`cec:s_profile`); Save actually writes (was toast-only before).
- **Grades / Report Card**: reads official teacher-encoded grades, PH
  1.00–5.00 conversion + GWA; empty state pre-encoding.
- **Class Schedule**: auto-built COR table from saved EDP picks.
- **Curriculum Checklist**: progress bar + per-item toggles.
- **Attendance Records**: filterable view of recorded entries.

## 4. Grading (T)
- **Grade Encoding**: percent (75–100) or point (1.00–5.00) entry, auto
  average → PH point + PASSED/FAILED, scale legend, lock/unlock sheets.
- **Computation / Finalization / Exams**: GWA math, sheet locking, exam CRUD.
  Writes `cec:t_grades_v2` (starts empty — no demo students).

## 5. Attendance (T)
- Daily marking (Present/Late/Absent per student), history, summaries;
  feeds the student attendance view and dashboard metric.

## 6. LMS
- T: materials upload, assignment creation/checking queue, announcements,
  forum. S: materials view, assignment submit (status → Submitted), quizzes
  (scored attempts), announcements, discussion posts.

## 7. Library
- Catalog search, borrowing tracker (borrow/return), reservations, fines
  (pay). All CRUD, persisted per browser.

## 8. Financial (live-connected both directions)
- S **Tuition Assessment**: official admin bills/fees (`a_bills_v2`,
  `a_fees_v2`) render read-only with live total + own adjustments.
- S **Payment Portal**: GCash, Maya, GoTyme, UnionBank, Metrobank, BPI,
  Cashier + reference → receipt popup + `Billing History`; receipt mirrored
  to MySQL `portal_items` (module `receipt`).
- A **Payment Monitoring**: local + MySQL receipts merged, Verify per receipt
  → student tracker hits Receipt Issued + notification.
- **Scholarships**: S applies → A queue → Approve/Deny writes back to the
  student application; approval counts as accounting clearance in enrollment.
- Dashboard balance = assessed − paid → Fully Paid state.

## 9. Communication
- Messaging per role, announcement posting (T) / broadcast (A) fanning
  notifications to all roles (`services/notify.ts`, MySQL-mirrored);
  NotificationCenter bell with badge, popup `AlertPopup` receipts.

## 10. Support Services (S)
- Guidance appointments, document requests (with live request tracker),
  complaint/feedback — full CRUD.

## 11. HR / Faculty (A)
- Teacher Records with faces, Load Assignment, Credentials with expiry —
  new teacher registrations surface here automatically.

## 12. Reporting (A)
- `LiveReports.tsx`: enrollment stats (program filter/search), academic
  bands from real encoded grades, revenue collected vs outstanding — Print +
  CSV export. Static showcase cards appear only with live data.

## 13. System
- Config key/value CRUD, Audit Log (reads real admin activity; server writes
  `audit_logs` on portal mutations), Backup download/Restore upload, demo
  Reset, Security (auto-approve state, session revoke), dark/light mode
  (persisted), AI Support widget (local KB + optional OpenAI endpoint),
  registrar (3) + finance (1) slideshows, profile photos everywhere,
  dragons loading screen with crest after every login.

## Cross-cutting
- IDs: 7 digits everywhere (`2` S · `3` T · `4` A), validated on entry,
  auto-migrated on login; login accepts ID or school email.
- Offline: every flow works browser-local and syncs to MySQL when reachable.
- Defense accounts: `registrar@cec.edu.ph` / `main.admin@` (Admin123),
  `j.santos@` / `h.quibol@` (Teacher123).
