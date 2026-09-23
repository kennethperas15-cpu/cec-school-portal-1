import { useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthContainer } from './components/auth/AuthContainer';
import type { UserAuthData } from './components/auth/Login';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import './styles.css';
import './login.css';

const roleOf = (role: string): 'student' | 'teacher' | 'admin' => {
  if (role === 'teacher' || role === 'admin') return role;
  return 'student';
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
    return <AuthContainer onLoginSuccess={setCurrentUser} onNotify={notify} />;
  }

  const props = { currentUser, onNotify: notify, onLogout: logout };
  const role = roleOf(currentUser.role);
  const dashboard = role === 'admin'
    ? <AdminDashboard {...props} />
    : role === 'teacher'
      ? <TeacherDashboard {...props} />
      : <StudentDashboard {...props} />;

  return <>{dashboard}{message && <div className="toast" role="status">{message}</div>}</>;
};

export default App;
