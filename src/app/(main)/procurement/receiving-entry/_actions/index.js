'use server';

// import { revalidatePath } from '@/app/actions';
import ReceivingEntry from '@/models/ReceivingEntry.js';

export async function getAllReceivingEntries(filters = {}, user = null, isAdmin = false) {
  try {
    const receivingEntries = await ReceivingEntry.getAllReceivingEntries(filters, user, isAdmin);
    return { success: true, receivingEntries };
  } catch (error) {
    console.error('Error fetching receiving entries:', error);
    return { success: false, message: error.message };
  }
}

export async function getReceivingEntryByNumber(receivingNumber, user = null, isAdmin = false) {
  try {
    const receivingEntry = await ReceivingEntry.getReceivingEntryByNumber(receivingNumber, user, isAdmin);
    if (receivingEntry) {
      return { success: true, receivingEntry };
    } else {
      return { success: false, message: 'Receiving entry not found or access denied' };
    }
  } catch (error) {
    console.error('Error fetching receiving entry:', error);
    return { success: false, message: error.message };
  }
}

export async function createReceivingEntry(headerData, detailsData, creatorName) {
  try {
    if (!headerData.poNumber || !headerData.poNumber.trim()) {
      return { success: false, message: 'Purchase Order is required' };
    }

    if (!headerData.receivedBy || !headerData.receivedBy.trim()) {
      return { success: false, message: 'Received By is required' };
    }

    if (!detailsData || detailsData.length === 0) {
      return { success: false, message: 'At least one item is required' };
    }

    const result = await ReceivingEntry.createReceivingEntry(headerData, detailsData, creatorName);

    return {
      success: true,
      referenceNo: result.referenceNo,
      message: result.message
    };
  } catch (error) {
    console.error('Error creating receiving entry:', error);
    return { success: false, message: error.message };
  }
}

export async function updateReceivingEntry(receivingNumber, headerData, detailsData, updaterName) {
  try {
    const result = await ReceivingEntry.updateReceivingEntry(receivingNumber, headerData, detailsData, updaterName);

    if (result.success) {
      return { success: true, message: result.message };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error updating receiving entry:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteReceivingEntry(receivingNumber, deleterName) {
  try {
    const result = await ReceivingEntry.deleteReceivingEntry(receivingNumber, deleterName);

    if (result.success) {
      return { success: true, message: result.message };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error deleting receiving entry:', error);
    return { success: false, message: error.message };
  }
}

export async function postReceivingEntry(receivingNumber, posterName) {
  try {
    const result = await ReceivingEntry.postReceivingEntry(receivingNumber, posterName);

    if (result.success) {
      return { success: true, message: result.message };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error posting receiving entry:', error);
    return { success: false, message: error.message };
  }
}

export async function getApprovedPurchaseOrdersForReceiving(user = null, isAdmin = false) {
  try {
    const purchaseOrders = await ReceivingEntry.getPostedPurchaseOrdersForReceiving(user, isAdmin);
    return { success: true, purchaseOrders };
  } catch (error) {
    console.error('Error fetching approved POs:', error);
    return { success: false, message: error.message };
  }
}

export async function getPurchaseOrderForReceiving(poNumber, user = null, isAdmin = false) {
  try {
    const purchaseOrder = await ReceivingEntry.getPurchaseOrderForReceiving(poNumber, user, isAdmin);
    if (purchaseOrder) {
      return { success: true, purchaseOrder };
    } else {
      return { success: false, message: 'Purchase order not found' };
    }
  } catch (error) {
    console.error('Error fetching purchase order for receiving:', error);
    return { success: false, message: error.message };
  }
}

export async function getNextReceivingNumber() {
  try {
    const receivingEntry = new ReceivingEntry();
    const referenceNo = await ReceivingEntry.getNextReceivingNumber();
    return { success: true, referenceNo };
  } catch (error) {
    console.error('Error generating receiving number:', error);
    return { success: false, message: error.message };
  }
}