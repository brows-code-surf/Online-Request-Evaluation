'use server';

import Notification from '../../models/Notification';
import { notifyUserUpdate } from '../../lib/socketBroadcast';

export async function getUserNotifications(recipient) {
  try {
    const notifications = await Notification.getByRecipient(recipient, 20); // Get last 20
    return {
      success: true,
      notifications: notifications.map(n => ({
        id: n.rowId,
        title: n.title,
        description: n.description,
        createdBy: n.createdBy,
        dateCreated: n.dateCreated,
        isRead: n.isRead,
        dateRead: n.dateRead
      }))
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch notifications'
    };
  }
}

export async function getUnreadNotificationCount(recipient) {
  try {
    const count = await Notification.getUnreadCount(recipient);
    return {
      success: true,
      count: count
    };
  } catch (error) {
    console.error('Get unread count error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get unread count'
    };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const notification = await Notification.getById(notificationId);
    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }

    const result = await notification.markAsRead();
    if (result.success) {
      // Get updated unread count and broadcast
      const updatedCount = await Notification.getUnreadCount(notification.recipient);
      notifyUserUpdate(notification.recipient, 'notification-count-updated', { count: updatedCount });
    }
    return result;
  } catch (error) {
    console.error('Mark as read error:', error);
    return {
      success: false,
      message: error.message || 'Failed to mark notification as read'
    };
  }
}
