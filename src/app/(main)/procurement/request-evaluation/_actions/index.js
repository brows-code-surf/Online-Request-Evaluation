'use server';

import RequestEvaluation from '@/models/RequestEvaluation';
import UserProfile from '@/models/UserProfile';
import Notification from '@/models/Notification';
import { ActivityLogs } from '@/models/ActivityLogs';
import { sendEmailWithTemplate } from '@/utils/emailService';
import { broadcastRequestEvaluationUpdate, broadcastDashboardUpdate } from '@/lib/socketBroadcast';

//#region PURCHASE REQUEST ACTIONS
export async function fetchEvaluationLeftPanel(requesterName, requestStatus, filters = {}, isAdmin = false) {
    try {
        const requests = await RequestEvaluation.getEvaluationsLeftPanel(requesterName, requestStatus, filters, isAdmin);
        return requests;
    } catch (error) {
        console.error('Error fetching requests:', error);
        throw error;
    }
}

export async function fetchEvaluationDetails(referenceNo) {
    try {
        const details = await RequestEvaluation.getEvaluationDetails(referenceNo);
        return details;
    } catch (error) {
        console.error('Error fetching evaluation details:', error);
        throw error;
    }
}

export async function approveEvaluation(referenceNo, approverName, currentStatus) {
    try {
        const result = await RequestEvaluation.updateApprovedEvaluation(referenceNo, approverName, currentStatus);

        if (result.headerUpdated) {
            // Log activity with detailed workflow information
            try {
                // Get request details to identify workflow participants
                const requestDetails = await RequestEvaluation.getEvaluationDetails(referenceNo);
                let personBefore = 'Unknown';
                let recipient = 'Unknown';

                if (requestDetails.length > 0) {
                    const request = requestDetails[0];

                    // Determine who sent it to this approver (person before)
                    if (currentStatus === 'FOR CONFIRMATION') {
                        personBefore = request.requestedBy || 'Requester';
                    } else if (currentStatus === 'FOR REQUEST APPROVAL') {
                        personBefore = request.reviewer || 'Reviewer';
                    } else if (currentStatus === 'FOR PURCHASING LEAD TIME') {
                        personBefore = request.approver || 'Approver';
                    }

                    // Determine who will receive it next (recipient)
                    if (result.newStatus === 'FOR REQUEST APPROVAL') {
                        recipient = request.approver || 'Approver';
                    } else if (result.newStatus === 'FOR PURCHASING LEAD TIME') {
                        recipient = request.addressedTo || 'Purchasing Lead';
                    } else if (result.newStatus === 'FOR CANVASSING') {
                        recipient = 'Canvassing Team';
                    }
                }

                const activityMessage = `Approved request ${referenceNo} from ${currentStatus} to ${result.newStatus}. From: ${personBefore} → To: ${recipient}`;
                await ActivityLogs.saveActivity(activityMessage, approverName);
                console.log('Activity logged for approval:', activityMessage);
            } catch (logError) {
                console.error('Error logging approval activity:', logError);
                // Fallback to simple logging
                const fallbackMessage = `Approved request ${referenceNo} from status ${currentStatus}`;
                await ActivityLogs.saveActivity(fallbackMessage, approverName);
            }

            // Send email notification for next approver
            console.log('Starting email notification process for referenceNo:', referenceNo, 'currentStatus:', currentStatus);
            try {
                if (currentStatus === 'FOR CONFIRMATION' || currentStatus === 'FOR REQUEST APPROVAL') {
                    const approverData = await RequestEvaluation.getRequestApproversEmails(referenceNo, currentStatus);
                    console.log('Approver data:', approverData);

                    if (approverData) {
                        const recipientEmail = approverData.EMAIL;
                        const recipientName = approverData.EMPLOYEENAME;
                        let subject = '';
                        let body = '';
                        let notificationTitle = '';
                        let notificationDescription = '';

                        if (currentStatus === 'FOR CONFIRMATION') {
                            subject = 'Request Approved - Waiting for Your Approval';
                            body = `The request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been confirmed and is now waiting for your approval. Please review and approve the request at your earliest convenience.`;
                            notificationTitle = 'Request Approved - Waiting for Your Approval';
                            notificationDescription = `The request ${referenceNo} has been confirmed and is now waiting for your approval.`;
                        } else if (currentStatus === 'FOR REQUEST APPROVAL') {
                            subject = 'Request Approved - Ready for Lead Time Review';
                            body = `The request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been approved and is now ready for purchasing lead time review. Please check the request details and proceed with the canvassing process.`;
                            notificationTitle = 'Request Approved - Ready for Lead Time Review';
                            notificationDescription = `The request ${referenceNo} has been approved and is now ready for purchasing lead time review.`;
                        }

                        console.log('Recipient name:', recipientName, 'Recipient email:', recipientEmail);
                        if (recipientEmail) {
                            const emailData = {
                                email: recipientEmail,
                                name: recipientName,
                                subject: subject,
                                companyName: 'SANTEH',
                                greeting: 'Dear',
                                body: body,
                                buttonText: 'View Request',
                                buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?ref=${referenceNo}`,
                                companyEmail: 'j.valencia@santehfeeds.com',
                                companyPhone: '+63 2 8584 4572',
                                unsubscribeUrl: '#',
                                preferencesUrl: '#'
                            };
                            console.log('Sending email to:', recipientEmail);
                            await sendEmailWithTemplate(emailData);
                            console.log('Email sent successfully');
                        } else {
                            console.log('No email found for recipient:', recipientName);
                        }

                        // Create notification for the next approver
                        try {
                            const notification = new Notification(
                                notificationTitle,
                                notificationDescription,
                                recipientName,
                                `/procurement/request-evaluation?id=${referenceNo}`
                            );

                            await notification.save(approverName);
                            console.log('Notification created for next approver:', recipientName);
                        } catch (notificationError) {
                            console.error('Error creating notification:', notificationError);
                            // Don't throw error to avoid failing the approval process
                        }
                    } else {
                        console.log('No approver data found for status:', currentStatus);
                    }
            } else if (currentStatus === 'FOR PURCHASING LEAD TIME') {
                // Receiver approval - notify reviewer and approver that request is now processing
                console.log('Processing receiver approval - notifying reviewer and approver');
                try {
                    // Get request details to find reviewer and approver
                    const requestDetails = await RequestEvaluation.getEvaluationDetails(referenceNo);
                    if (requestDetails.length > 0) {
                        const request = requestDetails[0];
                        const reviewerName = request.REVIEWER;
                        const approverName = request.APPROVER;

                        console.log('Participants for receiver approval:', { reviewerName, approverName });

                        // Notify reviewer if exists
                        if (reviewerName && reviewerName.trim()) {
                            let reviewerEmail = null;
                            if (reviewerName.includes('@')) {
                                reviewerEmail = reviewerName;
                            } else {
                                reviewerEmail = await UserProfile.getEmailByEmployeeName(reviewerName);
                            }

                            if (reviewerEmail) {
                                const subject = 'Request Now Processing';
                                const body = `The request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been received by purchasing and is now processing.`;

                                const emailData = {
                                    email: reviewerEmail,
                                    name: reviewerName,
                                    subject: subject,
                                    companyName: 'SANTEH',
                                    greeting: 'Dear',
                                    body: body,
                                    buttonText: 'View Request',
                                    buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?ref=${referenceNo}`,
                                    companyEmail: 'noreply@santehfeeds.com',
                                    companyPhone: '+63 (02) 8-XXX-XXXX',
                                    unsubscribeUrl: '#',
                                    preferencesUrl: '#'
                                };
                                console.log('Sending processing notification to reviewer:', reviewerEmail);
                                await sendEmailWithTemplate(emailData);
                                console.log('Reviewer notification email sent successfully');

                                // Create notification for reviewer
                                try {
                                    const notification = new Notification(
                                        'Request Now Processing',
                                        `Request ${referenceNo} has been received and is now processing.`,
                                        reviewerName,
                                        `/procurement/request-evaluation?id=${referenceNo}`
                                    );
                                    await notification.save(approverName);
                                    console.log('Notification created for reviewer:', reviewerName);
                                } catch (notificationError) {
                                    console.error('Error creating reviewer notification:', notificationError);
                                }
                            }
                        }

                        // Notify approver if exists
                        if (approverName && approverName.trim()) {
                            let approverEmail = null;
                            if (approverName.includes('@')) {
                                approverEmail = approverName;
                            } else {
                                approverEmail = await UserProfile.getEmailByEmployeeName(approverName);
                            }

                            if (approverEmail) {
                                const subject = 'Request Now Processing';
                                const body = `The request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been received and is now processing.`;

                                const emailData = {
                                    email: approverEmail,
                                    name: approverName,
                                    subject: subject,
                                    companyName: 'SANTEH',
                                    greeting: 'Dear',
                                    body: body,
                                    buttonText: 'View Request',
                                    buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?ref=${referenceNo}`,
                                    companyEmail: 'noreply@santehfeeds.com',
                                    companyPhone: '+63 (02) 8-XXX-XXXX',
                                    unsubscribeUrl: '#',
                                    preferencesUrl: '#'
                                };
                                console.log('Sending processing notification to approver:', approverEmail);
                                await sendEmailWithTemplate(emailData);
                                console.log('Approver notification email sent successfully');

                                // Create notification for approver
                                try {
                                    const notification = new Notification(
                                        'Request Now Processing',
                                        `Request ${referenceNo} has been received and is now processing.`,
                                        approverName,
                                        `/procurement/request-evaluation?id=${referenceNo}`
                                    );
                                    await notification.save(approverName);
                                    console.log('Notification created for approver:', approverName);
                                } catch (notificationError) {
                                    console.error('Error creating approver notification:', notificationError);
                                }
                            }
                        }

                        // Notify requester if exists
                        const requesterName = request.REQUESTEDBY;
                        if (requesterName && requesterName.trim()) {
                            let requesterEmail = null;
                            if (requesterName.includes('@')) {
                                requesterEmail = requesterName;
                            } else {
                                requesterEmail = await UserProfile.getEmailByEmployeeName(requesterName);
                            }

                            if (requesterEmail) {
                                const subject = 'Your Request is Now Processing';
                                const body = `Your request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been received and is now processing.`;

                                const emailData = {
                                    email: requesterEmail,
                                    name: requesterName,
                                    subject: subject,
                                    companyName: 'SANTEH',
                                    greeting: 'Dear',
                                    body: body,
                                    buttonText: 'View Request',
                                    buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?ref=${referenceNo}`,
                                    companyEmail: 'noreply@santehfeeds.com',
                                    companyPhone: '+63 (02) 8-XXX-XXXX',
                                    unsubscribeUrl: '#',
                                    preferencesUrl: '#'
                                };
                                console.log('Sending processing notification to requester:', requesterEmail);
                                await sendEmailWithTemplate(emailData);
                                console.log('Requester notification email sent successfully');

                                // Create notification for requester
                                try {
                                    const notification = new Notification(
                                        'Your Request is Now Processing',
                                        `Your request ${referenceNo} has been received and is now processing.`,
                                        requesterName,
                                        `/procurement/request-evaluation?id=${referenceNo}`
                                    );
                                    await notification.save(approverName);
                                    console.log('Notification created for requester:', requesterName);
                                } catch (notificationError) {
                                    console.error('Error creating requester notification:', notificationError);
                                }
                            }
                        }
                    }
                } catch (emailError) {
                    console.error('Error sending receiver approval notifications:', emailError);
                }
            } else {
                console.log('Current status does not trigger email notification:', currentStatus);
            }
            } catch (emailError) {
                console.error('Error sending notification email:', emailError);
                // Don't throw error to avoid failing the approval process
            }

            // Trigger Pusher events to notify all users of the approval
            broadcastRequestEvaluationUpdate("request-approved", {
                referenceNo,
                approverName,
                newStatus: result.newStatus,
                timestamp: new Date().toISOString(),
            });

            broadcastRequestEvaluationUpdate("request-changed", {
                referenceNo,
                changeType: "approve",
                approverName,
                newStatus: result.newStatus,
                timestamp: new Date().toISOString(),
            });

            // Notify dashboard of stats update
            broadcastDashboardUpdate("stats-updated", {
                type: "request-approved",
                referenceNo,
                oldStatus: currentStatus,
                newStatus: result.newStatus,
                timestamp: new Date().toISOString(),
            });
        }

        return result;
    } catch (error) {
        console.error('Error approving evaluation:', error);
        throw error;
    }
}

