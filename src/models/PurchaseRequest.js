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
                    PRH.IS_READ,
                    PRH.IS_POSTED
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
                isRead: record.IS_READ,
                isPosted: record.IS_POSTED
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
                    isRead: header.IS_READ,
                    isPosted: header.IS_POSTED
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

            // Start with the reference number from headerData (generated by the form)
            let referenceNo = headerData.referenceNo || `PR-${Date.now()}`;
            let originalReferenceNo = referenceNo;
            let referenceNumberChanged = false;

            // Keep trying until we find a unique reference number and RIDs
            let attempts = 0;
            const maxAttempts = 10; // Prevent infinite loops

            while (attempts < maxAttempts) {
                // Check if reference number is already taken
                const checkRefQuery = `
                    SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1]
                    WHERE REFERENCENO = @referenceNo
                `;

                const refCheckResult = await connection.request()
                    .input('referenceNo', referenceNo)
                    .query(checkRefQuery);

                if (refCheckResult.recordset[0].count > 0) {
                    // Reference number taken, generate new one
                    referenceNo = await PurchaseRequest.getNextReferenceNumber();
                    referenceNumberChanged = true;
                    attempts++;
                    continue;
                }

                // Check if any potential RIDs would conflict
                let ridConflict = false;
                for (let i = 0; i < detailsData.length; i++) {
                    const potentialRid = `${referenceNo}-${i + 1}`; // ROWID starts from 1
                    const checkRidQuery = `
                        SELECT COUNT(*) as count FROM [PURCHASE.REQUESTDETAILS.1]
                        WHERE RID = @rid
                    `;

                    const ridCheckResult = await connection.request()
                        .input('rid', potentialRid)
                        .query(checkRidQuery);

                    if (ridCheckResult.recordset[0].count > 0) {
                        ridConflict = true;
                        break;
                    }
                }

                if (ridConflict) {
                    // RIDs conflict, generate new reference number
                    referenceNo = await PurchaseRequest.getNextReferenceNumber();
                    referenceNumberChanged = true;
                    attempts++;
                    continue;
                }

                // No conflicts found, we can proceed
                break;
            }

            if (attempts >= maxAttempts) {
                throw new Error('Unable to generate unique reference number after multiple attempts');
            }

            // Extract numeric part from reference number (remove prefix)
            let referenceNum = '';
            if (referenceNo) {
                const parts = referenceNo.split('-');
                if (parts.length > 1) {
                    referenceNum = parts[parts.length - 1];
                } else {
                    referenceNum = referenceNo;
                }
            }

            // Insert header
            const headerQuery = `
                INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                    COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                    LOCNCODE, DATEREQUESTED, REQUESTEDBY, REVIEWER, APPROVER,
                    ADDRESSEDTO, REMARKS, IS_RUSH, CREATEDBY, DATECREATED, IS_READ
                ) VALUES (
                    @company, @requestType, @referenceNum, @referenceNo, 'FOR POSTING',
                    @locationCode, GETDATE(), @requestedBy, @reviewer, @approver,
                    @addressedTo, @remarks, @isRush, @createdBy, GETDATE(), 0
                )
            `;

            await connection.request()
                .input('company', headerData.company)
                .input('requestType', headerData.requestType)
                .input('referenceNum', referenceNum)
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
                // First, insert the record
                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                        REFERENCENO, ITEMSTATUS, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, BUDGETNAME, REMARKS, DATENEEDED
                    ) VALUES (
                        @referenceNo, 'FOR POSTING', @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @budgetName, @remarks, @dateNeeded
                    )
                `;

                await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('budgetName', detail.budgetName)
                    .input('remarks', detail.remarks || '')
                    .input('dateNeeded', detail.dateNeeded)
                    .query(detailInsertQuery);

                // Get the ROWID of the inserted record
                const getRowIdQuery = `
                    SELECT TOP 1 ROWID
                    FROM [PURCHASE.REQUESTDETAILS.1]
                    WHERE REFERENCENO = @referenceNo AND ITEMNMBR = @itemNumber AND ITEMDESC = @itemDescription
                    ORDER BY ROWID DESC
                `;

                const rowIdResult = await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .query(getRowIdQuery);

                if (rowIdResult.recordset.length > 0) {
                    const rowId = rowIdResult.recordset[0].ROWID;
                    const rid = `${referenceNo}-${rowId}`;

                    // Update the RID field
                    const updateRidQuery = `
                        UPDATE [PURCHASE.REQUESTDETAILS.1]
                        SET RID = @rid
                        WHERE ROWID = @rowId
                    `;

                    await connection.request()
                        .input('rid', rid)
                        .input('rowId', rowId)
                        .query(updateRidQuery);
                }
            }

            // Log activity for created request
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Request ${referenceNo} created by ${creatorName}`)
                .input('creatorName', creatorName)
                .query(activityQuery);

            return {
                referenceNo,
                referenceNumberChanged,
                originalReferenceNo
            };
        } catch (error) {
            console.error('Error creating purchase request:', error);
            throw new Error('Failed to create purchase request: ' + error.message);
        }
    }

    // Post purchase request (set IS_POSTED = 1 and trigger notifications)
    static async postPurchaseRequest(referenceNo, posterName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // First, check if reviewer is specified
            const checkQuery = `
                SELECT REVIEWER FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;
            const checkResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase request not found');
            }

            const reviewer = checkResult.recordset[0].REVIEWER;
            let newStatus = 'FOR CONFIRMATION'; // Default if reviewer exists

            // If no reviewer is specified, set status directly to FOR REQUEST APPROVAL
            if (!reviewer || reviewer.trim() === '') {
                newStatus = 'FOR REQUEST APPROVAL';
            }

            // Update IS_POSTED to 1, set status, and record posting time
            const updateQuery = `
                UPDATE [PURCHASE.REQUESTHEADER.1]
                SET IS_POSTED = 1,
                    REQUESTSTATUS = @newStatus,
                    POSTEDBY = @posterName,
                    DATEPOSTED = GETDATE()
                WHERE REFERENCENO = @referenceNo
            `;

            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .input('newStatus', newStatus)
                .input('posterName', posterName)
                .query(updateQuery);

            if (result.rowsAffected[0] === 0) {
                throw new Error('Purchase request not found or already posted');
            }

            // Update item statuses as well
            const updateItemsQuery = `
                UPDATE [PURCHASE.REQUESTDETAILS.1]
                SET ITEMSTATUS = @newStatus
                WHERE REFERENCENO = @referenceNo
            `;

            await connection.request()
                .input('referenceNo', referenceNo)
                .input('newStatus', newStatus)
                .query(updateItemsQuery);

            // Log activity for posted request
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @posterName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Request ${referenceNo} posted by ${posterName}`)
                .input('posterName', posterName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Purchase request posted successfully',
                newStatus: newStatus
            };
        } catch (error) {
            console.error('Error posting purchase request:', error);
            throw new Error('Failed to post purchase request: ' + error.message);
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

    // Update purchase request
    static async updatePurchaseRequest(referenceNo, headerData, detailsData, updaterName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Update header
            const updateHeaderQuery = `
                UPDATE [PURCHASE.REQUESTHEADER.1]
                SET COMPANY = @company,
                    REQUESTTYPE = @requestType,
                    REVIEWER = @reviewer,
                    APPROVER = @approver,
                    ADDRESSEDTO = @addressedTo,
                    REMARKS = @remarks,
                    IS_RUSH = @isRush
                WHERE REFERENCENO = @referenceNo
            `;

            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .input('company', headerData.company)
                .input('requestType', headerData.requestType)
                .input('reviewer', headerData.reviewer)
                .input('approver', headerData.approver)
                .input('addressedTo', headerData.addressedTo)
                .input('remarks', headerData.remarks || '')
                .input('isRush', headerData.isRush || 0)
                .input('updaterName', updaterName)
                .query(updateHeaderQuery);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Purchase request not found');
            }

            // Delete existing details
            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE REFERENCENO = @referenceNo
            `;

            await connection.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailsQuery);

            // Insert updated details
            for (const detail of detailsData) {
                // First, insert the record
                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                        REFERENCENO, ITEMSTATUS, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, BUDGETNAME, REMARKS, DATENEEDED
                    ) VALUES (
                        @referenceNo, 'FOR CONFIRMATION', @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @budgetName, @remarks, @dateNeeded
                    )
                `;

                await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('budgetName', detail.budgetName)
                    .input('remarks', detail.remarks || '')
                    .input('dateNeeded', detail.dateNeeded)
                    .query(detailInsertQuery);

                // Get the ROWID of the inserted record
                const getRowIdQuery = `
                    SELECT TOP 1 ROWID
                    FROM [PURCHASE.REQUESTDETAILS.1]
                    WHERE REFERENCENO = @referenceNo AND ITEMNMBR = @itemNumber AND ITEMDESC = @itemDescription
                    ORDER BY ROWID DESC
                `;

                const rowIdResult = await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .query(getRowIdQuery);

                if (rowIdResult.recordset.length > 0) {
                    const rowId = rowIdResult.recordset[0].ROWID;
                    const rid = `${referenceNo}-${rowId}`;

                    // Update the RID field
                    const updateRidQuery = `
                        UPDATE [PURCHASE.REQUESTDETAILS.1]
                        SET RID = @rid
                        WHERE ROWID = @rowId
                    `;

                    await connection.request()
                        .input('rid', rid)
                        .input('rowId', rowId)
                        .query(updateRidQuery);
                }
            }

            // Log activity for updated request
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @updaterName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Request ${referenceNo} updated by ${updaterName}`)
                .input('updaterName', updaterName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Purchase request updated successfully'
            };
        } catch (error) {
            console.error('Error updating purchase request:', error);
            throw new Error('Failed to update purchase request: ' + error.message);
        }
    }

    // Cancel purchase request
    static async cancelPurchaseRequest(referenceNo, cancellerName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Update header status to CANCELLED
            const updateHeaderQuery = `
                UPDATE [PURCHASE.REQUESTHEADER.1]
                SET REQUESTSTATUS = 'CANCELLED',
                    IS_READ = 1
                WHERE REFERENCENO = @referenceNo
            `;

            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .input('cancellerName', cancellerName)
                .query(updateHeaderQuery);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Purchase request not found');
            }

            // Update all item statuses to CANCELLED
            const updateItemsQuery = `
                UPDATE [PURCHASE.REQUESTDETAILS.1]
                SET ITEMSTATUS = 'CANCELLED'
                WHERE REFERENCENO = @referenceNo
            `;

            await connection.request()
                .input('referenceNo', referenceNo)
                .query(updateItemsQuery);

            // Log activity for cancelled request
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @cancellerName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Request ${referenceNo} cancelled by ${cancellerName}`)
                .input('cancellerName', cancellerName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Purchase request cancelled successfully'
            };
        } catch (error) {
            console.error('Error canceling purchase request:', error);
            throw new Error('Failed to cancel purchase request: ' + error.message);
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

            // Get the highest reference number with OPR- prefix
            const query = `
                SELECT TOP 1 REFERENCENO
                FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REFERENCENO LIKE 'OPR-%'
                ORDER BY CAST(SUBSTRING(REFERENCENO, 5, LEN(REFERENCENO)-4) AS INT) DESC
            `;

            const result = await connection.request().query(query);

            let nextNumber = 1;
            if (result.recordset.length > 0) {
                const lastRef = result.recordset[0].REFERENCENO;
                const lastNumber = parseInt(lastRef.substring(4)); // Remove 'OPR-' prefix
                nextNumber = lastNumber + 1;
            }

            return `OPR-${nextNumber}`;
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

            // First, check if exact item description already exists
            const exactMatchQuery = `
                SELECT ITEMNMBR
                FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE UPPER(LTRIM(RTRIM(ITEMDESC))) = UPPER(LTRIM(RTRIM(@itemDescription)))
            `;

            const exactMatchResult = await connection.request()
                .input('itemDescription', itemDescription.trim())
                .query(exactMatchQuery);

            if (exactMatchResult.recordset.length > 0) {
                // Exact match found, return existing item number
                return exactMatchResult.recordset[0].ITEMNMBR;
            }

            // No exact match, generate new item number from first 3 letters
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
