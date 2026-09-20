import { useNotifications } from '@/hooks/useNotifications';

export const NotificationCenter = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3>Notification Center</h3>
      <div>Unread: {unreadCount}</div>
      <button type="button" onClick={markAllRead}>Mark all read</button>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {notifications.map((notification) => (
          <li key={notification.id}>{notification.title}: {notification.message}</li>
        ))}
      </ul>
    </div>
  );
};