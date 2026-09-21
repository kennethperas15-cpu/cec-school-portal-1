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

export const averagePercent = (values: (string | number)[]): number | null => {
  const nums = values.filter((v) => v !== '' && !Number.isNaN(Number(v))).map(Number);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

export const gwa = (points: number[]): number | null => {
  const valid = points.filter((p) => p > 0);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};
