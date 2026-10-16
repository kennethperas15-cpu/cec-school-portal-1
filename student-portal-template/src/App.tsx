import { useMemo, useState } from 'react';
import { CheckCircle2, Info, RotateCcw, Sparkles } from 'lucide-react';
import { Sidebar, type NavKey } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { WelcomeBanner, type BannerAction } from './components/WelcomeBanner';
import { StatCards, type StatAction } from './components/StatCards';
import { TodaySchedule } from './components/TodaySchedule';
import { PerformanceBenchmark } from './components/PerformanceBenchmark';
import { CourseLoad } from './components/CourseLoad';
import { AttendanceAudit } from './components/AttendanceAudit';
import { Bulletins } from './components/Bulletins';
import { TermMilestones } from './components/TermMilestones';
import { Modal } from './components/ui/Modal';
import {
  AttendanceForm,
  CourseForm,
  GradeForm,
  ProfileForm,
  ScheduleForm,
  TasksModal,
} from './components/DataForms';
import { useStore } from './store';
import { DEFAULT_AY, SAMPLE_BULLETINS, SAMPLE_MILESTONES } from './data/sample';
import {
  attendanceSummary,
  benchmarkData,
  classesToday,
  compositeScore,
  nextClassHint,
  openTasks,
  taskBreakdown,
  totalUnits,
} from './lib/metrics';

type ModalKey = BannerAction | 'profile' | 'tasks' | 'notifications';

const BANNER_TARGET: Record<BannerAction, { nav: NavKey; anchor: string }> = {
  schedule: { nav: 'schedule', anchor: 'schedule' },
  grade: { nav: 'grades', anchor: 'benchmark' },
  attendance: { nav: 'attendance', anchor: 'attendance' },
  course: { nav: 'courses', anchor: 'courses' },
};

const norm = (value: string) => value.toLowerCase().replace(/\s+/g, '');

