export type AuthRole = 'student' | 'teacher' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  role: AuthRole;
  email: string;
};

export function useAuth() {
  const signIn = async (email: string, password: string, role: AuthRole = 'student') => ({
    success: email.length > 0 && password.length > 0,
    user: {
      id: 'demo-user',
      name: role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher Demo' : 'Student Demo',
      role,
      email,
    },
  });

  const signOut = async () => ({ success: true });

  return { signIn, signOut };
}

export default useAuth;