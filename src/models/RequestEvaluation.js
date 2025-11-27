import connectToDatabase from '@/lib/db.js';

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
}

export default RequestEvaluation;
