'use server';

import ReceivingEntry from '@/models/ReceivingEntry';
import DistributionOfAccounts from '@/models/DistributionOfAccounts';
import AdminUtilities from '@/models/AdminUtilities';

export async function getReceivingEntriesWithDA(filters = {}, user, isAdmin) {
  try {
    // Fetch posted receiving entries with DA
    const entries = await ReceivingEntry.getAllReceivingEntries({ ...filters, postStatus: 1 }, user, isAdmin);
    // Filter for those with hasDA
    const withDA = entries.filter(entry => entry.hasDA);
    return { success: true, data: withDA };
  } catch (error) {
    console.error('Error fetching receiving entries with DA:', error);
    return { success: false, error: error.message };
  }
}

export async function getReceivingEntryDetails(referenceNo, user, isAdmin) {
  try {
    const details = await ReceivingEntry.getReceivingEntryByNumber(referenceNo, user, isAdmin);
    return { success: true, data: details };
  } catch (error) {
    console.error('Error fetching receiving entry details:', error);
    return { success: false, error: error.message };
  }
}

export async function getDistributionAccounts(referenceNo) {
  try {
    const distributions = await DistributionOfAccounts.getDistributionsByReferenceNo(referenceNo);
    return { success: true, data: distributions };
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return { success: false, error: error.message };
  }
}

export async function unpostDistributionAccounts(referenceNo, userName) {
  try {
    const result = await AdminUtilities.unpostDistributions(referenceNo, userName);
    return result;
  } catch (error) {
    console.error('Error unposting distributions:', error);
    return { success: false, error: error.message };
  }
}