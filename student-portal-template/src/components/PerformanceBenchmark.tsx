import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Plus } from 'lucide-react';
import type { BenchmarkPoint } from '../lib/metrics';

type PerformanceBenchmarkProps = {
  data: BenchmarkPoint[];
  standing: string;
  composite: number;
  onAdd: () => void;
};

const percentLabel = (value: unknown) => `${String(value)}%`;

/* recharts injects these props at render time */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BenchTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as BenchmarkPoint | undefined;
  if (!point) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-bold text-slate-800">{point.course}</p>
      <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="h-2 w-2 rounded-sm bg-[#1E3A8A]" />
        Alex&apos;s Score
        <span className="ml-auto font-semibold text-slate-800">{point.you}%</span>
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="h-2 w-2 rounded-sm bg-[#BFDBFE]" />
        Class Median
        <span className="ml-auto font-semibold text-slate-800">{point.median}%</span>
      </p>
    </div>
  );
};

export const PerformanceBenchmark = ({ data, standing, composite, onAdd }: PerformanceBenchmarkProps) => {
  const hasData = data.length > 0;

  return (
    <section id="benchmark" className="card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="card-title">Academic Performance Benchmark</h2>
          <p className="card-sub">Continuous course grade assessments against the class median</p>
        </div>
        <button type="button" className="btn-soft shrink-0" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Enter Grades
        </button>
      </div>

      <div className="relative mt-4 h-[286px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 26, right: 10, bottom: 4, left: -12 }} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="4 4" stroke="#EEF2F7" vertical={false} />
            <XAxis
              dataKey="course"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              height={28}
            />
            <YAxis
              domain={[70, 100]}
              ticks={[70, 80, 90, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip cursor={{ fill: 'rgba(148,163,184,0.10)' }} content={<BenchTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              height={30}
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: '#64748B' }}
            />
            <Bar dataKey="median" name="Class Median" fill="#BFDBFE" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="you" name="Alex's Score" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={22}>
              <LabelList
                dataKey="you"
                position="top"
                offset={8}
                formatter={percentLabel}
                style={{ fontSize: 10, fontWeight: 700, fill: '#334155' }}
              />
            </Bar>
            <Line
              type="monotone"
              dataKey="you"
              stroke="#1E3A8A"
              strokeWidth={2}
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/60 backdrop-blur-[1px]">
            <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
              <BarChart3 className="h-5 w-5" />
            </span>
            <p className="max-w-xs text-center text-sm text-slate-500">
              Awaiting grade entries to generate benchmark analytics.
            </p>
            <button type="button" className="btn-soft mt-1" onClick={onAdd}>
              <Plus className="h-4 w-4" /> Enter your first grade
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <p className="text-slate-500">
          Overall Term Standing: <span className="font-semibold text-slate-800">{standing || '—'}</span>
        </p>
        <p className="text-slate-500">
          Overall Composite:{' '}
          <span className="font-semibold text-slate-800">{composite > 0 ? `${composite.toFixed(1)}%` : '—'}</span>
        </p>
      </div>
    </section>
  );
};