export const App = () => {
  const store = useStore();
  const [modal, setModal] = useState<ModalKey | null>(null);
  const [active, setActive] = useState<NavKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ay, setAy] = useState(DEFAULT_AY);
  const [query, setQuery] = useState('');

  const close = () => setModal(null);

  const scrollTo = (anchor: string) => {
    requestAnimationFrame(() => {
      if (!anchor || anchor === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  /* ------------------------------ Derived data ----------------------------- */

  const q = norm(query.trim());
  const match = (...values: string[]) => !q || values.some((value) => norm(value).includes(q));

  const allToday = classesToday(store.schedule);
  const visibleToday = useMemo(
    () => allToday.filter((slot) => match(slot.code, slot.title, slot.instructor, slot.room, slot.section)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.schedule, q],
  );
  const visibleCourses = useMemo(
    () => store.courses.filter((course) => match(course.code, course.title, course.instructor, course.section, course.kind)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.courses, q],
  );
  const visibleBenchmark = useMemo(
    () => benchmarkData(store.grades).filter((point) => match(point.code, point.course)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.grades, q],
  );

  const gpa = store.insights.gpa > 0 ? store.insights.gpa : null;
  const units = totalUnits(store.courses);
  const attendance = attendanceSummary(store.attendance);
  const composite = compositeScore(store.grades);
  const tasks = openTasks(store.tasks);
  const taskSummary = taskBreakdown(store.tasks).join(' • ');

  /* ------------------------------- Handlers -------------------------------- */

  const handleNavigate = (item: { key: NavKey; anchor?: string }) => {
    setMobileOpen(false);
    if (item.key === 'logout') {
      store.notify('Sign-out is stubbed in this template.', 'info');
      setActive('dashboard');
      return;
    }
    if (item.key === 'settings') {
      setActive('settings');
      setModal('profile');
      return;
    }
    setActive(item.key);
    scrollTo(item.anchor ?? 'top');
  };

  const handleBannerAction = (action: BannerAction) => {
    const target = BANNER_TARGET[action];
    setActive(target.nav);
    scrollTo(target.anchor);
  };

  const handleClear = () => {
    if (window.confirm('Clear all courses, grades, schedule and attendance? This cannot be undone.')) {
      store.resetAll();
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        active={active}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-60">
        <Topbar
          profile={store.profile}
          ay={ay}
          onAyChange={setAy}
          query={query}
          onQueryChange={setQuery}
          notificationCount={SAMPLE_BULLETINS.length}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenProfile={() => setModal('profile')}
          onOpenNotifications={() => setModal('notifications')}
        />

        <main id="top" className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6">
          <WelcomeBanner
            profile={store.profile}
            ay={ay}
            lecturesToday={allToday.length}
            onOpenProfile={() => setModal('profile')}
            onAction={handleBannerAction}
          />

          <StatCards
            courseCount={store.courses.length}
            units={units}
            gpa={gpa}
            gpaDelta={store.insights.gpaDelta}
            rankLabel={store.insights.rankLabel}
            attendance={attendance}
            classesTodayCount={allToday.length}
            nextClassLabel={nextClassHint(allToday)}
            taskCount={tasks.length}
            taskSummary={taskSummary}
            onAction={(action: StatAction) => setModal(action)}
          />

          <div className="animate-fade-in grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <TodaySchedule slots={visibleToday} onAdd={() => setModal('schedule')} onRemove={store.removeSchedule} />
              <PerformanceBenchmark
                data={visibleBenchmark}
                standing={store.insights.standing}
                composite={composite}
                onAdd={() => setModal('grade')}
              />
              <Bulletins bulletins={SAMPLE_BULLETINS} onOpenAll={() => setModal('notifications')} />
              <CourseLoad
                courses={visibleCourses}
                grades={store.grades}
                onAdd={() => setModal('course')}
                onRemove={store.removeCourse}
              />
            </div>

            <div className="space-y-5">
              <AttendanceAudit summary={attendance} onAdd={() => setModal('attendance')} />
              <TermMilestones milestones={SAMPLE_MILESTONES} />
            </div>
          </div>

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-xs text-slate-400 sm:flex-row">
            <p>Cebu Eastern College · Student Portal — template dashboard. Data is stored locally in your browser.</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                onClick={store.loadSample}
              >
                <Sparkles className="h-3.5 w-3.5" /> Load sample data
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                onClick={handleClear}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset template data
              </button>
            </div>
          </footer>
        </main>
      </div>

      <ScheduleForm open={modal === 'schedule'} onClose={close} />
      <GradeForm open={modal === 'grade'} onClose={close} />
      <AttendanceForm open={modal === 'attendance'} onClose={close} />
      <CourseForm open={modal === 'course'} onClose={close} />
      <ProfileForm open={modal === 'profile'} onClose={close} />
      <TasksModal open={modal === 'tasks'} onClose={close} />

      <Modal
        open={modal === 'notifications'}
        onClose={close}
        title="Notifications"
        subtitle={`${SAMPLE_BULLETINS.length} recent university notices`}
      >
        <ul className="space-y-2">
          {SAMPLE_BULLETINS.map((bulletin) => (
            <li key={bulletin.id} className="rounded-xl bg-[#F4F7FB] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="chip bg-white text-slate-600">{bulletin.category}</span>
                <span className="text-[11px] font-medium text-slate-400">{bulletin.relative}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">{bulletin.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{bulletin.body}</p>
            </li>
          ))}
        </ul>
      </Modal>

      {store.toast && (
        <div className="fixed bottom-5 right-5 z-[60] animate-toast-in">
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              store.toast.tone === 'success' ? 'bg-[#1B365D]' : 'bg-slate-700'
            }`}
          >
            {store.toast.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-[#6EE7B7]" />
            ) : (
              <Info className="h-4 w-4 text-sky-300" />
            )}
            {store.toast.message}
          </div>
        </div>
      )}
    </div>
  );
};
