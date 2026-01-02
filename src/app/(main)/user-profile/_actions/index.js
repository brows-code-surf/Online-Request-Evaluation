'use server';

import UserProfile from '@/models/UserProfile.js';

export async function getUserProfile(email) {
    try {
        const user = await UserProfile.getUserByEmail(email);
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        return { success: true, data: user };
    } catch (error) {
        console.error('Error in getUserProfile action:', error);
        return { success: false, message: 'Failed to fetch profile' };
    }
}

export async function updateUserProfile(profileData) {
    try {
        // Get the current user's employee ID from the context or pass it separately
        // For now, we'll use the employee ID from profileData as the modifier
        const success = await UserProfile.updateUserProfile(profileData.employeeID, profileData, profileData.employeeID);
        if (success) {
            return { success: true, message: 'Profile updated successfully' };
        }
        return { success: false, message: 'Failed to update profile' };
    } catch (error) {
        return { success: false, message: error.message || 'Failed to update profile' };
    }
}

export async function changePassword({ employeeID, currentPassword, newPassword }) {
    try {
        const user = await UserProfile.getUserByEmployeeID(employeeID);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        const passwordMatch = await UserProfile.verifyPassword(employeeID, currentPassword);
        if (!passwordMatch) {
            return { success: false, message: 'Current password is incorrect' };
        }

        const success = await UserProfile.changePassword(employeeID, newPassword);
        if (!success) {
            return { success: false, message: 'Failed to change password' };
        }
        return { success: true, message: 'Password changed successfully' };
    } catch (error) {
        return { success: false, message: error.message || 'Failed to change password' };
    }
}
