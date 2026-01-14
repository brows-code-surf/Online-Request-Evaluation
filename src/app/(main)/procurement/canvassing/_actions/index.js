'use server';

import Canvassing from '@/models/Canvassing.js';
import Budget from '@/models/Budget.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';

export async function getAllCanvassingRequests(filters = {}, user = null, isAdmin = false) {
  try {
    const canvassingRequests = await Canvassing.getAllCanvassingRequests(filters, user, isAdmin);
    return { success: true, canvassingRequests };
  } catch (error) {
    console.error('Error getting canvassing requests:', error);
    return { success: false, message: 'Failed to fetch canvassing requests' };
  }
}

export async function getCanvassingRequestByPQCode(pqCode, user = null, isAdmin = false) {
  try {
    const canvassingRequest = await Canvassing.getCanvassingRequestByPQCode(pqCode, user, isAdmin);
    return { success: true, canvassingRequest };
  } catch (error) {
    console.error('Error getting canvassing request:', error);
    return { success: false, message: 'Failed to fetch canvassing request' };
  }
}

export async function createCanvassingRequest(headerData, detailsData, creatorName, supplierName = '') {
  try {
    // Validate required fields
    if (!headerData.referenceNum || !headerData.referenceNum.trim()) {
      return { success: false, message: 'Reference number is required' };
    }

    // Validate details
    if (!detailsData || detailsData.length === 0) {
      return { success: false, message: 'At least one item detail is required' };
    }

    for (const detail of detailsData) {
      if (!detail.itemNumber || !detail.itemNumber.trim()) {
        return { success: false, message: 'Item number is required for all items' };
      }
      if (!detail.itemDescription || !detail.itemDescription.trim()) {
        return { success: false, message: 'Item description is required for all items' };
      }
      if (!detail.unitOfMeasure || !detail.unitOfMeasure.trim()) {
        return { success: false, message: 'Unit of measure is required for all items' };
      }
      if (!detail.quantity || detail.quantity <= 0) {
        return { success: false, message: 'Valid quantity is required for all items' };
      }
      if (!detail.budgetCode || !detail.budgetCode.trim()) {
        return { success: false, message: 'Budget code is required for all items' };
      }
    }

    const result = await Canvassing.createCanvassingRequest(headerData, detailsData, creatorName, supplierName);

    return {
      success: true,
      pqCode: result.pqCode,
      message: 'Canvassing request created successfully'
    };
  } catch (error) {
    console.error('Error creating canvassing request:', error);
    return { success: false, message: 'Failed to create canvassing request' };
  }
}

export async function updateCanvassingRequest(pqCode, headerData, detailsData, updaterName) {
  try {
    const result = await Canvassing.updateCanvassingRequest(pqCode, headerData, detailsData, updaterName);
    return result;
  } catch (error) {
    console.error('Error updating canvassing request:', error);
    return { success: false, message: 'Failed to update canvassing request' };
  }
}

export async function approveCanvassingRequest(pqCode, approverName) {
  try {
    const result = await Canvassing.approveCanvassingRequest(pqCode, approverName);

    if (result.success) {
      // Emit real-time event
      broadcastRequestEvaluationUpdate("canvassing-approved", {
        pqCode: pqCode,
        approverName: approverName,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    console.error('Error approving canvassing request:', error);
    return { success: false, message: 'Failed to approve canvassing request' };
  }
}

export async function postCanvassingRequest(pqCode, posterName) {
  try {
    const result = await Canvassing.postCanvassingRequest(pqCode, posterName);

    if (result.success) {
      // Emit real-time event
      broadcastRequestEvaluationUpdate("canvassing-posted", {
        pqCode: pqCode,
        posterName: posterName,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    console.error('Error posting canvassing request:', error);
    return { success: false, message: 'Failed to post canvassing request' };
  }
}

export async function deleteCanvassingRequest(pqCode, deleterName) {
  try {
    // Check if request exists and is in NOT POSTED status
    const existingRequest = await Canvassing.getCanvassingRequestByPQCode(pqCode);
    if (!existingRequest) {
      return { success: false, message: 'Canvassing request not found' };
    }

    if (existingRequest.header.postStatus !== 0) {
      return { success: false, message: 'Only NOT POSTED requests can be deleted' };
    }

    // Delete from database (implement in Canvassing model)
    const result = await Canvassing.deleteCanvassingRequest(pqCode, deleterName);

    if (result.success) {
      // Emit real-time event
      broadcastRequestEvaluationUpdate("canvassing-deleted", {
        pqCode: pqCode,
        deleterName: deleterName,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    console.error('Error deleting canvassing request:', error);
    return { success: false, message: 'Failed to delete canvassing request' };
  }
}

export async function getCanvassingStats(user = null) {
  try {
    const stats = await Canvassing.getCanvassingStats(user);
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting canvassing stats:', error);
    return { success: false, message: 'Failed to fetch canvassing stats' };
  }
}

export async function getNextPQCode() {
  try {
    const pqCode = await Canvassing.getNextPQCode();
    return { success: true, pqCode };
  } catch (error) {
    console.error('Error getting next PQ code:', error);
    return { success: false, message: 'Failed to generate PQ code' };
  }
}

export async function getAllBudgetAccounts() {
  try {
    const budgets = await Budget.getAllBudgetAccounts();
    return { success: true, budgets };
  } catch (error) {
    console.error('Error getting budget accounts:', error);
    return { success: false, message: 'Failed to fetch budget accounts' };
  }
}

// Get purchase request details that are FOR CANVASSING
export async function getPurchaseRequestDetailsForCanvassing(user, filterByAddressedTo = true) {
  try {
    const items = await Canvassing.getPurchaseRequestDetailsForCanvassing(user, filterByAddressedTo);
    return { success: true, items };
  } catch (error) {
    console.error('Error getting purchase request details for canvassing:', error);
    return { success: false, message: 'Failed to fetch purchase request details' };
  }
}

// Get all suppliers
export async function getAllSuppliers() {
  try {
    const suppliers = await Canvassing.getAllSuppliers();
    return { success: true, suppliers };
  } catch (error) {
    console.error('Error getting suppliers:', error);
    return { success: false, message: 'Failed to fetch suppliers' };
  }
}

// Get all payment terms
export async function getAllPaymentTerms() {
  try {
    const paymentTerms = await Canvassing.getAllPaymentTerms();
    return { success: true, paymentTerms };
  } catch (error) {
    console.error('Error getting payment terms:', error);
    return { success: false, message: 'Failed to fetch payment terms' };
  }
}

// Get next reference number with QUO- prefix
export async function getNextReferenceNumber() {
  try {
    const referenceNum = await Canvassing.getNextReferenceNumber();
    return { success: true, referenceNum };
  } catch (error) {
    console.error('Error getting next reference number:', error);
    return { success: false, message: 'Failed to generate reference number' };
  }
}

// Check existing suppliers for given RIDs
export async function checkExistingSuppliersForRIDs(rids) {
  try {
    const existingSuppliers = await Canvassing.checkExistingSuppliersForRIDs(rids);
    return { success: true, existingSuppliers };
  } catch (error) {
    console.error('Error checking existing suppliers:', error);
    return { success: false, message: 'Failed to check existing suppliers' };
  }
}
