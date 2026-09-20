import { create } from 'zustand';

export type AuthSession = {
  isAuthenticated: boolean;
  userName: string;
  role: 'student' | 'teacher' | 'admin';
};

type AuthStore = {
  session: AuthSession;
  signIn: (userName: string, role: AuthSession['role']) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: { isAuthenticated: false, userName: '', role: 'student' },
  signIn: (userName, role) => set({ session: { isAuthenticated: true, userName, role } }),
  signOut: () => set({ session: { isAuthenticated: false, userName: '', role: 'student' } }),
}));

export default useAuthStore;