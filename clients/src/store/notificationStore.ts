import { create } from 'zustand';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
};

type NotificationStore = {
  notifications: NotificationItem[];
  addNotification: (item: NotificationItem) => void;
  markAllRead: () => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [
    { id: 'n1', title: 'Enrollment update', message: 'Your review is scheduled.', read: false },
    { id: 'n2', title: 'Grade release', message: 'Your latest grade has been posted.', read: true },
  ],
  addNotification: (item) => set((state) => ({ notifications: [item, ...state.notifications] })),
  markAllRead: () => set((state) => ({ notifications: state.notifications.map((entry) => ({ ...entry, read: true })) })),
}));

export default useNotificationStore;