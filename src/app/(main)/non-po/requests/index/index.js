'use server';

import Canvassing from '@/models/Canvassing.js';
import NO_PO_RFP from '@/models/NOPORFP.js';

export async function getAllPaymentTerms() {
  try {
    const paymentTerms = await Canvassing.getAllPaymentTerms();
    return { success: true, paymentTerms };
  } catch (error) {
    console.error('Error getting payment terms:', error);
    return { success: false, message: 'Failed to fetch payment terms' };
  }
}

export async function getRFPDetails(isAdmin, user, referenceNo) {
  try {
    const rfpDetails = await NO_PO_RFP.getRFPDetails(isAdmin, user, referenceNo);
    return { success: true, rfpDetails };
  } catch (error) {
    console.error('Error getting RFP details:', error);
    return { success: false, message: 'Failed to fetch RFP details' };
  }
}

export async function getLatestReferenceNo() {
  try {
    const referenceNo = await NO_PO_RFP.getLatestReferenceNo();
    return { success: true, referenceNo };
  } catch (error) {
    console.error('Error getting latest reference number:', error);
    return { success: false, message: 'Failed to fetch latest reference number' };
  }
}

export async function saveRFPDetails(rfpData) {
  try {
    const result = await NO_PO_RFP.saveRFPDetails(rfpData);
    return result;
  } catch (error) {
    console.error('Error saving RFP details:', error);
    return { success: false, message: 'Failed to save RFP details' };
  }
}

export async function updateRFPDetails(referenceNo, updatedData) {
  try {
    const result = await NO_PO_RFP.updateRFP(referenceNo, updatedData);
    return result;
  } catch (error) {
    console.error('Error updating RFP details:', error);
    return { success: false, message: 'Failed to update RFP details' };
  }
}

