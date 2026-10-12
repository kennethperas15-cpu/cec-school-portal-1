import React, { useMemo, useState } from 'react';

export type ScheduleSlot = {
  edp: string;
  subject: string;
  schedule: string;
  room: string;
  section: string;
  batch?: number;
};

type DayBucket = 'all' | 'morning' | 'afternoon' | 'evening';

const bucketOf = (schedule: string): Exclude<DayBucket, 'all'> | null => {
  const m = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const hour = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const readSlots = (): ScheduleSlot[] => {
  try {
    const raw = localStorage.getItem('cec:studyload_offerings');
    const rows = raw ? (JSON.parse(raw) as ScheduleSlot[]) : [];
    return rows.filter((r) => r && r.edp && r.subject && r.schedule);
  } catch { return []; }
};

interface SchedulePickerProps {
  initialDay?: Exclude<DayBucket, 'all'>;
  selectedEdp?: string | null;
  onSelect?: (slot: ScheduleSlot | null) => void;
}

/**
 * Dedicated clutter-free schedule browser for enrollment: filter by class
 * time, pick one slot. Reads registrar-published study loads on this device.
 */
export const SchedulePicker: React.FC<SchedulePickerProps> = ({ initialDay = 'morning', selectedEdp = null, onSelect }) => {
  const [day, setDay] = useState<DayBucket>(initialDay);
  const [query, setQuery] = useState('');
  const slots = useMemo(readSlots, []);
  const q = query.trim().toLowerCase();
  const visible = slots.filter((s) => {
    if (day !== 'all' && bucketOf(s.schedule) !== day) return false;
    if (q && !`${s.subject} ${s.schedule} ${s.room} ${s.section}`.toLowerCase().includes(q)) return false;
    return true;
  });

  if (!slots.length) {
    return (
      <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 16, fontSize: 13, color: '#64748B' }}>
        No published class schedules yet — the registrar publishes study-load batches soon. You can still submit; plotting opens in Section Selection later.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }} role="group" aria-label="Filter by class time">
        {(['all', 'morning', 'afternoon', 'evening'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            aria-pressed={day === d}
            style={{
              border: day === d ? '2px solid #0B3D91' : '1px solid #e2e7ef',
              background: day === d ? '#e8f1ff' : '#fff', borderRadius: 999,
              padding: '6px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#0B3D91',
            }}
          >
            {d === 'all' ? 'All day' : d === 'morning' ? '☀️ Morning' : d === 'afternoon' ? '🌤️ Afternoon' : '🌙 Evening'}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subject or room…"
          aria-label="Search schedules"
          style={{ flex: '1 1 160px', border: '1px solid #e2e7ef', borderRadius: 999, padding: '6px 14px', fontSize: 12 }}
        />
      </div>
      <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
        {visible.map((s) => {
          const picked = selectedEdp === s.edp;
          return (
            <button
              key={s.edp}
              type="button"
              onClick={() => onSelect?.(picked ? null : s)}
              aria-pressed={picked}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                textAlign: 'left', border: picked ? '2px solid #0B3D91' : '1px solid #e6eaf1',
                background: picked ? '#eef4ff' : '#fff', borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
              }}
            >
              <span>
                <strong style={{ fontSize: 14, color: '#0f1f38' }}>{s.subject}</strong>
                <span style={{ display: 'block', fontSize: 12, color: '#6b7890' }}>
                  {s.schedule}{s.room ? ` • ${s.room}` : ''}{s.section ? ` • ${s.section}` : ''}{typeof s.batch === 'number' ? ` • Batch ${s.batch}` : ''}
                </span>
              </span>
              <span style={{
                background: picked ? '#0B3D91' : '#eef1f6', color: picked ? '#fff' : '#0B3D91',
                borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>
                {picked ? 'Picked ✓' : 'Pick'}
              </span>
            </button>
          );
        })}
        {!visible.length && (
          <div style={{ fontSize: 13, color: '#64748B' }}>No slots match this filter — try All day or another search.</div>
        )}
      </div>
    </div>
  );
};

export default SchedulePicker;
