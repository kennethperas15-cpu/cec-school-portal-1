import { BookOpen, GraduationCap, Layers, Sparkles } from 'lucide-react';
import { CourseLoad } from '../CourseLoad';
import { totalUnits } from '../../lib/metrics';
import { useStore } from '../../store';
import { PageHeader } from './PageHeader';

export const CoursesView = ({ onAdd }: { onAdd: () => void }) => {
  const { courses, grades, removeCourse } = useStore();

  const units = totalUnits(courses);
  const graded = courses.filter((course) => grades.some((g) => g.course === course.code)).length;
  const kinds = new Set(courses.map((course) => course.kind).filter(Boolean)).size;

  const tiles = [
    { label: 'Subjects enrolled', value: String(courses.length), icon: BookOpen },
    { label: 'Academic units', value: units.toFixed(1), icon: Layers },
    { label: 'Delivery types', value: String(kinds), icon: GraduationCap },
    { label: 'Subjects graded', value: `${graded}/${courses.length}`, icon: Sparkles },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BookOpen}
        title="Enrolled Courses"
        subtitle="The subjects on your current semester load"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase leading-tight tracking-wider text-slate-400">{label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <CourseLoad courses={courses} grades={grades} onAdd={onAdd} onRemove={removeCourse} />
    </div>
  );
};
