'use server';

import AccountApprovalModel from '@/models/AccountApproval.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';
import { generatePassword } from '@/utils/generatePassword.js';
import { broadcastUserApprovalUpdate, broadcastUserAccountUpdate } from '@/app/_actions/socket';
import Notification from '@/models/Notification';

export async function getPendingApprovals() {
    try {
        const approvals = await AccountApprovalModel.getPendingApprovals();
        return {
            success: true,
            data: approvals
        };
    } catch (error) {
        console.error('Get approvals error:', error);
        return {
            success: false,
            message: 'Failed to fetch approvals: ' + error.message
        };
    }
}

export async function approveUserAccount(userId, email, name, processedBy) {
    try {
        if (!userId) {
            return {
                success: false,
                message: 'User ID is required'
            };
        }

        // Generate a secure password
        const generatedPassword = generatePassword();

        await AccountApprovalModel.approveAccount(userId, processedBy, generatedPassword);

        // Send approval email with password
        await sendEmailWithTemplate({
            email: email,
            subject: 'Account Approval - Access Granted',
            title: 'Account Approved',
            companyName: 'SANTEH',
            greeting: 'Congratulations',
            name: name,
            body: `<p>Your account has been approved and is now active. You can now log in to the system and start using all available features.</p>
            <p><strong>Your Login Credentials:</strong></p>
            <p>Email: <strong>${email}</strong><br>
            Password: <strong>${generatedPassword}</strong></p>
            <p style="color: #d97706; margin-top: 16px;"><strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes.</p>
            <p><strong>Remarks:</strong> Validated and approved</p>
            <p>If you have any questions, please contact our support team.</p>`,
            companyEmail: 'contact@santeh.com',
            companyPhone: '+1-800-SANTEH',
            unsubscribeUrl: '#',
            preferencesUrl: '#'
        });

        // Create notification for the approved user
        try {
            const notification = new Notification(
                'Welcome to ORES - Online Requests Evaluation System!',
                `Your account has been approved and is now active.`,
                name // Send notification to the approved user
            );
            await notification.save(processedBy);
            console.log(`Welcome notification sent to user: ${name}`);
        } catch (notificationError) {
            console.error('Error creating welcome notification:', notificationError);
            // Don't fail the approval if notification fails
        }

        // Trigger Pusher events to notify all users
        await broadcastUserApprovalUpdate('user-account-approved', {
            userId,
            email,
            name,
            approvedBy: processedBy,
            timestamp: new Date().toISOString()
        });

        // Also broadcast to user-accounts page to add new user to the list
        await broadcastUserAccountUpdate('new-user-approved', {
            userId,
            email,
            name,
            status: 'ACTIVE',
            approvedBy: processedBy,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Account approved successfully'
        };
    } catch (error) {
        console.error('Approve account error:', error);
        return {
            success: false,
            message: 'Failed to approve account: ' + error.message
        };
    }
}

export async function rejectUserAccount(userId, email, name, processedBy, remarks) {
    try {
        if (!userId) {
            return {
                success: false,
                message: 'User ID is required'
            };
        }

        await AccountApprovalModel.rejectAccount(userId, processedBy, remarks);

        // Send rejection email
        await sendEmailWithTemplate({
            email: email,
            subject: 'Account Request - Not Approved',
            title: 'Account Request Status',
            companyName: 'SANTEH',
            greeting: 'Hello',
            name: name,
            body: `<p>Your account request has been reviewed and unfortunately has not been approved at this time.</p><p><strong>Remarks:</strong> ${remarks}</p><p>Please contact our support team for more information or to resubmit your request.</p>`,
            buttonText: 'View Dashboard',
            buttonUrl: 'http://localhost:3000/login',
            companyEmail: 'contact@santeh.com',
            companyPhone: '+1-800-SANTEH',
            unsubscribeUrl: '#',
            preferencesUrl: '#'
        });

        // Trigger Pusher event to notify user-approval page
        await broadcastUserApprovalUpdate('user-account-rejected', {
            userId,
            email,
            name,
            rejectedBy: processedBy,
            remarks,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Account rejected successfully'
        };
    } catch (error) {
        console.error('Reject account error:', error);
        return {
            success: false,
            message: 'Failed to reject account: ' + error.message
        };
    }
}

export async function sendNotification(title, description, recipient, createdBy) {
    try {
        const notification = new Notification(title, description, recipient);
        await notification.save(createdBy);

        return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
        console.error('Send notification error:', error);
        return { success: false, message: 'Failed to send notification: ' + error.message };
    }
}
