import { useMemo } from 'react';

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
};

export function useNotifications() {
  const notifications = useMemo<AppNotification[]>(() => [
    { id: 1, title: 'Enrollment update', message: 'Your enrollment review has been scheduled.', read: false, type: 'info' },
    { id: 2, title: 'Grade released', message: 'Statistics and Probability grade is now available.', read: false, type: 'success' },
    { id: 3, title: 'Fee reminder', message: 'Tuition payment is due this Friday.', read: true, type: 'warning' },
  ], []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAllRead = () => {
    notifications.forEach((notification) => {
      notification.read = true;
    });
  };

  return { notifications, unreadCount, markAllRead };
}

export const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return {
    notifications,
    unreadCount,
    markAllRead,
    title: 'Notifications',
  };
};