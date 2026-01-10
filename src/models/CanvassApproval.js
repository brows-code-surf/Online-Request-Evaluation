'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

class CanvassApproval {
    // Get all canvassing items for approval (flattened from all POSTED requests)
    static async getAllCanvassingItemsForApproval(user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get all POSTED canvassing requests (status = 1) with their details that haven't been approved/rejected yet
            let query = `
                SELECT DISTINCT
                    PQD.ROWID as itemId,
                    PQH.PQCODE,
                    PQH.CREATEDBY,
                    PQH.DATEREQUESTED,
                    PQD.ITEMNMBR,
                    PQD.ITEMDESC,
                    PQD.UOFM,
                    PQD.QUANTITY,
                    PQD.BUDGETCODE,
                    PQD.VENDORID,
                    S.VENDNAME as vendorName,
                    PQD.OFFEREDPRICE,
                    PQD.BIDPRICE,
                    PQD.FINALPRICE,
                    PQD.BRAND,
                    PQD.ORIGIN,
                    PQD.IS_IMPORTED,
                    PQD.DELIVERYSCHEDULE,
                    PQD.REMARKS,
                    PQD.DATECREATED
                FROM [PURCHASE.QUOTATIONHEADER.1] PQH
                INNER JOIN [PURCHASE.QUOTATIONDETAILS.1] PQD ON PQH.PQCODE = PQD.PQCODE
                LEFT JOIN [SUPPLIER.1] S ON PQD.VENDORID = S.VENDORID
                LEFT JOIN [PURCHASE.QUOTATIONAPPROVALSTATUS.1] PQAS ON PQD.ROWID = PQAS.PQROWID
                WHERE PQH.POSTSTATUS = 1
                AND (PQAS.IS_APPROVED IS NULL OR PQAS.ROWID IS NULL)
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by created by (only show canvassing requests created by the user for non-admin users)
            // Admin users can see all canvassing items for approval
            // if (!isAdmin && user) {
            //     const userName = user.empName;
            //     query += ` AND UPPER(PQH.CREATEDBY) = UPPER(@userName${paramIndex})`;
            //     params.push({ name: `userName${paramIndex}`, value: userName });
            //     paramIndex++;
            // }

            query += ` ORDER BY PQD.ITEMDESC ASC, PQH.DATEREQUESTED, PQD.ROWID`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);

            return result.recordset.map(record => ({
                id: record.itemId,
                pqCode: record.PQCODE,
                itemNumber: record.ITEMNMBR,
                itemDescription: record.ITEMDESC,
                unitOfMeasure: record.UOFM,
                quantity: record.QUANTITY,
                budgetCode: record.BUDGETCODE,
                vendorId: record.VENDORID,
                vendorName: record.vendorName,
                offeredPrice: record.OFFEREDPRICE,
                bidPrice: record.BIDPRICE,
                finalPrice: record.FINALPRICE,
                brand: record.BRAND,
                origin: record.ORIGIN,
                isImported: record.IS_IMPORTED,
                deliverySchedule: record.DELIVERYSCHEDULE,
                remarks: record.REMARKS,
                createdBy: record.CREATEDBY,
                dateRequested: record.DATEREQUESTED,
                dateCreated: record.DATECREATED
            }));
        } catch (error) {
            console.error('Error fetching canvassing items for approval:', error);
            throw new Error('Failed to fetch canvassing items for approval: ' + error.message);
        }
    }

    // Get canvassing approval statistics
    static async getCanvassApprovalStats(user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                    COUNT(DISTINCT PQH.PQCODE) as totalRequests,
                    COUNT(PQD.ROWID) as totalItems
                FROM [PURCHASE.QUOTATIONHEADER.1] PQH
                LEFT JOIN [PURCHASE.QUOTATIONDETAILS.1] PQD ON PQH.PQCODE = PQD.PQCODE
                WHERE PQH.POSTSTATUS = 1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by created by (only show stats for canvassing requests created by the user for non-admin users)
            // Admin users can see stats for all canvassing requests
            if (!isAdmin && user) {
                const userName = user.empName;
                query += ` AND UPPER(PQH.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);

            return {
                totalRequests: result.recordset[0].totalRequests || 0,
                totalItems: result.recordset[0].totalItems || 0,
                approvedToday: 0, // TODO: Implement daily stats
                rejectedToday: 0  // TODO: Implement daily stats
            };
        } catch (error) {
            console.error('Error fetching canvass approval stats:', error);
            throw new Error('Failed to fetch canvass approval stats: ' + error.message);
        }
    }

    // Approve individual item (this would typically update the item status)
    static async approveCanvassingItem(itemId, approverName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // First try to update existing record
            const updateQuery = `
                UPDATE [PURCHASE.QUOTATIONAPPROVALSTATUS.1]
                SET IS_APPROVED = 1,
                    APPROVEDBY = @approverName,
                    DATECREATED = GETDATE()
                WHERE PQROWID = @itemId
            `;

            let result = await connection.request()
                .input('itemId', itemId)
                .input('approverName', approverName)
                .query(updateQuery);

            // If no record was updated, insert a new one
            if (result.rowsAffected[0] === 0) {
                const insertQuery = `
                    INSERT INTO [PURCHASE.QUOTATIONAPPROVALSTATUS.1] (
                        PQROWID, IS_APPROVED, APPROVEDBY, REMARKS, DATECREATED
                    ) VALUES (
                        @itemId, 1, @approverName, NULL, GETDATE()
                    )
                `;

                result = await connection.request()
                    .input('itemId', itemId)
                    .input('approverName', approverName)
                    .query(insertQuery);

                if (result.rowsAffected[0] === 0) {
                    throw new Error('Failed to create approval record');
                }
            }

            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @approverName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Canvassing item ${itemId} approved by ${approverName}`)
                .input('approverName', approverName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Item approved successfully'
            };
        } catch (error) {
            console.error('Error approving canvassing item:', error);
            throw new Error('Failed to approve canvassing item: ' + error.message);
        }
    }

    // Reject individual item
    static async rejectCanvassingItem(itemId, rejectorName, rejectReason = '') {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // First try to update existing record
            const updateQuery = `
                UPDATE [PURCHASE.QUOTATIONAPPROVALSTATUS.1]
                SET IS_APPROVED = 0,
                    APPROVEDBY = @rejectorName,
                    REMARKS = @rejectReason,
                    DATECREATED = GETDATE()
                WHERE PQROWID = @itemId
            `;

            let result = await connection.request()
                .input('itemId', itemId)
                .input('rejectorName', rejectorName)
                .input('rejectReason', rejectReason || `Rejected by ${rejectorName}`)
                .query(updateQuery);

            // If no record was updated, insert a new one
            if (result.rowsAffected[0] === 0) {
                const insertQuery = `
                    INSERT INTO [PURCHASE.QUOTATIONAPPROVALSTATUS.1] (
                        PQROWID, IS_APPROVED, APPROVEDBY, REMARKS, DATECREATED
                    ) VALUES (
                        @itemId, 0, @rejectorName, @rejectReason, GETDATE()
                    )
                `;

                result = await connection.request()
                    .input('itemId', itemId)
                    .input('rejectorName', rejectorName)
                    .input('rejectReason', rejectReason || `Rejected by ${rejectorName}`)
                    .query(insertQuery);

                if (result.rowsAffected[0] === 0) {
                    throw new Error('Failed to create approval record');
                }
            }

            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @rejectorName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Canvassing item ${itemId} rejected by ${rejectorName}${rejectReason ? ': ' + rejectReason : ''}`)
                .input('rejectorName', rejectorName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Item rejected successfully'
            };
        } catch (error) {
            console.error('Error rejecting canvassing item:', error);
            throw new Error('Failed to reject canvassing item: ' + error.message);
        }
    }
}

export default CanvassApproval;