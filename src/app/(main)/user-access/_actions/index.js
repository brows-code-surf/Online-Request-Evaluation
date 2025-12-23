'use server';

import USERACCESS from '@/models/UserAccess.js';
import UserProfile from '@/models/UserProfile.js';
import { broadcastUserAccessUpdate } from '@/app/_actions/socket';

export async function getAllUsers() {
  try {
    console.log('Server action: getAllUsers called');
    const users = await UserProfile.getAllUsers();
    console.log('Server action: Raw users from UserProfile.getAllUsers():', users);

    const formattedUsers = users.map(user => ({
      id: user.employeeID,
      title: user.empName,
      requester: user.empName,
      email: user.email,
      employeeID: user.employeeID,
      department: user.department,
      jobTitle: user.jobTitle,
      jobLevel: user.jobLevel,
      location: user.location,
      dateRequested: user.dateRequested || new Date().toISOString(),
      status: user.status
    }));

    console.log('Server action: Formatted users:', formattedUsers);
    return {
      success: true,
      data: formattedUsers
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      message: 'Failed to fetch users'
    };
  }
}

export async function getUserAccess(employeeID) {
  try {
    console.log('Server action: getUserAccess called with employeeID:', employeeID);
    const accessRecords = await USERACCESS.getAccessByEmployee(employeeID);
    console.log('Server action: getUserAccess result from model:', accessRecords);
    return {
      success: true,
      data: accessRecords
    };
  } catch (error) {
    console.error('Server action: Error fetching user access:', error);
    return {
      success: false,
      message: 'Failed to fetch user access'
    };
  }
}

export async function grantAccess(employeeID, employeeName, module, grantedBy) {
  try {
    const result = await USERACCESS.grantAccess(employeeID, employeeName, module, grantedBy);

    // Broadcast access change
    await broadcastUserAccessUpdate('user-access-granted', {
      employeeID,
      employeeName,
      module,
      grantedBy,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('Error granting access:', error);
    return {
      success: false,
      message: 'Failed to grant access'
    };
  }
}

export async function revokeAccess(employeeID, module, revokedBy) {
  try {
    const result = await USERACCESS.revokeAccess(employeeID, module, revokedBy);

    // Broadcast access change
    await broadcastUserAccessUpdate('user-access-revoked', {
      employeeID,
      module,
      revokedBy,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('Error revoking access:', error);
    return {
      success: false,
      message: 'Failed to revoke access'
    };
  }
}

export async function getAllAccessRecords() {
  try {
    const records = await USERACCESS.getAllAccess();
    return {
      success: true,
      data: records
    };
  } catch (error) {
    console.error('Error fetching all access records:', error);
    return {
      success: false,
      message: 'Failed to fetch access records'
    };
  }
}

export async function updateAccess(rowId, hasAccess, modifiedBy) {
  try {
    const result = await USERACCESS.updateAccess(rowId, hasAccess, modifiedBy);

    // Broadcast access change
    await broadcastUserAccessUpdate('user-access-updated', {
      rowId,
      hasAccess,
      modifiedBy,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('Error updating access:', error);
    return {
      success: false,
      message: 'Failed to update access'
    };
  }
}

// Get available modules in the system
export async function getAvailableModules() {
  // Define system modules based on app structure
  const modules = [
    { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard and analytics' },
    { id: 'purchase-request', name: 'Purchase Request', description: 'Create and manage purchase requests' },
    { id: 'request-evaluation', name: 'Request Evaluation', description: 'Evaluate and process requests' },
    { id: 'ticket', name: 'Support Tickets', description: 'Create and manage support tickets' },
    { id: 'user-profile', name: 'User Profile', description: 'Manage personal profile and settings' },
    { id: 'settings', name: 'Settings', description: 'System settings and configuration' },
    { id: 'user-accounts', name: 'User Accounts', description: 'Manage user accounts (Admin only)' },
    { id: 'user-approval', name: 'User Approval', description: 'Approve new user accounts (Admin only)' },
    { id: 'user-access', name: 'User Access', description: 'Manage user access permissions (Admin only)' }
  ];

  return {
    success: true,
    data: modules
  };
}
