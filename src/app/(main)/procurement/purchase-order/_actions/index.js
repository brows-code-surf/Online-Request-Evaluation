'use server';

import PurchaseOrder from '@/models/PurchaseOrder.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';

export async function getAllPurchaseOrders(filters = {}, user = null, isAdmin = false) {
  try {
    const purchaseOrders = await PurchaseOrder.getAllPurchaseOrders(filters, user, isAdmin);
    return { success: true, purchaseOrders };
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    return { success: false, message: 'Failed to fetch purchase orders' };
  }
}

export async function getPurchaseOrderByPONumber(poNumber, user = null, isAdmin = false) {
  try {
    const purchaseOrder = await PurchaseOrder.getPurchaseOrderByPONumber(poNumber, user, isAdmin);
    if (purchaseOrder) {
      return { success: true, purchaseOrder };
    } else {
      return { success: false, message: 'Purchase order not found or access denied' };
    }
  } catch (error) {
    console.error('Error getting purchase order:', error);
    return { success: false, message: 'Failed to fetch purchase order' };
  }
}

export async function createPurchaseOrder(headerData, detailsData, creatorName) {
  try {
    // Validate required fields
    if (!headerData.vendorId || !headerData.vendorId.trim()) {
      return { success: false, message: 'Vendor ID is required' };
    }

    if (!headerData.vendName || !headerData.vendName.trim()) {
      return { success: false, message: 'Vendor name is required' };
    }

    // Validate details
    if (!detailsData || detailsData.length === 0) {
      return { success: false, message: 'At least one item detail is required' };
    }

    for (const detail of detailsData) {
      if (!detail.itemNmbr || !detail.itemNmbr.trim()) {
        return { success: false, message: 'Item number is required for all items' };
      }
      if (!detail.itemDesc || !detail.itemDesc.trim()) {
        return { success: false, message: 'Item description is required for all items' };
      }
      if (!detail.uofm || !detail.uofm.trim()) {
        return { success: false, message: 'Unit of measure is required for all items' };
      }
      if (!detail.qtyOrder || detail.qtyOrder <= 0) {
        return { success: false, message: 'Valid quantity is required for all items' };
      }
      if (!detail.unitCost || detail.unitCost < 0) {
        return { success: false, message: 'Valid unit cost is required for all items' };
      }
    }

    const result = await PurchaseOrder.createPurchaseOrder(headerData, detailsData, creatorName);

    return {
      success: true,
      poNumber: result.poNumber,
      message: 'Purchase order created successfully'
    };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, message: 'Failed to create purchase order' };
  }
}

export async function updatePurchaseOrder(poNumber, headerData, detailsData, updaterName) {
  try {
    const result = await PurchaseOrder.updatePurchaseOrder(poNumber, headerData, detailsData, updaterName);

    if (result.success) {
      return {
        success: true,
        message: result.message
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { success: false, message: 'Failed to update purchase order' };
  }
}

export async function postPurchaseOrder(poNumber, posterName) {
  try {
    const result = await PurchaseOrder.postPurchaseOrder(poNumber, posterName);

    if (result.success) {
      return {
        success: true,
        message: result.message
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error posting purchase order:', error);
    return { success: false, message: 'Failed to post purchase order' };
  }
}

export async function submitPurchaseOrderForProcessing(poNumber, submitterName) {
   try {
     const result = await PurchaseOrder.submitPurchaseOrderForProcessing(poNumber, submitterName);

     if (result.success) {
       return {
         success: true,
         message: result.message
       };
     } else {
       return { success: false, message: result.message };
     }
   } catch (error) {
     console.error('Error submitting purchase order for processing:', error);
     return { success: false, message: 'Failed to submit purchase order for processing' };
   }
 }

 export async function confirmPurchaseOrder(poNumber, confirmerName, step = 1) {
   try {
     const result = await PurchaseOrder.confirmPurchaseOrder(poNumber, confirmerName, step);

     if (result.success) {
       return {
         success: true,
         message: result.message
       };
     } else {
       return { success: false, message: result.message };
     }
   } catch (error) {
     console.error('Error confirming purchase order:', error);
     return { success: false, message: 'Failed to confirm purchase order' };
   }
 }

export async function deletePurchaseOrder(poNumber, deleterName) {
  try {
    const result = await PurchaseOrder.deletePurchaseOrder(poNumber, deleterName);

    if (result.success) {
      return {
        success: true,
        message: result.message
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return { success: false, message: 'Failed to delete purchase order' };
  }
}

export async function getCanvassingDataForPO(user, filterByAssignedTo = true) {
  try {
    const items = await PurchaseOrder.getCanvassingDataForPO(user, filterByAssignedTo);
    return { success: true, items };
  } catch (error) {
    console.error('Error getting canvassing data for PO:', error);
    return { success: false, message: 'Failed to fetch canvassing data' };
  }
}

export async function getAllSuppliers() {
  try {
    const suppliers = await PurchaseOrder.getAllSuppliers();
    return { success: true, suppliers };
  } catch (error) {
    console.error('Error getting suppliers:', error);
    return { success: false, message: 'Failed to fetch suppliers' };
  }
}

export async function getAllPaymentTerms() {
  try {
    const paymentTerms = await PurchaseOrder.getAllPaymentTerms();
    return { success: true, paymentTerms };
  } catch (error) {
    console.error('Error getting payment terms:', error);
    return { success: false, message: 'Failed to fetch payment terms' };
  }
}

export async function getSupplierContactPersons(vendorId) {
  try {
    const contactPersons = await PurchaseOrder.getSupplierContactPersons(vendorId);
    return { success: true, contactPersons };
  } catch (error) {
    console.error('Error getting supplier contact persons:', error);
    return { success: false, message: 'Failed to fetch contact persons' };
  }
}

export async function getNextPONumber() {
  try {
    const poNumber = await PurchaseOrder.getNextPONumber();
    return { success: true, poNumber };
  } catch (error) {
    console.error('Error getting next PO number:', error);
    return { success: false, message: 'Failed to generate PO number' };
  }
}

export async function getConfirmedBy() {
  try {
    const confirmedBy = await PurchaseOrder.getConfirmedBy();
    return { success: true, confirmedBy };
  } catch (error) {
    console.error('Error getting confirmed by options:', error);
    return { success: false, message: 'Failed to fetch confirmed by options' };
  }
}

export async function getApprovedBy() {
  try {
    const approvedBy = await PurchaseOrder.getApprovedBy();
    return { success: true, approvedBy };
  } catch (error) {
    console.error('Error getting approved by options:', error);
    return { success: false, message: 'Failed to fetch approved by options' };
  }
}

export async function getDeliveryLocations() {
  try {
    const deliveryLocations = await PurchaseOrder.getDeliveryLocations();
    return { success: true, deliveryLocations };
  } catch (error) {
    console.error('Error getting delivery locations:', error);
    return { success: false, message: 'Failed to fetch delivery locations' };
  }
}

export async function getDocumentTypes() {
  try {
    const documentTypes = await PurchaseOrder.getDocumentTypes();
    return { success: true, documentTypes };
  } catch (error) {
    console.error('Error getting document types:', error);
    return { success: false, message: 'Failed to fetch document types' };
  }
}
