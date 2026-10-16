import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AttendanceRecord,
  Bulletin,
  Course,
  GradeEntry,
  Profile,
  ScheduleSlot,
  Task,
} from './types';
import { EMPTY_APP_STATE, type AppState } from './data/state';
import {
  cecAcademicPeriod,
  cecAnnouncements,
  cecLogin,
  cecLogout,
  cecRefresh,
  type AcademicPeriod,
  type CecSession,
  type CecUser,
} from './lib/api';
import { clearSession, isAccessTokenExpired, loadSession, saveSession } from './lib/session';
import { relativeTime } from './lib/metrics';

const STORAGE_KEY = 'student-portal-template:v4';

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

type Toast = { id: string; message: string; tone: 'success' | 'info' | 'error' };
type Tone = Toast['tone'];

type Store = AppState & {
  toast: Toast | null;
  notify: (message: string, tone?: Tone) => void;

  /* --- live session (real CEC accounts) --- */
  session: CecSession | null;
  user: CecUser | null;
  authError: string;
  signingIn: boolean;
  restoring: boolean;
  signIn: (identifier: string, password: string) => Promise<boolean>;
  signOut: () => void;
  /** Abandon a stalled silent refresh and go straight to the sign-in screen. */
  cancelRestore: () => void;
  clearAuthError: () => void;

  /* --- live academic context --- */
  period: AcademicPeriod | null;
  periodLabel: string;
  shortYear: string;
  bulletins: Bulletin[];
  bulletinsLoading: boolean;
  refreshBulletins: () => Promise<void>;

  /* --- local academic records --- */
  setProfile: (patch: Partial<Profile>) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  addSchedule: (slot: Omit<ScheduleSlot, 'id'>) => void;
  removeSchedule: (id: string) => void;
  addGrade: (grade: Omit<GradeEntry, 'id'>) => void;
  removeGrade: (id: string) => void;
  logAttendance: (record: Omit<AttendanceRecord, 'id'>) => void;
  removeAttendance: (id: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

/** The signed-in CEC account is the source of truth for name and email. */
const applyUser = (profile: Profile, user: CecUser): Profile => ({
  ...profile,
  name: `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim(),
  email: user.email,
});

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_APP_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      profile: { ...EMPTY_APP_STATE.profile, ...(parsed.profile ?? {}) },
      insights: { ...EMPTY_APP_STATE.insights, ...(parsed.insights ?? {}) },
      courses: parsed.courses ?? [],
      schedule: parsed.schedule ?? [],
      grades: parsed.grades ?? [],
      attendance: parsed.attendance ?? [],
      tasks: parsed.tasks ?? [],
    };
  } catch {
    return EMPTY_APP_STATE;
  }
};

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  /* Storage and session are read synchronously so the first paint is correct. */
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | null>(null);

  const stale = useRef<CecSession | null>(null);
  const [session, setSession] = useState<CecSession | null>(() => {
    const stored = loadSession();
    if (!stored) return null;
    if (!isAccessTokenExpired(stored.accessToken)) return stored;
    stale.current = stored; // expired: needs a refresh round-trip before it can be used
    return null;
  });
  const [restoring, setRestoring] = useState(() => stale.current !== null);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [period, setPeriod] = useState<AcademicPeriod | null>(null);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [bulletinsLoading, setBulletinsLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — the dashboard still works in-memory */
    }
  }, [state]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const notify = useCallback((message: string, tone: Tone = 'success') => {
    setToast({ id: uid('t'), message, tone });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  /* ------------------------- session bootstrap ------------------------- */

  useEffect(() => {
    const expired = stale.current;
    if (!expired) return;
    let cancelled = false;
    void (async () => {
      const refreshed = await cecRefresh(expired.refreshToken);
      // Abandon the result if the component unmounted or the user bailed out.
      if (cancelled || stale.current !== expired) return;
      if (refreshed.ok) {
        saveSession(refreshed.data);
        setSession(refreshed.data);
      } else {
        clearSession();
      }
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cancelRestore = useCallback(() => {
    stale.current = null;
    clearSession();
    setRestoring(false);
  }, []);

  useEffect(() => {
    if (!session) return;
    setState((s) => ({ ...s, profile: applyUser(s.profile, session.user) }));
  }, [session]);

  /* ----------------------- live academic context ----------------------- */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await cecAcademicPeriod();
      if (!cancelled && result.ok) setPeriod(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshBulletins = useCallback(async () => {
    setBulletinsLoading(true);
    const result = await cecAnnouncements('students');
    setBulletinsLoading(false);
    if (!result.ok) return;
    setBulletins(
      result.data.map((row) => ({
        id: row.id,
        category: row.category || 'General',
        title: row.title,
        body: row.content,
        relative: relativeTime(row.published_at),
        author: row.published_by_name || undefined,
      })),
    );
  }, []);

  useEffect(() => {
    void refreshBulletins();
  }, [refreshBulletins]);

  /* ------------------------------- actions ----------------------------- */

  const store = useMemo<Store>(() => {
    const periodLabel = period ? `AY ${period.schoolYear} • ${period.semester}` : '';
    const shortYear = period ? `AY ${period.schoolYear}` : '';

    return {
      ...state,
      toast,
      notify,

      session,
      user: session?.user ?? null,
      authError,
      signingIn,
      restoring,

      signIn: async (identifier, password) => {
        setAuthError('');
        setSigningIn(true);
        const result = await cecLogin(identifier.trim(), password);
        setSigningIn(false);
        if (!result.ok) {
          setAuthError(result.message);
          return false;
        }
        saveSession(result.data);
        setSession(result.data);
        notify(`Signed in as ${result.data.user.firstName} ${result.data.user.lastName}`);
        return true;
      },

      signOut: () => {
        if (session) void cecLogout(session.refreshToken); // best-effort server-side revoke
        clearSession();
        setSession(null);
        setAuthError('');
        notify('Signed out of the CEC portal', 'info');
      },

      cancelRestore,

      clearAuthError: () => setAuthError(''),

      period,
      periodLabel,
      shortYear,
      bulletins,
      bulletinsLoading,
      refreshBulletins,

      setProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

      addCourse: (course) => {
        let added = false;
        setState((s) => {
          if (s.courses.some((c) => c.code.trim().toLowerCase() === course.code.trim().toLowerCase())) return s;
          added = true;
          return { ...s, courses: [...s.courses, { ...course, id: uid('c') }] };
        });
        notify(added ? `Enrolled in ${course.code || 'course'}` : `${course.code} is already in your load`, added ? 'success' : 'info');
      },

      removeCourse: (id) =>
        setState((s) => {
          const target = s.courses.find((c) => c.id === id);
          return {
            ...s,
            courses: s.courses.filter((c) => c.id !== id),
            schedule: s.schedule.filter((slot) => slot.courseId !== id),
            grades: target ? s.grades.filter((g) => g.course !== target.code) : s.grades,
          };
        }),

      addSchedule: (slot) => {
        setState((s) => ({ ...s, schedule: [...s.schedule, { ...slot, id: uid('s') }] }));
        notify('Class added to your timetable');
      },
      removeSchedule: (id) => setState((s) => ({ ...s, schedule: s.schedule.filter((x) => x.id !== id) })),

      addGrade: (grade) => {
        setState((s) => {
          const without = s.grades.filter(
            (g) => !(g.course.trim().toLowerCase() === grade.course.trim().toLowerCase() && g.term === grade.term),
          );
          return { ...s, grades: [...without, { ...grade, id: uid('g') }] };
        });
        notify('Grade recorded');
      },
      removeGrade: (id) => setState((s) => ({ ...s, grades: s.grades.filter((g) => g.id !== id) })),

      logAttendance: (record) => {
        setState((s) => ({ ...s, attendance: [...s.attendance, { ...record, id: uid('a') }] }));
        notify(`Marked ${record.status.toLowerCase()} for ${record.course}`);
      },
      removeAttendance: (id) => setState((s) => ({ ...s, attendance: s.attendance.filter((a) => a.id !== id) })),

      addTask: (task) => {
        setState((s) => ({ ...s, tasks: [...s.tasks, { ...task, id: uid('k') }] }));
        notify(`Task added: ${task.title}`);
      },
      removeTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) =>
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      resetAll: () => {
        setState((s) => ({ ...EMPTY_APP_STATE, profile: { ...EMPTY_APP_STATE.profile, ...(session ? applyUser(s.profile, session.user) : {}) } }));
        notify('All local academic records cleared', 'info');
      },
    };
  }, [
    state,
    toast,
    notify,
    session,
    authError,
    signingIn,
    restoring,
    period,
    bulletins,
    bulletinsLoading,
    refreshBulletins,
    cancelRestore,
  ]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const useStore = (): Store => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
};