export async function rejectEvaluation(referenceNo, approverName, rejectionReason) {
    try {
        // Get current status before rejection
        const currentStatus = await RequestEvaluation.getRequestStatus(referenceNo);
        const result = await RequestEvaluation.rejectApprovedEvaluation(referenceNo, approverName, rejectionReason);

        // Send email notification for rejection
        if (result.headerUpdated) {
            // Log activity with detailed workflow information
            try {
                // Get request details to identify workflow participants
                const requestDetails = await RequestEvaluation.getEvaluationDetails(referenceNo);
                let personBefore = 'Unknown';
                let recipient = 'Unknown';

                if (requestDetails.length > 0) {
                    const request = requestDetails[0];

                    // Determine who sent it to this approver (person before)
                    if (currentStatus === 'FOR CONFIRMATION') {
                        personBefore = request.requestedBy || 'Requester';
                    } else if (currentStatus === 'FOR REQUEST APPROVAL') {
                        personBefore = request.reviewer || 'Reviewer';
                    } else if (currentStatus === 'FOR PURCHASING LEAD TIME') {
                        personBefore = request.approver || 'Approver';
                    }

                    // For rejections, the recipient is typically the requester
                    recipient = request.requestedBy || 'Requester';
                }

                const activityMessage = `Rejected request ${referenceNo} from ${currentStatus}. From: ${personBefore} → Returned to: ${recipient}. Reason: ${rejectionReason}`;
                await ActivityLogs.saveActivity(activityMessage, approverName);
                console.log('Activity logged for rejection:', activityMessage);
            } catch (logError) {
                console.error('Error logging rejection activity:', logError);
                // Fallback to simple logging
                const fallbackMessage = `Rejected request ${referenceNo} with reason: ${rejectionReason}`;
                await ActivityLogs.saveActivity(fallbackMessage, approverName);
            }

            // Notify that the request was rejected
            broadcastRequestEvaluationUpdate("request-rejected", {
                referenceNo,
                approverName,
                rejectionReason,
                timestamp: new Date().toISOString(),
            });

            // Notify that the request has changed (reject)
            broadcastRequestEvaluationUpdate("request-changed", {
                referenceNo,
                changeType: "reject",
                approverName,
                rejectionReason,
                timestamp: new Date().toISOString(),
            });

            // Notify dashboard of stats update
            broadcastDashboardUpdate("stats-updated", {
                type: "request-rejected",
                referenceNo,
                rejectionReason,
                timestamp: new Date().toISOString(),
            });


            try {
                // Get request details to find the requester
                const requestDetails = await RequestEvaluation.getEvaluationDetails(referenceNo);
                if (requestDetails.length > 0) {
                    const requesterName = requestDetails[0].requestedBy;
                    console.log('Requester name:', requesterName);
                    if (requesterName) {
                        let requesterEmail = null;

                        // Check if the requesterName is already an email address
                        if (requesterName.includes('@')) {
                            requesterEmail = requesterName;
                            console.log('Requester is already an email:', requesterEmail);
                        } else {
                            // Look up email by employee name
                            requesterEmail = await UserProfile.getEmailByEmployeeName(requesterName);
                            console.log('Requester email:', requesterEmail);
                        }
                        if (requesterEmail) {
                            const subject = 'Request Rejected';
                            const body = `Your request ${referenceNo} has been rejected by ${approverName}. Reason: ${rejectionReason}. Please review the feedback and resubmit if needed.`;

                            const emailData = {
                                email: requesterEmail,
                                name: requesterName,
                                title: subject,
                                companyName: 'SANTEH',
                                greeting: 'Dear',
                                body: body,
                                buttonText: 'View Request',
                                buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?ref=${referenceNo}`,
                                companyEmail: 'noreply@santehfeeds.com',
                                companyPhone: '+63 (02) 8-XXX-XXXX',
                                unsubscribeUrl: '#',
                                preferencesUrl: '#'
                            };
                            console.log('Sending rejection email to:', requesterEmail);
                            await sendEmailWithTemplate(emailData);
                            console.log('Rejection email sent successfully');
                        } else {
                            console.log('No email found for requester:', requesterName);
                        }

                        // Create notification for the requester
                        try {
                            const notification = new Notification(
                                'Request Rejected',
                                `Your request ${referenceNo} has been rejected by ${approverName}. Reason: ${rejectionReason}.`,
                                requesterName,
                                `/procurement/request-evaluation?id=${referenceNo}`
                            );

                            await notification.save(approverName);
                            console.log('Notification created for requester:', requesterName);
                        } catch (notificationError) {
                            console.error('Error creating rejection notification:', notificationError);
                            // Don't throw error to avoid failing the rejection process
                        }
                    }
                }
            } catch (emailError) {
                console.error('Error sending rejection notification email:', emailError);
                // Don't throw error to avoid failing the rejection process
            }
        }

        return result;
    } catch (error) {
        console.error('Error rejecting evaluation:', error);
        throw error;
    }
}

export async function fetchUserAvailableStatuses(userName) {
    try {
        const statuses = await RequestEvaluation.getUserAvailableStatuses(userName);
        return statuses;
    } catch (error) {
        console.error('Error fetching user available statuses:', error);
        throw error;
    }
}

export async function markAsRead(referenceNo, userName) {
    try {
        const result = await RequestEvaluation.markAsRead(referenceNo);

        if (result) {
            // Log activity for marking as read
            try {
                const activityMessage = `Marked request ${referenceNo}`;
                await ActivityLogs.saveActivity(activityMessage, userName);
                console.log('Activity logged for marking as read:', activityMessage);
            } catch (logError) {
                console.error('Error logging read activity:', logError);
                // Don't throw error to avoid failing the mark as read process
            }

            // Trigger Pusher event to notify all users of the read status change
            // Notify that the request has been marked as read
            broadcastRequestEvaluationUpdate("request-changed", {
                referenceNo,
                changeType: "markAsRead",
                userName,
                timestamp: new Date().toISOString(),
            });

        }

        return result;
    } catch (error) {
        console.error('Error marking as read:', error);
        throw error;
    }
}
//#endregion

//#region PURCHASE ORDER APPROVAL ACTIONS

export async function fetchPurchaseOrderEvaluationsLeftPanel(userName, statusFilter, isAdmin = false) {
    try {
        const evaluations = await RequestEvaluation.getPurchaseOrderEvaluationsLeftPanel(userName, statusFilter, isAdmin);
        return evaluations;
    } catch (error) {
        console.error('Error fetching purchase order evaluations:', error);
        throw error;
    }
}

export async function fetchPurchaseOrderDetails(poNumber) {
    try {
        const details = await RequestEvaluation.getPurchaseOrderDetails(poNumber);
        return details;
    } catch (error) {
        console.error('Error fetching purchase order details:', error);
        throw error;
    }
}

export async function confirmPurchaseOrder(poNumber, confirmBy) {
    try {
        const result = await RequestEvaluation.confirmPurchaseOrder(poNumber, confirmBy);
        return result;
    } catch (error) {
        console.error('Error confirming purchase order:', error);
        throw error;
    }
}

export async function approvePurchaseOrder(poNumber, approvedBy) {
    try {
        const result = await RequestEvaluation.approvePurchaseOrder(poNumber, approvedBy);
        return result;
    } catch (error) {
        console.error('Error approving purchase order:', error);
        throw error;
    }
}

export async function rejectPurchaseOrder(poNumber, rejectedBy, reason) {
    try {
        const result = await RequestEvaluation.rejectPurchaseOrder(poNumber, rejectedBy, reason);
        return result;
    } catch (error) {
        console.error('Error rejecting purchase order:', error);
        throw error;
    }
}
//#endregion
