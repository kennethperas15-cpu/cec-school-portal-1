import { BookOpen, Plus, Trash2 } from 'lucide-react';
import type { Course, GradeEntry } from '../types';
import { gradeForCode, letterGrade } from '../lib/metrics';

type CourseLoadProps = {
  courses: Course[];
  grades: GradeEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
};

export const CourseLoad = ({ courses, grades, onAdd, onRemove }: CourseLoadProps) => (
  <section id="courses" className="card scroll-mt-24 p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="icon-chip h-9 w-9 bg-[#EFF6FF] text-[#2563EB]">
          <BookOpen className="h-[18px] w-[18px]" />
        </span>
        <h2 className="card-title">Current Semester Course Load</h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="pill bg-slate-100 text-slate-600">{courses.length} Total Enrolled Courses</span>
        <button type="button" className="btn-soft px-2.5 py-2" onClick={onAdd} aria-label="Enroll a course">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>

    {courses.length === 0 ? (
      <div className="dashed-empty mt-5">
        <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
          <BookOpen className="h-5 w-5" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          No enrolled courses yet. Use{' '}
          <span className="font-semibold text-slate-700">&lsquo;Enrolled Courses&rsquo;</span> to build this
          semester&apos;s load.
        </p>
        <button type="button" className="btn-primary" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Enroll a Course
        </button>
      </div>
    ) : (
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const grade = gradeForCode(grades, course.code);
          return (
            <article
              key={course.id}
              className="group rounded-xl border border-line bg-white p-4 transition hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold text-[#1B365D]">{course.code}</span>
                <div className="flex items-center gap-1.5">
                  {grade ? (
                    <span className="chip bg-[#EFF6FF] text-[#2563EB]">
                      {grade.score}% ({letterGrade(grade.score)})
                    </span>
                  ) : (
                    <span className="chip bg-slate-100 text-slate-400">Not graded</span>
                  )}
                  <button
                    type="button"
                    className="text-slate-300 opacity-0 transition hover:text-[#EF4444] focus:opacity-100 group-hover:opacity-100"
                    onClick={() => onRemove(course.id)}
                    aria-label={`Remove ${course.code}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="mt-1 truncate text-sm font-semibold text-slate-800" title={course.title}>
                {course.title || 'Untitled course'}
              </h3>
              <p className="mt-1 truncate text-xs text-slate-500">
                {course.instructor || 'Instructor TBA'}
                {course.section ? ` • ${course.section}` : ''}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[11px] font-medium text-slate-500">
                  {course.units.toFixed(1)} Academic Units
                </span>
                <span className="chip shrink-0 bg-slate-100 text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                  {course.kind || 'Lecture'}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </section>
);
