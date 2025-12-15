'use server';

import PurchaseRequest from '@/models/PurchaseRequest.js';
import UserProfile from '@/models/UserProfile.js';
import Notification from '@/models/Notification.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';

export async function getAllPurchaseRequests(filters = {}, user = null) {
  try {
    const purchaseRequests = await PurchaseRequest.getAllPurchaseRequests(filters, user);
    return { success: true, purchaseRequests };
  } catch (error) {
    console.error('Error getting purchase requests:', error);
    return { success: false, message: 'Failed to fetch purchase requests' };
  }
}

export async function getPurchaseRequestByReferenceNo(referenceNo, user = null) {
  try {
    const purchaseRequest = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo, user);
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
    if (!headerData.reviewer || !headerData.reviewer.trim()) {
      return { success: false, message: 'Reviewer is required' };
    }
    if (!headerData.approver || !headerData.approver.trim()) {
      return { success: false, message: 'Approver is required' };
    }
    if (!headerData.addressedTo || !headerData.addressedTo.trim()) {
      return { success: false, message: 'Addressed to is required' };
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
      if (!detail.budgetName || !detail.budgetName.trim()) {
        return { success: false, message: 'Budget name is required for all items' };
      }
      if (!detail.dateNeeded) {
        return { success: false, message: 'Date needed is required for all items' };
      }
    }

    const referenceNo = await PurchaseRequest.createPurchaseRequest(headerData, detailsData, creatorName);

    // Send notifications asynchronously
    notifyReviewersOfNewPR(referenceNo, headerData, detailsData, creatorName).catch(notificationError => {
      console.error('Error sending reviewer notifications:', notificationError);
    });

    return { success: true, referenceNo, message: 'Purchase request created successfully' };
  } catch (error) {
    console.error('Error creating purchase request:', error);
    return { success: false, message: 'Failed to create purchase request' };
  }
}

export async function reviewPurchaseRequest(referenceNo, userName) {
  try {
    // Check if user is the assigned reviewer
    const pr = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo, { empName: userName });
    if (pr.header.reviewer.toUpperCase() !== userName.toUpperCase()) {
      return { success: false, message: 'You are not authorized to review this purchase request' };
    }

    const success = await PurchaseRequest.updatePurchaseRequestStatus(referenceNo, 'review', userName);

    if (success) {
      // Notify approver
      notifyApproverOfReviewedPR(referenceNo, pr, userName).catch(notificationError => {
        console.error('Error sending approver notification:', notificationError);
      });

      return { success: true, message: 'Purchase request reviewed successfully' };
    } else {
      return { success: false, message: 'Failed to review purchase request' };
    }
  } catch (error) {
    console.error('Error reviewing purchase request:', error);
    return { success: false, message: 'Failed to review purchase request' };
  }
}

export async function approvePurchaseRequest(referenceNo, userName) {
  try {
    // Check if user is the assigned approver
    const pr = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo, { empName: userName });
    if (pr.header.approver.toUpperCase() !== userName.toUpperCase()) {
      return { success: false, message: 'You are not authorized to approve this purchase request' };
    }

    const success = await PurchaseRequest.updatePurchaseRequestStatus(referenceNo, 'approve', userName);

    if (success) {
      // Notify receiver
      notifyReceiverOfApprovedPR(referenceNo, pr, userName).catch(notificationError => {
        console.error('Error sending receiver notification:', notificationError);
      });

      return { success: true, message: 'Purchase request approved successfully' };
    } else {
      return { success: false, message: 'Failed to approve purchase request' };
    }
  } catch (error) {
    console.error('Error approving purchase request:', error);
    return { success: false, message: 'Failed to approve purchase request' };
  }
}

export async function receivePurchaseRequest(referenceNo, userName) {
  try {
    // Check if user is the assigned receiver
    const pr = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo, { empName: userName });
    if (pr.header.addressedTo.toUpperCase() !== userName.toUpperCase()) {
      return { success: false, message: 'You are not authorized to receive this purchase request' };
    }

    const success = await PurchaseRequest.updatePurchaseRequestStatus(referenceNo, 'receive', userName);

    if (success) {
      // Notify requester
      notifyRequesterOfReceivedPR(referenceNo, pr, userName).catch(notificationError => {
        console.error('Error sending requester notification:', notificationError);
      });

      return { success: true, message: 'Purchase request received successfully' };
    } else {
      return { success: false, message: 'Failed to receive purchase request' };
    }
  } catch (error) {
    console.error('Error receiving purchase request:', error);
    return { success: false, message: 'Failed to receive purchase request' };
  }
}

export async function rejectPurchaseRequest(referenceNo, userName, reason) {
  try {
    // Check if user has permission to reject (reviewer or approver)
    const pr = await PurchaseRequest.getPurchaseRequestByReferenceNo(referenceNo, { empName: userName });
    const canReject = pr.header.reviewer.toUpperCase() === userName.toUpperCase() ||
                     pr.header.approver.toUpperCase() === userName.toUpperCase();

    if (!canReject) {
      return { success: false, message: 'You are not authorized to reject this purchase request' };
    }

    const success = await PurchaseRequest.updatePurchaseRequestStatus(referenceNo, 'reject', userName, reason);

    if (success) {
      // Notify requester of rejection
      notifyRequesterOfRejectedPR(referenceNo, pr, userName, reason).catch(notificationError => {
        console.error('Error sending rejection notification:', notificationError);
      });

      return { success: true, message: 'Purchase request rejected successfully' };
    } else {
      return { success: false, message: 'Failed to reject purchase request' };
    }
  } catch (error) {
    console.error('Error rejecting purchase request:', error);
    return { success: false, message: 'Failed to reject purchase request' };
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
        greeting: `Hello ${reviewerUser.empName}`,
        name: reviewerUser.empName,
        body: `A new purchase request has been created and requires your review.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${headerData.company}<br>
              <strong>Request Type:</strong> ${headerData.requestType}<br>
              <strong>Created by:</strong> ${creatorName}<br>
              <strong>Items:</strong> ${detailsData.length}<br><br>
              Please review this request as soon as possible.`,
        buttonText: 'Review Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-request`,
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
        '/purchase-request'
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
        greeting: `Hello ${approverUser.empName}`,
        name: approverUser.empName,
        body: `Purchase request ${referenceNo} has been reviewed by ${reviewerName} and now requires your approval.<br><br>
              <strong>Reference No:</strong> ${referenceNo}<br>
              <strong>Company:</strong> ${pr.header.company}<br>
              <strong>Request Type:</strong> ${pr.header.requestType}<br><br>
              Please review and approve this request.`,
        buttonText: 'Approve Request',
        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-request`,
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
        '/purchase-request'
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
        greeting: `Hello ${receiverUser.empName}`,
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
        greeting: `Hello ${requesterUser.empName}`,
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
        greeting: `Hello ${requesterUser.empName}`,
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
