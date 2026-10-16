import { Medal, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { PerformanceBenchmark } from '../PerformanceBenchmark';
import { compositeScore, letterGrade } from '../../lib/metrics';
import { useStore } from '../../store';
import { PageHeader } from './PageHeader';

export const GradesView = ({ onAdd }: { onAdd: () => void }) => {
  const { grades, insights, removeGrade } = useStore();
  const composite = compositeScore(grades);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Medal}
        title="Grades"
        subtitle="Assessment scores, class median and your standing"
        action={
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Enter grade
          </button>
        }
      />

      <PerformanceBenchmark data={grades.map((g) => ({ code: g.code, course: g.course, you: g.score, median: g.median }))} standing={insights.standing} composite={composite} onAdd={onAdd} />

      <section className="card p-6">
        <h2 className="card-title">Recorded grades</h2>
        <p className="card-sub">One entry per course and term — re-recording a term replaces it</p>

        {grades.length === 0 ? (
          <div className="dashed-empty mt-5">
            <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
              <Medal className="h-5 w-5" />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500">
              No grades recorded yet. Grades appear here as soon as your instructors post them.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 pr-3">Course</th>
                  <th className="pb-2.5 pr-3">Term</th>
                  <th className="pb-2.5 pr-3 text-right">Score</th>
                  <th className="pb-2.5 pr-3 text-right">Median</th>
                  <th className="pb-2.5 pr-3 text-right">vs median</th>
                  <th className="pb-2.5 pr-3">Letter</th>
                  <th className="pb-2.5" />
                </tr>
              </thead>
              <tbody>
                {[...grades]
                  .sort((a, b) => a.course.localeCompare(b.course))
                  .map((grade) => {
                    const delta = grade.score - grade.median;
                    return (
                      <tr key={grade.id} className="group border-b border-line/70 last:border-0">
                        <td className="py-3 pr-3 font-semibold text-slate-800">{grade.course}</td>
                        <td className="py-3 pr-3 text-slate-500">{grade.term}</td>
                        <td className="py-3 pr-3 text-right font-bold text-slate-900">{grade.score}</td>
                        <td className="py-3 pr-3 text-right text-slate-500">{grade.median}</td>
                        <td className="py-3 pr-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {delta >= 0 ? '+' : ''}
                            {delta}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="chip bg-[#EFF6FF] text-[#2563EB]">{letterGrade(grade.score)}</span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            className="text-slate-300 transition hover:text-[#EF4444]"
                            onClick={() => removeGrade(grade.id)}
                            aria-label={`Remove ${grade.course} grade`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
