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
  try {
    const MODULE = (await import('@/models/Module.js')).default;
    const modules = await MODULE.getActiveModules();

    // Group modules by parent and children
    const groupedModules = [];
    const parentModules = modules.filter(m => !m.SUBMODULE || m.SUBMODULE === null || m.SUBMODULE === '');

    console.log('Total modules:', modules.length);
    console.log('Parent modules:', parentModules.length);

    parentModules.forEach(parent => {
      // Add parent module
      groupedModules.push({
        id: parent.MODULE,
        name: parent.NAME,
        description: parent.DESCRIPTION,
        isParent: true
      });

      // Add child modules under this parent
      const childModules = modules.filter(m => m.SUBMODULE === parent.MODULE || m.SUBMODULE === parent.NAME);
      console.log(`Child modules for ${parent.NAME}:`, childModules.length);

      childModules.forEach(child => {
        groupedModules.push({
          id: child.MODULE,
          name: `${parent.NAME} > ${child.NAME}`,
          description: child.DESCRIPTION,
          isParent: false,
          parentName: parent.NAME,
          parentId: parent.MODULE
        });
      });
    });

    // Add any orphaned child modules (children without parents in the list)
    const allChildModules = modules.filter(m => m.SUBMODULE && m.SUBMODULE !== null && m.SUBMODULE !== '');
    const processedChildren = groupedModules.filter(m => !m.isParent).map(m => m.id);

    allChildModules.forEach(child => {
      if (!processedChildren.includes(child.MODULE)) {
        groupedModules.push({
          id: child.MODULE,
          name: `${child.SUBMODULE} > ${child.NAME}`,
          description: child.DESCRIPTION,
          isParent: false,
          parentName: child.SUBMODULE,
          parentId: child.SUBMODULE
        });
      }
    });

    console.log('Final grouped modules:', groupedModules.length);

    return {
      success: true,
      data: groupedModules
    };
  } catch (error) {
    console.error('Error fetching available modules:', error);
    return {
      success: false,
      message: 'Failed to fetch modules: ' + error.message
    };
  }
}
