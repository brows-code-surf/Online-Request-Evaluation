'use server';

import RequestEvaluation from '@/models/RequestEvaluation';
import UserProfile from '@/models/UserProfile';
import { sendEmailWithTemplate } from '@/utils/emailService';
import { broadcastRequestEvaluationUpdate } from '@/app/_actions/pusher';

export async function fetchEvaluationLeftPanel(requesterName, requestStatus, filters = {}) {
    try {
        const requests = await RequestEvaluation.getEvaluationsLeftPanel(requesterName, requestStatus, filters);
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

                        if (currentStatus === 'FOR CONFIRMATION') {
                            subject = 'Request Approved - Waiting for Your Approval';
                            body = `The request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been confirmed and is now waiting for your approval. Please review and approve the request at your earliest convenience.`;
                        } else if (currentStatus === 'FOR REQUEST APPROVAL') {
                            subject = 'Request Approved - Ready for Lead Time Review';
                            body = `The request <strong style="font-size:20px;color:#2563eb;">${referenceNo}</strong> has been approved and is now ready for purchasing lead time review. Please check the request details and proceed with the canvassing process.`;
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
                                buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/request-evaluation?ref=${referenceNo}`,
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
                    } else {
                        console.log('No approver data found for status:', currentStatus);
                    }
                } else {
                    console.log('Current status does not trigger email notification:', currentStatus);
                }
            } catch (emailError) {
                console.error('Error sending notification email:', emailError);
                // Don't throw error to avoid failing the approval process
            }

            // Trigger Pusher events to notify all users of the approval
            await broadcastRequestEvaluationUpdate('request-approved', {
                referenceNo,
                approverName,
                newStatus: result.newStatus,
                timestamp: new Date().toISOString()
            });
            await broadcastRequestEvaluationUpdate('request-changed', {
                referenceNo,
                changeType: 'approve',
                approverName,
                newStatus: result.newStatus,
                timestamp: new Date().toISOString()
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
        const result = await RequestEvaluation.rejectApprovedEvaluation(referenceNo, approverName, rejectionReason);

        // Send email notification for rejection
        if (result.headerUpdated) {
            await broadcastRequestEvaluationUpdate('request-rejected', {
                referenceNo,
                approverName,
                rejectionReason,
                timestamp: new Date().toISOString()
            });
            await broadcastRequestEvaluationUpdate('request-changed', {
                referenceNo,
                changeType: 'reject',
                approverName,
                rejectionReason,
                timestamp: new Date().toISOString()
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
                                buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/request-evaluation?ref=${referenceNo}`,
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

export async function markAsRead(referenceNo) {
    try {
        const result = await RequestEvaluation.markAsRead(referenceNo);

        if (result) {
            // Trigger Pusher event to notify all users of the read status change
            await broadcastRequestEvaluationUpdate('request-changed', {
                referenceNo,
                changeType: 'markAsRead',
                timestamp: new Date().toISOString()
            });
        }

        return result;
    } catch (error) {
        console.error('Error marking as read:', error);
        throw error;
    }
}
