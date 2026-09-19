import { useNotifications } from '@/hooks/useNotifications';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Notifications</strong>
        <button type="button" onClick={markAllRead} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
          Mark all read
        </button>
      </div>
      <span>🔔 {unreadCount} unread</span>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {notifications.map((notification) => (
          <li key={notification.id}>{notification.title}</li>
        ))}
      </ul>
    </div>
  );
};