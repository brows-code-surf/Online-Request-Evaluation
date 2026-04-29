'use server';

import AdminUtilities from '@/models/AdminUtilities';
import { revalidatePath } from 'next/cache';

export async function getReceivingEntries(filters = {}, user, isAdmin) {
  try {
    const finalFilters = { ...filters };
    if (finalFilters.postStatus === undefined) {
      finalFilters.postStatus = 1; // Default to posted for deletion
    }
    const entries = await AdminUtilities.getAllReceivingEntries(finalFilters, user, isAdmin);
    return { success: true, data: entries };
  } catch (error) {
    console.error('Error fetching receiving entries:', error);
    return { success: false, error: error.message };
  }
}


export async function getReceivingEntryDetails(referenceNo, user, isAdmin) {
  try {
    const details = await AdminUtilities.getReceivingEntryByNumber(referenceNo, user, isAdmin);
    return { success: true, data: details };
  } catch (error) {
    console.error('Error fetching receiving entry details:', error);
    return { success: false, error: error.message };
  }
}

export async function getDistributionAccounts(referenceNo) {
  try {
    const DistributionOfAccounts = (await import('@/models/DistributionOfAccounts')).default;
    const distributions = await DistributionOfAccounts.getDistributionsByReferenceNo(referenceNo);
    return { success: true, data: distributions };
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return { success: false, error: error.message };
  }
}

export async function unpostReceivingEntryAction(referenceNo, unposterName, isAdmin) {
  try {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Only administrators can unpost receiving entries' };
    }

    // Check if the entry exists and is posted
    const entry = await AdminUtilities.getReceivingEntryByNumber(referenceNo);
    if (!entry) {
      return { success: false, error: 'Receiving entry not found' };
    }

    if (entry.header.postStatus !== 1) {
      return { success: false, error: 'Receiving entry is not posted' };
    }

    const result = await AdminUtilities.unpostReceivingEntry(referenceNo, unposterName);
    revalidatePath('/admin-utilities/delete-receiving');
    return result;
  } catch (error) {
    console.error('Error unposting receiving entry:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteReceivingEntryAction(referenceNo, deleterName, isAdmin) {
  try {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Only administrators can delete receiving entries' };
    }

    // Check if the entry exists
    const entry = await AdminUtilities.getReceivingEntryByNumber(referenceNo);
    if (!entry) {
      return { success: false, error: 'Receiving entry not found' };
    }

    const result = await AdminUtilities.deleteReceivingEntry(referenceNo, deleterName);
    revalidatePath('/admin-utilities/delete-receiving');
    return result;
  } catch (error) {
    console.error('Error deleting receiving entry:', error);
    return { success: false, error: error.message };
  }
}