import { useMemo, useState } from 'react';

export type WorkflowStep = {
  label: string;
  updatedAt?: string;
  updatedBy?: string;
  notes?: string;
  nextAction?: string;
  documents?: string[];
};

type Props = {
  title: string;
  reference: string;
  steps: WorkflowStep[];
  currentIndex: number;
  onAdvance?: (index: number, step: WorkflowStep) => void;
};

export const WorkflowTracker = ({ title, reference, steps, currentIndex, onAdvance }: Props) => {
  const [selected, setSelected] = useState(currentIndex);
  const active = steps[selected] ?? steps[0];
  const progress = useMemo(() => Math.round(((selected + 1) / steps.length) * 100), [selected, steps.length]);
  return <section className="workflow-card">
    <div className="workflow-heading"><div><span className="workflow-kicker">WORKFLOW STATUS</span><h1>{title}</h1><p>{reference}</p></div><strong>{progress}% complete</strong></div>
    <div className="workflow-progress"><span style={{ width: `${progress}%` }} /></div>
    <div className="workflow-steps">{steps.map((step, index) => <button key={step.label} type="button" className={`workflow-step ${index === selected ? 'is-active' : ''} ${index < selected ? 'is-complete' : ''}`} onClick={() => setSelected(index)}><span>{index < selected ? '✓' : index + 1}</span><b>{step.label}</b><small>{step.updatedAt ?? 'Pending'}</small></button>)}</div>
    {active && <div className="workflow-detail"><div><span className="workflow-kicker">CURRENT STAGE</span><h2>{active.label}</h2><p>{active.notes ?? 'No notes have been added for this stage.'}</p></div><dl><div><dt>Updated by</dt><dd>{active.updatedBy ?? 'Awaiting update'}</dd></div><div><dt>Next action</dt><dd>{active.nextAction ?? 'No next action specified'}</dd></div><div><dt>Supporting documents</dt><dd>{active.documents?.join(', ') || 'None attached'}</dd></div></dl></div>}
    {onAdvance && selected < steps.length - 1 && <button className="primary-button workflow-advance" type="button" onClick={() => { const next = selected + 1; setSelected(next); onAdvance(next, steps[next]); }}>Advance to {steps[selected + 1].label}</button>}
  </section>;
};
