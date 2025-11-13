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
        const { employeeID, ...dataToUpdate } = profileData;
        const success = await UserProfile.updateUserProfile(dataToUpdate.email, dataToUpdate);
        if (success) {
            return { success: true, message: 'Profile updated successfully' };
        }
        return { success: false, message: 'Failed to update profile' };
    } catch (error) {
        return { success: false, message: error.message || 'Failed to update profile' };
    }
}

export async function changePassword({ email, currentPassword, newPassword }) {
    try {
        // Verify current password first
        const user = await UserProfile.getUserByEmail(email);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        const passwordMatch = await UserProfile.verifyPassword(email, currentPassword);
        if (!passwordMatch) {
            return { success: false, message: 'Current password is incorrect' };
        }

        const success = await UserProfile.changePassword(email, newPassword);
        if (!success) {
            return { success: false, message: 'Failed to change password' };
        }
        return { success: true, message: 'Password changed successfully' };
    } catch (error) {
        return { success: false, message: error.message || 'Failed to change password' };
    }
}
