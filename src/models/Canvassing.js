'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

class Canvassing {
    // Get all canvassing requests with filtering and role-based access
    static async getAllCanvassingRequests(filters = {}, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT DISTINCT
                    PQH.ROWID,
                    PQH.COMPANY,
                    PQH.REFERENCENUM,
                    PQH.PQCODE,
                    PQH.DATEREQUESTED,
                    PQH.POSTSTATUS,
                    PQH.PQREMARKS,
                    PQH.CREATEDBY,
                    PQH.DATEMODIFIED,
                    PQH.MODIFIEDBY
                FROM [PURCHASE.QUOTATIONHEADER.1] PQH
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by status (for canvassing)
            if (filters.status) {
                query += ` AND PQH.POSTSTATUS = @status${paramIndex}`;
                params.push({ name: `status${paramIndex}`, value: filters.status });
                paramIndex++;
            } else {
                // Default to canvassing status
                query += ` AND PQH.POSTSTATUS = 1`;
            }

            // Filter by created by (only show canvassing requests created by the user for non-admin users)
            if (user && !isAdmin) {
                const userName = user.empName;
                query += ` AND UPPER(PQH.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            // Apply additional filters
            if (filters.company) {
                query += ` AND PQH.COMPANY = @company${paramIndex}`;
                params.push({ name: `company${paramIndex}`, value: filters.company });
                paramIndex++;
            }

            if (filters.pqCode) {
                query += ` AND PQH.PQCODE LIKE @pqCode${paramIndex}`;
                params.push({ name: `pqCode${paramIndex}`, value: `%${filters.pqCode}%` });
                paramIndex++;
            }

            query += ` ORDER BY PQH.DATEREQUESTED DESC, PQH.PQCODE DESC`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                company: record.COMPANY,
                referenceNum: record.REFERENCENUM,
                pqCode: record.PQCODE,
                dateRequested: record.DATEREQUESTED,
                postStatus: record.POSTSTATUS,
                pqRemarks: record.PQREMARKS,
                createdBy: record.CREATEDBY,
                dateModified: record.DATEMODIFIED,
                modifiedBy: record.MODIFIEDBY
            }));
        } catch (error) {
            console.error('Error fetching canvassing requests:', error);
            throw new Error('Failed to fetch canvassing requests: ' + error.message);
        }
    }

    // Get canvassing request by PQ code with details
    static async getCanvassingRequestByPQCode(pqCode, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check access permissions - only allow if user is the creator (unless admin)
            if (user && !isAdmin) {
                const userName = user.empName;
                const accessQuery = `
                    SELECT COUNT(*) as count FROM [PURCHASE.QUOTATIONHEADER.1]
                    WHERE PQCODE = @pqCode AND UPPER(CREATEDBY) = UPPER(@userName)
                `;
                const accessResult = await connection.request()
                    .input('pqCode', pqCode)
                    .input('userName', userName)
                    .query(accessQuery);

                if (accessResult.recordset[0].count === 0) {
                    throw new Error('Access denied: You can only view canvassing requests you created');
                }
            }

            // Get header
            const headerQuery = `
                SELECT * FROM [PURCHASE.QUOTATIONHEADER.1]
                WHERE PQCODE = @pqCode
            `;
            const headerResult = await connection.request()
                .input('pqCode', pqCode)
                .query(headerQuery);

            if (headerResult.recordset.length === 0) {
                throw new Error('Canvassing request not found');
            }

            const header = headerResult.recordset[0];

            // Get details
            const detailsQuery = `
                SELECT * FROM [PURCHASE.QUOTATIONDETAILS.1]
                WHERE PQCODE = @pqCode
                ORDER BY ROWID
            `;
            const detailsResult = await connection.request()
                .input('pqCode', pqCode)
                .query(detailsQuery);

            // Get approval status
            const approvalQuery = `
                SELECT * FROM [PURCHASE.QUOTATIONAPPROVALSTATUS.1]
                WHERE PQROWID = @pqRowId
            `;
            const approvalResult = await connection.request()
                .input('pqRowId', header.ROWID)
                .query(approvalQuery);

            return {
                header: {
                    id: header.ROWID,
                    company: header.COMPANY,
                    referenceNum: header.REFERENCENUM,
                    pqCode: header.PQCODE,
                    dateRequested: header.DATEREQUESTED,
                    postStatus: header.POSTSTATUS,
                    pqRemarks: header.PQREMARKS,
                    createdBy: header.CREATEDBY,
                    dateModified: header.DATEMODIFIED,
                    modifiedBy: header.MODIFIEDBY
                },
                details: detailsResult.recordset.map(detail => ({
                    id: detail.ROWID,
                    pqCode: detail.PQCODE,
                    prCode: detail.PRCODE,
                    rid: detail.RID,
                    pqdPostStatus: detail.PQDPOSTSTATUS,
                    approvedBy: detail.APPROVEDBY,
                    dateApproved: detail.DATEAPPROVED,
                    itemNumber: detail.ITEMNMBR,
                    itemDescription: detail.ITEMDESC,
                    unitOfMeasure: detail.UOFM,
                    quantity: detail.QUANTITY,
                    vendorId: detail.VENDORID,
                    brand: detail.BRAND,
                    origin: detail.ORIGIN,
                    isImported: detail.IS_IMPORTED,
                    offeredPrice: detail.OFFEREDPRICE,
                    bidPrice: detail.BIDPRICE,
                    finalPrice: detail.FINALPRICE,
                    paymentTerms: detail.PYMTRMID,
                    supplierQty: detail.SUPPLIERQTY,
                    legend: detail.LEGEND,
                    deliverySchedule: detail.DELIVERYSCHEDULE,
                    poNumber: detail.PONUMBER,
                    remarks: detail.REMARKS,
                    canvassedBy: detail.CANVASSED_BY,
                    budgetCode: detail.BUDGETCODE,
                    dateCreated: detail.DATECREATED,
                    modifiedBy: detail.MODIFIEDBY,
                    modifiedDate: detail.MODIFIEDDATE,
                    isServed: detail.IS_SERVED
                })),
                approvals: approvalResult.recordset.map(approval => ({
                    id: approval.ROWID,
                    pqRowId: approval.PQROWID,
                    isApproved: approval.IS_APPROVED,
                    approvedBy: approval.APPROVEDBY,
                    dateApproved: approval.DATEAPPROVED
                }))
            };
        } catch (error) {
            console.error('Error fetching canvassing request:', error);
            throw new Error('Failed to fetch canvassing request: ' + error.message);
        }
    }

    // Create new canvassing request with transaction safety
    static async createCanvassingRequest(headerData, detailsData, creatorName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for canvassing request creation');

            // Generate PQ code
            const pqCode = await Canvassing.getNextPQCode();

            // Insert canvassing header
            const headerQuery = `
                INSERT INTO [PURCHASE.QUOTATIONHEADER.1] (
                    COMPANY, REFERENCENUM, PQCODE, DATEREQUESTED, POSTSTATUS,
                    PQREMARKS, CREATEDBY, DATEMODIFIED, MODIFIEDBY
                ) VALUES (
                    @company, @referenceNum, @pqCode, GETDATE(), 1,
                    @pqRemarks, @createdBy, GETDATE(), @createdBy
                )
            `;

            const headerResult = await transaction.request()
                .input('company', headerData.company)
                .input('referenceNum', headerData.referenceNum)
                .input('pqCode', pqCode)
                .input('pqRemarks', headerData.pqRemarks || '')
                .input('createdBy', creatorName)
                .query(headerQuery);

            // Get the ROWID of the inserted header
            const getRowIdQuery = `SELECT ROWID FROM [PURCHASE.QUOTATIONHEADER.1] WHERE PQCODE = @pqCode`;
            const rowIdResult = await transaction.request()
                .input('pqCode', pqCode)
                .query(getRowIdQuery);

            const headerRowId = rowIdResult.recordset[0].ROWID;

            console.log('Canvassing request header inserted');

            // Insert canvassing details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.QUOTATIONDETAILS.1] (
                        PQCODE, PRCODE, RID, PQDPOSTSTATUS, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, VENDORID, BRAND, ORIGIN, IS_IMPORTED,
                        OFFEREDPRICE, BIDPRICE, FINALPRICE, PYMTRMID, SUPPLIERQTY,
                        LEGEND, DELIVERYSCHEDULE, PONUMBER, REMARKS, CANVASSED_BY,
                        BUDGETCODE, DATECREATED, MODIFIEDBY, MODIFIEDDATE, IS_SERVED
                    ) VALUES (
                        @pqCode, @prCode, @rid, 'FOR CANVASSING', @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @vendorId, @brand, @origin, @isImported,
                        @offeredPrice, @bidPrice, @finalPrice, @paymentTerms, @supplierQty,
                        @legend, @deliverySchedule, @poNumber, @remarks, @canvassedBy,
                        @budgetCode, GETDATE(), @modifiedBy, GETDATE(), @isServed
                    )
                `;

                await transaction.request()
                    .input('pqCode', pqCode)
                    .input('prCode', detail.prCode || '')
                    .input('rid', detail.rid || `${pqCode}-${i + 1}`)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('vendorId', detail.vendorId || '')
                    .input('brand', detail.brand || '')
                    .input('origin', detail.origin || '')
                    .input('isImported', detail.isImported || 0)
                    .input('offeredPrice', detail.offeredPrice || 0)
                    .input('bidPrice', detail.bidPrice || 0)
                    .input('finalPrice', detail.finalPrice || 0)
                    .input('paymentTerms', detail.paymentTerms || '')
                    .input('supplierQty', detail.supplierQty || 0)
                    .input('legend', detail.legend || '')
                    .input('deliverySchedule', detail.deliverySchedule || '')
                    .input('poNumber', detail.poNumber || '')
                    .input('remarks', detail.remarks || '')
                    .input('canvassedBy', detail.canvassedBy || creatorName)
                    .input('budgetCode', detail.budgetCode)
                    .input('modifiedBy', creatorName)
                    .input('isServed', detail.isServed || 0)
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} canvassing request details inserted`);

            // Insert initial approval status
            const approvalInsertQuery = `
                INSERT INTO [PURCHASE.QUOTATIONAPPROVALSTATUS.1] (
                    PQROWID, IS_APPROVED, APPROVEDBY, DATEAPPROVED
                ) VALUES (
                    @pqRowId, 0, NULL, NULL
                )
            `;

            await transaction.request()
                .input('pqRowId', headerRowId)
                .query(approvalInsertQuery);

            console.log('Approval status initialized');

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Canvassing Request ${pqCode} created by ${creatorName}`)
                .input('creatorName', creatorName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                pqCode,
                success: true
            };

        } catch (error) {
            console.error('Error creating canvassing request:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to create canvassing request: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
        }
    }

    // Update canvassing request
    static async updateCanvassingRequest(pqCode, headerData, detailsData, updaterName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for canvassing request update');

            // Update header
            const updateHeaderQuery = `
                UPDATE [PURCHASE.QUOTATIONHEADER.1]
                SET COMPANY = @company,
                    REFERENCENUM = @referenceNum,
                    PQREMARKS = @pqRemarks,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @modifiedBy
                WHERE PQCODE = @pqCode
            `;

            const headerResult = await transaction.request()
                .input('pqCode', pqCode)
                .input('company', headerData.company)
                .input('referenceNum', headerData.referenceNum)
                .input('pqRemarks', headerData.pqRemarks || '')
                .input('modifiedBy', updaterName)
                .query(updateHeaderQuery);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Canvassing request not found');
            }

            console.log('Canvassing request header updated');

            // Delete existing details
            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.QUOTATIONDETAILS.1]
                WHERE PQCODE = @pqCode
            `;

            await transaction.request()
                .input('pqCode', pqCode)
                .query(deleteDetailsQuery);

            console.log('Existing details deleted');

            // Insert updated details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.QUOTATIONDETAILS.1] (
                        PQCODE, PRCODE, RID, PQDPOSTSTATUS, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, VENDORID, BRAND, ORIGIN, IS_IMPORTED,
                        OFFEREDPRICE, BIDPRICE, FINALPRICE, PYMTRMID, SUPPLIERQTY,
                        LEGEND, DELIVERYSCHEDULE, PONUMBER, REMARKS, CANVASSED_BY,
                        BUDGETCODE, DATECREATED, MODIFIEDBY, MODIFIEDDATE, IS_SERVED
                    ) VALUES (
                        @pqCode, @prCode, @rid, @pqdPostStatus, @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @vendorId, @brand, @origin, @isImported,
                        @offeredPrice, @bidPrice, @finalPrice, @paymentTerms, @supplierQty,
                        @legend, @deliverySchedule, @poNumber, @remarks, @canvassedBy,
                        @budgetCode, GETDATE(), @modifiedBy, GETDATE(), @isServed
                    )
                `;

                await transaction.request()
                    .input('pqCode', pqCode)
                    .input('prCode', detail.prCode || '')
                    .input('rid', detail.rid || `${pqCode}-${i + 1}`)
                    .input('pqdPostStatus', detail.pqdPostStatus || 'FOR CANVASSING')
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('vendorId', detail.vendorId || '')
                    .input('brand', detail.brand || '')
                    .input('origin', detail.origin || '')
                    .input('isImported', detail.isImported || 0)
                    .input('offeredPrice', detail.offeredPrice || 0)
                    .input('bidPrice', detail.bidPrice || 0)
                    .input('finalPrice', detail.finalPrice || 0)
                    .input('paymentTerms', detail.paymentTerms || '')
                    .input('supplierQty', detail.supplierQty || 0)
                    .input('legend', detail.legend || '')
                    .input('deliverySchedule', detail.deliverySchedule || '')
                    .input('poNumber', detail.poNumber || '')
                    .input('remarks', detail.remarks || '')
                    .input('canvassedBy', detail.canvassedBy || updaterName)
                    .input('budgetCode', detail.budgetCode)
                    .input('modifiedBy', updaterName)
                    .input('isServed', detail.isServed || 0)
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} updated details inserted`);

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @updaterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Canvassing Request ${pqCode} updated by ${updaterName}`)
                .input('updaterName', updaterName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Canvassing request updated successfully'
            };

        } catch (error) {
            console.error('Error updating canvassing request:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to update canvassing request: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
        }
    }

    // Approve canvassing request
    static async approveCanvassingRequest(pqCode, approverName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get header ROWID
            const getHeaderQuery = `SELECT ROWID FROM [PURCHASE.QUOTATIONHEADER.1] WHERE PQCODE = @pqCode`;
            const headerResult = await connection.request()
                .input('pqCode', pqCode)
                .query(getHeaderQuery);

            if (headerResult.recordset.length === 0) {
                throw new Error('Canvassing request not found');
            }

            const pqRowId = headerResult.recordset[0].ROWID;

            // Update approval status
            const updateApprovalQuery = `
                UPDATE [PURCHASE.QUOTATIONAPPROVALSTATUS.1]
                SET IS_APPROVED = 1,
                    APPROVEDBY = @approverName,
                    DATEAPPROVED = GETDATE()
                WHERE PQROWID = @pqRowId
            `;

            await connection.request()
                .input('pqRowId', pqRowId)
                .input('approverName', approverName)
                .query(updateApprovalQuery);



            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @approverName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Canvassing Request ${pqCode} approved by ${approverName}`)
                .input('approverName', approverName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Canvassing request approved successfully'
            };
        } catch (error) {
            console.error('Error approving canvassing request:', error);
            throw new Error('Failed to approve canvassing request: ' + error.message);
        }
    }

    // Get next PQ code
    static async getNextPQCode() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get the highest PQ code
            const query = `
                SELECT TOP 1 PQCODE
                FROM [PURCHASE.QUOTATIONHEADER.1]
                WHERE PQCODE LIKE 'PQ-%'
                ORDER BY CAST(SUBSTRING(PQCODE, 4, LEN(PQCODE)-3) AS INT) DESC
            `;

            const result = await connection.request().query(query);

            let nextNumber = 1;
            if (result.recordset.length > 0) {
                const lastPQ = result.recordset[0].PQCODE;
                const lastNumber = parseInt(lastPQ.substring(3)); // Remove 'PQ-' prefix
                nextNumber = lastNumber + 1;
            }

            return `PQ-${nextNumber}`;
        } catch (error) {
            console.error('Error getting next PQ code:', error);
            throw new Error('Failed to generate PQ code: ' + error.message);
        }
    }

    // Get purchase request details that are FOR CANVASSING
    static async getPurchaseRequestDetailsForCanvassing(user, filterByAddressedTo = true) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                  rd.*,
                  rh.COMPANY,
                  rh.REQUESTTYPE,
                  rh.REQUESTEDBY as requester,
                  rh.DATEREQUESTED as dateRequested,
                  rh.LOCNCODE as location,
                  rh.REFERENCENO as requestId
                FROM [PURCHASE.REQUESTDETAILS.1] rd
                INNER JOIN [PURCHASE.REQUESTHEADER.1] rh ON rd.REFERENCENO = rh.REFERENCENO
                WHERE rh.REQUESTSTATUS = 'FOR CANVASSING'
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by requested by (only show PRs created by the user for non-admin users)
            if (filterByAddressedTo && user?.empName) {
                query += ` AND UPPER(rh.REQUESTEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: user.empName });
                paramIndex++;
            }

            query += ` ORDER BY rh.DATECREATED DESC, rd.ROWID`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);

            const items = result.recordset.map(record => ({
                id: record.ROWID,
                referenceNo: record.REFERENCENO,
                itemNumber: record.ITEMNMBR,
                itemDescription: record.ITEMDESC,
                rid: record.RID,
                unitOfMeasure: record.UOFM,
                quantity: record.QUANTITY,
                budgetCode: record.BUDGETCODE,
                remarks: record.REMARKS,
                dateNeeded: record.DATENEEDED,
                requestId: record.requestId,
                requestType: record.REQUESTTYPE,
                company: record.COMPANY,
                requester: record.requester,
                dateRequested: record.dateRequested,
                location: record.location,
                ITEMNMBR: record.ITEMNMBR,
                ITEMDESC: record.ITEMDESC,
                UOFM: record.UOFM,
                QUANTITY: record.QUANTITY,
                BUDGETCODE: record.BUDGETCODE,
                REMARKS: record.REMARKS || '',
                RID: record.RID
            }));

            return items;
        } catch (error) {
            console.error('Error getting purchase request details for canvassing:', error);
            throw new Error('Failed to fetch purchase request details: ' + error.message);
        }
    }

    // Get canvassing statistics
    static async getCanvassingStats(user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                    POSTSTATUS,
                    COUNT(*) as count
                FROM [PURCHASE.QUOTATIONHEADER.1]
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by created by (only show stats for canvassing requests created by the user)
            if (user) {
                const userName = user.empName;
                query += ` AND UPPER(CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            query += ` GROUP BY POSTSTATUS`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);

            const stats = {};
            result.recordset.forEach(record => {
                stats[record.POSTSTATUS] = record.count;
            });

            return stats;
        } catch (error) {
            console.error('Error fetching canvassing stats:', error);
            throw new Error('Failed to fetch canvassing stats: ' + error.message);
        }
    }
}

export default Canvassing;
