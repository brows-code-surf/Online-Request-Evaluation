'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../utils/authContext';
import { getUnreadNotificationCount } from '../_actions/notifications';
import { useSocketMultiple } from '../../hooks/useSocketMultiple';

export default function TitleUpdater() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?.empName) {
        try {
          const result = await getUnreadNotificationCount(user.empName);
          if (result.success) {
            setUnreadCount(result.count);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      }
    };

    fetchUnreadCount();
  }, [user?.empName]);

  // Listen for notification updates via socket
  useSocketMultiple(`user-${user?.empName}`, {
    'new-notification': () => {
      setUnreadCount(prev => prev + 1);
    },
    'notification-count-updated': (data) => {
      setUnreadCount(data.count);
    }
  });

  // Update document title when count changes
  useEffect(() => {
    const baseTitle = "Online Requests Evaluation System";
    if (user && unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadCount, user]);

  return null; // This component doesn't render anything
}
