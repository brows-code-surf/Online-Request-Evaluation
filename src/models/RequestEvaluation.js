import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';
import Notification from './Notification.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';

class RequestEvaluation {
    //#region PURCHASE REQUEST
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
                            PRD.ITEMNMBR,
                            PRD.ITEMDESC,
                            PRD.UOFM,
                            ISNULL(PRD.QUANTITY, 0) as QUANTITY,
                            ISNULL(PRD.QTYCANCEL, 0) as QTYCANCEL,
                            PRD.BUDGETCODE,
                            PRD.REMARKS as remarks,
                            PRD.DATENEEDED,
                            PRD.ITEMSTATUS,
                            PRH.IS_READ,
                            PRH.REVIEWER,
                            PRH.DATEREVIEWED,
                            PRH.APPROVER,
                            PRH.DATEAPPROVED,
                            PRH.ADDRESSEDTO,
                            PRH.DATERECEIVED,
                            PRH.REQUESTSTATUS,
                            PRH.CANCELREMARKS
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

    static async getEvaluationsLeftPanel(requesterName, requestStatus, filters = {}, isAdmin = false) {
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

            const request = connection.request();

            // Only add userName input for non-admin users
            if (!isAdmin) {
                request.input('userName', requesterName);
            }

            // For admin users, show all posted requests regardless of assignment
            if (isAdmin) {
                query += ` PRH.IS_POSTED = 1`;
            } else {
                // Dynamic WHERE condition based on request status - strict role matching for regular users
                switch (requestStatus.toLowerCase()) {
                    case 'for confirmation':
                        query += ` PRH.REVIEWER = @userName AND PRH.REQUESTSTATUS = 'FOR CONFIRMATION' AND PRH.IS_POSTED = 1`;
                        break;
                    case 'for request approval':
                        query += ` PRH.APPROVER = @userName AND PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL' AND PRH.IS_POSTED = 1`;
                        break;
                    case 'for purchasing lead time':
                        query += ` PRH.ADDRESSEDTO = @userName AND PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME' AND PRH.IS_POSTED = 1`;
                        break;
                    default:
                        // Show requests where user is assigned and status matches their role
                        query += ` ((PRH.REVIEWER = @userName AND PRH.REQUESTSTATUS = 'FOR CONFIRMATION' AND PRH.IS_POSTED = 1)
                                  OR (PRH.APPROVER = @userName AND PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL' AND PRH.IS_POSTED = 1)
                                  OR (PRH.ADDRESSEDTO = @userName AND PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME' AND PRH.IS_POSTED = 1))`; // Also show user's own requests
                }
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

    // Update approved evaluation with transaction safety
    static async updateApprovedEvaluation(referenceNo, approverName, currentStatus) {
        console.log(`updateApprovedEvaluation called with:`, { referenceNo, approverName, currentStatus });
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for approval update');

            let newStatus = '';
            let headerUpdateQuery = '';

            // Determine new status and set appropriate fields based on current status
            if (currentStatus === 'FOR CONFIRMATION') {
                newStatus = 'FOR REQUEST APPROVAL';
                // Only update reviewer fields if a reviewer is assigned
                headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1]
                                    SET REVIEWEDBY = CASE WHEN REVIEWER IS NOT NULL AND REVIEWER != '' THEN @approverName ELSE REVIEWEDBY END,
                                        DATEREVIEWED = CASE WHEN REVIEWER IS NOT NULL AND REVIEWER != '' THEN GETDATE() ELSE DATEREVIEWED END,
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

            const requestHeader = transaction.request();
            requestHeader.input('referenceNo', referenceNo);
            requestHeader.input('approverName', approverName);
            requestHeader.input('newStatus', newStatus);

            const resultHeader = await requestHeader.query(headerUpdateQuery);

            console.log('Header status updated');

            // Update item statuses to match the new request status
            const updateItemsQuery = `UPDATE [PURCHASE.REQUESTDETAILS.1]
                                     SET ITEMSTATUS = @newStatus
                                     WHERE REFERENCENO = @referenceNo`;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('newStatus', newStatus)
                .query(updateItemsQuery);

            console.log(`Item statuses updated to ${newStatus}`);

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
                    const approverResult = await transaction.request()
                        .input('referenceNo', referenceNo)
                        .query(approverQuery);
                } else if (newStatus === 'FOR CANVASSING') {
                    // For final approval, notify all participants
                    const participantsQuery = `SELECT REVIEWER, APPROVER, ADDRESSEDTO, REQUESTEDBY FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
                    const participantsResult = await transaction.request()
                        .input('referenceNo', referenceNo)
                        .query(participantsQuery);

                    if (participantsResult.recordset.length > 0) {
                        const { REVIEWER, APPROVER, ADDRESSEDTO, REQUESTEDBY } = participantsResult.recordset[0];
                        console.log(`Final approval participants:`, { REVIEWER, APPROVER, ADDRESSEDTO, REQUESTEDBY });

                        const participants = [
                            { role: 'reviewer', name: REVIEWER, message: `Request ${referenceNo} is now processing.` },
                            { role: 'approver', name: APPROVER, message: `Request ${referenceNo} is now processing.` },
                            { role: 'addressed-to', name: ADDRESSEDTO, message: `Request ${referenceNo} is now processing.` },
                            { role: 'requester', name: REQUESTEDBY, message: `Your request ${referenceNo} is now processing.` }
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

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                headerUpdated: resultHeader.rowsAffected[0] > 0,
                newStatus: newStatus
            };

        } catch (error) {
            console.error('Error updating approved evaluation:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw error;
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
        }
    }

    // Reject approved evaluation with transaction safety
    static async rejectApprovedEvaluation(referenceNo, approverName, rejectionReason) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for rejection');

            const headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1]
                                      SET REQUESTSTATUS = 'REJECTED',
                                          CANCELREMARKS = @rejectionReason
                                      WHERE REFERENCENO = @referenceNo`;

            const requestHeader = transaction.request();
            requestHeader.input('referenceNo', referenceNo);
            requestHeader.input('rejectionReason', rejectionReason);

            const resultHeader = await requestHeader.query(headerUpdateQuery);

            console.log('Header status updated to REJECTED');

            // Update item statuses to REJECTED
            const updateItemsQuery = `UPDATE [PURCHASE.REQUESTDETAILS.1]
                                     SET ITEMSTATUS = 'REJECTED'
                                     WHERE REFERENCENO = @referenceNo`;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(updateItemsQuery);

            console.log('Item statuses updated to REJECTED');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                headerUpdated: resultHeader.rowsAffected[0] > 0
            };

        } catch (error) {
            console.error('Error rejecting evaluation:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw error;
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
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
        try {
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
        } catch (error) {
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
    static async getRequestEvaluationStatusBreakdown(days = null, startDate = null, endDate = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if table exists
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            let dateFilter = '';
            if (startDate && endDate) {
                dateFilter = ` WHERE PRH.DATEREQUESTED >= '${startDate}' AND PRH.DATEREQUESTED <= '${endDate}'`;
            } else if (days) {
                dateFilter = ` WHERE PRH.DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())`;
            }

            const query = `
                SELECT
                    CASE
                        WHEN PRH.IS_POSTED = 0 AND PRH.REQUESTSTATUS != 'CANCELLED' THEN 'FOR SUBMISSION'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR P.O. CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'APPROVED' THEN 'APPROVED'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'REJECTED' THEN 'REJECTED'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'CANCELLED' THEN 'CANCELLED'
                        ELSE LTRIM(RTRIM(PRH.REQUESTSTATUS))
                    END as status,
                    COUNT(DISTINCT PRH.REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1] PRH
                ${dateFilter}
                GROUP BY
                    CASE
                        WHEN PRH.IS_POSTED = 0 AND PRH.REQUESTSTATUS != 'CANCELLED' THEN 'FOR SUBMISSION'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR P.O. CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'APPROVED' THEN 'APPROVED'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'REJECTED' THEN 'REJECTED'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'CANCELLED' THEN 'CANCELLED'
                        ELSE LTRIM(RTRIM(PRH.REQUESTSTATUS))
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

    // Get requests trend for specified number of days
    static async getThirtyDayRequestsTrend(days = 30, startDate = null, endDate = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if table exists
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            let whereClause = '';
            if (startDate && endDate) {
                whereClause = `WHERE DATEREQUESTED >= '${startDate}' AND DATEREQUESTED <= '${endDate}'`;
            } else {
                whereClause = `WHERE DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())`;
            }

            const query = `
                SELECT
                    CAST(DATEREQUESTED AS DATE) as requestDate,
                    COUNT(*) as requestCount
                FROM [PURCHASE.REQUESTHEADER.1]
                ${whereClause}
                GROUP BY CAST(DATEREQUESTED AS DATE)
                ORDER BY CAST(DATEREQUESTED AS DATE)
            `;

            const result = await connection.request().query(query);

            // Create array for the date range with zero-fill for missing dates
            const trendDays = [];
            let start, end;
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                end = new Date();
                start = new Date();
                start.setDate(end.getDate() - days + 1);
            }

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];

                const existing = result.recordset.find(r => {
                    const recordDate = r.requestDate instanceof Date ? r.requestDate.toISOString().split('T')[0] : r.requestDate;
                    return recordDate === dateStr;
                });
                trendDays.push({
                    date: dateStr,
                    requests: existing ? existing.requestCount : 0
                });
            }

            return trendDays;
        } catch (error) {
            console.error(`Error fetching requests trend:`, error);
            // Return array with zeros for the date range
            const trendDays = [];
            let start, end;
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                end = new Date();
                start = new Date();
                start.setDate(end.getDate() - days + 1);
            }

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                trendDays.push({
                    date: dateStr,
                    requests: 0
                });
            }
            return trendDays;
        }
    }

    // User-specific methods for non-admin dashboard

    // Get user's request evaluation status breakdown (for requests they created)
    static async getUserRequestEvaluationStatusBreakdown(createdBy, days = null, startDate = null, endDate = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if tables exist
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            let dateFilter = '';
            if (startDate && endDate) {
                dateFilter = ` AND PRH.DATEREQUESTED >= '${startDate}' AND PRH.DATEREQUESTED <= '${endDate}'`;
            } else if (days) {
                dateFilter = ` AND PRH.DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())`;
            }

            const query = `
                SELECT
                    CASE
                        WHEN PRH.REQUESTSTATUS = 'FOR SUBMISSION' THEN 'FOR SUBMISSION'
                        WHEN PRH.REQUESTSTATUS = 'FOR P.O. CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN PRH.REQUESTSTATUS = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN PRH.REQUESTSTATUS = 'APPROVED' THEN 'APPROVED'
                        WHEN PRH.REQUESTSTATUS = 'REJECTED' THEN 'REJECTED'
                        ELSE LTRIM(RTRIM(PRH.REQUESTSTATUS))
                    END as status,
                    COUNT(DISTINCT PRH.REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1] PRH
                WHERE PRH.REQUESTEDBY = @createdBy${dateFilter}
                GROUP BY
                    CASE
                        WHEN PRH.REQUESTSTATUS = 'FOR SUBMISSION' THEN 'FOR SUBMISSION'
                        WHEN PRH.REQUESTSTATUS = 'FOR P.O. CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN PRH.REQUESTSTATUS = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN PRH.REQUESTSTATUS = 'APPROVED' THEN 'APPROVED'
                        WHEN PRH.REQUESTSTATUS = 'REJECTED' THEN 'REJECTED'
                        ELSE LTRIM(RTRIM(PRH.REQUESTSTATUS))
                    END
                ORDER BY status
            `;

            const result = await connection.request()
                .input('createdBy', createdBy)
                .query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching user request evaluation status breakdown:', error);
            return [];
        }
    }

    // Get user's requests trend for specified number of days (for requests they created)
    static async getUserThirtyDayRequestsTrend(createdBy, days = 30, startDate = null, endDate = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if table exists
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            let whereClause = 'AND REQUESTEDBY = @createdBy';
            if (startDate && endDate) {
                whereClause += ` AND DATEREQUESTED >= '${startDate}' AND DATEREQUESTED <= '${endDate}'`;
            } else {
                whereClause += ` AND DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())`;
            }

            const query = `
                SELECT
                    CAST(DATEREQUESTED AS DATE) as requestDate,
                    COUNT(*) as requestCount
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE 1=1 ${whereClause}
                GROUP BY CAST(DATEREQUESTED AS DATE)
                ORDER BY CAST(DATEREQUESTED AS DATE)
            `;

            const result = await connection.request()
                .input('createdBy', createdBy)
                .query(query);

            // Create array for the date range with zero-fill for missing dates
            const trendDays = [];
            let start, end;
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                end = new Date();
                start = new Date();
                start.setDate(end.getDate() - days + 1);
            }

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];

                const existing = result.recordset.find(r => {
                    const recordDate = r.requestDate instanceof Date ? r.requestDate.toISOString().split('T')[0] : r.requestDate;
                    return recordDate === dateStr;
                });
                trendDays.push({
                    date: dateStr,
                    requests: existing ? existing.requestCount : 0
                });
            }

            return trendDays;
        } catch (error) {
            console.error(`Error fetching user requests trend:`, error);
            // Return array with zeros for the date range
            const trendDays = [];
            let start, end;
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                end = new Date();
                start = new Date();
                start.setDate(end.getDate() - days + 1);
            }

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                trendDays.push({
                    date: dateStr,
                    requests: 0
                });
            }
            return trendDays;
        }
    }
    //#endregion

    //#region PURCHASE ORDER

    // Helper function to check if user is in comma-separated field (case-insensitive)
    static isUserInCommaSeparated(fieldValue, userName) {
        if (!fieldValue || !userName) return false;
        // Ensure userName is a string
        if (typeof userName !== 'string') {
            console.error('isUserInCommaSeparated: userName is not a string:', userName);
            return false;
        }
        const userNameUpper = userName.toUpperCase();
        const names = fieldValue.split(',').map(n => n.trim().toUpperCase());
        return names.includes(userNameUpper);
    }

    // Get purchase orders for left panel that need confirmation/approval
    static async getPurchaseOrderEvaluationsLeftPanel(userName, statusFilter, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                    h.ROWID,
                    h.PONUMBER as id,
                    'PURCHASE ORDER' as title,
                    h.PO_STATUS as status,
                    h.DATECREATED as requestDate,
                    h.CREATEDBY as requester,
                    h.VENDORID as department,
                    h.VENDNAME as vendName,
                    h.PYMTRMID as paymentTerms,
                    h.DELIVERY_TO as deliveryTo,
                    h.DATENEEDED as dateNeeded,
                    h.CANVASSEDBY as canvassedBy,
                    h.CONFIRMEDBY_1 as confirmedBy_1,
                    h.DATECONFIRMED_1 as dateConfirmed_1,
                    h.CONFIRMEDBY_2 as confirmedBy_2,
                    h.DATECONFIRMED_2 as dateConfirmed_2,
                    h.APPROVEDBY as approvedBy,
                    h.DATEAPPROVED as dateApproved,
                    h.REMARKS as remarks,
                    h.POSTSTATUS as postStatus,
                    COUNT(d.RID) as itemCount,
                    1 as header,
                    h.CONFIRMEDBY_1 + CASE WHEN h.CONFIRMEDBY_2 IS NOT NULL AND h.CONFIRMEDBY_2 != '' THEN ' / ' + h.CONFIRMEDBY_2 ELSE '' END as confirmedBy,
                    CASE WHEN h.DATECONFIRMED_1 IS NOT NULL THEN h.DATECONFIRMED_1 ELSE h.DATECONFIRMED_2 END as dateConfirmed
                FROM [PURCHASE.ORDERHEADER.1] h
                LEFT JOIN [PURCHASE.ORDERDETAILS.1] d ON h.PONUMBER = d.PONUMBER
                WHERE (h.PO_STATUS = 'FOR P.O. CONFIRMATION' OR h.PO_STATUS = 'FOR P.O. APPROVAL')
            `;

            const request = connection.request();

            // Role-based filtering logic
            if (isAdmin) {
                // Admin: Return all POs where postatus is either FOR P.O. CONFIRMATION OR FOR P.O. APPROVAL
                // No additional WHERE conditions needed - already filtered above
            } else {
                // Non-admin: Apply role-based filtering
                // Use case-insensitive matching for user
                // Both reviewers (confirmedby_1 OR confirmedby_2) can see FOR P.O. CONFIRMATION POs
                query += ` AND (
                    -- Either confirmedby_1 OR confirmedby_2 contains current user in FOR P.O. CONFIRMATION status
                    (UPPER(h.CONFIRMEDBY_1) LIKE @userName AND h.PO_STATUS = 'FOR P.O. CONFIRMATION')
                    OR
                    (UPPER(h.CONFIRMEDBY_2) LIKE @userName AND h.PO_STATUS = 'FOR P.O. CONFIRMATION')
                    OR
                    -- User is approver: APPROVEDBY contains current user AND status is FOR P.O. APPROVAL
                    (UPPER(h.APPROVEDBY) LIKE @userName AND h.PO_STATUS = 'FOR P.O. APPROVAL')
                )`;

                // Use LIKE pattern for comma-separated names matching (case-insensitive with UPPER)
                request.input('userName', `%${userName.toUpperCase()}%`);
                console.log('Non-admin user filter applied with userName:', userName);
                console.log('Number of parameters:', Object.keys(request.parameters).length);
            }

            query += ` GROUP BY h.ROWID, h.PONUMBER, h.PO_STATUS, h.DATECREATED, h.CREATEDBY,
                      h.VENDORID, h.VENDNAME, h.PYMTRMID, h.DELIVERY_TO, h.DATENEEDED,
                      h.CANVASSEDBY, h.CONFIRMEDBY_1, h.DATECONFIRMED_1, h.CONFIRMEDBY_2, h.DATECONFIRMED_2, h.APPROVEDBY, h.DATEAPPROVED,
                      h.REMARKS, h.POSTSTATUS
                      ORDER BY h.DATECREATED DESC`;

            const result = await request.query(query);
            console.log('PO query result:', result.recordset.length, 'records');
            if (result.recordset.length > 0) {
                const firstPO = result.recordset[0];
                console.log('First PO record: ', {
                    id: firstPO.id,
                    status: firstPO.status,
                    confirmedBy_1: firstPO.confirmedBy_1,
                    dateConfirmed_1: firstPO.dateConfirmed_1,
                    confirmedBy_2: firstPO.confirmedBy_2,
                    dateConfirmed_2: firstPO.dateConfirmed_2,
                    approvedBy: firstPO.approvedBy,
                    dateApproved: firstPO.dateApproved
                });
            }

            // For non-admin users, apply additional client-side filtering to ensure exact name matching
            // (since SQL LIKE with wildcards might match partial names)
            if (!isAdmin) {
                const filtered = result.recordset.filter(po => {
                    // Both reviewers (confirmedby_1 OR confirmedby_2) can see PO in FOR P.O. CONFIRMATION status
                    // regardless of whether confirmation dates are null
                    if (po.status === 'FOR P.O. CONFIRMATION') {
                        if (this.isUserInCommaSeparated(po.confirmedBy_1, userName) ||
                            this.isUserInCommaSeparated(po.confirmedBy_2, userName)) {
                            return true;
                        }
                    }

                    // User is approver: dateconfirmed_1 IS NOT NULL AND dateconfirmed_2 IS NOT NULL
                    if (po.status === 'FOR P.O. APPROVAL' && po.dateConfirmed_1 && po.dateConfirmed_2) {
                        if (this.isUserInCommaSeparated(po.approvedBy, userName)) {
                            return true;
                        }
                    }

                    return false;
                });

                console.log('Client-side filter - Input records:', result.recordset.length, 'Output records:', filtered.length);
                if (filtered.length > 0) {
                    console.log('First filtered PO:', filtered[0].id, filtered[0].status);
                }
                return filtered;
            }

            return result.recordset;
        } catch (error) {
            console.error('Error fetching purchase order evaluations:', error);
            return [];
        }
    }

