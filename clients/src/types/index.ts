export type PortalRole = 'student' | 'teacher' | 'admin';

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: PortalRole;
};

export type PortalStatus = 'active' | 'pending' | 'inactive';