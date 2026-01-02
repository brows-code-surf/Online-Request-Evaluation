'use server';

import { ActivityLogs } from '@/models/ActivityLogs.js';
import UserProfile from '@/models/UserProfile.js';
import { changePassword as changeUserPassword } from '../../user-profile/_actions/index.js';

export async function getUserSettings(employeeID) {
    try {
        const settings = await UserProfile.getUserSettings(employeeID);
        return { success: true, settings };
    } catch (error) {
        console.error('Error getting user settings:', error);
        return { success: false, message: 'Failed to get user settings' };
    }
}

export async function updateDarkMode(employeeID, isDarkMode) {
    try {
        const success = await UserProfile.updateDarkMode(employeeID, isDarkMode);
        if (success) {
            return { success: true, message: 'Dark mode updated successfully' };
        } else {
            return { success: false, message: 'Failed to update dark mode' };
        }
    } catch (error) {
        console.error('Error updating dark mode:', error);
        return { success: false, message: 'Failed to update dark mode' };
    }
}

export async function updateEmailNotification(employeeID, isEmailNotification) {
    try {
        const success = await UserProfile.updateEmailNotification(employeeID, isEmailNotification);
        if (success) {
            return { success: true, message: 'Email notification updated successfully' };
        } else {
            return { success: false, message: 'Failed to update email notification' };
        }
    } catch (error) {
        console.error('Error updating email notification:', error);
        return { success: false, message: 'Failed to update email notification' };
    }
}

export async function getUserActivityLogs(employeeID, limit = 50, offset = 0) {
    try {
        const logs = await ActivityLogs.getActivityLogsByUser(employeeID, limit, offset);
        return { success: true, logs };
    } catch (error) {
        console.error('Error getting user activity logs:', error);
        return { success: false, message: 'Failed to get activity logs' };
    }
}

export async function changePassword(data) {
    return await changeUserPassword(data);
}
