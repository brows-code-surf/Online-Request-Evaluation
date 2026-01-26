'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

class PurchaseRequest {
    // Get all purchase requests with filtering and role-based access
    static async getAllPurchaseRequests(filters = {}, user = null, isAdmin = false) {
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

            // Filter by requested by (only show PRs created by the user for non-admin users)
            if (user && !isAdmin) {
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
    static async getPurchaseRequestByReferenceNo(referenceNo, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check access permissions - only allow if user is the requester (unless admin)
            if (user && !isAdmin) {
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
                SELECT ROWID, REFERENCENO, ITEMNMBR, ITEMDESC, RID, UOFM, QUANTITY, BUDGETCODE, REMARKS, DATENEEDED, ITEMSTATUS, LINETYPE FROM [PURCHASE.REQUESTDETAILS.1]
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
                    cancelRemarks: header.CANCELREMARKS,
                    isRush: header.IS_RUSH,
                    createdBy: header.CREATEDBY,
                    dateCreated: header.DATECREATED,
                    isRead: header.IS_READ,
                    isPosted: header.IS_POSTED
                },
                details: detailsResult.recordset.map(detail => ({
                    id: detail.ROWID,
                    referenceNo: detail.REFERENCENO,
                    itemNumber: detail.ITEMNMBR,
                    itemDescription: detail.ITEMDESC,
                    rid: detail.RID,
                    unitOfMeasure: detail.UOFM,
                    quantity: detail.QUANTITY,
                    budgetCode: detail.BUDGETCODE,
                    remarks: detail.REMARKS,
                    dateNeeded: detail.DATENEEDED,
                    itemStatus: detail.ITEMSTATUS,
                    lineType: detail.LINETYPE
                }))
            };
        } catch (error) {
            console.error('Error fetching purchase request:', error);
            throw new Error('Failed to fetch purchase request: ' + error.message);
        }
    }

