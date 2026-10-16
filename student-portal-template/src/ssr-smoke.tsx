/**
 * Headless smoke test — renders the real app tree to a string so we can verify
 * both surfaces mount without throwing:
 *   1. signed out  -> the CEC sign-in screen
 *   2. signed in   -> the dashboard, with a seeded session + records
 * Not shipped with the app.
 *   npx vite build --ssr src/ssr-smoke.tsx --outDir dist-ssr && node dist-ssr/ssr-smoke.js
 */
import { renderToString } from 'react-dom/server';
import { StoreProvider } from './store';
import { App } from './App';

/* SSR has no localStorage; the store hydrates from it, so provide a minimal one. */
const memory = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: (index: number) => [...memory.keys()][index] ?? null,
  get length() {
    return memory.size;
  },
};
(globalThis as unknown as { localStorage: typeof memoryStorage }).localStorage = memoryStorage;

const render = () => renderToString(<StoreProvider><App /></StoreProvider>);

let assertions = 0;
const expect = (html: string, needles: string[], label: string): void => {
  const missing = needles.filter((needle) => !html.includes(needle));
  if (missing.length) throw new Error(`SSR_SMOKE_FAIL [${label}] missing: ${missing.join(', ')}`);
  assertions += needles.length;
};
const reject = (html: string, needles: string[], label: string): void => {
  const present = needles.filter((needle) => html.includes(needle));
  if (present.length) throw new Error(`SSR_SMOKE_FAIL [${label}] unexpected: ${present.join(', ')}`);
  assertions += needles.length;
};

/* 1 ── signed out: the school-account sign-in screen, no dashboard leakage. */
const loginHtml = render();
expect(
  loginHtml,
  [
    'Cebu Eastern College',
    'Student Portal',
    'Sign in',
    'School ID or CEC email',
    'Forgot your password?',
    'Back to the CEC website',
    'cec-logo.png',
  ],
  'login',
);
reject(loginHtml, ['Academic Menu', 'Enrolled Courses', 'Sign out', 'Dashboard'], 'login');

/* 2 ── signed in with a real CEC account (JWT-shaped, unexpired). */
memory.set(
  'student-portal-template:session:v1',
  JSON.stringify({
    accessToken: 'header.payload.signature',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-1',
      email: 'juan.delacruz.307588@cec.edu.ph',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      role: 'student',
      schoolId: '2836159',
    },
  }),
);

memory.set(
  'student-portal-template:v4',
  JSON.stringify({
    profile: {
      name: 'Juan Dela Cruz',
      program: 'BS Information Technology',
      year: 'Year 3',
      section: 'A',
      major: '',
      email: 'juan.delacruz.307588@cec.edu.ph',
      honor: '',
    },
    insights: { gpa: 3.5, gpaDelta: 0.08, rankLabel: 'Top 10%', standing: 'With Honors' },
    courses: [
      {
        id: 'c1',
        code: 'IT 301',
        title: 'Web Systems',
        instructor: 'Prof. Rosa Santos',
        section: 'Sec A',
        units: 3,
        hours: 3,
        kind: 'Lecture & Lab',
        room: 'Room 304',
        schedule: 'MWF 09:00–10:30',
      },
    ],
    schedule: [
      {
        id: 's1',
        courseId: 'c1',
        code: 'IT 301',
        title: 'Web Systems',
        section: 'Sec A',
        instructor: 'Prof. Rosa Santos',
        room: 'Room 304',
        day: 'Monday',
        start: '09:00',
        end: '10:30',
      },
    ],
    grades: [{ id: 'g1', code: 'IT301', course: 'IT 301', score: 94, median: 90, term: 'Midterm' }],
    attendance: [{ id: 'a1', course: 'IT 301', date: '2026-03-04', status: 'Present' }],
    tasks: [{ id: 'k1', title: 'Group project', course: 'IT 301', type: 'Project', due: 'Mar 10', done: false }],
  }),
);

const dashboardHtml = render();
expect(
  dashboardHtml,
  [
    'Cebu Eastern College',
    'Welcome back,',
    'Juan Dela Cruz',
    'Academic Menu',
    'Dashboard',
    'Class Schedule',
    'Enrolled Courses',
    'Attendance',
    'Settings',
    'Logout',
    'Active Student',
    'Academic period unavailable', // no API call during SSR
    'Current Cumulative GPA',
    'With Honors',
    'Current Semester Course Load',
    'Web Systems',
    'Academic Performance Benchmark',
    'Academic Schedule',
    'Attendance Rate',
    'Attendance Audit',
    'University Bulletins',
    'Term Milestones',
    'No milestones scheduled for this term.',
    'CEC website',
  ],
  'dashboard',
);
reject(dashboardHtml, ['Sign in', 'Forgot your password?'], 'dashboard');

console.log(`SSR_SMOKE_OK login=${loginHtml.length}b dashboard=${dashboardHtml.length}b, ${assertions} assertions passed`);
