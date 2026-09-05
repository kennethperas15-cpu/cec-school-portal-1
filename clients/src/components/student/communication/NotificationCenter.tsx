// NotificationCenter.tsx - Notification System (NEW)
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, CheckCheck } from 'lucide-react';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
      <NotificationDropdown items={notifications} />
    </div>
  );
};