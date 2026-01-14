'use server';

import PurchaseRequest from '@/models/PurchaseRequest.js';
import Budget from '@/models/Budget.js';
import UserProfile from '@/models/UserProfile.js';
import Notification from '@/models/Notification.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';

export async function getAllPurchaseRequests(filters = {}, user = null, isAdmin = false) {
  try {
    const purchaseRequests = await PurchaseRequest.getAllPurchaseRequests(filters, user, isAdmin);
    return { success: true, purchaseRequests };
  } catch (error) {
    console.error('Error getting purchase requests:', error);
    return { success: false, message: 'Failed to fetch purchase requests' };
  }
}

// Validate names in PURCHASE.REQUESTHEADER.1 fields
async function validatePurchaseRequestNames(headerData) {
  try {
    // Get filtered users (excluding Production Rank & File and Union Members)
    const usersResult = await getFilteredUsersForPurchaseRequest();
    if (!usersResult.success) {
      return { success: false, message: 'Failed to fetch users for validation' };
    }

    const validUsers = usersResult.data;
    const validUserNames = validUsers.map(user => user.empName.toUpperCase());

    // Validate requestedBy (optional field)
    if (headerData.requestedBy && headerData.requestedBy.trim()) {
      if (!validUserNames.includes(headerData.requestedBy.trim().toUpperCase())) {
        return { success: false, message: `Requested by "${headerData.requestedBy}" is not a valid user` };
      }
    }

    // Validate reviewer (optional field)
    if (headerData.reviewer && headerData.reviewer.trim()) {
      if (!validUserNames.includes(headerData.reviewer.trim().toUpperCase())) {
        return { success: false, message: `Reviewer "${headerData.reviewer}" is not a valid user` };
      }
    }

    // Validate approver (required field)
    if (headerData.approver && headerData.approver.trim()) {
      if (!validUserNames.includes(headerData.approver.trim().toUpperCase())) {
        return { success: false, message: `Approver "${headerData.approver}" is not a valid user` };
      }
    }

    // Validate addressedTo (required field)
    if (headerData.addressedTo && headerData.addressedTo.trim()) {
      if (!validUserNames.includes(headerData.addressedTo.trim().toUpperCase())) {
        return { success: false, message: `Addressed to "${headerData.addressedTo}" is not a valid user` };
      }
    }

    // Validate createdBy (optional field)
    if (headerData.createdBy && headerData.createdBy.trim()) {
      if (!validUserNames.includes(headerData.createdBy.trim().toUpperCase())) {
        return { success: false, message: `Created by "${headerData.createdBy}" is not a valid user` };
      }
    }

    // Validate postedBy (optional field)
    if (headerData.postedBy && headerData.postedBy.trim()) {
      if (!validUserNames.includes(headerData.postedBy.trim().toUpperCase())) {
        return { success: false, message: `Posted by "${headerData.postedBy}" is not a valid user` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error validating purchase request names:', error);
    return { success: false, message: 'Failed to validate user names' };
  }
}

export async function getPurchaseRequestByReferenceNo(referenceNo, user = null, isAdmin = false) {
  try {
    const purchaseRequest = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo, user, isAdmin);
    return { success: true, purchaseRequest };
  } catch (error) {
    console.error('Error getting purchase request:', error);
    return { success: false, message: 'Failed to fetch purchase request' };
  }
}

export async function createPurchaseRequest(headerData, detailsData, creatorName) {
  try {
    // Validate required fields
    if (!headerData.company || !headerData.company.trim()) {
      return { success: false, message: 'Company is required' };
    }
    if (!headerData.requestType || !headerData.requestType.trim()) {
      return { success: false, message: 'Request type is required' };
    }
    if (!headerData.locationCode || !headerData.locationCode.trim()) {
      return { success: false, message: 'Location code is required' };
    }
    // if (!headerData.reviewer || !headerData.reviewer.trim()) {
    //   return { success: false, message: 'Reviewer is required' };
    // }
    if (!headerData.approver || !headerData.approver.trim()) {
      return { success: false, message: 'Approver is required' };
    }
    if (!headerData.addressedTo || !headerData.addressedTo.trim()) {
      return { success: false, message: 'Addressed to is required' };
    }

    // Validate names in header fields
    const nameValidation = await validatePurchaseRequestNames(headerData);
    if (!nameValidation.success) {
      return nameValidation;
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
      if (!detail.dateNeeded) {
        return { success: false, message: 'Date needed is required for all items' };
      }
    }

    const result = await PurchaseRequest.createPurchaseRequest(headerData, detailsData, creatorName);

    // Note: Notifications are no longer sent here - they will be sent when the request is posted

    return {
        success: true,
        referenceNo: result.referenceNo,
        referenceNumberChanged: result.referenceNumberChanged,
        originalReferenceNo: result.originalReferenceNo,
        message: 'Purchase request created successfully'
    };
  } catch (error) {
    console.error('Error creating purchase request:', error);
    return { success: false, message: 'Failed to create purchase request' };
  }
}

export async function postPurchaseRequest(referenceNo, posterName) {
  try {
    const result = await PurchaseRequest.postPurchaseRequest(referenceNo, posterName);

    if (result.success) {
      // Emit real-time event for request-evaluation page
      broadcastRequestEvaluationUpdate("purchase-request-posted", {
        referenceNo: referenceNo,
        posterName: posterName,
        newStatus: result.newStatus,
        timestamp: new Date().toISOString()
      });

      // Send notifications asynchronously after posting
      const pr = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo);
      if (pr) {
        // Check if reviewer is specified
        if (pr.header.reviewer && pr.header.reviewer.trim()) {
          // Reviewer exists, send to reviewer first
          notifyReviewersOfNewPR(referenceNo, pr.header, pr.details, pr.header.createdBy).catch(notificationError => {
            console.error('Error sending reviewer notifications:', notificationError);
          });
        } else {
          // No reviewer specified, send directly to approver
          notifyApproversOfNewPR(referenceNo, pr.header, pr.details, pr.header.createdBy).catch(notificationError => {
            console.error('Error sending approver notifications:', notificationError);
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error posting purchase request:', error);
    return { success: false, message: 'Failed to post purchase request' };
  }
}

export async function updatePurchaseRequest(referenceNo, headerData, detailsData, updaterName) {
  try {
    // Validate names in header fields during update
    const nameValidation = await validatePurchaseRequestNames(headerData);
    if (!nameValidation.success) {
      return nameValidation;
    }

    const result = await PurchaseRequest.updatePurchaseRequest(referenceNo, headerData, detailsData, updaterName);
    return result;
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return { success: false, message: 'Failed to update purchase request' };
  }
}

export async function cancelPurchaseRequest(referenceNo, cancellerName, cancelReason = '') {
  try {
    const result = await PurchaseRequest.cancelPurchaseRequest(referenceNo, cancellerName, cancelReason);
    return result;
  } catch (error) {
    console.error('Error canceling purchase request:', error);
    return { success: false, message: 'Failed to cancel purchase request' };
  }
}

export async function getPurchaseRequestStats(user = null) {
  try {
    const stats = await PurchaseRequest.getPurchaseRequestStats(user);
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting purchase request stats:', error);
    return { success: false, message: 'Failed to fetch purchase request stats' };
  }
}

export async function getNextReferenceNumber() {
  try {
    const referenceNo = await PurchaseRequest.getNextReferenceNumber();
    return { success: true, referenceNo };
  } catch (error) {
    console.error('Error getting next reference number:', error);
    return { success: false, message: 'Failed to generate reference number' };
  }
}

export async function generateItemNumber(itemDescription) {
  try {
    const itemNumber = await PurchaseRequest.generateItemNumber(itemDescription);
    return { success: true, itemNumber };
  } catch (error) {
    console.error('Error generating item number:', error);
    return { success: false, message: 'Failed to generate item number' };
  }
}

export async function getFilteredUsersForPurchaseRequest() {
  try {
    const users = await UserProfile.getAllUsers();
    // Filter out users with job level "Production Rank & File" or "Union Members"
    const filteredUsers = users.filter(user =>
      user.jobLevel !== 'Production Rank & File' &&
      user.jobLevel !== 'Union Members'
    );

    return {
      success: true,
      data: filteredUsers.map(user => ({
        empName: user.empName,
        email: user.email
      }))
    };
  } catch (error) {
    console.error('Error fetching filtered users:', error);
    return {
      success: false,
      message: 'Failed to fetch users'
    };
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

// Notification helper functions
async function notifyReviewersOfNewPR(referenceNo, headerData, detailsData, creatorName) {
  try {
    // Get reviewer user details
    const allUsers = await UserProfile.getAllUsers();
    const reviewerUser = allUsers.find(user => user.empName.toUpperCase() === headerData.reviewer.toUpperCase());

    if (reviewerUser) {
      // Send email
      const emailData = {
        email: reviewerUser.email,
        subject: `New Purchase Request ${referenceNo} Requires Review`,
        title: `Purchase Request ${referenceNo}`,
        companyName: 'SANTEH',
        greeting: `Hello `,
        name: reviewerUser.empName,
        body: `A new purchase request has been created and requires your review.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${headerData.company}<br>
              <strong>Request Type:</strong> ${headerData.requestType}<br>
              <strong>Created by:</strong> ${creatorName}<br>
              <strong>Items:</strong> ${detailsData.length}<br><br>
              Please review this request as soon as possible.`,
        buttonText: 'Review Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?id=${referenceNo}`,
        companyEmail: 'support@santeh.com',
        companyPhone: '+1 (555) 123-4567',
        unsubscribeUrl: '#',
        preferencesUrl: '#'
      };

      await sendEmailWithTemplate(emailData);

      // Send notification
      const notification = new Notification(
        'New Purchase Request Review',
        `Purchase Request ${referenceNo} created by ${creatorName} requires your review`,
        reviewerUser.empName,
        `/procurement/request-evaluation?id=${referenceNo}`
      );

      await notification.save(creatorName);
    }
  } catch (error) {
    console.error('Error notifying reviewer:', error);
    throw error;
  }
}

async function notifyApproverOfReviewedPR(referenceNo, pr, reviewerName) {
  try {
    const allUsers = await UserProfile.getAllUsers();
    const approverUser = allUsers.find(user => user.empName.toUpperCase() === pr.header.approver.toUpperCase());

    if (approverUser) {
      const emailData = {
        email: approverUser.email,
        subject: `Purchase Request ${referenceNo} Reviewed - Approval Required`,
        title: `Purchase Request ${referenceNo}`,
        companyName: 'SANTEH',
        greeting: `Hello `,
        name: approverUser.empName,
        body: `Purchase request ${referenceNo} has been reviewed by ${reviewerName} and now requires your approval.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${pr.header.company}<br>
              <strong>Request Type:</strong> ${pr.header.requestType}<br><br>
              Please review and approve this request.`,
        buttonText: 'Approve Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?id=${referenceNo}`,
        companyEmail: 'support@santeh.com',
        companyPhone: '+1 (555) 123-4567',
        unsubscribeUrl: '#',
        preferencesUrl: '#'
      };

      await sendEmailWithTemplate(emailData);

      const notification = new Notification(
        'Purchase Request Approval',
        `Purchase Request ${referenceNo} reviewed by ${reviewerName} - requires your approval`,
        approverUser.empName,
        `/procurement/request-evaluation?id=${referenceNo}`
      );

      await notification.save(reviewerName);
    }
  } catch (error) {
    console.error('Error notifying approver:', error);
    throw error;
  }
}

async function notifyReceiverOfApprovedPR(referenceNo, pr, approverName) {
  try {
    const allUsers = await UserProfile.getAllUsers();
    const receiverUser = allUsers.find(user => user.empName.toUpperCase() === pr.header.addressedTo.toUpperCase());

    if (receiverUser) {
      const emailData = {
        email: receiverUser.email,
        subject: `Purchase Request ${referenceNo} Approved - Action Required`,
        title: `Purchase Request ${referenceNo}`,
        companyName: 'SANTEH',
        greeting: `Hello `,
        name: receiverUser.empName,
        body: `Purchase request ${referenceNo} has been approved by ${approverName} and is now ready for processing.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${pr.header.company}<br>
              <strong>Request Type:</strong> ${pr.header.requestType}<br><br>
              Please process this purchase request.`,
        buttonText: 'Process Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-request`,
        companyEmail: 'support@santeh.com',
        companyPhone: '+1 (555) 123-4567',
        unsubscribeUrl: '#',
        preferencesUrl: '#'
      };

      await sendEmailWithTemplate(emailData);

      const notification = new Notification(
        'Purchase Request Processing',
        `Purchase Request ${referenceNo} approved by ${approverName} - requires processing`,
        receiverUser.empName,
        '/purchase-request'
      );

      await notification.save(approverName);
    }
  } catch (error) {
    console.error('Error notifying receiver:', error);
    throw error;
  }
}

async function notifyRequesterOfReceivedPR(referenceNo, pr, receiverName) {
  try {
    const allUsers = await UserProfile.getAllUsers();
    const requesterUser = allUsers.find(user => user.empName.toUpperCase() === pr.header.createdBy.toUpperCase());

    if (requesterUser) {
      const emailData = {
        email: requesterUser.email,
        subject: `Purchase Request ${referenceNo} Completed`,
        title: `Purchase Request ${referenceNo}`,
        companyName: 'SANTEH',
        greeting: `Hello `,
        name: requesterUser.empName,
        body: `Your purchase request ${referenceNo} has been completed and received by ${receiverName}.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${pr.header.company}<br>
              <strong>Request Type:</strong> ${pr.header.requestType}<br><br>
              The request has been successfully processed.`,
        buttonText: 'View Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-request`,
        companyEmail: 'support@santeh.com',
        companyPhone: '+1 (555) 123-4567',
        unsubscribeUrl: '#',
        preferencesUrl: '#'
      };

      await sendEmailWithTemplate(emailData);

      const notification = new Notification(
        'Purchase Request Completed',
        `Your Purchase Request ${referenceNo} has been completed and received by ${receiverName}`,
        requesterUser.empName,
        '/purchase-request'
      );

      await notification.save(receiverName);
    }
  } catch (error) {
    console.error('Error notifying requester:', error);
    throw error;
  }
}

async function notifyRequesterOfRejectedPR(referenceNo, pr, rejectorName, reason) {
  try {
    const allUsers = await UserProfile.getAllUsers();
    const requesterUser = allUsers.find(user => user.empName.toUpperCase() === pr.header.createdBy.toUpperCase());

    if (requesterUser) {
      const emailData = {
        email: requesterUser.email,
        subject: `Purchase Request ${referenceNo} Rejected`,
        title: `Purchase Request ${referenceNo}`,
        companyName: 'SANTEH',
        greeting: `Hello `,
        name: requesterUser.empName,
        body: `Your purchase request ${referenceNo} has been rejected by ${rejectorName}.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${pr.header.company}<br>
              <strong>Request Type:</strong> ${pr.header.requestType}<br>
              <strong>Reason:</strong> ${reason || 'No reason provided'}<br><br>
              Please review the rejection reason and resubmit if necessary.`,
        buttonText: 'View Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-request`,
        companyEmail: 'support@santeh.com',
        companyPhone: '+1 (555) 123-4567',
        unsubscribeUrl: '#',
        preferencesUrl: '#'
      };

      await sendEmailWithTemplate(emailData);

      const notification = new Notification(
        'Purchase Request Rejected',
        `Your Purchase Request ${referenceNo} has been rejected by ${rejectorName}`,
        requesterUser.empName,
        '/purchase-request'
      );

      await notification.save(rejectorName);
    }
  } catch (error) {
    console.error('Error notifying requester of rejection:', error);
    throw error;
  }
}

async function notifyApproversOfNewPR(referenceNo, headerData, detailsData, creatorName) {
  try {
    // Get approver user details
    const allUsers = await UserProfile.getAllUsers();
    const approverUser = allUsers.find(user => user.empName.toUpperCase() === headerData.approver.toUpperCase());

    if (approverUser) {
      // Send email
      const emailData = {
        email: approverUser.email,
        subject: `New Purchase Request ${referenceNo} Requires Approval`,
        title: `Purchase Request ${referenceNo}`,
        companyName: 'SANTEH',
        greeting: `Hello `,
        name: approverUser.empName,
        body: `A new purchase request has been created and requires your approval.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${headerData.company}<br>
              <strong>Request Type:</strong> ${headerData.requestType}<br>
              <strong>Created by:</strong> ${creatorName}<br>
              <strong>Items:</strong> ${detailsData.length}<br><br>
              Please review and approve this request as soon as possible.`,
        buttonText: 'Review Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?id=${referenceNo}`,
        companyEmail: 'support@santeh.com',
        companyPhone: '+1 (555) 123-4567',
        unsubscribeUrl: '#',
        preferencesUrl: '#'
      };

      await sendEmailWithTemplate(emailData);

      // Send notification
      const notification = new Notification(
        'New Purchase Request Approval',
        `Purchase Request ${referenceNo} created by ${creatorName} requires your approval`,
        approverUser.empName,
        `/procurement/request-evaluation?id=${referenceNo}`
      );

      await notification.save(creatorName);
    }
  } catch (error) {
    console.error('Error notifying approver:', error);
    throw error;
  }
}
