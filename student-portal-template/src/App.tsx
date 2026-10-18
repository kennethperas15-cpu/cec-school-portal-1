import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Loader2, RotateCcw } from 'lucide-react';
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
import { TuitionPayment } from './components/TuitionPayment';
import { ScheduleView } from './components/views/ScheduleView';
import { CoursesView } from './components/views/CoursesView';
import { GradesView } from './components/views/GradesView';
import { AttendanceView } from './components/views/AttendanceView';
import { SettingsView } from './components/views/SettingsView';
import { Modal } from './components/ui/Modal';
import {
  AttendanceForm,
  CourseForm,
  GradeForm,
  ProfileForm,
  TasksModal,
} from './components/DataForms';
import { useStore } from './store';
import { CEC_WEBSITE_URL } from './lib/api';
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
import { totalUnitsOf } from './lib/schedule';

type ModalKey = BannerAction | 'profile' | 'tasks' | 'notifications';

const BANNER_TARGET: Record<BannerAction, string> = {
  schedule: 'schedule',
  grade: 'benchmark',
  attendance: 'attendance',
  course: 'courses',
};

const norm = (value: string) => value.toLowerCase().replace(/\s+/g, '');

/** Momentary notice while the browser hands off to the CEC website. */
const Redirecting = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0E2340] px-6 text-center text-blue-100">
    <Loader2 className="h-6 w-6 animate-spin" />
    <p className="text-sm font-semibold">Taking you to the CEC website…</p>
  </div>
);

/** Shown while the shared portal session is refreshed and re-verified. */
const Restoring = ({ onCancel }: { onCancel: () => void }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0E2340] px-6 text-center text-blue-100">
    <Loader2 className="h-6 w-6 animate-spin" />
    <div>
      <p className="text-sm font-semibold">Restoring your CEC portal session…</p>
      <p className="mt-1 text-xs text-blue-200/70">
        The portal service can take a moment to wake up. You are not stuck here.
      </p>
    </div>
    <button
      type="button"
      onClick={onCancel}
      className="rounded-xl border border-white/25 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
    >
      Go to the CEC website
    </button>
  </div>
);

