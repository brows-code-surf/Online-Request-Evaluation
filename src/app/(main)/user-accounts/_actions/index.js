'use server';

import UserProfile from '@/models/UserProfile.js';

export async function getAllUsers() {
  try {
    const users = await UserProfile.getAllUsers();
    return {
      success: true,
      data: users.map(user => ({
        id: user.employeeID,
        title: user.empName,
        requester: user.empName,
        email: user.email,
        employeeID: user.employeeID,
        department: user.department,
        jobTitle: user.jobTitle,
        location: user.location,
        requestDate: new Date().toISOString(),
        status: user.status
      }))
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      message: 'Failed to fetch users'
    };
  }
}

export async function getUserProfile(employeeID) {
  try {
    const user = await UserProfile.getUserByEmployeeID(employeeID);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      success: false,
      message: 'Failed to fetch user profile'
    };
  }
}

export async function updateUserProfile(profileData, modifiedByEmployeeID) {
  try {
    await UserProfile.updateUserProfile(profileData.employeeID, profileData, modifiedByEmployeeID);
    return {
      success: true,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      message: 'Failed to update profile'
    };
  }
}

export async function changePassword(data) {
  try {
    await UserProfile.changePassword(data.employeeID, data.newPassword);
    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: 'Failed to change password'
    };
  }
}

export async function setUserInactive(employeeID) {
  try {
    await UserProfile.setUserInactive(employeeID);
    return {
      success: true,
      message: 'User account set to inactive successfully'
    };
  } catch (error) {
    console.error('Error setting user inactive:', error);
    return {
      success: false,
      message: 'Failed to set user inactive'
    };
  }
}

export async function setUserActive(employeeID) {
  try {
    await UserProfile.setUserActive(employeeID);
    return {
      success: true,
      message: 'User account set to active successfully'
    };
  } catch (error) {
    console.error('Error setting user active:', error);
    return {
      success: false,
      message: 'Failed to set user active'
    };
  }
}
