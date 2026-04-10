
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserNotifications, markNotificationAsRead } from '../_actions/notifications';
import { useAuth } from '../../utils/authContext';
import { useSocketMultiple } from '../../hooks/useSocketMultiple';
import React, { forwardRef } from "react";

export const NotificationBell = forwardRef((props, ref) => {
  const { user, darkMode } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to format time ago
  const timeAgo = (date) => {
    const now = new Date();
    let notificationDate;

    // Handle different input types
    if (typeof date === 'number') {
      notificationDate = new Date(date);
    } else if (typeof date === 'string') {
      // Ensure ISO string has Z or explicit timezone
      let dateStr = date;
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-00:')) {
        // If it looks like an ISO string without timezone, append Z (UTC)
        if (dateStr.includes('T')) {
          dateStr = dateStr + 'Z';
        } else {
          // If it's a datetime with space, convert and add Z
          dateStr = dateStr.replace(' ', 'T') + 'Z';
        }
      }
      notificationDate = new Date(dateStr);
    } else if (date instanceof Date) {
      notificationDate = date;
    } else {
      return 'Invalid date';
    }

    // Check if the date is valid
    if (isNaN(notificationDate.getTime())) {
      return 'Invalid date';
    }

    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    // Handle future dates or very recent dates (within 2 seconds tolerance for clock skew)
    if (diffInSeconds < 0) {
      if (diffInSeconds > -2) {
        return 'just now';
      }
      return 'just now'; // Treat anything within reason as 'just now' to handle timezone/clock issues
    }

    if (diffInSeconds < 60) {
      return diffInSeconds === 1 ? '1 second ago' : `${diffInSeconds} seconds ago`;
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
    const diffInWeeks = Math.floor(diffInDays / 7);
    return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
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

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    // Redirect if URL exists
    if (notification.url) {
      router.push(notification.url);
    }
  };

  return (
    <div
      ref={ref}
      className={`
                fixed
                sm:absolute
                bottom-0
                sm:bottom-auto
                right-0
                sm:right-0
                left-0
                sm:left-auto
                sm:top-full
                sm:mt-3
                w-full
                sm:w-96
                md:w-80
                max-h-[70vh]
                sm:max-h-[28rem]
                sm:rounded-xl
                rounded-t-lg
                shadow-2xl
                sm:border
                border-t
                sm:border-t
                overflow-hidden
                ${darkMode ? 'bg-gray-900' : 'bg-white'}
                ${darkMode ? 'border-gray-700' : 'border-gray-200'}
                z-[9999]
              `}
    >

      <div className={`px-4 py-3.5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
        <h3 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
      </div>

      <div className="max-h-[calc(70vh-80px)] sm:max-h-[calc(28rem-64px)] md:max-h-[calc(28rem-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start gap-3 animate-pulse">
                <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} mt-2`}></div>
                <div className="flex-1 space-y-2">
                  <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-3/4`}></div>
                  <div className={`h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-full`}></div>
                  <div className={`h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-1/2`}></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} cursor-pointer transition duration-150 ease-in-out ${!notification.isRead ? (darkMode ? "bg-blue-900/30" : "bg-blue-50/70") : ""
                }`}
            >
                <div className="flex items-start gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${!notification.isRead ? "bg-blue-500 ring-2 ring-blue-500/30" : (darkMode ? "bg-gray-500" : "bg-gray-400")
                    }`}
                ></div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'} font-semibold`}>
                    {notification.title}
                  </p>

                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    {notification.description}
                  </p>

                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1.5`}>
                    {timeAgo(new Date(notification.dateCreated))}
                    {notification.createdBy && <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}> • by {notification.createdBy}</span>}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No notifications
          </div>
        )}
      </div>

      <div className={`hidden sm:block p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}></div>
    </div>
  );
});

export default NotificationBell;
