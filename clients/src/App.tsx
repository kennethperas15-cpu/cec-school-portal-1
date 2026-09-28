import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthContainer } from './components/auth/AuthContainer';
import type { UserAuthData } from './components/auth/Login';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AISupport } from './components/shared/AISupport';
import { PortalLoginLoading } from './components/shared/PortalLoginLoading';
import api, { clearTokens, getRefreshToken, isRemembered, setTokens } from './services/api';
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

const SESSION_USER_KEY = 'cec:session_user';

const readCachedUser = (): UserAuthData | null => {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as UserAuthData;
    return user && typeof user.role === 'string' ? user : null;
  } catch {
    return null;
  }
};

const persistSessionUser = (user: UserAuthData | null): void => {
  try {
    if (user) localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_USER_KEY);
  } catch { /* private mode */ }
};

export const App = () => {
  const [currentUser, setCurrentUser] = useState<UserAuthData | null>(null);
  const [pendingUser, setPendingUser] = useState<UserAuthData | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [message, setMessage] = useState('');

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  };

  const enterPortal = (user: UserAuthData) => {
    const adopted = adoptSchoolIdentity(user);
    persistSessionUser(adopted);
    setCurrentUser(adopted);
  };

  // Restore the session after refresh: revalidate the refresh token when the
  // backend is reachable; fall back to the cached identity offline.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const response = await api.post('/auth/refresh', { refreshToken });
            const data = response.data?.data;
            if (data?.user && data?.accessToken && live) {
              setTokens(data.accessToken, data.refreshToken ?? refreshToken, isRemembered());
              enterPortal(data.user);
              return;
            }
          } catch (refreshError) {
            const status = (refreshError as { response?: { status?: number } }).response?.status;
            if (status && live) {
              // Token rejected by the server — force a fresh login.
              clearTokens();
              persistSessionUser(null);
              return;
            }
            // No response (backend offline) — fall through to cached identity.
          }
          if (live) {
            const cached = readCachedUser();
            if (cached) setCurrentUser(cached);
          }
          return;
        }
        // No tokens (e.g. offline demo sign-in): only restore when the
        // backend is unreachable, otherwise require a real login.
        const cached = readCachedUser();
        if (cached) {
          try {
            await api.get('/portal/health');
          } catch (healthError) {
            if (!(healthError as { response?: unknown }).response && live) {
              setCurrentUser(cached);
            }
          }
        }
      } finally {
        if (live) setRestoring(false);
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    clearTokens();
    persistSessionUser(null);
    sessionStorage.removeItem('cec_refresh_token');
    setCurrentUser(null);
    setPendingUser(null);
    notify('You have been signed out.');
  };

  if (restoring) {
    return (
      <main aria-label="Restoring your session" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#BFDBFE', fontFamily: 'Inter,system-ui,sans-serif', fontSize: 14 }}>
        Restoring your session…
      </main>
    );
  }

  if (!currentUser) {
    if (pendingUser) {
      return (
        <PortalLoginLoading
          name={`${pendingUser.firstName} ${pendingUser.lastName}`}
          role={pendingUser.role}
          onDone={() => {
            enterPortal(pendingUser);
            setPendingUser(null);
            notify(`Welcome back, ${pendingUser.firstName}!`);
          }}
        />
      );
    }
    return <AuthContainer onLoginSuccess={(u) => setPendingUser(adoptSchoolIdentity(u))} onNotify={notify} />;
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
