
import { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationAsRead } from '../_actions/notifications';
import { useAuth } from '../../utils/authContext';
import { useSocketMultiple } from '../../hooks/useSocketMultiple';

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to format time ago
  const timeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} weeks ago`;
  };

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user?.empName) {
      fetchNotifications();
    }
  }, [user?.empName]);

  // Listen for new notifications via socket
  useSocketMultiple(`user-${user?.empName}`, {
    'new-notification': (newNotification) => {
      console.log('Received new notification:', newNotification);
      setNotifications(prev => {
        // Add new notification and sort by dateCreated descending
        const updated = [newNotification, ...prev].sort((a, b) =>
          new Date(b.dateCreated) - new Date(a.dateCreated)
        );
        return updated;
      });
    }
  });

  const fetchNotifications = async () => {
    if (!user?.empName) return;

    setLoading(true);
    try {
      const result = await getUserNotifications(user.empName);
      if (result.success) {
        setNotifications(result.notifications);
      } else {
        console.error('Failed to fetch notifications:', result.message);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const result = await markNotificationAsRead(id);
      if (result.success) {
        // Update local state
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, isRead: true, dateRead: new Date() } : n
        ));
      } else {
        console.error('Failed to mark as read:', result.message);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {/* Skeleton loader for notifications */}
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start gap-3 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notification.isRead ? 'bg-blue-50' : ''
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-blue-600' : 'bg-gray-300'
                  }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    {notification.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeAgo(new Date(notification.dateCreated))}
                    {notification.createdBy && ` • by ${notification.createdBy}`}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            No notifications
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 text-center">
        {/* <Link href="/notifications" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All Notifications
        </Link> */}
      </div>
    </div>
  );
}
