'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

class CanvassApproval {

    // Get all canvassing items (approved, rejected, and pending)
    static async getAllCanvassingItems(user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get all POSTED canvassing requests (status = 1) with their approval status
            // Exclude items where PR Code is already approved
            let query = `
                SELECT DISTINCT
                    PQD.ROWID as itemId,
                    PQH.PQCODE,
                    PQH.CREATEDBY,
                    PQH.DATEREQUESTED,
                    PQD.PRCODE,
                    PRH.REQUESTEDBY,
                    PQD.RID,
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
                    PQD.DATECREATED,
                    PQD.APPROVALSTATUS,
                    PQD.APPROVEDBY as approvedBy,
                    PQD.REJECTREMARKS as approvalRemarks,
                    PQD.DATECREATED as approvalDate
                FROM [PURCHASE.QUOTATIONHEADER.1] PQH
                INNER JOIN [PURCHASE.QUOTATIONDETAILS.1] PQD ON PQH.PQCODE = PQD.PQCODE
                LEFT JOIN [SUPPLIER.1] S ON PQD.VENDORID = S.VENDORID
                LEFT JOIN [PURCHASE.REQUESTHEADER.1] PRH ON PQD.PRCODE = PRH.REFERENCENO
                WHERE PQH.POSTSTATUS = 1

            `;

            const params = [];

            query += ` ORDER BY PQH.DATEREQUESTED, PQD.RID ASC`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);

            return result.recordset.map(record => {
                let status = 'PENDING';
                if (record.APPROVALSTATUS === 'SELECTED') {
                    status = 'SELECTED';
                } else if (record.APPROVALSTATUS === 'NOT SELECTED') {
                    status = 'NOT SELECTED';
                } else if (record.APPROVALSTATUS === 'REJECTED') {
                    status = 'REJECTED';
                }

                return {
                    id: record.itemId,
                    pqCode: record.PQCODE,
                    prCode: record.PRCODE,
                    rid: record.RID,
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
                    requestedBy: record.REQUESTEDBY,
                    dateRequested: record.DATEREQUESTED,
                    dateCreated: record.DATECREATED,
                    status: status,
                    approvedBy: record.approvedBy,
                    approvalRemarks: record.approvalRemarks,
                    approvalDate: record.approvalDate
                };
            });
        } catch (error) {
            console.error('Error fetching all canvassing items:', error);
            throw new Error('Failed to fetch all canvassing items: ' + error.message);
        }
    }

    // Approve individual item (this would typically update the item status)
    static async approveCanvassingItem(itemId, approverName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // First, get the PRCODE and RID for this canvassing item
            const getItemQuery = `
                SELECT PRCODE, RID FROM [PURCHASE.QUOTATIONDETAILS.1]
                WHERE ROWID = @itemId
            `;

            const itemResult = await connection.request()
                .input('itemId', itemId)
                .query(getItemQuery);

            if (itemResult.recordset.length === 0) {
                throw new Error('Canvassing item not found');
            }

            const { PRCODE: prCode, RID: rid } = itemResult.recordset[0];

            // Update the QUOTATIONDETAILS table directly
            const approveQuery = ` UPDATE [PURCHASE.QUOTATIONDETAILS.1] SET APPROVALSTATUS = 'SELECTED', APPROVEDBY = @approverName, DATEAPPROVED = GETDATE() WHERE ROWID = @itemId `;

            let result = await connection.request()
                .input('itemId', itemId)
                .input('approverName', approverName)
                .query(approveQuery);

            // Check if the approval was successful
            if (result.rowsAffected[0] === 0) {
                throw new Error('Failed to approve canvassing item');
            }

            // Mark other items with the same PRCODE as NOT SELECTED
            const updateNotSelectedQuery = `UPDATE [PURCHASE.QUOTATIONDETAILS.1] SET APPROVALSTATUS = 'NOT SELECTED' WHERE RID = @rid AND ROWID != @itemId`;

            await connection.request()
                .input('rid', rid)
                .input('itemId', itemId)
                .query(updateNotSelectedQuery);

            // Update the corresponding purchase request item status to 'FOR P.O. PROCESSING'
            if (prCode && rid) {
                const updatePRQuery = ` UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'FOR P.O.' WHERE REFERENCENO = @prCode AND RID = @rid`;

                await connection.request()
                    .input('prCode', prCode)
                    .input('rid', rid)
                    .query(updatePRQuery);

                // Check only items with the same RID (same request item)
                let checkAllItemStatusQuery = `SELECT ITEMSTATUS as itemStatus FROM [PURCHASE.REQUESTDETAILS.1] WHERE RID = @rid`;

                const checkResult = await connection.request()
                    .input('rid', rid)
                    .query(checkAllItemStatusQuery);

                const allStatuses = checkResult.recordset.map(record => record.itemStatus);
                const advancedStatuses = ['P.O. PROCESSING','FOR P.O. CONFIRMATION', 'FOR P.O. APPROVAL', 'P.O. APPROVED', 'P.O. POSTED'];

                // Only update header to 'FOR P.O. PROCESSING' if no items have advanced beyond it
                const noneHaveAdvancedStatus = !allStatuses.some(status => advancedStatuses.includes(status));

                if (noneHaveAdvancedStatus) {
                    const updatePRHQuery = `UPDATE [PURCHASE.REQUESTHEADER.1] SET REQUESTSTATUS = 'FOR P.O.' WHERE REFERENCENO = @prCode`;

                    await connection.request()
                        .input('prCode', prCode)
                        .query(updatePRHQuery);
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

            // Emit socket event for real-time update
            try {
                if (global.io) {
                    global.io.to('canvass-approval-broadcast').emit('canvass-approved', {
                        itemId,
                        approvedBy: approverName,
                        prCode,
                        rid,
                        date: new Date().toISOString()
                    });
                }
            } catch (socketError) {
                console.error('Error emitting socket event:', socketError);
            }

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

            // Update the QUOTATIONDETAILS table directly
            const rejectQuery = `
                UPDATE [PURCHASE.QUOTATIONDETAILS.1]
                SET APPROVALSTATUS = 'REJECTED',
                    APPROVEDBY = @rejectorName,
                    REJECTREMARKS = @rejectReason,
                    DATECREATED = GETDATE()
                WHERE ROWID = @itemId
            `;

            let result = await connection.request()
                .input('itemId', itemId)
                .input('rejectorName', rejectorName)
                .input('rejectReason', rejectReason || `Rejected by ${rejectorName}`)
                .query(rejectQuery);

            if (result.rowsAffected[0] === 0) {
                throw new Error('Failed to reject canvassing item');
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

            // Emit socket event for real-time update
            try {
                if (global.io) {
                    global.io.to('canvass-approval-broadcast').emit('canvass-rejected', {
                        itemId,
                        rejectedBy: rejectorName,
                        rejectReason,
                        date: new Date().toISOString()
                    });
                }
            } catch (socketError) {
                console.error('Error emitting socket event:', socketError);
            }

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
