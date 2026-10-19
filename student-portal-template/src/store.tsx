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
  Day,
  GradeEntry,
  Profile,
  ScheduleSlot,
  Task,
} from './types';
import { DAYS } from './types';
import { EMPTY_APP_STATE, type AppState } from './data/state';
import {
  cecAcademicPeriod,
  cecAnnouncements,
  cecCourseCatalog,
  cecDropCourse,
  cecEnrollCourse,
  cecLogout,
  cecMe,
  cecRefresh,
  type AcademicPeriod,
  type CatalogCourse,
  type CecSession,
  type CecUser,
  type CourseCatalog,
} from './lib/api';
import {
  clearCachedUser,
  clearTokens,
  isAccessTokenExpired,
  readCachedUser,
  readTokens,
  tokenSubject,
  writeCachedUser,
  writeTokens,
} from './lib/session';
import { relativeTime, toMinutes } from './lib/metrics';
import {
  fetchTimetables,
  hoursForMeetings,
  meetingText,
  pickTimetable,
  subjectsOf,
  toSlots,
  type ScheduleEntry,
  type TimetableItem,
} from './lib/schedule';
import {
  asAttendanceRecords,
  fetchAttendanceDocs,
  fetchGradeRecords,
  type AttendanceDoc,
  type GradeRecord,
} from './lib/records';

const STORAGE_KEY = 'student-portal-template:v4';

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

type Toast = { id: string; message: string; tone: 'success' | 'info' | 'error' };
type Tone = Toast['tone'];

