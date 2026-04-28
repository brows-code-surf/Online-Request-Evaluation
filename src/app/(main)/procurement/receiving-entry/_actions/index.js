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

// Check if user has RR Distribution of Account authorization
export async function checkUserHasRRAuthorization(userName) {
  try {
    const USERACCESS = (await import('@/models/UserAccess.js')).default;
    const authorizations = await USERACCESS.getAuthorizationUsersForUser(userName);
    const hasAuthorization = authorizations.some(auth =>
      auth.ACTION === 'RR Distribution of Account' &&
      (auth.ACTIVE === 1 || auth.ACTIVE === '1' || auth.ACTIVE === true)
    );
    return {
      success: true,
      hasAuthorization
    };
  } catch (error) {
    console.error('Error checking RR authorization:', error);
    return {
      success: false,
      hasAuthorization: false,
      message: 'Failed to check authorization: ' + error.message
    };
  }
}

// Get distribution accounts
export async function getDistributionAccounts() {
  try {
    const { connectToDatabase } = await import('@/lib/db.js');

    const connection = await connectToDatabase(process.env.DB_SFC);

    const query = `
      SELECT ROWID, ACCTNO, ACCTNAME, ACTIVE
      FROM [SETTINGS.DISTRIBUTION.ACCOUNTS.1]
      WHERE ACTIVE = 1
      ORDER BY ACCTNAME
    `;

    const result = await connection.request().query(query);
    return {
      success: true,
      accounts: result.recordset.map(record => ({
        id: record.ROWID,
        acctNo: record.ACCTNO,
        acctName: record.ACCTNAME,
        active: record.ACTIVE
      }))
    };
  } catch (error) {
    console.error('Error fetching distribution accounts:', error);
    return {
      success: false,
      accounts: [],
      message: 'Failed to fetch accounts: ' + error.message
    };
  }
}

// Save distributions
export async function saveDistributions(referenceNo, distributions, ewt, userName) {
  try {
    const DistributionOfAccounts = (await import('@/models/DistributionOfAccounts.js')).default;
    const result = await DistributionOfAccounts.saveDistributions(referenceNo, distributions, ewt, userName);
    return result;
  } catch (error) {
    console.error('Error saving distributions:', error);
    return {
      success: false,
      message: 'Failed to save distributions: ' + error.message
    };
  }
}

// Update distributions
export async function updateDistributions(referenceNo, distributions, ewt, userName) {
  try {
    const DistributionOfAccounts = (await import('@/models/DistributionOfAccounts.js')).default;
    const result = await DistributionOfAccounts.updateDistributions(referenceNo, distributions, ewt, userName);
    return result;
  } catch (error) {
    console.error('Error updating distributions:', error);
    return {
      success: false,
      message: 'Failed to update distributions: ' + error.message
    };
  }
}

// Post distributions
export async function postDistributions(referenceNo, userName) {
  try {
    const DistributionOfAccounts = (await import('@/models/DistributionOfAccounts.js')).default;
    const result = await DistributionOfAccounts.postDistributions(referenceNo, userName);
    return result;
  } catch (error) {
    console.error('Error posting distributions:', error);
    return {
      success: false,
      message: 'Failed to post distributions: ' + error.message
    };
  }
}

export async function postReceivingEntryWithNotifications(receivingNumber, posterName) {
  try {
    const result = await ReceivingEntry.postReceivingEntry(receivingNumber, posterName);

    if (result.success) {
      // Send notifications and emails to all authorization users
      try {
        const USERACCESS = (await import('@/models/UserAccess.js')).default;
        const { Notification } = await import('@/models/Notification.js');
        // const { sendEmailWithTemplate } = await import('@/utils/emailService.js');
        const { connectToDatabase } = await import('@/lib/db.js');

        const authorizationUsers = await USERACCESS.getAllAuthorizationUsers();
        console.log('Sending notifications to authorization users:', authorizationUsers.length);

        for (const authUser of authorizationUsers) {
          if (authUser.ACTIVE === 1) {
            try {
              // Get email for the user
              const connection = await connectToDatabase();
              const query = `SELECT EMAIL FROM [SYSTEM.USERACCOUNT.1] WHERE EMPLOYEENAME = @employeeName`;
              const emailResult = await connection.request()
                .input('employeeName', authUser.NAME)
                .query(query);
              const userEmail = emailResult.recordset.length > 0 ? emailResult.recordset[0].EMAIL : null;

              if (userEmail) {
                // Create in-app notification
                const notification = new Notification(
                  'Receiving Entry Posted',
                  `Receiving entry ${receivingNumber} has been posted by ${posterName}, and is now ready for Distribution of Accounts.`,
                  authUser.NAME,
                  `/procurement/receiving-entry`
                );
                await notification.save(posterName);

                // Send email notification
                // const emailData = {
                //   email: userEmail,
                //   subject: 'Receiving Entry Posted Notification',
                //   title: 'Receiving Entry Posted',
                //   companyName: 'SANTEH',
                //   greeting: 'Hello',
                //   name: authUser.NAME,
                //   body: `Receiving entry ${receivingNumber} has been posted by ${posterName}. Please review the entry for Distribution of Accounts.`,
                //   buttonText: 'View Entry',
                //   buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/procurement/receiving-entry`,
                //   companyEmail: 'jcvalencia@santehfeeds.com',
                //   companyPhone: '+1-234-567-8900',
                //   unsubscribeUrl: '#',
                //   preferencesUrl: '#'
                // };
                // await sendEmailWithTemplate(emailData);
              }
            } catch (userError) {
              console.error(`Error sending notification/email to ${authUser.NAME}:`, userError);
            }
          }
        }
      } catch (notificationError) {
        console.error('Error sending notifications/emails:', notificationError);
        // Don't fail the posting if notifications fail
      }

      return { success: true, message: result.message };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error posting receiving entry:', error);
    return { success: false, message: error.message };
  }
}

// Delete distributions for a reference number
export async function deleteDistributions(referenceNo, userName) {
  try {
    const DistributionOfAccounts = (await import('@/models/DistributionOfAccounts.js')).default;
    const result = await DistributionOfAccounts.deleteDistributions(referenceNo, userName);

    return {
      success: true,
      message: 'Distributions deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting distributions:', error);
    return {
      success: false,
      message: 'Failed to delete distributions: ' + error.message
    };
  }
}

// Get distributions by reference number
export async function getDistributionsByReferenceNo(referenceNo) {
  try {
    const DistributionOfAccounts = (await import('@/models/DistributionOfAccounts.js')).default;
    const distributions = await DistributionOfAccounts.getDistributionsByReferenceNo(referenceNo);
    return {
      success: true,
      distributions
    };
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return {
      success: false,
      distributions: [],
      message: 'Failed to fetch distributions: ' + error.message
    };
  }
}