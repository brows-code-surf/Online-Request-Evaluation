import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';
import Notification from './Notification.js';

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
    static async getRequestEvaluationStatusBreakdown() {
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
                    CASE
                        WHEN PRH.IS_POSTED = 0 AND PRH.REQUESTSTATUS != 'CANCELLED' THEN 'FOR POSTING'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR CONFIRMATION' THEN 'FOR CONFIRMATION'
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
                GROUP BY
                    CASE
                        WHEN PRH.IS_POSTED = 0 AND PRH.REQUESTSTATUS != 'CANCELLED' THEN 'FOR POSTING'
                        WHEN LTRIM(RTRIM(PRH.REQUESTSTATUS)) = 'FOR CONFIRMATION' THEN 'FOR CONFIRMATION'
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
    static async getThirtyDayRequestsTrend(days = 30) {
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
                WHERE DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                GROUP BY CAST(DATEREQUESTED AS DATE)
                ORDER BY CAST(DATEREQUESTED AS DATE)
            `;

            const result = await connection.request().query(query);

            // Create array for last N days with zero-fill for missing dates
            const trendDays = [];
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

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
            console.error(`Error fetching ${days}-day requests trend:`, error);
            // Return array with zeros for all days
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                requests: 0
            }));
        }
    }

    // User-specific methods for non-admin dashboard

    // Get user's request evaluation status breakdown (for requests they created)
    static async getUserRequestEvaluationStatusBreakdown(createdBy) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if tables exist
            const headerExists = await this.checkTableExists(connection, 'PURCHASE.REQUESTHEADER.1');
            if (!headerExists) {
                console.warn('PURCHASE.REQUESTHEADER.1 table not found.');
                return [];
            }

            const query = `
                SELECT
                    CASE
                        WHEN PRH.REQUESTSTATUS = 'FOR POSTING' THEN 'FOR POSTING'
                        WHEN PRH.REQUESTSTATUS = 'FOR CONFIRMATION' THEN 'FOR CONFIRMATION'
                        WHEN PRH.REQUESTSTATUS = 'FOR REQUEST APPROVAL' THEN 'FOR REQUEST APPROVAL'
                        WHEN PRH.REQUESTSTATUS = 'FOR CANVASSING' THEN 'FOR CANVASSING'
                        WHEN PRH.REQUESTSTATUS = 'FOR PURCHASING LEAD TIME' THEN 'FOR PURCHASING LEAD TIME'
                        WHEN PRH.REQUESTSTATUS = 'APPROVED' THEN 'APPROVED'
                        WHEN PRH.REQUESTSTATUS = 'REJECTED' THEN 'REJECTED'
                        ELSE LTRIM(RTRIM(PRH.REQUESTSTATUS))
                    END as status,
                    COUNT(DISTINCT PRH.REFERENCENO) as count
                FROM [PURCHASE.REQUESTHEADER.1] PRH
                WHERE PRH.REQUESTEDBY = @createdBy
                GROUP BY
                    CASE
                        WHEN PRH.REQUESTSTATUS = 'FOR POSTING' THEN 'FOR POSTING'
                        WHEN PRH.REQUESTSTATUS = 'FOR CONFIRMATION' THEN 'FOR CONFIRMATION'
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
    static async getUserThirtyDayRequestsTrend(createdBy, days = 30) {
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
                WHERE DATEREQUESTED >= DATEADD(DAY, -${days}, GETDATE())
                AND REQUESTEDBY = @createdBy
                GROUP BY CAST(DATEREQUESTED AS DATE)
                ORDER BY CAST(DATEREQUESTED AS DATE)
            `;

            const result = await connection.request()
                .input('createdBy', createdBy)
                .query(query);

            // Create array for last N days with zero-fill for missing dates
            const trendDays = [];
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

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
            console.error(`Error fetching user ${days}-day requests trend:`, error);
            // Return array with zeros for all days
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - ((days - 1) - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                requests: 0
            }));
        }
    }
    //#endregion

//#region PURCHASE ORDER

    // Helper function to check if user is in comma-separated field
    static isUserInCommaSeparated(fieldValue, userName) {
        if (!fieldValue || !userName) return false;
        const names = fieldValue.split(',').map(n => n.trim());
        return names.includes(userName);
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
                    h.CONFIRMEDBY_1,
                    h.DATECONFIRMED_1,
                    h.CONFIRMEDBY_2,
                    h.DATECONFIRMED_2,
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
                // We need to check multiple conditions in SQL to determine user's role
                query += ` AND (
                    -- User is confirmedby_1: confirmedby_1 = current user AND dateconfirmed_1 IS NULL
                    (h.CONFIRMEDBY_1 LIKE @userName AND h.DATECONFIRMED_1 IS NULL AND h.PO_STATUS = 'FOR P.O. CONFIRMATION')
                    OR
                    -- User is confirmedby_2: confirmedby_2 = current user AND dateconfirmed_1 IS NOT NULL AND dateconfirmed_2 IS NULL
                    (h.CONFIRMEDBY_2 LIKE @userName AND h.DATECONFIRMED_1 IS NOT NULL AND h.DATECONFIRMED_2 IS NULL AND h.PO_STATUS = 'FOR P.O. CONFIRMATION')
                    OR
                    -- User is approver: dateconfirmed_1 IS NOT NULL AND dateconfirmed_2 IS NOT NULL
                    (h.DATECONFIRMED_1 IS NOT NULL AND h.DATECONFIRMED_2 IS NOT NULL AND h.PO_STATUS = 'FOR P.O. APPROVAL' AND h.APPROVEDBY LIKE @userName)
                )`;
                
                // Use LIKE pattern for comma-separated names matching
                request.input('userName', `%${userName}%`);
            }

            query += ` GROUP BY h.ROWID, h.PONUMBER, h.PO_STATUS, h.DATECREATED, h.CREATEDBY,
                      h.VENDORID, h.VENDNAME, h.PYMTRMID, h.DELIVERY_TO, h.DATENEEDED,
                      h.CANVASSEDBY, h.CONFIRMEDBY_1, h.DATECONFIRMED_1, h.CONFIRMEDBY_2, h.DATECONFIRMED_2, h.APPROVEDBY, h.DATEAPPROVED,
                      h.REMARKS, h.POSTSTATUS
                      ORDER BY h.DATECREATED DESC`;

            const result = await request.query(query);
            console.log('PO query result:', result.recordset.length, 'records');
            if (result.recordset.length > 0) {
                console.log('First PO status:', result.recordset[0].status);
                console.log('First PO id:', result.recordset[0].id);
            }

            // For non-admin users, apply additional client-side filtering to ensure exact name matching
            // (since SQL LIKE with wildcards might match partial names)
            if (!isAdmin) {
                return result.recordset.filter(po => {
                    // User is confirmedby_1: confirmedby_1 contains current user AND dateconfirmed_1 IS NULL
                    if (po.status === 'FOR P.O. CONFIRMATION' && !po.dateConfirmed_1) {
                        if (this.isUserInCommaSeparated(po.confirmedBy_1, userName)) {
                            return true;
                        }
                    }
                    
                    // User is confirmedby_2: confirmedby_2 contains current user AND dateconfirmed_1 IS NOT NULL AND dateconfirmed_2 IS NULL
                    if (po.status === 'FOR P.O. CONFIRMATION' && po.dateConfirmed_1 && !po.dateConfirmed_2) {
                        if (this.isUserInCommaSeparated(po.confirmedBy_2, userName)) {
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
    static async confirmPurchaseOrder(poNumber, confirmBy, isAdmin = false) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            // Check if PO exists and is in correct status
            const checkQuery = `
                SELECT PO_STATUS, CONFIRMEDBY_1, CONFIRMEDBY_2, DATECONFIRMED_1, DATECONFIRMED_2 FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
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
            
            // Check if current user is in CONFIRMEDBY_1 or CONFIRMEDBY_2
            const isUserInConfirmedBy1 = this.isUserInCommaSeparated(confirmedBy1, confirmBy);
            const isUserInConfirmedBy2 = this.isUserInCommaSeparated(confirmedBy2, confirmBy);
            
            // Helper function to check if a smalldatetime field is empty
            const isDateEmpty = (dateValue) => {
                // For smalldatetime: null or undefined indicates empty
                // Date objects are truthy, so we only check for null/undefined
                return dateValue === null || dateValue === undefined;
            };
            
            // Admin can confirm at any stage (bypass role checks)
            if (isAdmin) {
                const isDate1Empty = isDateEmpty(dateConfirmed1);
                const isDate2Empty = isDateEmpty(dateConfirmed2);
                
                if (isDate1Empty) {
                    // First confirmation - update DATECONFIRMED_1
                    updateQuery = `
                        UPDATE [PURCHASE.ORDERHEADER.1]
                        SET DATECONFIRMED_1 = GETDATE(),
                            PO_STATUS = @newStatus
                        WHERE PONUMBER = @poNumber
                    `;
                    // Keep status as 'FOR P.O. CONFIRMATION' for second reviewer
                } else if (isDate2Empty && !isDate1Empty) {
                    // Second confirmation - update DATECONFIRMED_2
                    updateQuery = `
                        UPDATE [PURCHASE.ORDERHEADER.1]
                        SET DATECONFIRMED_2 = GETDATE(),
                            PO_STATUS = @newStatus
                        WHERE PONUMBER = @poNumber
                    `;
                    // Change status to 'FOR P.O. APPROVAL' after both confirm
                    newStatus = 'FOR P.O. APPROVAL';
                } else {
                    // Both dates are already filled
                    throw new Error('Both reviewers have already confirmed this purchase order');
                }
            } else if (isUserInConfirmedBy1 && isDateEmpty(dateConfirmed1)) {
                // User is in CONFIRMEDBY_1 and hasn't confirmed yet
                updateQuery = `
                    UPDATE [PURCHASE.ORDERHEADER.1]
                    SET DATECONFIRMED_1 = GETDATE(),
                        PO_STATUS = @newStatus
                    WHERE PONUMBER = @poNumber
                `;
                // Keep status as 'FOR P.O. CONFIRMATION' for second reviewer
            } else if (isUserInConfirmedBy2 && !isDateEmpty(dateConfirmed1) && isDateEmpty(dateConfirmed2)) {
                // User is in CONFIRMEDBY_2, first confirmation done, and hasn't confirmed yet
                updateQuery = `
                    UPDATE [PURCHASE.ORDERHEADER.1]
                    SET DATECONFIRMED_2 = GETDATE(),
                        PO_STATUS = @newStatus
                    WHERE PONUMBER = @poNumber
                `;
                // Change status to 'FOR P.O. APPROVAL' after both confirm
                newStatus = 'FOR P.O. APPROVAL';
            } else if (isUserInConfirmedBy1 && !isDateEmpty(dateConfirmed1)) {
                // User is in CONFIRMEDBY_1 but has already confirmed
                throw new Error('You have already confirmed this purchase order');
            } else if (isUserInConfirmedBy2 && !isDateEmpty(dateConfirmed2)) {
                // User is in CONFIRMEDBY_2 but has already confirmed
                throw new Error('You have already confirmed this purchase order');
            } else if (isUserInConfirmedBy2 && isDateEmpty(dateConfirmed1)) {
                // User is in CONFIRMEDBY_2 but first confirmation not done yet
                throw new Error('Waiting for first confirmation before you can confirm');
            } else {
                // User is not in either CONFIRMEDBY field and not admin
                throw new Error('You are not authorized to confirm this purchase order');
            }
            
            // Execute the update query
            await transaction.request()
                .input('poNumber', poNumber)
                .input('newStatus', newStatus)
                .query(updateQuery);

            await transaction.commit();

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
            const checkQuery = `
                SELECT PO_STATUS, APPROVEDBY FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
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
            const updateQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET DATEAPPROVED = GETDATE(),
                    PO_STATUS = 'P.O. APPROVED'
                WHERE PONUMBER = @poNumber
            `;

            await transaction.request()
                .input('poNumber', poNumber)
                .query(updateQuery);

            await transaction.commit();

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
    static async rejectPurchaseOrder(poNumber, rejectedBy, reason) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            // Update the PO status to rejected
            const updateQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET PO_STATUS = 'P.O. REJECTED',
                    CANCELREMARKS = @reason,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @rejectedBy
                WHERE PONUMBER = @poNumber
            `;

            const result = await transaction.request()
                .input('poNumber', poNumber)
                .input('reason', reason)
                .input('rejectedBy', rejectedBy)
                .query(updateQuery);

            await transaction.commit();

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