type Store = AppState & {
  toast: Toast | null;
  notify: (message: string, tone?: Tone) => void;

  /* --- shared session, issued by the CEC portal's sign-in popover --- */
  session: CecSession | null;
  user: CecUser | null;
  restoring: boolean;
  signOut: () => void;
  /** Stop waiting on a stalled restore and hand off to the CEC website. */
  cancelRestore: () => void;

  /* --- live academic context --- */
  period: AcademicPeriod | null;
  periodLabel: string;
  /** True until the portal answers with the academic period (or fails). */
  periodLoading: boolean;
  shortYear: string;
  bulletins: Bulletin[];
  bulletinsLoading: boolean;
  refreshBulletins: () => Promise<void>;

  /* --- published class timetable (registrar + faculty) --- */
  /** Every published timetable the school has, newest publication first. */
  timetables: TimetableItem[];
  timetableLoading: boolean;
  timetableError: string;
  refreshTimetables: () => Promise<void>;
  /** The published document for this student's own section, when there is one. */
  myTimetable: TimetableItem | null;
  /** Its meetings in the dashboard's slot shape — empty when nothing is published. */
  mySlots: ScheduleSlot[];
  /** The published subjects of that section, shaped like the local course list. */
  publishedCourses: Course[];

  /* --- official academic records, posted by the faculty --- */
  /** The signed-in student's posted grades, newest document first. */
  gradeRecords: GradeRecord[];
  /** The signed-in student's posted attendance, newest document first. */
  attendanceDocs: AttendanceDoc[];
  recordsLoading: boolean;
  recordsError: string;
  refreshRecords: () => Promise<void>;
  /** True once any official record exists — the pages then report it, not the local log. */
  hasOfficialRecords: boolean;
  /** The official attendance in the dashboard's own shape, for shared widgets. */
  officialAttendance: AttendanceRecord[];

  /* --- course offerings, and the load the student builds from them --- */
  /** Every offering for the live term, with whether this student holds it. */
  catalog: CatalogCourse[];
  catalogTerm: CourseCatalog['term'] | null;
  catalogLoading: boolean;
  catalogError: string;
  refreshCatalog: () => Promise<void>;
  /** Offerings still open to this student and not yet taken. */
  availableCourses: CatalogCourse[];
  /** The subjects the student enrolled in themselves, in the course-list shape. */
  selfCourses: Course[];
  /** True when the load shown is the student's own enrollment, not a section's. */
  loadIsSelfEnrolled: boolean;
  /** The course id being enrolled in or dropped right now. */
  enrollingId: number | null;
  enrollCourse: (courseId: number) => Promise<void>;
  dropCourse: (courseId: number) => Promise<void>;

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

/**
 * Tokens plus the cached profile from the shared storage. The profile is only a
 * first-paint cache; GET /auth/me re-reads it on every boot.
 */
const cachedSession = (): CecSession | null => {
  const tokens = readTokens();
  if (!tokens) return null;
  const cached = readCachedUser();
  if (!cached) return null;
  // A different account signed in on the portal: never render the stale name.
  const subject = tokenSubject(tokens.accessToken);
  if (subject && cached.id && subject !== cached.id) return null;
  return { ...tokens, user: cached };
};

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

  /**
   * The portal owns signing in, so on boot we adopt whatever session it left in
   * the shared storage. A cached profile paints immediately while GET /auth/me
   * re-verifies it, so a cold API never blocks the first render.
   */
  const [session, setSession] = useState<CecSession | null>(cachedSession);
  const [restoring, setRestoring] = useState(() => readTokens() !== null && cachedSession() === null);

  const [period, setPeriod] = useState<AcademicPeriod | null>(null);
  const [periodLoading, setPeriodLoading] = useState(true);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [bulletinsLoading, setBulletinsLoading] = useState(true);
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [timetableError, setTimetableError] = useState('');
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [attendanceDocs, setAttendanceDocs] = useState<AttendanceDoc[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [catalogTerm, setCatalogTerm] = useState<CourseCatalog['term'] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

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
    const tokens = readTokens();
    if (!tokens) {
      clearCachedUser(); // the portal signed out — never keep a stale name around
      setSession(null);
      setRestoring(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      let active = tokens;
      if (isAccessTokenExpired(active.accessToken)) {
        const refreshed = await cecRefresh(active.refreshToken);
        if (cancelled) return;
        if (!refreshed.ok) {
          clearTokens();
          clearCachedUser();
          setSession(null);
          setRestoring(false);
          return;
        }
        active = refreshed.data;
        writeTokens(active);
      }
      const me = await cecMe(active.accessToken);
      if (cancelled) return;
      if (me.ok) {
        writeCachedUser(me.data);
        setSession({ ...active, user: me.data });
      } else if (me.status === 401 || me.status === 404) {
        clearTokens();
        clearCachedUser();
        setSession(null);
      }
      // A network failure keeps the cached session: the free-tier API cold-starts.
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cancelRestore = useCallback(() => {
    // Leave the portal session intact — only this app stops waiting for it.
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
      if (cancelled) return;
      if (result.ok) setPeriod(result.data);
      setPeriodLoading(false);
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

  /**
   * The class schedule is published by staff, so the app reads it rather than
   * owning it. A refusal (or an offline API) leaves the page honest: it reports
   * that nothing could be read instead of showing remembered sample classes.
   */
  const refreshTimetables = useCallback(async () => {
    setTimetableLoading(true);
    const result = await fetchTimetables();
    setTimetableLoading(false);
    if (!result.ok) {
      setTimetableError(result.message);
      return;
    }
    setTimetableError('');
    setTimetables(result.data);
  }, []);

  useEffect(() => {
    void refreshTimetables();
  }, [refreshTimetables]);

  /**
   * Official grades and attendance are the faculty's records, not this browser's.
   * They are read with the shared access token, and the server returns only the
   * documents posted under this student's own school ID. Signed out there is
   * nothing to read, so the pages fall back to their honest empty state.
   */
  const refreshRecords = useCallback(async () => {
    const token = readTokens()?.accessToken;
    if (!token) {
      setGradeRecords([]);
      setAttendanceDocs([]);
      setRecordsError('');
      setRecordsLoading(false);
      return;
    }
    setRecordsLoading(true);
    const [grades, attendance] = await Promise.all([fetchGradeRecords(token), fetchAttendanceDocs(token)]);
    setRecordsLoading(false);
    if (grades.ok) setGradeRecords(grades.data);
    if (attendance.ok) setAttendanceDocs(attendance.data);
    const failure = !grades.ok ? grades.message : !attendance.ok ? attendance.message : '';
    setRecordsError(failure);
  }, []);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords, session]);

  /**
   * The courses the school has opened for the live term — the offerings a student
   * builds their load from. Read with the shared access token, so the same answer
   * says which of them this student already holds. Signed out there is nothing to
   * read, and the page says so rather than showing an invented catalog.
   */
  const refreshCatalog = useCallback(async () => {
    const token = readTokens()?.accessToken;
    if (!token) {
      setCatalog([]);
      setCatalogTerm(null);
      setCatalogError('');
      setCatalogLoading(false);
      return;
    }
    setCatalogLoading(true);
    const result = await cecCourseCatalog(token);
    setCatalogLoading(false);
    if (!result.ok) {
      setCatalogError(result.message);
      return;
    }
    setCatalogError('');
    setCatalog(result.data.courses);
    setCatalogTerm(result.data.term);
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog, session]);

  /** Taking a course, and putting it back, are both the student's own act. */
  const enrollCourse = useCallback(
    async (courseId: number) => {
      const token = readTokens()?.accessToken;
      if (!token) return;
      setEnrollingId(courseId);
      const result = await cecEnrollCourse(token, courseId);
      setEnrollingId(null);
      if (!result.ok) {
        notify(result.message, 'error');
        return;
      }
      notify('Course added to your study load');
      await refreshCatalog();
    },
    [notify, refreshCatalog],
  );

  const dropCourse = useCallback(
    async (courseId: number) => {
      const token = readTokens()?.accessToken;
      if (!token) return;
      setEnrollingId(courseId);
      const result = await cecDropCourse(token, courseId);
      setEnrollingId(null);
      if (!result.ok) {
        notify(result.message, 'error');
        return;
      }
      notify('Course dropped from your study load', 'info');
      await refreshCatalog();
    },
    [notify, refreshCatalog],
  );

  /* ------------------------------- actions ----------------------------- */

  const store = useMemo<Store>(() => {
    const periodLabel = period ? `AY ${period.schoolYear} • ${period.semester}` : '';
    const shortYear = period ? `AY ${period.schoolYear}` : '';

    /**
     * The student's own enrollment comes first: the courses they picked in the
     * portal, with the meetings those courses run. Only when they hold none does
     * the registrar's published timetable for their section drive the load.
     */
    const enrolledCatalog = catalog.filter((course) => course.enrolled);
    const selfCourses: Course[] = enrolledCatalog.map((course) => ({
      id: `enrolled-${course.id}`,
      code: course.code,
      title: course.title,
      instructor: course.instructor,
      section: state.profile.section,
      units: course.units ?? 0,
      hours: hoursForMeetings(course.meetings),
      kind: '',
      room: [...new Set(course.meetings.map((meeting) => meeting.room).filter(Boolean))].join(', '),
      schedule: meetingText(course.meetings.map((meeting) => ({ ...meeting, day: meeting.day as Day }))),
    }));
    const selfEntries: ScheduleEntry[] = enrolledCatalog.flatMap((course) =>
      course.meetings
        .filter((meeting) => (DAYS as readonly string[]).includes(meeting.day))
        .map((meeting, index) => ({
          id: `enrolled-${course.id}-${index}`,
          code: course.code,
          title: course.title,
          units: course.units,
          kind: '',
          day: meeting.day as Day,
          start: meeting.start,
          end: meeting.end,
          room: meeting.room,
          instructor: course.instructor,
        })),
    );
    const sectionTimetable = pickTimetable(timetables, period, state.profile.section);
    const myTimetable: TimetableItem | null =
      selfEntries.length && period
        ? {
            schoolYear: period.schoolYear,
            semester: period.semester,
            section: state.profile.section || 'My enrollment',
            program: state.profile.program || '',
            note: '',
            entries: selfEntries,
            publishedBy: '',
            publishedByName: 'you',
            publishedAt: '',
            itemId: 'self-enrollment',
          }
        : sectionTimetable;
    const mySlots = myTimetable ? toSlots(myTimetable.entries, myTimetable.section) : [];
    // Same published meetings, shaped like the local course list so the enrolled
    // courses page and the dashboard counters report the registrar's load.
    const publishedCourses: Course[] = myTimetable
      ? subjectsOf(myTimetable.entries).map((subject) => ({
          id: `published-${subject.key}`,
          code: subject.code || subject.title,
          title: subject.title,
          instructor: subject.instructors.join(', '),
          section: myTimetable.section,
          units: subject.units ?? 0,
          hours:
            Math.round(
              subject.meetings.reduce((sum, meeting) => sum + (toMinutes(meeting.end) - toMinutes(meeting.start)) / 60, 0) *
                10,
            ) / 10,
          kind: subject.kinds.join(' & '),
          room: subject.rooms.join(', '),
          schedule: subject.scheduleText,
        }))
      : [];

    return {
      ...state,
      toast,
      notify,

      session,
      user: session?.user ?? null,
      restoring,

      signOut: () => {
        // One session covers both apps, so revoking it signs the portal out too.
        if (session) void cecLogout(session.refreshToken); // best-effort server-side revoke
        clearTokens();
        clearCachedUser();
        setSession(null);
        notify('Signed out of the CEC portal', 'info');
      },

      cancelRestore,

      period,
      periodLabel,
      periodLoading,
      shortYear,
      bulletins,
      bulletinsLoading,
      refreshBulletins,

      timetables,
      timetableLoading,
      timetableError,
      refreshTimetables,
      myTimetable,
      mySlots,
      publishedCourses,

      gradeRecords,
      attendanceDocs,
      recordsLoading,
      recordsError,
      refreshRecords,
      hasOfficialRecords: gradeRecords.length > 0 || attendanceDocs.length > 0,
      officialAttendance: asAttendanceRecords(attendanceDocs),

      catalog,
      catalogTerm,
      catalogLoading,
      catalogError,
      refreshCatalog,
      availableCourses: catalog.filter((course) => course.open && !course.enrolled),
      selfCourses,
      loadIsSelfEnrolled: selfEntries.length > 0,
      enrollingId,
      enrollCourse,
      dropCourse,

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
    restoring,
    period,
    bulletins,
    bulletinsLoading,
    refreshBulletins,
    timetables,
    timetableLoading,
    timetableError,
    refreshTimetables,
    gradeRecords,
    attendanceDocs,
    recordsLoading,
    recordsError,
    refreshRecords,
    catalog,
    catalogTerm,
    catalogLoading,
    catalogError,
    refreshCatalog,
    enrollingId,
    enrollCourse,
    dropCourse,
    cancelRestore,
  ]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const useStore = (): Store => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
};
