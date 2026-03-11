'use server';

import CanvassApproval from '@/models/CanvassApproval.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';

export async function getAllCanvassingItems(user = null, isAdmin = false) {
  try {
    const items = await CanvassApproval.getAllCanvassingItems(user, isAdmin);
    return { success: true, items };
  } catch (error) {
    console.error('Error getting all canvassing items:', error);
    return { success: false, message: 'Failed to fetch all canvassing items' };
  }
}

export async function getCanvassApprovalStats(user = null, isAdmin = false) {
  try {
    const stats = await CanvassApproval.getCanvassApprovalStats(user, isAdmin);
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting canvass approval stats:', error);
    return { success: false, message: 'Failed to fetch canvass approval stats' };
  }
}

export async function approveCanvassingItem(itemId, approverName) {
  try {
    const result = await CanvassApproval.approveCanvassingItem(itemId, approverName);

    if (result.success) {
      // Emit real-time event
      broadcastRequestEvaluationUpdate("canvassing-item-approved", {
        itemId: itemId,
        approverName: approverName,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    console.error('Error approving canvassing item:', error);
    return { success: false, message: 'Failed to approve canvassing item' };
  }
}

export async function rejectCanvassingItem(itemId, rejectorName, rejectReason = '') {
  try {
    const result = await CanvassApproval.rejectCanvassingItem(itemId, rejectorName, rejectReason);

    if (result.success) {
      // Emit real-time event
      broadcastRequestEvaluationUpdate("canvassing-item-rejected", {
        itemId: itemId,
        rejectorName: rejectorName,
        rejectReason: rejectReason,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    console.error('Error rejecting canvassing item:', error);
    return { success: false, message: 'Failed to reject canvassing item' };
  }
}
