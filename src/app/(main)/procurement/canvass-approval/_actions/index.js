'use server';

import CanvassApproval from '@/models/CanvassApproval.js';

export async function getAllCanvassingItems(user = null, isAdmin = false) {
  try {
    const items = await CanvassApproval.getAllCanvassingItems(user, isAdmin);
    return { success: true, items };
  } catch (error) {
    console.error('Error getting all canvassing items:', error);
    return { success: false, message: 'Failed to fetch all canvassing items' };
  }
}

export async function approveCanvassingItem(itemId, approverName) {
  try {
    const result = await CanvassApproval.approveCanvassingItem(itemId, approverName);
    return result;
  } catch (error) {
    console.error('Error approving canvassing item:', error);
    return { success: false, message: 'Failed to approve canvassing item' };
  }
}

export async function rejectCanvassingItem(itemId, rejectorName, rejectReason = '') {
  try {
    const result = await CanvassApproval.rejectCanvassingItem(itemId, rejectorName, rejectReason);
    return result;
  } catch (error) {
    console.error('Error rejecting canvassing item:', error);
    return { success: false, message: 'Failed to reject canvassing item' };
  }
}