    // Create new purchase request with transaction safety
    static async createPurchaseRequest(headerData, detailsData, creatorName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for purchase request creation');

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

                const refCheckResult = await transaction.request()
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

                    const ridCheckResult = await transaction.request()
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

            // Insert Purchase Request header
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

            await transaction.request()
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

            console.log('Purchase request header inserted');

            // Insert Purchase Request items/details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];
                const itemRowNumber = i + 1; // Use the item order (1-based) instead of database ROWID

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                        REFERENCENO, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, BUDGETCODE, REMARKS, DATENEEDED, ITEMSTATUS, RID, LINETYPE
                    ) VALUES (
                        @referenceNo, @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @budgetCode, @remarks, @dateNeeded, @itemStatus, @rid, @lineType
                    )
                `;

                const rid = `${referenceNo}-${itemRowNumber}`;

                await transaction.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('budgetCode', detail.budgetCode)
                    .input('remarks', detail.remarks || '')
                    .input('dateNeeded', detail.dateNeeded)
                    .input('itemStatus', detail.itemStatus || '')
                    .input('rid', rid)
                    .input('lineType', detail.lineType || '')
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} purchase request details inserted`);

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Purchase Request ${referenceNo} created by ${creatorName}`)
                .input('creatorName', creatorName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                referenceNo,
                referenceNumberChanged,
                originalReferenceNo
            };

        } catch (error) {
            console.error('Error creating purchase request:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to create purchase request: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
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
                    break;

                case 'reject':
                    updateQuery = `
                        UPDATE [PURCHASE.REQUESTHEADER.1]
                        SET REQUESTSTATUS = 'REJECTED',
                            CANCELREMARKS = @remarks,
                            IS_READ = 1
                        WHERE REFERENCENO = @referenceNo
                    `;
                    break;

                default:
                    throw new Error('Invalid action');
            }

            await connection.request()
                .input('referenceNo', referenceNo)
                .input('userName', userName)
                .query(updateQuery);

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

    // Update purchase request with transaction safety
    static async updatePurchaseRequest(referenceNo, headerData, detailsData, updaterName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for purchase request update');

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

            const headerResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .input('company', headerData.company)
                .input('requestType', headerData.requestType)
                .input('reviewer', headerData.reviewer)
                .input('approver', headerData.approver)
                .input('addressedTo', headerData.addressedTo)
                .input('remarks', headerData.remarks || '')
                .input('isRush', headerData.isRush || 0)
                .query(updateHeaderQuery);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Purchase request not found');
            }

            console.log('Purchase request header updated');

            // Delete existing details
            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE REFERENCENO = @referenceNo
            `;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailsQuery);

            console.log('Existing details deleted');

            // Insert updated details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                        REFERENCENO, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, BUDGETCODE, REMARKS, DATENEEDED, ITEMSTATUS, RID, LINETYPE
                    ) VALUES (
                        @referenceNo, @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @budgetCode, @remarks, @dateNeeded, @itemStatus, @rid, @lineType
                    )
                `;

                const rid = `${referenceNo}-${i + 1}`; // Use 1-based index for RID

                await transaction.request()
                    .input('referenceNo', referenceNo)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('budgetCode', detail.budgetCode)
                    .input('remarks', detail.remarks || '')
                    .input('dateNeeded', detail.dateNeeded)
                    .input('itemStatus', detail.itemStatus || '')
                    .input('rid', rid)
                    .input('lineType', detail.lineType || '')
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} updated details inserted`);

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @updaterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Purchase Request ${referenceNo} updated by ${updaterName}`)
                .input('updaterName', updaterName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Purchase request updated successfully'
            };

        } catch (error) {
            console.error('Error updating purchase request:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to update purchase request: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
        }
    }

    // Cancel purchase request
    static async cancelPurchaseRequest(referenceNo, cancellerName, cancelReason = '') {
        let connection;
        try {
            console.log('cancelPurchaseRequest called with:', { referenceNo, cancellerName, cancelReason });
            connection = await connectToDatabase(process.env.DB_SFC);

            // Update header status to CANCELLED
            const updateHeaderQuery = `
                UPDATE [PURCHASE.REQUESTHEADER.1]
                SET REQUESTSTATUS = 'CANCELLED',
                    CANCELREMARKS = @cancelReason,
                    IS_READ = 1
                WHERE REFERENCENO = @referenceNo
            `;

            console.log('Executing query:', updateHeaderQuery);
            console.log('With parameters:', { referenceNo, cancelReason });

            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .input('cancelReason', cancelReason)
                .query(updateHeaderQuery);

            console.log('Update result:', headerResult);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Purchase request not found');
            }

            // Verify the update by checking the result
            const verifyQuery = `SELECT CANCELREMARKS FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
            const verifyResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(verifyQuery);

            console.log('Verification query result:', verifyResult.recordset);

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

    // Check if there are existing items with same base but different descriptions
    static async checkItemBaseConflict(baseItemNumber, currentDescription) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const checkQuery = `
                SELECT COUNT(*) as count
                FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE ITEMNMBR LIKE @basePattern + '%' AND UPPER(LTRIM(RTRIM(ITEMDESC))) != UPPER(LTRIM(RTRIM(@currentDescription)))
            `;

            const result = await connection.request()
                .input('basePattern', baseItemNumber)
                .input('currentDescription', currentDescription.trim())
                .query(checkQuery);

            return result.recordset[0].count > 0;

        } catch (error) {
            console.error('Error checking item base conflict:', error);
            throw new Error('Failed to check item base conflict: ' + error.message);
        }
    }

    // Generate unique item number from description (increment only for same base, different descriptions)
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

            // No exact match, generate base item number from first 3 letters
            const words = itemDescription.trim().split(/\s+/).slice(0, 3);
            const baseItemNumber = words.map(word => word.charAt(0).toUpperCase()).join('');

            if (!baseItemNumber || baseItemNumber.length < 1) {
                throw new Error('Item description must contain at least one word');
            }

            // For single-word descriptions, don't check conflicts, just return the base
            if (words.length === 1 || words.length === 2) {
                return baseItemNumber;
            }

            // Check if any items with this base exist but have different descriptions
            const checkBaseQuery = `
                SELECT COUNT(*) as count
                FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE ITEMNMBR LIKE @basePattern + '%' AND UPPER(LTRIM(RTRIM(ITEMDESC))) != UPPER(LTRIM(RTRIM(@itemDescription)))
            `;

            const baseResult = await connection.request()
                .input('basePattern', baseItemNumber)
                .input('itemDescription', itemDescription.trim())
                .query(checkBaseQuery);

            const hasDifferentDescriptionsWithSameBase = baseResult.recordset[0].count > 0;

            if (!hasDifferentDescriptionsWithSameBase) {
                // No existing items with same base but different descriptions, return base without number
                return baseItemNumber;
            }

            // Find the highest number used for this base (including dash)
            const findHighestQuery = `
                SELECT ITEMNMBR
                FROM [PURCHASE.REQUESTDETAILS.1]
                WHERE ITEMNMBR LIKE @basePattern + '%'
                ORDER BY
                  CASE
                    WHEN ITEMNMBR = @basePattern THEN 0
                    WHEN ITEMNMBR LIKE @basePattern + '-%' THEN COALESCE(TRY_CAST(ISNULL(NULLIF(REPLACE(ITEMNMBR, @basePattern + '-', ''), ''), '0') AS INT), 0)
                    ELSE 0
                  END DESC
            `;

            const result = await connection.request()
                .input('basePattern', baseItemNumber)
                .query(findHighestQuery);

            let highestNumber = 0;

            // Parse the results to find the highest number
            for (const record of result.recordset) {
                const itemNumber = record.ITEMNMBR;
                let numberPart = 0;

                if (itemNumber.startsWith(baseItemNumber + '-')) {
                    // Has dash, extract number after dash
                    const parts = itemNumber.split('-');
                    if (parts.length >= 2) {
                        numberPart = parseInt(parts[1]) || 0;
                    }
                } else if (itemNumber === baseItemNumber) {
                    // Exact match without dash, treat as number 0
                    numberPart = 0;
                }

                if (numberPart > highestNumber) {
                    highestNumber = numberPart;
                }
            }

            // Use next available number with dash
            const nextNumber = highestNumber + 1;
            return `${baseItemNumber}-${nextNumber}`;

        } catch (error) {
            console.error('Error generating item number:', error);
            throw new Error('Failed to generate item number: ' + error.message);
        }
    }
}

export default PurchaseRequest;
