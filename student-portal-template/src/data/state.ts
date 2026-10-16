import type { AttendanceRecord, Course, GradeEntry, Insights, Profile, ScheduleSlot, Task } from '../types';

/** Everything the dashboard owns locally. Academic records start empty — they are
 *  filled by real actions (enrolment, grading, attendance logging) or by the
 *  registrar/admin once those endpoints are wired. Nothing is pre-seeded. */
export type AppState = {
  profile: Profile;
  courses: Course[];
  schedule: ScheduleSlot[];
  grades: GradeEntry[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  insights: Insights;
};

/** CEC student accounts live on the school domain, e.g. juan.delacruz.307588@cec.edu.ph */
export const DEFAULT_STUDENT_EMAIL = 'sample@cec.edu.ph';

export const EMPTY_PROFILE: Profile = {
  name: '',
  program: '',
  year: '',
  section: '',
  major: '',
  email: DEFAULT_STUDENT_EMAIL,
  honor: '',
};

export const EMPTY_INSIGHTS: Insights = { gpa: 0, gpaDelta: 0, rankLabel: '', standing: '' };

export const EMPTY_APP_STATE: AppState = {
  profile: { ...EMPTY_PROFILE },
  courses: [],
  schedule: [],
  grades: [],
  attendance: [],
  tasks: [],
  insights: { ...EMPTY_INSIGHTS },
};
