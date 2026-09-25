// Philippine college grading system (1.00–5.00 scale).
export type GradePoint = { point: number; equivalent: string; remarks: 'PASSED' | 'FAILED' };

const SCALE: { min: number; point: number; equivalent: string }[] = [
  { min: 97, point: 1.0, equivalent: 'Excellent' },
  { min: 94, point: 1.25, equivalent: 'Superior' },
  { min: 91, point: 1.5, equivalent: 'Very Good' },
  { min: 88, point: 1.75, equivalent: 'Good' },
  { min: 85, point: 2.0, equivalent: 'Satisfactory' },
  { min: 82, point: 2.25, equivalent: 'Fair' },
  { min: 79, point: 2.5, equivalent: 'Fair' },
  { min: 76, point: 2.75, equivalent: 'Passing' },
  { min: 75, point: 3.0, equivalent: 'Passing' },
];

export const percentToPoint = (percent: number): GradePoint => {
  if (!Number.isFinite(percent)) return { point: 0, equivalent: '—', remarks: 'FAILED' };
  for (const row of SCALE) {
    if (percent >= row.min) return { point: row.point, equivalent: row.equivalent, remarks: 'PASSED' };
  }
  return { point: 5.0, equivalent: 'Failure', remarks: 'FAILED' };
};

export const formatPoint = (point: number): string => (point > 0 ? point.toFixed(2) : '—');

// College input: teachers may type a percent (60–100) or a grade point
// (1.00–5.00). Points convert to their band percent for averaging.
const POINT_TO_PERCENT: [number, number][] = [
  [1.0, 98], [1.25, 95], [1.5, 92], [1.75, 89], [2.0, 86],
  [2.25, 83], [2.5, 80], [2.75, 77], [3.0, 75], [5.0, 65],
];

export const entryToPercent = (value: string | number): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 5) {
    let best = POINT_TO_PERCENT[0];
    for (const row of POINT_TO_PERCENT) {
      if (Math.abs(n - row[0]) < Math.abs(n - best[0])) best = row;
    }
    return best[1];
  }
  return n;
};

export const averagePercent = (values: (string | number)[]): number | null => {
  const nums = values.map(entryToPercent).filter((v): v is number => v !== null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

export const gwa = (points: number[]): number | null => {
  const valid = points.filter((p) => p > 0);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};
