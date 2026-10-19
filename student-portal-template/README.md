# CEC Portal — the signed-in portal

The portal students, faculty and the registrar sign in to: dashboard, class
schedule, enrolled courses, grades, attendance, bulletins, chat and the
administration console (registrar only).

Built with **React + Vite + TypeScript**, **Tailwind CSS**, **Lucide React** and
**Recharts**. It is one of the three applications in this repository — see the
[root README](../README.md) for the whole picture.

---

## It is the whole site's dev server

Locally this app serves **both** front-ends on one origin, which is what lets a
visitor sign in on the landing page and land in the portal in the same session:

```bash
cd student-portal-template
npm install
npx vite            # http://localhost:5173/cec-school-portal-1/
                    #   landing  -> /cec-school-portal-1/
                    #   portal   -> /cec-school-portal-1/template/
```

The landing page is a static build of `../clients` (the `clients/` app is the
public site *and* the registrar console). `scripts/build-portal.mjs` produces that
copy into `.portal/`:

```bash
npm run portal:build          # rebuild when clients/ changed (skips if fresh)
npm run portal:build -- --force
```

Stop the dev server before rebuilding: Windows holds a lock on the portal's media
files and the copy will fail otherwise.

| Script | What it does |
| --- | --- |
| `npm run dev` / `npx vite` | Dev server for the landing page *and* the portal on port 5173 |
| `npm run portal:build` | Build `../clients` into `.portal/` so the dev server can serve it |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run build` | Type-check + production build to `dist/` (what Pages publishes under `template/`) |
| `npm run preview` | Serve the production build |
| `npm run smoke` | SSR-render the tree headlessly and assert on the output |

---

## Where its data comes from

Every screen reads the live API — there is **no sample dataset**, and nothing is
seeded into the portal on first load. An empty table means an honest empty state.

| Screen | Source |
| --- | --- |
| Class Schedule | published timetable documents (`portal_items`, `module: schedule`) — what the registrar published for the section and term |
| Grades / Attendance | one posted record per student and term (`module: grade` / `attendance`), written by the faculty member who teaches them |
| Enrolled Courses | the student's own enrollment records |
| Bulletins | `announcements`, filtered to the reader's audience |
| Tuition receipt | the receipt the student files, verified by the EDP office |
| Administration screens | the registrar's API (`/api/admin/...`) plus the portal's own decision routes |

Signed-in students are sent here from the landing page; signing out returns them to
the landing page. Sessions live in `localStorage` (`cec:session_user`,
`cec_access_token`, `cec_refresh_token`) so a shared link works without localhost.

---

## Navigation by role

* **Student** — ACADEMIC MENU: Dashboard, Class Schedule, Enrolled Courses, Grades,
  Attendance; SYSTEM: Settings, Logout.
* **Faculty** — class roster, grade encoding, attendance tracker, class schedule.
* **Registrar / administrator** — the twelve administration screens (Dashboard,
  Student Management, Teacher Management, Course Management, Class Schedule,
  Enrollment Management, Grades Management, Attendance Management, User Accounts,
  Announcements, Settings, Activity Logs), with real writes behind them.

---

## Configuration

The API base is resolved per environment:

* **locally** — `/api`, proxied by Vite to `http://127.0.0.1:4000`.
* **on GitHub Pages** — the absolute Render URL baked in by the deployment
  workflow; the deployed origin has no proxy, so the base must include `/api`.

Chat needs `VITE_SOCKET_URL`; without it the portal keeps chat read-only instead of
guessing a host.

---

## Related

* `../clients` — the public site and registrar console, and the source of `.portal/`.
* `../server` — the API, the database access layer and the socket server.
* `../README.md` — the repository overview, the enrollment flow, and how to run
  everything together.
