import { useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthContainer } from './components/auth/AuthContainer';
import type { UserAuthData } from './components/auth/Login';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AISupport } from './components/shared/AISupport';
import { ensureSchoolId } from './services/crud';
import './styles.css';
import './login.css';

const roleOf = (role: string): 'student' | 'teacher' | 'admin' => {
  if (role === 'teacher' || role === 'admin') return role;
  return 'student';
};

// One person, one school ID: prefer the official school number from the
// server, else the issued local account, then enforce 7-digit role IDs
// (2 student • 3 teacher • 4 admin).
const adoptSchoolIdentity = (u: UserAuthData): UserAuthData => {
  const role = roleOf(u.role);
  let id = u.schoolId;
  if (!id) {
    try {
      const raw = localStorage.getItem('cec:registrations');
      const regs = raw ? (JSON.parse(raw) as { id?: string; personalEmail?: string }[]) : [];
      const match = regs.find((r) => r.personalEmail?.toLowerCase() === String(u.email ?? '').toLowerCase());
      if (match?.id) id = match.id;
    } catch { /* keep server identity */ }
    if (!id) id = u.id;
  }
  return { ...u, role, id: ensureSchoolId(id, role) };
};

export const App = () => {
  const [currentUser, setCurrentUser] = useState<UserAuthData | null>(null);
  const [message, setMessage] = useState('');

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  };

  const logout = () => {
    sessionStorage.removeItem('cec_access_token');
    sessionStorage.removeItem('cec_refresh_token');
    setCurrentUser(null);
    notify('You have been signed out.');
  };

  if (!currentUser) {
    return <AuthContainer onLoginSuccess={(u) => setCurrentUser(adoptSchoolIdentity(u))} onNotify={notify} />;
  }

  const props = { currentUser, onNotify: notify, onLogout: logout };
  const role = roleOf(currentUser.role);
  const dashboard = role === 'admin'
    ? <AdminDashboard {...props} />
    : role === 'teacher'
      ? <TeacherDashboard {...props} />
      : <StudentDashboard {...props} />;

  return <>{dashboard}<AISupport role={role} />{message && <div className="toast" role="status">{message}</div>}</>;
};

export default App;
