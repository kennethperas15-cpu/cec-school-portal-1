/**
 * Headless smoke test — renders the full dashboard tree to a string so we can
 * verify every panel mounts without throwing. Not shipped with the app.
 *   npx vite build --ssr src/ssr-smoke.tsx --outDir dist-ssr && node dist-ssr/ssr-smoke.js
 */
import { renderToString } from 'react-dom/server';
import { StoreProvider } from './store';
import { App } from './App';

const html = renderToString(
  <StoreProvider>
    <App />
  </StoreProvider>,
);

const required = [
  'Welcome back,',
  'BS Computer Science',
  'Cebu Eastern College',
  'Honor List',
  'Enrolled Courses',
  'Current Cumulative GPA',
  '3.84',
  'Attendance Rate',
  'Classes Today',
  'Pending Tasks',
  'Academic Schedule',
  'Systems Programming',
  'Prof. Alan Turing',
  'Innovation Lab B',
  'Academic Performance Benchmark',
  'Overall Composite',
  'Overall Term Standing',
  'Summa Cum Laude Track',
  'Current Semester Course Load',
  'Total Enrolled Courses',
  'Academic Units',
  'Database Architecture',
  'Attendance Audit',
  'Late Arrivals',
  'Total Sessions',
  'University Bulletins',
  'Term Milestones',
  'Midterm Examination Week',
  'Grading Clearance Deadline',
  'Active Student',
];

const missing = required.filter((needle) => !html.includes(needle));
if (missing.length) {
  throw new Error(`SSR_SMOKE_FAIL missing: ${missing.join(', ')}`);
}

console.log(`SSR_SMOKE_OK html=${html.length} bytes, ${required.length} assertions passed`);
