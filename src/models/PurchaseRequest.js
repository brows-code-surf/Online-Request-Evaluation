'use server';

import 'server-only';
import connectToDatabase from '@/lib/db.js';

class PurchaseRequest {
    // Get all purchase requests with filtering and role-based access
    static async getAllPurchaseRequests(filters = {}, user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT DISTINCT
                    PRH.ROWID,
                    PRH.COMPANY,
                    PRH.REQUESTTYPE,
                    PRH.REFERENCENUM,
                    PRH.REFERENCENO,
                    PRH.REQUESTSTATUS,
                    PRH.LOCNCODE,
                    PRH.DATEREQUESTED,
                    PRH.REQUESTEDBY,
                    PRH.REVIEWER,
                    PRH.REVIEWEDBY,
                    PRH.DATEREVIEWED,
                    PRH.APPROVER,
                    PRH.APPROVEDBY,
                    PRH.DATEAPPROVED,
                    PRH.ADDRESSEDTO,
                    PRH.RECEIVEDBY,
                    PRH.DATERECEIVED,
                    PRH.REMARKS,
                    PRH.IS_RUSH,
                    PRH.CREATEDBY,
                    PRH.DATECREATED,
                    PRH.IS_READ
                FROM [PURCHASE.REQUESTHEADER.1] PRH
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by requested by (only show PRs created by the user)
            if (user) {
                const userName = user.empName;
                query += ` AND UPPER(PRH.REQUESTEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            // Apply filters
            if (filters.status) {
                query += ` AND PRH.REQUESTSTATUS = @status${paramIndex}`;
                params.push({ name: `status${paramIndex}`, value: filters.status });
                paramIndex++;
            }

            if (filters.requestType) {
                query += ` AND PRH.REQUESTTYPE = @requestType${paramIndex}`;
                params.push({ name: `requestType${paramIndex}`, value: filters.requestType });
                paramIndex++;
            }

            if (filters.company) {
                query += ` AND PRH.COMPANY = @company${paramIndex}`;
                params.push({ name: `company${paramIndex}`, value: filters.company });
                paramIndex++;
            }

            if (filters.isRush) {
                query += ` AND PRH.IS_RUSH = @isRush${paramIndex}`;
                params.push({ name: `isRush${paramIndex}`, value: filters.isRush });
                paramIndex++;
            }

            if (filters.referenceNo) {
                query += ` AND PRH.REFERENCENO LIKE @referenceNo${paramIndex}`;
                params.push({ name: `referenceNo${paramIndex}`, value: `%${filters.referenceNo}%` });
                paramIndex++;
            }

            query += ` ORDER BY PRH.DATECREATED DESC, PRH.REFERENCENO DESC`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                company: record.COMPANY,
                requestType: record.REQUESTTYPE,
                referenceNum: record.REFERENCENUM,
                referenceNo: record.REFERENCENO,
                requestStatus: record.REQUESTSTATUS,
                locationCode: record.LOCNCODE,
                dateRequested: record.DATEREQUESTED,
                requestedBy: record.REQUESTEDBY,
                reviewer: record.REVIEWER,
                reviewedBy: record.REVIEWEDBY,
                dateReviewed: record.DATEREVIEWED,
                approver: record.APPROVER,
                approvedBy: record.APPROVEDBY,
                dateApproved: record.DATEAPPROVED,
                addressedTo: record.ADDRESSEDTO,
                receivedBy: record.RECEIVEDBY,
                dateReceived: record.DATERECEIVED,
                remarks: record.REMARKS,
                isRush: record.IS_RUSH,
                createdBy: record.CREATEDBY,
                dateCreated: record.DATECREATED,
                isRead: record.IS_READ
            }));
        } catch (error) {
            console.error('Error fetching purchase requests:', error);
            throw new Error('Failed to fetch purchase requests: ' + error.message);
        }
    }

    // Get purchase request by reference number with details
    static async getPurchaseRequestByReferenceNo(referenceNo, user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check access permissions - only allow if user is the requester
            if (user) {
                const userName = user.empName;
                const accessQuery = `
                    SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1]
                    WHERE REFERENCENO = @referenceNo AND UPPER(REQUESTEDBY) = UPPER(@userName)
                `;
                const accessResult = await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('userName', userName)
                    .query(accessQuery);

                if (accessResult.recordset[0].count === 0) {
                    throw new Error('Access denied: You can only view purchase requests you created');
                }
            }

            // Get header
            const headerQuery = `
                SELECT * FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;
            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(headerQuery);

            if (headerResult.recordset.length === 0) {
                throw new Error('Purchase request not found');
            }

            const header = headerResult.recordset[0];

            // Get details
            const detailsQuery = `
                SELECT * FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE REFERENCENO = @referenceNo
                ORDER BY ROWID
            `;
            const detailsResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(detailsQuery);

            return {
                header: {
                    id: header.ROWID,
                    company: header.COMPANY,
                    requestType: header.REQUESTTYPE,
                    referenceNum: header.REFERENCENUM,
                    referenceNo: header.REFERENCENO,
                    requestStatus: header.REQUESTSTATUS,
                    locationCode: header.LOCNCODE,
                    dateRequested: header.DATEREQUESTED,
                    requestedBy: header.REQUESTEDBY,
                    reviewer: header.REVIEWER,
                    reviewedBy: header.REVIEWEDBY,
                    dateReviewed: header.DATEREVIEWED,
                    approver: header.APPROVER,
                    approvedBy: header.APPROVEDBY,
                    dateApproved: header.DATEAPPROVED,
                    addressedTo: header.ADDRESSEDTO,
                    receivedBy: header.RECEIVEDBY,
                    dateReceived: header.DATERECEIVED,
                    remarks: header.REMARKS,
                    isRush: header.IS_RUSH,
                    createdBy: header.CREATEDBY,
                    dateCreated: header.DATECREATED,
                    isRead: header.IS_READ
                },
                details: detailsResult.recordset.map(detail => ({
                    id: detail.ROWID,
                    referenceNo: detail.REFERENCENO,
                    itemStatus: detail.ITEMSTATUS,
                    itemNumber: detail.ITEMNMBR,
                    itemDescription: detail.ITEMDESC,
                    rid: detail.RID,
                    unitOfMeasure: detail.UOFM,
                    quantity: detail.QUANTITY,
                    budgetName: detail.BUDGETNAME,
                    remarks: detail.REMARKS,
                    dateNeeded: detail.DATENEEDED
                }))
            };
        } catch (error) {
            console.error('Error fetching purchase request:', error);
            throw new Error('Failed to fetch purchase request: ' + error.message);
        }
    }

    // Create new purchase request
    static async createPurchaseRequest(headerData, detailsData, creatorName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Generate reference number (you might want to customize this logic)
            const referenceNo = `PR-${Date.now()}`;

            // Insert header
            const headerQuery = `
                INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                    COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                    LOCNCODE, DATEREQUESTED, REQUESTEDBY, REVIEWER, APPROVER,
                    ADDRESSEDTO, REMARKS, IS_RUSH, CREATEDBY, DATECREATED, IS_READ
                ) VALUES (
                    @company, @requestType, @referenceNum, @referenceNo, 'FOR CONFIRMATION',
                    @locationCode, GETDATE(), @requestedBy, @reviewer, @approver,
                    @addressedTo, @remarks, @isRush, @createdBy, GETDATE(), 0
                )
            `;

            await connection.request()
                .input('company', headerData.company)
                .input('requestType', headerData.requestType)
                .input('referenceNum', headerData.referenceNum || '')
                .input('referenceNo', referenceNo)
                .input('locationCode', headerData.locationCode)
                .input('requestedBy', creatorName)
                .input('reviewer', headerData.reviewer)
                .input('approver', headerData.approver)
                .input('addressedTo', headerData.addressedTo)
                .input('remarks', headerData.remarks || '')
                .input('isRush', headerData.isRush || 0)
                .input('createdBy', creatorName)
                .query(headerQuery);

            // Insert details
            for (const detail of detailsData) {
                const detailQuery = `
                    INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                        REFERENCENO, ITEMSTATUS, ITEMNMBR, ITEMDESC, RID,
                        UOFM, QUANTITY, BUDGETNAME, REMARKS, DATENEEDED
                    ) VALUES (
                        @referenceNo, 'FOR CONFIRMATION', @itemNumber, @itemDescription, @rid,
                        @unitOfMeasure, @quantity, @budgetName, @remarks, @dateNeeded
                    )
                `;

                await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('rid', detail.rid || '')
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('budgetName', detail.budgetName)
                    .input('remarks', detail.remarks || '')
                    .input('dateNeeded', detail.dateNeeded)
                    .query(detailQuery);
            }

            return referenceNo;
        } catch (error) {
            console.error('Error creating purchase request:', error);
            throw new Error('Failed to create purchase request: ' + error.message);
        }
    }

    // Update purchase request status (review, approve, receive)
    static async updatePurchaseRequestStatus(referenceNo, action, userName, remarks = '') {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let updateQuery = '';
            let statusUpdate = '';

            switch (action) {
                case 'review':
                    updateQuery = `
                        UPDATE [PURCHASE.REQUESTHEADER.1]
                        SET REQUESTSTATUS = 'FOR REQUEST APPROVAL',
                            REVIEWEDBY = @userName,
                            DATEREVIEWED = GETDATE(),
                            IS_READ = 0
                        WHERE REFERENCENO = @referenceNo
                    `;
                    statusUpdate = "UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'FOR REQUEST APPROVAL' WHERE REFERENCENO = @referenceNo";
                    break;

                case 'approve':
                    updateQuery = `
                        UPDATE [PURCHASE.REQUESTHEADER.1]
                        SET REQUESTSTATUS = 'FOR PURCHASING LEAD TIME',
                            APPROVEDBY = @userName,
                            DATEAPPROVED = GETDATE(),
                            IS_READ = 0
                        WHERE REFERENCENO = @referenceNo
                    `;
                    statusUpdate = "UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'FOR PURCHASING LEAD TIME' WHERE REFERENCENO = @referenceNo";
                    break;

                case 'receive':
                    updateQuery = `
                        UPDATE [PURCHASE.REQUESTHEADER.1]
                        SET REQUESTSTATUS = 'COMPLETED',
                            RECEIVEDBY = @userName,
                            DATERECEIVED = GETDATE(),
                            IS_READ = 1
                        WHERE REFERENCENO = @referenceNo
                    `;
                    statusUpdate = "UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'COMPLETED' WHERE REFERENCENO = @referenceNo";
                    break;

                case 'reject':
                    updateQuery = `
                        UPDATE [PURCHASE.REQUESTHEADER.1]
                        SET REQUESTSTATUS = 'REJECTED',
                            IS_READ = 1
                        WHERE REFERENCENO = @referenceNo
                    `;
                    statusUpdate = "UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'REJECTED' WHERE REFERENCENO = @referenceNo";
                    break;

                default:
                    throw new Error('Invalid action');
            }

            await connection.request()
                .input('referenceNo', referenceNo)
                .input('userName', userName)
                .query(updateQuery);

            await connection.request()
                .input('referenceNo', referenceNo)
                .query(statusUpdate);

            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @userName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Request ${referenceNo} ${action}ed by ${userName}`)
                .input('userName', userName)
                .query(activityQuery);

            return true;
        } catch (error) {
            console.error('Error updating purchase request status:', error);
            throw new Error('Failed to update purchase request status: ' + error.message);
        }
    }

    // Get purchase request statistics
    static async getPurchaseRequestStats(user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                    REQUESTSTATUS,
                    COUNT(*) as count
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by requested by (only show stats for PRs created by the user)
            if (user) {
                const userName = user.empName;
                query += ` AND UPPER(REQUESTEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            query += ` GROUP BY REQUESTSTATUS`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);

            const stats = {};
            result.recordset.forEach(record => {
                stats[record.REQUESTSTATUS] = record.count;
            });

            return stats;
        } catch (error) {
            console.error('Error fetching purchase request stats:', error);
            throw new Error('Failed to fetch purchase request stats: ' + error.message);
        }
    }

    // Get next reference number with SCPRO- prefix
    static async getNextReferenceNumber() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get the highest reference number with SCPRO- prefix
            const query = `
                SELECT TOP 1 REFERENCENO
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REFERENCENO LIKE 'SCPRO-%'
                ORDER BY CAST(SUBSTRING(REFERENCENO, 7, LEN(REFERENCENO)) AS INT) DESC
            `;

            const result = await connection.request().query(query);

            let nextNumber = 1;
            if (result.recordset.length > 0) {
                const lastRef = result.recordset[0].REFERENCENO;
                const lastNumber = parseInt(lastRef.substring(6)); // Remove 'SCPRO-' prefix
                nextNumber = lastNumber + 1;
            }

            // Format as SCPRO-XXXX (4 digits)
            const formattedNumber = nextNumber.toString().padStart(4, '0');
            return `SCPRO-${formattedNumber}`;
        } catch (error) {
            console.error('Error getting next reference number:', error);
            throw new Error('Failed to generate reference number: ' + error.message);
        }
    }

    // Generate unique item number from description
    static async generateItemNumber(itemDescription) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Generate base item number from first letters of first 3 words
            const words = itemDescription.trim().split(/\s+/).slice(0, 3);
            const baseItemNumber = words.map(word => word.charAt(0).toUpperCase()).join('');

            if (!baseItemNumber || baseItemNumber.length < 1) {
                throw new Error('Item description must contain at least one word');
            }

            // Check if base item number exists
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE ITEMNMBR = @itemNumber
            `;

            let itemNumber = baseItemNumber;
            let counter = 1;

            while (true) {
                const result = await connection.request()
                    .input('itemNumber', itemNumber)
                    .query(checkQuery);

                if (result.recordset[0].count === 0) {
                    // Item number is unique
                    break;
                }

                // Item number exists, add suffix
                itemNumber = `${baseItemNumber}-${counter}`;
                counter++;
            }

            return itemNumber;
        } catch (error) {
            console.error('Error generating item number:', error);
            throw new Error('Failed to generate item number: ' + error.message);
        }
    }
}

export default PurchaseRequest;
