export type AuthPayload = {
  email?: string;
  password?: string;
  role?: 'student' | 'teacher' | 'admin';
};

export const authService = {
  async findAll() {
    return [
      { id: 'demo-student', email: 'student@cec.edu.ph', role: 'student' },
      { id: 'demo-teacher', email: 'teacher@cec.edu.ph', role: 'teacher' },
      { id: 'demo-admin', email: 'admin@cec.edu.ph', role: 'admin' },
    ];
  },
  async create(payload: AuthPayload) {
    return {
      id: `auth-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  },
};

export default authService;