export const App = () => {
  const store = useStore();
  const [modal, setModal] = useState<ModalKey | null>(null);
  const [active, setActive] = useState<NavKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const signedIn = !!store.session;

  /* Switching accounts must never leak the previous session's view state. */
  useEffect(() => {
    if (!signedIn) {
      setActive('dashboard');
      setQuery('');
      setMobileOpen(false);
      setModal(null);
    }
  }, [signedIn]);

  /*
   * The CEC website owns signing in, so a signed-out template never shows a form
   * of its own: it hands the student straight back to the landing page. This is
   * what Logout does, and it also covers arriving here without a shared session.
   */
  useEffect(() => {
    if (signedIn || store.restoring) return;
    window.location.assign(CEC_WEBSITE_URL);
  }, [signedIn, store.restoring]);

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

  const allToday = classesToday(store.mySlots.length ? store.mySlots : store.schedule);
  const visibleToday = useMemo(
    () => allToday.filter((slot) => match(slot.code, slot.title, slot.instructor, slot.room, slot.section)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.mySlots, store.schedule, q],
  );
  // The registrar's published load, when there is one, *is* the student's load.
  const load = store.publishedCourses.length ? store.publishedCourses : store.courses;
  const visibleCourses = useMemo(
    () => load.filter((course) => match(course.code, course.title, course.instructor, course.section, course.kind)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load, q],
  );
  const visibleBenchmark = useMemo(
    () => benchmarkData(store.grades).filter((point) => match(point.code, point.course)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.grades, q],
  );

  const gpa = store.insights.gpa > 0 ? store.insights.gpa : null;
  /*
   * The registrar's published load is the real one: when a timetable exists for
   * this student's section, the dashboard counters read from it instead of the
   * local record, so the dashboard and Class Schedule never disagree.
   */
  const publishedUnits = store.myTimetable ? totalUnitsOf(store.myTimetable.entries) : null;
  const units = publishedUnits && publishedUnits.units > 0 ? publishedUnits.units : totalUnits(store.courses);
  const courseCount = store.publishedCourses.length || store.courses.length;
  const attendance = attendanceSummary(store.attendance);
  const composite = compositeScore(store.grades);
  const tasks = openTasks(store.tasks);
  const taskSummary = taskBreakdown(store.tasks).join(' • ');

  /* ------------------------------- Handlers -------------------------------- */

  const handleNavigate = (item: { key: NavKey; anchor?: string }) => {
    setMobileOpen(false);

    if (item.key === 'logout') {
      store.signOut();
      return;
    }

    if (item.key !== 'dashboard') setQuery('');
    setActive(item.key);

    if (item.key === 'dashboard') scrollTo(item.anchor ?? 'top');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBannerAction = (action: BannerAction) => {
    setActive('dashboard');
    scrollTo(BANNER_TARGET[action]);
  };

  const handleClear = () => {
    if (window.confirm('Clear every course, grade, class and attendance entry stored in this browser?')) {
      store.resetAll();
    }
  };

  if (store.restoring) return <Restoring onCancel={store.cancelRestore} />;
  if (!signedIn) return <Redirecting />;

  const dashboard = (
    <>
      <WelcomeBanner
        profile={store.profile}
        ay={store.periodLabel}
        periodLoading={store.periodLoading}
        lecturesToday={allToday.length}
        standing={store.insights.standing}
        onOpenProfile={() => setModal('profile')}
        onAction={handleBannerAction}
      />

      <StatCards
        courseCount={courseCount}
        units={units}
        gpa={gpa}
        gpaDelta={store.insights.gpaDelta}
        rankLabel={store.insights.rankLabel}
        attendance={attendance}
        classesTodayCount={allToday.length}
        nextClassLabel={nextClassHint(allToday)}
        hasLoad={load.length > 0}
        taskCount={tasks.length}
        taskSummary={taskSummary}
        onAction={(action: StatAction) => {
          // The timetable is a page of its own now, not a local-entry form.
          if (action === 'schedule') {
            setActive('schedule');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          setModal(action);
        }}
      />

      <div className="animate-fade-in grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <TodaySchedule
            slots={visibleToday}
            onRemove={store.removeSchedule}
            onOpenSchedule={() => {
              setActive('schedule');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            publishedBy={
              store.mySlots.length ? store.myTimetable?.publishedByName || 'the registrar' : undefined
            }
          />
          <PerformanceBenchmark
            data={visibleBenchmark}
            standing={store.insights.standing}
            composite={composite}
            onAdd={() => setModal('grade')}
          />
          <Bulletins
            bulletins={store.bulletins}
            loading={store.bulletinsLoading}
            onOpenAll={() => setModal('notifications')}
            onRefresh={() => void store.refreshBulletins()}
          />
          <CourseLoad
            courses={visibleCourses}
            grades={store.grades}
            published={store.publishedCourses.length > 0}
            onAdd={() => setModal('course')}
            onRemove={store.removeCourse}
          />
        </div>

        <div className="space-y-5">
          <AttendanceAudit summary={attendance} onAdd={() => setModal('attendance')} />
          <TermMilestones milestones={[]} />
        </div>
      </div>

      <TuitionPayment />
    </>
  );

  const views: Record<string, ReactNode> = {
    dashboard,
    schedule: <ScheduleView />,
    courses: <CoursesView onAdd={() => setModal('course')} />,
    grades: <GradesView onAdd={() => setModal('grade')} />,
    attendance: <AttendanceView onAdd={() => setModal('attendance')} />,
    settings: <SettingsView onEditProfile={() => setModal('profile')} />,
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        active={active}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        yearLabel={store.shortYear}
      />

      <div className="lg:pl-60">
        <Topbar
          profile={store.profile}
          periodLabel={store.periodLabel}
          periodLoading={store.periodLoading}
          schoolId={store.user?.schoolId}
          query={query}
          onQueryChange={setQuery}
          notificationCount={store.bulletins.length}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenProfile={() => setModal('profile')}
          onOpenNotifications={() => setModal('notifications')}
        />

        <main id="top" className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6">
          {views[active] ?? dashboard}

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-xs text-slate-400 sm:flex-row">
            <p>Cebu Eastern College · Student Portal — timetables are published by the registrar; grades and attendance you log stay in this browser.</p>
            <div className="flex items-center gap-1">
              <a
                href={CEC_WEBSITE_URL}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <ExternalLink className="h-3.5 w-3.5" /> CEC website
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                onClick={handleClear}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear local records
              </button>
            </div>
          </footer>
        </main>
      </div>

      <GradeForm open={modal === 'grade'} onClose={close} />
      <AttendanceForm open={modal === 'attendance'} onClose={close} />
      <CourseForm open={modal === 'course'} onClose={close} />
      <ProfileForm open={modal === 'profile'} onClose={close} />
      <TasksModal open={modal === 'tasks'} onClose={close} />

      <Modal
        open={modal === 'notifications'}
        onClose={close}
        title="Notifications"
        subtitle={
          store.bulletinsLoading
            ? 'Loading notices from the CEC portal…'
            : `${store.bulletins.length} published notice${store.bulletins.length === 1 ? '' : 's'}`
        }
      >
        {store.bulletins.length === 0 ? (
          <div className="dashed-empty">
            <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
              <Info className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-500">
              {store.bulletinsLoading ? 'Loading notices…' : 'No announcements have been published yet.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {store.bulletins.map((bulletin) => (
              <li key={bulletin.id} className="rounded-xl bg-[#F4F7FB] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip bg-white text-slate-600">{bulletin.category}</span>
                  <span className="text-[11px] font-medium text-slate-400">{bulletin.relative}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{bulletin.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{bulletin.body}</p>
                {bulletin.author && (
                  <p className="mt-2 text-[11px] font-medium text-slate-400">Posted by {bulletin.author}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {store.toast && (
        <div className="fixed bottom-5 right-5 z-[60] animate-toast-in">
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              store.toast.tone === 'success'
                ? 'bg-[#1B365D]'
                : store.toast.tone === 'error'
                  ? 'bg-rose-600'
                  : 'bg-slate-700'
            }`}
          >
            {store.toast.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-[#6EE7B7]" />
            ) : store.toast.tone === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-100" />
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
