// Enrollment pipeline shared by student ↔ admin ↔ teacher (same-browser local layer).
// Flow: Applied → Docs OK (registrar: assessment + typed ID present)
//     → Payment OK (accounting: receipt posted OR scholarship approved)
//     → EDP auto-approves → Enrolled → student appears on teacher roster.
export type Applicant = { name: string; email: string };

type App = { id: string; name: string; role: string };

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};

const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

export const docsComplete = (): boolean => {
  const rows = read<{ id: string }[]>('cec:s_docs', []);
  return rows.some((r) => r.id === 'school-assessment') && rows.some((r) => r.id === 'school-id-doc');
};

export const paymentComplete = (): boolean => {
  const history = read<{ id: string }[]>('cec:s_history_v2', []);
  if (history.length > 0) return true;
  const scholars = read<{ name: string; role: string }[]>('cec:s_scholar_v2', []);
  return scholars.some((s) => s.role.toLowerCase().includes('approv'));
};

const ensureRoster = (appId: string, applicant: Applicant, program: string) => {
  const roster = read<{ id: string; name: string; course: string; email: string }[]>('cec:t_roster_v2', []);
  if (roster.some((r) => r.id === appId)) return;
  roster.push({ id: appId, name: applicant.name, course: program.split('•')[0].trim(), email: applicant.email });
  write('cec:t_roster_v2', roster);
};

/** One-time normalization + roster sync. Statuses change ONLY via admin
 *  actions (queue Approve/Reject, auto-approve toggle). Never auto-enrolls. */
export const refreshPipeline = (applicant: Applicant): string[] => {
  const apps = read<App[]>('cec:s_enroll_apps', []);
  let changed = false;
  const next = apps.map((a) => {
    // Roll back unearned pipeline auto-enrollments to verified-pending
    if (a.role.includes('EDP auto-approved')) {
      changed = true;
      return { ...a, role: 'Pending • Documents Verified' };
    }
    return a;
  });
  // Roster follows ADMIN-approved enrollments only
  next.forEach((a) => {
    if (a.role === 'Approved' || a.role.includes('Approved (auto)') || a.role === 'Enrolled') {
      ensureRoster(a.id, applicant, a.name);
    }
  });
  if (changed) write('cec:s_enroll_apps', next);
  return [];
};

export const pipelineBadges = (): { docs: boolean; pay: boolean } => ({
  docs: docsComplete(),
  pay: paymentComplete(),
});

export type AssessmentLine = { id: string; label: string; amount: number; source: 'finance' | 'self' };

export const parseAmount = (s: string): number => {
  const t = s.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = t.replace(/,/g, '').match(/₱\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
};

/** Official finance-office assessment lines (admin Financial Mgmt). */
export const readOfficialAssessment = (): AssessmentLine[] => {
  const out: AssessmentLine[] = [];
  try {
    const bRaw = localStorage.getItem('cec:a_bills_v2');
    (bRaw ? (JSON.parse(bRaw) as { id: string; name: string; role: string }[]) : []).forEach((b) => {
      const amt = parseAmount(`${b.name} ${b.role}`);
      if (amt > 0) out.push({ id: `bill:${b.id}`, label: `${b.name} — ${b.role}`, amount: amt, source: 'finance' });
    });
    const fRaw = localStorage.getItem('cec:a_fees_v2');
    (fRaw ? (JSON.parse(fRaw) as { id: string; name: string; role: string }[]) : []).forEach((f) => {
      const amt = parseAmount(`${f.name} ${f.role}`);
      if (amt > 0) out.push({ id: `fee:${f.id}`, label: `${f.name} (${f.role})`, amount: amt, source: 'finance' });
    });
  } catch { /* ignore */ }
  return out;
};