    // Get purchase order details by PO number
    static async getPurchaseOrderDetails(poNumber) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if table exists
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.ORDERHEADER.1');
            const detailsExists = await this.checkTableExists(connection, 'PURCHASE.ORDERDETAILS.1');

            if (!headerExists || !detailsExists) {
                console.warn('PURCHASE.ORDERHEADER.1 or PURCHASE.ORDERDETAILS.1 table not found.');
                return null;
            }

            // Get header
            const headerQuery = `
                SELECT ROWID, PO_STATUS, POSTSTATUS, PONUMBER, DATECREATED, CREATEDBY, VENDORID, VENDNAME,
                       PYMTRMID, REFDOCTYPE, DELIVERY_TO, PODATE, DATENEEDED, PROMISEDDATE,
                       PROMISEDSHIPDATE, CANVASSEDBY, CONFIRMEDBY_1, DATECONFIRMED_1, CONFIRMEDBY_2, DATECONFIRMED_2, APPROVEDBY,
                       DATEAPPROVED, IS_BUDGETNO, IS_PRNO, CAPEX, IS_PERADVISE, REMARKS,
                       SUBTOTAL, BUDGETNOLIST, PRLISTS, PO_STATUS, CONTACTPERSON
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const headerResult = await connection.request()
                .input('poNumber', poNumber)
                .query(headerQuery);

            if (headerResult.recordset.length === 0) {
                return null;
            }

            const header = headerResult.recordset[0];

            // Get details
            const detailsQuery = `
                SELECT ROWID, PONUMBER, RID, PQCODE, PRCODE, ITEMNMBR, ITEMDESC, UOFM, QTYORDER, QTYCANCEL,
                       QTYALLOCATED, CURRENCY, UNITCOST, EXTDCOST, BRAND, ORIGIN, QTYSERVED, BUDGETNO
                FROM [PURCHASE.ORDERDETAILS.1]
                WHERE PONUMBER = @poNumber
                ORDER BY ROWID
            `;
            const detailsResult = await connection.request()
                .input('poNumber', poNumber)
                .query(detailsQuery);

            return {
                header: {
                    id: header.ROWID,
                    poStatus: header.PO_STATUS,
                    postStatus: header.POSTSTATUS,
                    poNumber: header.PONUMBER,
                    dateCreated: header.DATECREATED,
                    createdBy: header.CREATEDBY,
                    vendorId: header.VENDORID,
                    vendName: header.VENDNAME,
                    pymtrmid: header.PYMTRMID,
                    refDocType: header.REFDOCTYPE,
                    deliveryTo: header.DELIVERY_TO,
                    poDate: header.PODATE,
                    dateNeeded: header.DATENEEDED,
                    promisedDate: header.PROMISEDDATE,
                    promisedShipDate: header.PROMISEDSHIPDATE,
                    canvassedBy: header.CANVASSEDBY,
                    confirmedBy_1: header.CONFIRMEDBY_1,
                    dateConfirmed_1: header.DATECONFIRMED_1,
                    confirmedBy_2: header.CONFIRMEDBY_2,
                    dateConfirmed_2: header.DATECONFIRMED_2,
                    approvedBy: header.APPROVEDBY,
                    dateApproved: header.DATEAPPROVED,
                    isBudgetNo: header.IS_BUDGETNO,
                    isPrNo: header.IS_PRNO,
                    capex: header.CAPEX,
                    isPerAdvise: header.IS_PERADVISE,
                    remarks: header.REMARKS,
                    subtotal: header.SUBTOTAL,
                    budgetNoList: header.BUDGETNOLIST,
                    prList: header.PRLISTS,
                    contactPerson: header.CONTACTPERSON,
                    poStatus: header.PO_STATUS || 'PENDING',
                    confirmedBy: [header.CONFIRMEDBY_1, header.CONFIRMEDBY_2].filter(name => name && name.trim()).join(' / '),
                    dateConfirmed: header.DATECONFIRMED_1 || header.DATECONFIRMED_2,
                    currencyCode: detailsResult.recordset[0]?.CURRENCY || 'PHP'
                },
                details: detailsResult.recordset.map(detail => ({
                    id: detail.ROWID,
                    poNumber: detail.PONUMBER,
                    rid: detail.RID,
                    pqCode: detail.PQCODE,
                    prCode: detail.PRCODE,
                    ITEMNMBR: detail.ITEMNMBR,
                    ITEMDESC: detail.ITEMDESC,
                    UOFM: detail.UOFM,
                    QUANTITY: detail.QTYORDER,
                    qtyCancel: detail.QTYCANCEL,
                    qtyAllocated: detail.QTYALLOCATED,
                    currency: detail.CURRENCY,
                    unitPrice: detail.UNITCOST,
                    extdCost: detail.EXTDCOST,
                    brand: detail.BRAND,
                    origin: detail.ORIGIN,
                    qtyServed: detail.QTYSERVED,
                    budgetNo: detail.BUDGETNO
                }))
            };
        } catch (error) {
            console.error('Error fetching purchase order details:', error);
            return null;
        }
    }

    // Confirm purchase order
    static async confirmPurchaseOrder(poNumber, rid, confirmBy, isAdmin = false) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            // Check if PO exists and is in correct status
            const checkQuery = ` SELECT PO_STATUS, CONFIRMEDBY_1, CONFIRMEDBY_2, DATECONFIRMED_1, DATECONFIRMED_2 FROM [PURCHASE.ORDERHEADER.1] WHERE PONUMBER = @poNumber `;
            const checkResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            const currentStatus = checkResult.recordset[0].PO_STATUS;
            if (currentStatus !== 'FOR P.O. CONFIRMATION') {
                throw new Error('Purchase order is not in confirmation status');
            }

            const confirmedBy1 = checkResult.recordset[0].CONFIRMEDBY_1 || '';
            const confirmedBy2 = checkResult.recordset[0].CONFIRMEDBY_2 || '';
            const dateConfirmed1 = checkResult.recordset[0].DATECONFIRMED_1;
            const dateConfirmed2 = checkResult.recordset[0].DATECONFIRMED_2;

            let updateQuery;
            let newStatus = 'FOR P.O. CONFIRMATION';

            // Helper function to check if a smalldatetime field is empty
            const isDateEmpty = (dateValue) => {
                return dateValue === null || dateValue === undefined;
            };

            // Check if user is in CONFIRMEDBY_1 or CONFIRMEDBY_2
            const isUserInConfirmedBy1 = this.isUserInCommaSeparated(confirmedBy1, confirmBy);
            const isUserInConfirmedBy2 = this.isUserInCommaSeparated(confirmedBy2, confirmBy);

            const selectRid = ` SELECT RID FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber`;
            const selectRidResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(selectRid);
            const ridFromDetails = selectRidResult.recordset[0]?.RID;
            console.log(`RID from order details for PO ${poNumber}:`, ridFromDetails);

            // Determine which date field to update
            if (isUserInConfirmedBy1 && isDateEmpty(dateConfirmed1)) {
                // User matches CONFIRMEDBY_1 and hasn't confirmed yet
                updateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET DATECONFIRMED_1 = GETDATE() WHERE PONUMBER = @poNumber`;
                // Keep status as 'FOR P.O. CONFIRMATION' for second reviewer

            } else if (isUserInConfirmedBy2 && isDateEmpty(dateConfirmed2)) {
                // User matches CONFIRMEDBY_2 and hasn't confirmed yet
                updateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET DATECONFIRMED_2 = GETDATE() WHERE PONUMBER = @poNumber `;
                // Check if both dates are now confirmed before changing status
                // We'll check after the update

            } else if (isUserInConfirmedBy1 && !isDateEmpty(dateConfirmed1) && !isAdmin) {
                throw new Error('You have already confirmed this purchase order');
            } else if (isUserInConfirmedBy2 && !isDateEmpty(dateConfirmed2) && !isAdmin) {
                throw new Error('You have already confirmed this purchase order');
            } else if (isUserInConfirmedBy2 && isDateEmpty(dateConfirmed1) && !isAdmin) {
                throw new Error('Waiting for first confirmation before you can confirm');
            } else if (isUserInConfirmedBy1 && !isDateEmpty(dateConfirmed1) && isDateEmpty(dateConfirmed2) && !isAdmin) {
                throw new Error('You have already confirmed this purchase order');
            } else {
                // User doesn't match either CONFIRMEDBY field - treat as admin ascending order
                if (isDateEmpty(dateConfirmed1)) {
                    // Update dateConfirmed_1 first
                    updateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET DATECONFIRMED_1 = GETDATE() WHERE PONUMBER = @poNumber`;
                } else if (isDateEmpty(dateConfirmed2)) {
                    // Update dateConfirmed_2 second
                    updateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET DATECONFIRMED_2 = GETDATE() WHERE PONUMBER = @poNumber `;
                } else {
                    throw new Error('Both reviewers have already confirmed this purchase order');
                }
            }

            // Execute the update query
            await transaction.request()
                .input('poNumber', poNumber)
                .input('newStatus', newStatus)
                .query(updateQuery);

            // Check if both confirmations are done before updating status to FOR P.O. APPROVAL
            const checkBothQuery = ` SELECT DATECONFIRMED_1, DATECONFIRMED_2 FROM [PURCHASE.ORDERHEADER.1] WHERE PONUMBER = @poNumber `;
            const checkBothResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(checkBothQuery);

            const dateConf1 = checkBothResult.recordset[0].DATECONFIRMED_1;
            const dateConf2 = checkBothResult.recordset[0].DATECONFIRMED_2;

            // Only change status to FOR P.O. APPROVAL if:
            // 1. Both dates are confirmed (when there are 2 reviewers), OR
            // 2. First date is confirmed and there's no second reviewer
            const hasSecondReviewer = confirmedBy2 && confirmedBy2.trim() !== '';
            const shouldTransitionToApproval = hasSecondReviewer
                ? (!isDateEmpty(dateConf1) && confirmedBy1 !== '' && !isDateEmpty(dateConf2) && confirmedBy2 !== '')  // Both confirmed with 2 reviewers
                : (confirmedBy2 === '');  // Single reviewer - just need first confirmation

            if (shouldTransitionToApproval) {
                const getPrCodesFromDetailsQuery = `SELECT DISTINCT PRCODE FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber AND PRCODE IS NOT NULL AND PRCODE != ''`;
                const prCodesFromDetailsResult = await transaction.request()
                    .input('poNumber', poNumber)
                    .query(getPrCodesFromDetailsQuery);
                const prCodes = prCodesFromDetailsResult.recordset.map(r => r.PRCODE);
                console.log(`PO ${poNumber} PR codes from details:`, prCodes);

                const statusUpdateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET PO_STATUS = 'FOR P.O. APPROVAL' WHERE PONUMBER = @poNumber `;
                await transaction.request()
                    .input('poNumber', poNumber)
                    .query(statusUpdateQuery);

                const itemStatusQuery = ` UPDATE [PURCHASE.ORDERDETAILS.1] SET ITEMSTATUS = 'FOR P.O. APPROVAL' WHERE PONUMBER = @poNumber `;
                await transaction.request()
                    .input('poNumber', poNumber)
                    .query(itemStatusQuery);

                newStatus = 'FOR P.O. APPROVAL';

                console.log(`PO ${poNumber} PR codes to process:`, prCodes);
                for (const prCode of prCodes) {
                    try {
                        console.log(`Processing PR ${prCode} and RID ${rid} for PO ${poNumber}`);

                        // Get all RID values for this PO from order details
                        const getRidsQuery = `SELECT RID FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber AND PRCODE = @prCode`;
                        const ridsResult = await transaction.request()
                            .input('poNumber', poNumber)
                            .input('prCode', prCode)
                            .query(getRidsQuery);

                        const rids = ridsResult.recordset.map(r => r.RID);
                        console.log(`RIDs for PR ${prCode}:`, rids);

                        // Update each RID individually
                        for (const ridToUpdate of rids) {
                            console.log(`Updating item with RID ${ridToUpdate} to FOR P.O. APPROVAL`);
                            const updateItemStatusQuery = `UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'FOR P.O. APPROVAL' WHERE RID = @rid`;

                            const updateResult = await transaction.request()
                                .input('rid', ridToUpdate)
                                .query(updateItemStatusQuery);
                            console.log(`Updated item with RID ${ridToUpdate}, rows affected:`, updateResult.rowsAffected);
                        }

                        let checkAllItemStatusQuery = `SELECT rd.ITEMSTATUS as itemStatus FROM [PURCHASE.REQUESTDETAILS.1] rd INNER JOIN [PURCHASE.ORDERDETAILS.1] od ON rd.RID = od.RID WHERE od.PONUMBER = @poNumber`;
                        const checkResult = await transaction.request()
                            .input('poNumber', poNumber)
                            .query(checkAllItemStatusQuery);

                        const allStatuses = checkResult.recordset.map(record => record.itemStatus);
                        console.log(`PR ${prCode} item statuses after update:`, allStatuses);
                        const advancedStatuses = ['P.O. APPROVED', 'P.O. SUBMITTED'];

                        const noneHaveAdvancedStatus = !allStatuses.some(status => advancedStatuses.includes(status));
                        console.log(`PR ${prCode} noneHaveAdvancedStatus:`, noneHaveAdvancedStatus);

                        if (noneHaveAdvancedStatus) {
                            console.log(`Updating PR ${prCode} header status to FOR P.O. APPROVAL`);
                            const updateRequestStatusQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] SET REQUESTSTATUS = 'FOR P.O. APPROVAL' WHERE REFERENCENO = @prCode`;
                            await transaction.request()
                                .input('prCode', prCode)
                                .query(updateRequestStatusQuery);

                            // Create notification and email for the requester
                            try {
                                // Get requester from PR header
                                const requesterQuery = `SELECT REQUESTEDBY FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @prCode`;
                                const requesterResult = await transaction.request()
                                    .input('prCode', prCode)
                                    .query(requesterQuery);

                                const approverQuer = `SELECT APPROVEDBY FROM [PURCHASE.ORDERHEADER.1] WHERE PONUMBER = @poNumber`;
                                const approverResult = await transaction.request()
                                    .input('poNumber', poNumber)
                                    .query(approverQuer);

                                if (requesterResult.recordset.length > 0) {
                                    const requester = requesterResult.recordset[0].REQUESTEDBY;
                                    const approver = approverResult.recordset.length > 0 ? approverResult.recordset[0].APPROVEDBY : null;
                                    // Create in-app notification
                                    const notification = new Notification(
                                        'FOR P.O. APPROVAL',
                                        `PO NO. ${poNumber} is now ready for P.O. approval.`,
                                        requester
                                    );
                                    await notification.save(confirmBy);
                                    console.log(`Notification created for requester ${requester} on PR ${prCode}`);

                                    const notifyApprover = new Notification(
                                        'FOR P.O. APPROVAL',
                                        `PR NO. ${prCode} is now ready for P.O. approval.`,
                                        approver
                                    );
                                    await notifyApprover.save(confirmBy);

                                    // Send email notification
                                    let requesterEmail = null;
                                    if (requester.includes('@')) {
                                        requesterEmail = requester;
                                        console.log('Requester is already an email:', requesterEmail);
                                    } else {
                                        // Look up email by employee name
                                        try {
                                            const gdbConnection = await connectToDatabase(process.env.DB_NAME);
                                            const userQuery = `SELECT EMAIL FROM [SYSTEM.USERACCOUNT.1] WHERE EMPLOYEENAME = @requester`;
                                            const userResult = await gdbConnection.request()
                                                .input('requester', requester)
                                                .query(userQuery);
                                            requesterEmail = userResult.recordset.length > 0 ? userResult.recordset[0].EMAIL : null;
                                            console.log('Requester email:', requesterEmail);
                                        } catch (emailError) {
                                            console.error('Error fetching requester email:', emailError);
                                        }
                                    }
                                    if (requesterEmail) {
                                        const emailData = {
                                            email: requesterEmail,
                                            name: requester,
                                            subject: 'P.O. Request For Approval',
                                            companyName: 'SANTEH',
                                            greeting: 'Hello',
                                            body: `We are pleased to inform you that Purchase Order No. <strong style="font-size:20px;color:#2563eb;">${poNumber}</strong> has been confirmed and is now ready for approval.`,
                                            buttonText: 'View Request',
                                            buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/procurement/request-evaluation`,
                                            companyEmail: 'jcvalencia@santehfeeds.com',
                                            companyPhone: '123-456-7890',
                                            unsubscribeUrl: '#',
                                            preferencesUrl: '#'
                                        };
                                        console.log('Sending email to:', requesterEmail);
                                        await sendEmailWithTemplate(emailData);
                                        console.log('Email sent successfully');
                                    } else {
                                        console.log('No email found for requester:', requester);
                                    }

                                    // Send email notification to approver
                                    let approverEmail = null;
                                    if (approver && approver.includes('@')) {
                                        approverEmail = approver;
                                        console.log('Approver is already an email:', approverEmail);
                                    } else if (approver) {
                                        // Look up email by employee name
                                        try {
                                            const gdbConnection = await connectToDatabase(process.env.DB_NAME);
                                            const userQuery = `SELECT EMAIL FROM [SYSTEM.USERACCOUNT.1] WHERE EMPLOYEENAME = @approver`;
                                            const userResult = await gdbConnection.request()
                                                .input('approver', approver)
                                                .query(userQuery);
                                            approverEmail = userResult.recordset.length > 0 ? userResult.recordset[0].EMAIL : null;
                                            console.log('Approver email:', approverEmail);
                                        } catch (emailError) {
                                            console.error('Error fetching approver email:', emailError);
                                        }
                                    }
                                    if (approverEmail) {
                                        const emailData = {
                                            email: approverEmail,
                                            name: approver,
                                            subject: 'P.O. Request For Approval',
                                            companyName: 'SANTEH',
                                            greeting: 'Hello',
                                            body: `A purchase order <strong style="font-size:20px;color:#2563eb;">${poNumber}</strong> has been submitted and is waiting for your approval. Please review and approve the purchase order at your earliest convenience.`,
                                            buttonText: 'View Request',
                                            buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/procurement/request-evaluation`,
                                            companyEmail: 'jcvalencia@santehfeeds.com',
                                            companyPhone: '123-456-7890',
                                            unsubscribeUrl: '#',
                                            preferencesUrl: '#'
                                        };
                                        console.log('Sending email to:', approverEmail);
                                        await sendEmailWithTemplate(emailData);
                                        console.log('Email sent successfully');
                                    } else {
                                        console.log('No email found for approver:', approver);
                                    }
                                }
                            } catch (notificationError) {
                                console.error(`Error creating notification/email for PR ${prCode}:`, notificationError);
                            }
                        } else {
                            console.log(`Skipping PR ${prCode} header update - has advanced statuses`);
                        }
                    } catch (prError) {
                        console.error(`Error processing PR ${prCode} for PO ${poNumber}:`, prError);
                        // Continue with other PRs
                    }
                }

                console.log(`Completed updating PR statuses for PO ${poNumber}`);

            }

            await transaction.commit();

            // Broadcast the update for real-time UI
            broadcastRequestEvaluationUpdate("po-confirmed", {
                poNumber: poNumber,
                newStatus: newStatus,
                confirmedBy: confirmBy
            });

            return {
                success: true,
                message: 'Purchase order confirmed successfully',
                newStatus: newStatus
            };
        } catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }
            console.error('Error confirming purchase order:', error);
            throw error;
        }
    }

    // Approve purchase order
    static async approvePurchaseOrder(poNumber, approvedBy) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            // Check if PO exists and is in correct status
            const checkQuery = ` SELECT PO_STATUS, APPROVEDBY FROM [PURCHASE.ORDERHEADER.1] WHERE PONUMBER = @poNumber `;
            const checkResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            const currentStatus = checkResult.recordset[0].PO_STATUS;
            if (currentStatus !== 'FOR P.O. APPROVAL') {
                throw new Error('Purchase order is not in approval status');
            }

            // Get current APPROVEDBY and append new approver
            let currentApprovedBy = checkResult.recordset[0].APPROVEDBY || '';
            let newApprovedBy = currentApprovedBy;

            if (currentApprovedBy && !this.isUserInCommaSeparated(currentApprovedBy, approvedBy)) {
                newApprovedBy = currentApprovedBy + ', ' + approvedBy;
            } else if (!currentApprovedBy) {
                newApprovedBy = approvedBy;
            }

            // Update the PO
            const updateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET DATEAPPROVED = GETDATE(), PO_STATUS = 'P.O. APPROVED' WHERE PONUMBER = @poNumber `;

            await transaction.request()
                .input('poNumber', poNumber)
                .query(updateQuery);

            const updateItemStatusQuery = ` UPDATE [PURCHASE.ORDERDETAILS.1] SET ITEMSTATUS = 'P.O. APPROVED' WHERE poNumber = @poNumber `;
            await transaction.request()
                .input('poNumber', poNumber)
                .query(updateItemStatusQuery);

            // Get PR codes from ORDERDETAILS
            const getPrCodesQuery = `SELECT DISTINCT PRCODE FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber AND PRCODE IS NOT NULL AND PRCODE != ''`;
            const prCodesResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(getPrCodesQuery);

            const prCodes = prCodesResult.recordset.map(r => r.PRCODE);

            for (const prCode of prCodes) {
                // Get all RID values for this PO from order details
                const getRidsQuery = `SELECT RID FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber AND PRCODE = @prCode`;
                const ridsResult = await transaction.request()
                    .input('poNumber', poNumber)
                    .input('prCode', prCode)
                    .query(getRidsQuery);

                const rids = ridsResult.recordset.map(r => r.RID);
                console.log(`RIDs for PR ${prCode}:`, rids);

                // Update each RID individually
                for (const ridToUpdate of rids) {
                    console.log(`Updating item with RID ${ridToUpdate} to P.O. APPROVED`);
                    const updateItemStatusQuery = `UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'P.O. APPROVED' WHERE RID = @rid`;

                    const updateResult = await transaction.request()
                        .input('rid', ridToUpdate)
                        .query(updateItemStatusQuery);
                    console.log(`Updated item with RID ${ridToUpdate}, rows affected:`, updateResult.rowsAffected);
                }

                let checkAllItemStatusQuery = `SELECT rd.ITEMSTATUS as itemStatus FROM [PURCHASE.REQUESTDETAILS.1] rd INNER JOIN [PURCHASE.ORDERDETAILS.1] od ON rd.RID = od.RID WHERE od.PONUMBER = @poNumber`;

                const checkStatus = await transaction.request()
                    .input('poNumber', poNumber)
                    .query(checkAllItemStatusQuery);

                const allStatuses = checkStatus.recordset.map(record => record.itemStatus);
                const advancedStatuses = ['P.O. SUBMITTED'];

                const noneHaveAdvancedStatus = !allStatuses.some(status => advancedStatuses.includes(status));
                if (noneHaveAdvancedStatus) {
                    const updateRequestStatusQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] SET REQUESTSTATUS = 'P.O. APPROVED' WHERE REFERENCENO = @prCode`;
                    await transaction.request()
                        .input('prCode', prCode)
                        .query(updateRequestStatusQuery);

                    try {
                        // Get requester from PR header
                        const requesterQuery = `SELECT REQUESTEDBY FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @prCode`;
                        const requesterResult = await transaction.request()
                            .input('prCode', prCode)
                            .query(requesterQuery);

                        if (requesterResult.recordset.length > 0) {
                            const requester = requesterResult.recordset[0].REQUESTEDBY;

                            // Create in-app notification
                            const notification = new Notification(
                                'FOR Receiving',
                                `PO NO. ${poNumber} is now ready for Receiving.`,
                                requester
                            );
                            await notification.save(approvedBy);
                            console.log(`Notification created for requester ${requester} on PR ${prCode}`);

                            // Send email notification
                            let requesterEmail = null;
                            if (requester.includes('@')) {
                                requesterEmail = requester;
                                console.log('Requester is already an email:', requesterEmail);
                            } else {
                                // Look up email by employee name
                                try {
                                    const gdbConnection = await connectToDatabase(process.env.DB_NAME);
                                    const userQuery = `SELECT EMAIL FROM [SYSTEM.USERACCOUNT.1] WHERE EMPLOYEENAME = @requester`;
                                    const userResult = await gdbConnection.request()
                                        .input('requester', requester)
                                        .query(userQuery);
                                    requesterEmail = userResult.recordset.length > 0 ? userResult.recordset[0].EMAIL : null;
                                    console.log('Requester email:', requesterEmail);
                                } catch (emailError) {
                                    console.error('Error fetching requester email:', emailError);
                                }
                            }
                            if (requesterEmail) {
                                const emailData = {
                                    email: requesterEmail,
                                    name: requester,
                                    subject: 'P.O. Request For Receiving',
                                    companyName: 'SANTEH',
                                    greeting: 'Hello',
                                    body: `We are pleased to inform you that Purchase Order No. <strong style="font-size:20px;color:#2563eb;">${poNumber}</strong> has been approved and is now ready for receiving.`,
                                    buttonText: 'View Request',
                                    buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/procurement/request-evaluation`,
                                    companyEmail: 'jcvalencia@santehfeeds.com',
                                    companyPhone: '123-456-7890',
                                    unsubscribeUrl: '#',
                                    preferencesUrl: '#'
                                };
                                console.log('Sending email to:', requesterEmail);
                                await sendEmailWithTemplate(emailData);
                                console.log('Email sent successfully');
                            } else {
                                console.log('No email found for requester:', requester);
                            }
                        }
                    } catch (notificationError) {
                        console.error(`Error creating notification/email for PR ${prCode}:`, notificationError);
                    }
                }
            }

            await transaction.commit();

            // Broadcast the update for real-time UI
            broadcastRequestEvaluationUpdate("po-approved", {
                poNumber: poNumber,
                newStatus: 'P.O. APPROVED',
                approvedBy: approvedBy
            });

            return {
                success: true,
                message: 'Purchase order approved successfully',
                newStatus: 'P.O. APPROVED'
            };
        } catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }
            console.error('Error approving purchase order:', error);
            throw error;
        }
    }

    // Reject purchase order
    static async rejectPurchaseOrder(poNumber, rejectedBy, reason, rejectionType = 'PO') {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            let newStatus = 'P.O. REJECTED';

            // Handle different rejection types
            switch (rejectionType) {
                case 'PR':
                    newStatus = 'P.R. REJECTED FROM P.O.';
                    break;
                case 'PO':
                default:
                    newStatus = 'P.O. REJECTED';
                    break;
            }

            // Update the PO status to rejected
            const updateQuery = ` UPDATE [PURCHASE.ORDERHEADER.1] SET PO_STATUS = @newStatus,
                                  REJECTREMARKS = @reason, DATEMODIFIED = GETDATE(), MODIFIEDBY = @rejectedBy
                                  WHERE PONUMBER = @poNumber `;

            const result = await transaction.request()
                .input('poNumber', poNumber)
                .input('reason', reason)
                .input('rejectedBy', rejectedBy)
                .input('newStatus', newStatus)
                .query(updateQuery);

            // Update each item's QTYCANCEL to its own QTYORDER value
            const updateItemStatusQuery = ` UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYCANCEL = QTYORDER WHERE PONUMBER = @poNumber `;
            await transaction.request()
                .input('poNumber', poNumber)
                .input('newStatus', newStatus)
                .query(updateItemStatusQuery);

            // Get PO details for related updates
            const getDetailsQuery = `SELECT PQCODE, RID, QTYORDER FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber`;
            const detailsResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(getDetailsQuery);

            if (detailsResult.recordset.length > 0) {
                switch (rejectionType) {
                    case 'PR':
                        // Update each request detail item with its corresponding QTYORDER
                        for (const detail of detailsResult.recordset) {
                            if (detail.RID) {
                                const updatePrQuery = ` UPDATE [PURCHASE.REQUESTDETAILS.1] 
                                                        SET ITEMSTATUS = @newStatus, 
                                                            QTYCANCEL = @itemQtyCancel 
                                                        WHERE RID = @rid `;
                                const ridRequest = transaction.request();
                                ridRequest.input('newStatus', newStatus);
                                ridRequest.input('itemQtyCancel', detail.QTYORDER || 0);
                                ridRequest.input('rid', detail.RID);
                                await ridRequest.query(updatePrQuery);
                            }
                        }
                        break;
                }
            }
            await transaction.commit();

            // Broadcast the update for real-time UI
            broadcastRequestEvaluationUpdate("po-rejected", {
                poNumber: poNumber,
                newStatus: newStatus,
                rejectedBy: rejectedBy,
                reason: reason
            });

            return {
                success: result.rowsAffected[0] > 0,
                message: 'Purchase order rejected successfully'
            };
        } catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }
            console.error('Error rejecting purchase order:', error);
            throw error;
        }
    }
    //#endregion
}

export default RequestEvaluation;
