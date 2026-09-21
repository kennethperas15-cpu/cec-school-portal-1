import api from './api';

// Shared document stages: registrar/admin advance these, students only watch.
// Same-browser source of truth is localStorage; mirrored to MySQL portal_items.
export const DOC_STAGES = ['Request Submitted', 'Processing', 'Ready for Pickup', 'Released'];
// Stages for submitted requirement documents (assessment / ID)
export const SUBMIT_STAGES = ['Submitted', 'Under Review', 'Verified', 'Accepted'];
const KEY = 'cec:doc_stages';

type StageMap = Record<string, number>;

export const readStages = (): StageMap => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StageMap) : {};
  } catch { return {}; }
};

export const readStage = (docId: string): number => readStages()[docId] ?? 0;

export const writeStage = (docId: string, index: number) => {
  const next = { ...readStages(), [docId]: Math.max(0, Math.min(DOC_STAGES.length - 1, index)) };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  // Best-effort MySQL mirror so other devices/admins see it
  try {
    void api.post('/portal/items', {
      portal: 'shared', module: 'doc_stage', title: docId,
      detail: DOC_STAGES[next[docId]], status: `stage-${next[docId]}`,
    }).catch(() => undefined);
  } catch { /* offline */ }
  try { window.dispatchEvent(new Event('cec:doc-stages')); } catch { /* ignore */ }
};

export const listTrackedDocs = (): { id: string; stage: number }[] => {
  const ids = new Set<string>();
  // Student submissions + registrar seed
  try {
    const raw = localStorage.getItem('cec:s_docs');
    const rows = raw ? (JSON.parse(raw) as { id: string; name: string }[]) : [];
    rows.forEach((r) => ids.add(r.id));
  } catch { /* ignore */ }
  ids.add('DOC-2026-0091');
  const stages = readStages();
  return [...ids].map((id) => ({ id, stage: stages[id] ?? 0 }));
};
