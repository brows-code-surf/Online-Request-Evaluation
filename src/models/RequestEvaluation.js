import connectToDatabase from '@/lib/db.js';
import Notification from './Notification.js';

class RequestEvaluation {

    static async checkTableExists(connection, tableName) {
        try {
            const query = `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName`;
            const result = await connection.request()
                .input('tableName', tableName)
                .query(query);
            return result.recordset.length > 0;
        } catch (error) {
            console.error(`Error checking if table ${tableName} exists:`, error);
            return false;
        }
    }

    static async getEvaluationDetails(referenceNo) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            
            // Check if tables exist
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            const detailsExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTDETAILS.1');
            
            if (!headerExists || !detailsExists) {
                console.warn('PURCHASE.REQUESTDETAILS.1 or PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            const query = `SELECT 
                            PRD.REFERENCENO,
                            PRH.REQUESTEDBY as requestedBy,
                            PRH.COMPANY as company,
                            PRH.LOCNCODE as locationCode,
                            PRD.ITEMSTATUS as STATUS,
                            PRD.ITEMNMBR,
                            PRD.ITEMDESC,
                            PRD.UOFM,
                            (PRD.QUANTITY + PRD.QUANTITYADJ) - PRD.QUANTITYCANCEL as QUANTITY,
                            PRD.BUDGETNAME,
                            PRD.REMARKS as remarks,
                            PRD.DATENEEDED,
                            PRH.IS_READ
                            FROM [PURCHASE.REQUESTDETAILS.1] PRD
                            INNER JOIN [PURCHASE.REQUESTHEADER.1] PRH ON PRD.REFERENCENO = PRH.REFERENCENO
                            WHERE PRH.REFERENCENO = @REFERENCENO`;
            const result = await connection.request()
                .input('REFERENCENO', referenceNo)
                .query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching evaluation details:', error);
            return [];
        }
    }

    static async getEvaluationsLeftPanel(requesterName, requestStatus, filters = {}) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            
            // Check if table exists
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found. Returning empty results.');
                return [];
            }

            let query = `SELECT 
                            prh.REFERENCENO as id,
                            prh.REQUESTTYPE as title, 
                            prh.REQUESTEDBY as requester, 
                            prh.REQUESTSTATUS as status, 
                            prh.DATEREQUESTED as requestDate, 
                            prh.COMPANY as department, 
                            prh.LOCNCODE as location, 
                            prh.REMARKS as description,
                            CASE 
                            WHEN PRH.IS_RUSH = 0 THEN ''
                            WHEN PRH.IS_RUSH = 1 THEN 'RUSH'
                            end as isRush,
                            CASE
                            WHEN PRH.IS_READ = 0 THEN 'NOT READ'
                            WHEN PRH.IS_READ = 1 THEN 'READ'
                            end as isRead
                            FROM [PURCHASE.REQUESTHEADER.1] PRH
                            WHERE `;

            const request = connection.request()
                .input('userName', requesterName);

            // Dynamic WHERE condition based on request status - strict role matching
            switch (requestStatus.toLowerCase()) {
                case 'for confirmation':
                    query += ` PRH.REVIEWER = @userName AND PRH.REQUESTSTATUS = 'FOR CONFIRMATION'`;
                    break;
                case 'for request approval':
                    query += ` PRH.APPROVER = @userName AND PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL'`;
                    break;
                case 'for purchasing lead time':
                    query += ` PRH.ADDRESSEDTO = @userName AND PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME'`;
                    break;
                default:
                    // Show requests where user is assigned and status matches their role
                    query += ` ((PRH.REVIEWER = @userName AND PRH.REQUESTSTATUS = 'FOR CONFIRMATION') 
                              OR (PRH.APPROVER = @userName AND PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL') 
                              OR (PRH.ADDRESSEDTO = @userName AND PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME'))`;
            }

            // Dynamic filters
            if (filters.referenceNo) {
                query += ` AND prh.REFERENCENO LIKE @referenceNo`;
                request.input('referenceNo', `%${filters.referenceNo}%`);
            }

            if (filters.status && filters.status !== 'all') {
                query += ` AND prh.REQUESTSTATUS = @status`;
                request.input('status', filters.status);
            }

            if (filters.department) {
                query += ` AND prh.COMPANY LIKE @department`;
                request.input('department', `%${filters.department}%`);
            }

            if (filters.location) {
                query += ` AND prh.LOCNCODE = @location`;
                request.input('location', filters.location);
            }

            if (filters.startDate) {
                query += ` AND prh.DATEREQUESTED >= @startDate`;
                request.input('startDate', new Date(filters.startDate));
            }

            if (filters.endDate) {
                query += ` AND prh.DATEREQUESTED <= @endDate`;
                request.input('endDate', new Date(filters.endDate));
            }

            query += ` ORDER BY PRH.DATEREQUESTED DESC`;

            const result = await request.query(query);
            return result.recordset;

        } catch (error) {
            console.error('Error fetching requests by requester name:', error);
            return [];
        }
    }

    static async getRequestStatus(referenceNo) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) return null;
            
            const query = `SELECT REQUESTSTATUS FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .query(query);
            return result.recordset.length > 0 ? result.recordset[0].REQUESTSTATUS : null;
        } catch (error) {
            console.error('Error fetching request status:', error);
            throw error;
        }
    }

    static async getRequestApprovers(referenceNo) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) return null;
            
            const query = `SELECT APPROVER, ADDRESSEDTO FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .query(query);
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            console.error('Error fetching request approvers:', error);
            throw error;
        }
    }

    static async updateApprovedEvaluation(referenceNo, approverName, currentStatus) {
        console.log(`updateApprovedEvaluation called with:`, { referenceNo, approverName, currentStatus });
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let newStatus = '';
            let headerUpdateQuery = '';

            // Determine new status and set appropriate fields based on current status
            if (currentStatus === 'FOR CONFIRMATION') {
                newStatus = 'FOR REQUEST APPROVAL';
                headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] 
                                    SET REVIEWEDBY = @approverName, 
                                        DATEREVIEWED = GETDATE(), 
                                        IS_READ = 0,
                                        REQUESTSTATUS = @newStatus 
                                    WHERE REFERENCENO = @referenceNo`;
            } else if (currentStatus === 'FOR REQUEST APPROVAL') {
                newStatus = 'FOR PURCHASING LEAD TIME';
                headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] 
                                    SET APPROVEDBY = @approverName, 
                                        DATEAPPROVED = GETDATE(), 
                                        IS_READ = 0,
                                        REQUESTSTATUS = @newStatus 
                                    WHERE REFERENCENO = @referenceNo`;
            } else if (currentStatus === 'FOR PURCHASING LEAD TIME') {
                newStatus = 'FOR CANVASSING';
                headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] 
                                    SET RECEIVEDBY = @approverName, 
                                        DATERECEIVED = GETDATE(), 
                                        IS_READ = 0,
                                        REQUESTSTATUS = @newStatus 
                                    WHERE REFERENCENO = @referenceNo`;
            }

            const requestHeader = connection.request();
            requestHeader.input('referenceNo', referenceNo);
            requestHeader.input('approverName', approverName);
            requestHeader.input('newStatus', newStatus);
            
            const resultHeader = await requestHeader.query(headerUpdateQuery);

            // Update request details with new status
            const detailsUpdateQuery = `UPDATE [PURCHASE.REQUESTDETAILS.1] 
                                       SET ITEMSTATUS = @newStatus 
                                       WHERE REFERENCENO = @referenceNo`;
            
            const requestDetails = connection.request();
            requestDetails.input('referenceNo', referenceNo);
            requestDetails.input('newStatus', newStatus);
            
            const resultDetails = await requestDetails.query(detailsUpdateQuery);

            // Create notification for the next approver with improved error handling
            const notificationResults = [];
            try {
                console.log(`Creating notifications for status transition: ${currentStatus} -> ${newStatus}`);

                let notificationRecipient = '';
                let notificationTitle = '';
                let notificationDescription = '';

                if (newStatus === 'FOR REQUEST APPROVAL') {
                    // Get the approver from the request
                    const approverQuery = `SELECT APPROVER FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
                    const approverResult = await connection.request()
                        .input('referenceNo', referenceNo)
                        .query(approverQuery);

                    if (approverResult.recordset.length > 0 && approverResult.recordset[0].APPROVER) {
                        notificationRecipient = approverResult.recordset[0].APPROVER;
                        notificationTitle = 'Request Ready for Approval';
                        notificationDescription = `Request ${referenceNo} has been reviewed and is now ready for your approval.`;

                        // Validate recipient exists
                        if (!notificationRecipient || notificationRecipient.trim() === '') {
                            console.warn(`No valid approver found for request ${referenceNo}`);
                        } else {
                            console.log(`Creating notification for approver: ${notificationRecipient}`);
                            const notification = new Notification(notificationTitle, notificationDescription, notificationRecipient.trim());
                            const result = await notification.save(approverName);
                            notificationResults.push({ type: 'approver', recipient: notificationRecipient, result });
                            console.log(`Approver notification created successfully:`, result);
                        }
                    } else {
                        console.warn(`No approver found in database for request ${referenceNo}`);
                    }
                } else if (newStatus === 'FOR PURCHASING LEAD TIME') {
                    // Get the addressed to person from the request
                    const addressedToQuery = `SELECT ADDRESSEDTO FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
                    const addressedToResult = await connection.request()
                        .input('referenceNo', referenceNo)
                        .query(addressedToQuery);

                    if (addressedToResult.recordset.length > 0 && addressedToResult.recordset[0].ADDRESSEDTO) {
                        notificationRecipient = addressedToResult.recordset[0].ADDRESSEDTO;
                        notificationTitle = 'Request Approved - Ready for Purchasing';
                        notificationDescription = `Request ${referenceNo} has been approved and is now ready for purchasing lead time review.`;

                        // Validate recipient exists
                        if (!notificationRecipient || notificationRecipient.trim() === '') {
                            console.warn(`No valid addressed-to person found for request ${referenceNo}`);
                        } else {
                            console.log(`Creating notification for addressed-to: ${notificationRecipient}`);
                            const notification = new Notification(notificationTitle, notificationDescription, notificationRecipient.trim());
                            const result = await notification.save(approverName);
                            notificationResults.push({ type: 'addressed-to', recipient: notificationRecipient, result });
                            console.log(`Addressed-to notification created successfully:`, result);
                        }
                    } else {
                        console.warn(`No addressed-to person found in database for request ${referenceNo}`);
                    }
                } else if (newStatus === 'FOR CANVASSING') {
                    // For final approval, notify all participants
                    const participantsQuery = `SELECT REVIEWER, APPROVER, ADDRESSEDTO, REQUESTEDBY FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
                    const participantsResult = await connection.request()
                        .input('referenceNo', referenceNo)
                        .query(participantsQuery);

                    if (participantsResult.recordset.length > 0) {
                        const { REVIEWER, APPROVER, ADDRESSEDTO, REQUESTEDBY } = participantsResult.recordset[0];
                        console.log(`Final approval participants:`, { REVIEWER, APPROVER, ADDRESSEDTO, REQUESTEDBY });

                        const participants = [
                            { role: 'reviewer', name: REVIEWER, message: `Request ${referenceNo} that you reviewed has been fully approved and is now in the canvassing stage.` },
                            { role: 'approver', name: APPROVER, message: `Request ${referenceNo} that you approved has been fully approved and is now in the canvassing stage.` },
                            { role: 'addressed-to', name: ADDRESSEDTO, message: `Request ${referenceNo} that was addressed to you has been fully approved and is now in the canvassing stage.` },
                            { role: 'requester', name: REQUESTEDBY, message: `Your request ${referenceNo} has been fully approved and is now in the canvassing stage.` }
                        ];

                        for (const participant of participants) {
                            if (participant.name && participant.name.trim() !== '') {
                                try {
                                    console.log(`Creating final notification for ${participant.role}: ${participant.name}`);
                                    const notification = new Notification(
                                        'Request Fully Approved',
                                        participant.message,
                                        participant.name.trim()
                                    );
                                    const result = await notification.save(approverName);
                                    notificationResults.push({ type: participant.role, recipient: participant.name, result });
                                    console.log(`${participant.role} notification created successfully:`, result);
                                } catch (participantError) {
                                    console.error(`Failed to create notification for ${participant.role} ${participant.name}:`, participantError);
                                    notificationResults.push({ type: participant.role, recipient: participant.name, error: participantError.message });
                                }
                            } else {
                                console.log(`Skipping notification for ${participant.role} - no name provided`);
                            }
                        }
                    } else {
                        console.warn(`No participants found for final approval of request ${referenceNo}`);
                    }
                }

                // Log notification summary
                if (notificationResults.length > 0) {
                    console.log(`Notification creation summary for request ${referenceNo}:`, {
                        totalAttempted: notificationResults.length,
                        successful: notificationResults.filter(r => r.result && r.result.success).length,
                        failed: notificationResults.filter(r => r.error).length,
                        details: notificationResults
                    });
                } else {
                    console.log(`No notifications were created for request ${referenceNo} (status: ${newStatus})`);
                }

            } catch (notificationError) {
                console.error('Critical error in notification creation process:', {
                    error: notificationError.message,
                    stack: notificationError.stack,
                    referenceNo,
                    currentStatus,
                    newStatus,
                    approverName
                });

                // Log the error but don't fail the approval
                notificationResults.push({ type: 'system-error', error: notificationError.message });
            }

            return {
                headerUpdated: resultHeader.rowsAffected[0] > 0,
                detailsUpdated: resultDetails.rowsAffected[0] > 0,
                newStatus: newStatus
            };

        } catch (error) {
            console.error('Error updating approved evaluation:', error);
            throw error;
        }
    }

    static async rejectApprovedEvaluation(referenceNo, approverName, rejectionReason) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            
            const headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] 
                                      SET REQUESTSTATUS = 'REJECTED'
                                      WHERE REFERENCENO = @referenceNo`;

            const requestHeader = connection.request();
            requestHeader.input('referenceNo', referenceNo);
            
            const resultHeader = await requestHeader.query(headerUpdateQuery);

            // Update request details status to REJECTED
            const detailsUpdateQuery = `UPDATE [PURCHASE.REQUESTDETAILS.1] 
                                       SET ITEMSTATUS = 'REJECTED',
                                       ADJCANCELREMARKS = @rejectionReason
                                       WHERE REFERENCENO = @referenceNo`;
            
            const requestDetails = connection.request();
            requestDetails.input('referenceNo', referenceNo);
            requestDetails.input('rejectionReason', rejectionReason);
            
            const resultDetails = await requestDetails.query(detailsUpdateQuery);

            return {
                headerUpdated: resultHeader.rowsAffected[0] > 0,
                detailsUpdated: resultDetails.rowsAffected[0] > 0
            };

        } catch (error) {
            console.error('Error rejecting evaluation:', error);
            throw error;
        }
    }

    static async getUserAvailableStatuses(userName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found. Returning default status.');
                return ['FOR CONFIRMATION'];
            }
            
            // Check which roles the user has and return corresponding statuses
            const query = `SELECT 
                            CASE 
                                WHEN EXISTS (SELECT 1 FROM [PURCHASE.REQUESTHEADER.1] WHERE REVIEWER = @userName) 
                                    THEN 'FOR CONFIRMATION'
                                WHEN EXISTS (SELECT 1 FROM [PURCHASE.REQUESTHEADER.1] WHERE APPROVER = @userName) 
                                    THEN 'FOR REQUEST APPROVAL'
                                WHEN EXISTS (SELECT 1 FROM [PURCHASE.REQUESTHEADER.1] WHERE ADDRESSEDTO = @userName) 
                                    THEN 'FOR PURCHASING LEAD TIME'
                            END as status`;
            
            const result = await connection.request()
                .input('userName', userName)
                .query(query);
            
            // Get distinct statuses user has access to
            const statuses = result.recordset
                .map(row => row.status)
                .filter(status => status !== null && status !== undefined);
            
            return [...new Set(statuses)];
        } catch (error) {
            console.error('Error fetching user available statuses:', error);
            return ['FOR CONFIRMATION'];
        }
    }

    static async getRequestApproversEmails(referenceNo, requestStatus) {
        let sfcConnection;
        let gdbConnection;
        try{
            sfcConnection = await connectToDatabase(process.env.DB_SFC);
            gdbConnection = await connectToDatabase(process.env.DB_NAME); // Connect to GDB
            
            const headerExists = await this.checkTableExists(sfcConnection, 'PURCHASE.REQUESTHEADER.1');
            const userExists = await this.checkTableExists(gdbConnection, 'SYSTEM.USERACCOUNT.1');
            
            if (!userExists || !headerExists) {
                console.warn('Required tables not found.');
                return null;
            }

            // Get the approver/addressedTo person from SFC database
            let approverFieldQuery = `SELECT `;
            
            switch (requestStatus.toUpperCase()) {
                case 'FOR CONFIRMATION':
                    approverFieldQuery += `APPROVER as employeeName FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
                    break;
                case 'FOR REQUEST APPROVAL':
                    approverFieldQuery += `ADDRESSEDTO as employeeName FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
                    break;
                default:
                    return null;
            }

            const approverResult = await sfcConnection.request()
                .input('referenceNo', referenceNo)
                .query(approverFieldQuery);
            
            if (approverResult.recordset.length === 0) {
                console.warn('No approver found for reference:', referenceNo);
                return null;
            }

            const employeeName = approverResult.recordset[0].employeeName;

            // Get email from GDB database using the employee name
            const userQuery = `SELECT EMAIL, EMPLOYEENAME FROM [SYSTEM.USERACCOUNT.1] WHERE EMPLOYEENAME = @employeeName`;
            const userResult = await gdbConnection.request()
                .input('employeeName', employeeName)
                .query(userQuery);

            return userResult.recordset.length > 0 ? userResult.recordset[0] : null;
        }catch(error){
            console.error('Error fetching request approvers emails:', error);
            return null;
        }
    }

    static async markAsRead(referenceNo) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const query = `UPDATE [PURCHASE.REQUESTHEADER.1]
                           SET IS_READ = 1
                           WHERE REFERENCENO = @referenceNo`;
            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .query(query);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error marking as read:', error);
            return false;
        }
    }

    // Get request evaluation status breakdown
    static async getRequestEvaluationStatusBreakdown() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if table exists
            const detailsExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTDETAILS.1');
            if (!detailsExists) {
                console.warn('PURCHASE.REQUESTDETAILS.1 table not found.');
                return [];
            }

            const query = `
                SELECT
                    CASE
                        WHEN ITEMSTATUS = 'FOR CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN ITEMSTATUS = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN ITEMSTATUS = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN ITEMSTATUS = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN ITEMSTATUS = 'APPROVED' THEN 'APPROVED'
                        WHEN ITEMSTATUS = 'REJECTED' THEN 'REJECTED'
                        ELSE 'OTHER'
                    END as status,
                    COUNT(*) as count
                FROM [PURCHASE.REQUESTDETAILS.1]
                GROUP BY
                    CASE
                        WHEN ITEMSTATUS = 'FOR CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN ITEMSTATUS = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN ITEMSTATUS = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN ITEMSTATUS = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN ITEMSTATUS = 'APPROVED' THEN 'APPROVED'
                        WHEN ITEMSTATUS = 'REJECTED' THEN 'REJECTED'
                        ELSE 'OTHER'
                    END
                ORDER BY status
            `;

            const result = await connection.request().query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching request evaluation status breakdown:', error);
            return [];
        }
    }

    // Get 30-day requests trend
    static async getThirtyDayRequestsTrend() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if table exists
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            const query = `
                SELECT
                    CAST(DATEREQUESTED AS DATE) as requestDate,
                    COUNT(*) as requestCount
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE DATEREQUESTED >= DATEADD(DAY, -30, GETDATE())
                GROUP BY CAST(DATEREQUESTED AS DATE)
                ORDER BY CAST(DATEREQUESTED AS DATE)
            `;

            const result = await connection.request().query(query);

            // Create array for last 30 days with zero-fill for missing dates
            const thirtyDays = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const existing = result.recordset.find(r => {
                    const recordDate = r.requestDate instanceof Date ? r.requestDate.toISOString().split('T')[0] : r.requestDate;
                    return recordDate === dateStr;
                });
                thirtyDays.push({
                    date: dateStr,
                    requests: existing ? existing.requestCount : 0
                });
            }

            return thirtyDays;
        } catch (error) {
            console.error('Error fetching 30-day requests trend:', error);
            // Return array with zeros for all 30 days
            return Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                requests: 0
            }));
        }
    }
}

export default RequestEvaluation;
