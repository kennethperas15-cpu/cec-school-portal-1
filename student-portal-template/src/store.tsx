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
import type { AttendanceRecord, Course, GradeEntry, Profile, ScheduleSlot } from './types';
import { createSampleState, EMPTY_APP_STATE, type AppState } from './data/sample';

const STORAGE_KEY = 'student-portal-template:v3';

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

type Toast = { id: string; message: string; tone: 'success' | 'info' };

type Store = AppState & {
  toast: Toast | null;
  notify: (message: string, tone?: 'success' | 'info') => void;
  isSample: boolean;
  setProfile: (patch: Partial<Profile>) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  addSchedule: (slot: Omit<ScheduleSlot, 'id'>) => void;
  removeSchedule: (id: string) => void;
  addGrade: (grade: Omit<GradeEntry, 'id'>) => void;
  removeGrade: (id: string) => void;
  logAttendance: (record: Omit<AttendanceRecord, 'id'>) => void;
  removeAttendance: (id: string) => void;
  toggleTask: (id: string) => void;
  loadSample: () => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSampleState();
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
    return createSampleState();
  }
};

const isEmpty = (state: AppState): boolean => state.courses.length === 0 && state.grades.length === 0;

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  // Synchronous init: seed from the sample dataset (or stored data) on first paint.
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<Toast | null>(null);
  const [touched, setTouched] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — the template still works in-memory */
    }
  }, [state]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const notify = useCallback((message: string, tone: 'success' | 'info' = 'success') => {
    setToast({ id: uid('t'), message, tone });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...state,
      toast,
      notify,
      isSample: !touched && !isEmpty(state),
      setProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      addCourse: (course) => {
        setState((s) => {
          if (s.courses.some((c) => c.code.trim().toLowerCase() === course.code.trim().toLowerCase())) {
            return s;
          }
          return { ...s, courses: [...s.courses, { ...course, id: uid('c') }] };
        });
        setTouched(true);
        notify(`Enrolled in ${course.code || 'course'}`);
      },
      removeCourse: (id) =>
        setState((s) => ({
          ...s,
          courses: s.courses.filter((c) => c.id !== id),
          schedule: s.schedule.filter((slot) => slot.courseId !== id),
          grades: s.grades.filter((g) => g.course !== s.courses.find((c) => c.id === id)?.code),
        })),
      addSchedule: (slot) => {
        setState((s) => ({ ...s, schedule: [...s.schedule, { ...slot, id: uid('s') }] }));
        setTouched(true);
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
        setTouched(true);
        notify('Grade recorded');
      },
      removeGrade: (id) => setState((s) => ({ ...s, grades: s.grades.filter((g) => g.id !== id) })),
      logAttendance: (record) =>
        setState((s) => ({ ...s, attendance: [...s.attendance, { ...record, id: uid('a') }] })),
      removeAttendance: (id) =>
        setState((s) => ({ ...s, attendance: s.attendance.filter((a) => a.id !== id) })),
      toggleTask: (id) =>
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      loadSample: () => {
        setTouched(false);
        setState(createSampleState());
        notify('Sample dataset loaded', 'info');
      },
      resetAll: () => {
        setTouched(false);
        setState(EMPTY_APP_STATE);
        notify('All template data cleared', 'info');
      },
    }),
    [state, toast, notify, touched],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const useStore = (): Store => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
};
