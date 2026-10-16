# Student Portal — Dashboard Template

A modern, data-dense academic dashboard inspired by high-end SaaS analytics tools.
Built with **React + Vite + TypeScript**, **Tailwind CSS**, **Lucide React** icons,
and **Recharts**.

> Standalone template — intentionally **not** wired into the CEC School Portal app.
> It has its own dependencies and build so it can be used, themed, and demoed independently.

---

## Quick start

```bash
cd student-portal-template
npm install
npm run dev        # http://localhost:5180
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5180 |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run smoke` | SSR-render the whole tree headlessly and assert on the output |

The app ships with a **sample dataset** (Alex Morgan · BS Computer Science · 6 courses)
so it looks complete on first load. Use the footer buttons to **Load sample data** or
**Reset template data** (empty) at any time. State persists to `localStorage`
(`student-portal-template:v2`).

---

## Layout

```
Sidebar (240px)  ┃  Topbar (search · AY pill · bell · profile)
                 ┃  ┌ Welcome banner — identity pills + 4 quick actions ┐
                 ┃  │ 5 stat cards: Courses · GPA · Attendance ·       │
                 ┃  │   Classes Today · Pending Tasks                  │
                 ┃  ├──────────────────────────┬───────────────────────┤
                 ┃  │ Today's Academic Schedule│ Attendance Audit donut│
                 ┃  │ Performance Benchmark    │ University Bulletins  │
                 ┃  │ Current Course Load      │ Term Milestones       │
                 ┃  └──────────────────────────┴───────────────────────┘
```

- **Schedule rows** show a live status badge (Completed / Ongoing / Starting in _Nm_ / Upcoming)
  computed from the current time.
- **Benchmark** is a grouped bar chart (Your Score vs Cohort) with a term-standing footer.
- **Attendance** is a 4-segment donut: Present · Late · Excused Leave · Unexcused Absences.
- **Course cards** carry a syllabus progress bar, contact hours, units and a delivery-type chip.

## Data-entry modals

Every metric is editable — the five hero/card actions open real forms:

1. **Class Schedule** — day, start/end, linked course, section, instructor, room
2. **Grades** — course, score (0–100), cohort average, term
3. **Attendance** — course, date, Present/Late/Excused/Absent
4. **Enroll Course** — code, title, instructor, units, hours, delivery type, progress, room
5. **Profile Setup** — name, email, program, major, year, section, honor banner
   Plus a **Pending Tasks** modal with checkable items.

## Project structure

```
src/
  App.tsx                     layout + modal orchestration
  main.tsx                    entry
  store.tsx                   context store (state, actions, localStorage, toast)
  types.ts                    domain types + option constants + palette
  index.css                   Tailwind layers + component classes
  data/sample.ts              AY options + the sample dataset + empty state
  lib/metrics.ts              derived analytics (GPA, attendance, tasks, benchmarks, status)
  ssr-smoke.tsx               headless render smoke test (dev only)
  components/
    Sidebar · Topbar · WelcomeBanner · StatCards
    TodaySchedule · PerformanceBenchmark · CourseLoad
    AttendanceAudit · Bulletins · TermMilestones
    DataForms.tsx             all six modals
    ui/Modal.tsx              accessible dialog primitive
```

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| Brand navy | `#1B365D` / `#1E3A8A` | banner, primary buttons, chart series |
| Surface | `#F3F6FC` | app background |
| Border | `#E2E8F0` | cards, dividers |
| Accents | `#3B82F6` `#6366F1` `#8B5CF6` `#10B981` `#F59E0B` `#EF4444` | nav icons, stat tones, course tiles, charts |
| Fonts | Inter (sans) · Playfair Display (serif headings) | — |

Responsive: stat cards `sm:grid-cols-2 xl:grid-cols-5`, course grid `sm:grid-cols-2 xl:grid-cols-3`,
main region `lg:grid-cols-3`. The sidebar collapses to a mobile drawer under `lg`.
