'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

class Canvassing {
    // Get all canvassing requests with filtering and role-based access
    static async getAllCanvassingRequests(filters = {}, user = null, isAdmin = true) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Join with details and PR tables to get all required fields
            let query = `
                SELECT DISTINCT
                    PQH.ROWID,
                    PQH.REFERENCENUM,
                    PQH.PQCODE,
                    PQH.DATEREQUESTED,
                    PQH.POSTSTATUS,
                    PQH.PQREMARKS,
                    PQH.CREATEDBY,
                    PQH.DATEMODIFIED,
                    PQH.MODIFIEDBY,
                    -- Fields from details table
                    PQD.PRCODE as prId,
                    PQD.ITEMDESC as itemDescription,
                    PQD.CANVASSED_BY as canvassedBy,
                    PQD.APPROVALSTATUS as approvalStatus,
                    PQD.APPROVEDBY as approvedBy,
                    -- Fields from PR header
                    PRH.REQUESTEDBY as prBy,
                    PRH.DATEAPPROVED as prApprovalDate
                FROM [PURCHASE.QUOTATIONHEADER.1] PQH
                LEFT JOIN [PURCHASE.QUOTATIONDETAILS.1] PQD ON PQH.PQCODE = PQD.PQCODE
                LEFT JOIN [PURCHASE.REQUESTHEADER.1] PRH ON PQD.PRCODE = PRH.REFERENCENO
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by status (for canvassing)
            if (filters.status !== undefined && filters.status !== null) {
                query += ` AND PQH.POSTSTATUS = @status${paramIndex}`;
                params.push({ name: `status${paramIndex}`, value: filters.status });
                paramIndex++;
            }
            // No default filter - show all statuses including posted (POSTSTATUS = 1)

            // Filter by created by (only show canvassing requests created by the user for non-admin users)
            if (user && !isAdmin) {
                const userName = user.empName;
                query += ` AND UPPER(PQH.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            // Filter by status only if explicitly provided (for admins)
            if (user && isAdmin && filters.status !== undefined && filters.status !== null) {
                query += ` AND PQH.POSTSTATUS = @status${paramIndex}`;
                params.push({ name: `status${paramIndex}`, value: filters.status });
                paramIndex++;
            }

            // Company filter removed since company is now per-item in details

            if (filters.pqCode) {
                query += ` AND PQH.PQCODE LIKE @pqCode${paramIndex}`;
                params.push({ name: `pqCode${paramIndex}`, value: `%${filters.pqCode}%` });
                paramIndex++;
            }

            // Add ORDER BY at the end after all filters
            query += ` ORDER BY PQH.DATEREQUESTED DESC`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                referenceNum: `COQ-${record.REFERENCENUM}`,
                pqCode: record.PQCODE,
                dateRequested: record.DATEREQUESTED,
                postStatus: record.POSTSTATUS,
                pqRemarks: record.PQREMARKS,
                createdBy: record.CREATEDBY,
                dateModified: record.DATEMODIFIED,
                modifiedBy: record.MODIFIEDBY,
                approvalStatus: record.approvalStatus,
                approvedBy: record.approvedBy,
                // New fields from joined tables
                prId: record.prId,
                prBy: record.prBy,
                itemDescription: record.itemDescription,
                canvassedBy: record.canvassedBy,
                prApprovalDate: record.prApprovalDate
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

                // if (accessResult.recordset[0].count === 0) {
                //     throw new Error('Access denied: You can only view canvassing requests you created');
                // }
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

            // Get details with supplier information and company
            const detailsQuery = `
                SELECT PQD.*, S.VENDNAME as vendorName
                FROM [PURCHASE.QUOTATIONDETAILS.1] PQD
                LEFT JOIN [SUPPLIER.1] S ON PQD.VENDORID = S.VENDORID
                WHERE PQD.PQCODE = @pqCode
                ORDER BY PQD.ROWID
            `;
            const detailsResult = await connection.request()
                .input('pqCode', pqCode)
                .query(detailsQuery);

            // Get approval status from QUOTATIONDETAILS
            const approvalQuery = `
                SELECT ROWID, APPROVALSTATUS, APPROVEDBY, REJECTREMARKS, DATECREATED 
                FROM [PURCHASE.QUOTATIONDETAILS.1]
                WHERE ROWID = @pqRowId
            `;
            const approvalResult = await connection.request()
                .input('pqRowId', header.ROWID)
                .query(approvalQuery);

            return {
                header: {
                    id: header.ROWID,
                    referenceNum: `COQ-${header.REFERENCENUM}`,
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
                    approvalStatus: detail.APPROVALSTATUS,
                    approvedBy: detail.APPROVEDBY,
                    rejectRemarks: detail.REJECTREMARKS,
                    dateApproved: detail.DATECREATED,
                    itemNumber: detail.ITEMNMBR,
                    itemDescription: detail.ITEMDESC,
                    unitOfMeasure: detail.UOFM,
                    quantity: detail.QUANTITY,
                    company: detail.COMPANY,
                    vendorId: detail.VENDORID,
                    vendorName: detail.vendorName,
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
                    pqRowId: approval.ROWID,
                    approvalStatus: approval.APPROVALSTATUS,
                    approvedBy: approval.APPROVEDBY,
                    rejectRemarks: approval.REJECTREMARKS,
                    dateApproved: approval.DATECREATED
                }))
            };
        } catch (error) {
            console.error('Error fetching canvassing request:', error);
            throw new Error('Failed to fetch canvassing request: ' + error.message);
        }
    }

    // Create new canvassing request with transaction safety
    static async createCanvassingRequest(headerData, detailsData, creatorName, supplierName = '') {
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

            // Use reference number as PQ code
            const pqCode = headerData.referenceNum;

            // Extract number from referenceNum (remove 'COQ-' prefix)
            const referenceNumOnly = parseInt(headerData.referenceNum.replace('COQ-', ''));

            // Leave PQREMARKS as blank
            let remarks = '';

            // Insert canvassing header
            const headerQuery = `
                INSERT INTO [PURCHASE.QUOTATIONHEADER.1] (
                    REFERENCENUM, PQCODE, DATEREQUESTED, POSTSTATUS,
                    PQREMARKS, CREATEDBY, DATEMODIFIED, MODIFIEDBY
                ) VALUES (
                    @referenceNum, @pqCode, GETDATE(), 0,
                    @pqRemarks, @createdBy, GETDATE(), @createdBy
                )
            `;

            const headerResult = await transaction.request()
                .input('referenceNum', referenceNumOnly)
                .input('pqCode', pqCode)
                .input('pqRemarks', remarks)
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

                await transaction.request()
                    .input('pqCode', pqCode)
                    .input('prCode', detail.prCode || '')
                    .input('rid', detail.rid || `${pqCode}-${i + 1}`)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('company', detail.company || headerData.company || '')
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
                    .input('isServed', detail.isServed || 0)
                    .query(`INSERT INTO [PURCHASE.QUOTATIONDETAILS.1] (
                        PQCODE, PRCODE, RID, PQDPOSTSTATUS, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, COMPANY, VENDORID, BRAND, ORIGIN, IS_IMPORTED,
                        OFFEREDPRICE, BIDPRICE, FINALPRICE, PYMTRMID, SUPPLIERQTY,
                        LEGEND, DELIVERYSCHEDULE, PONUMBER, REMARKS, CANVASSED_BY,
                        BUDGETCODE, DATECREATED, IS_SERVED
                    ) VALUES (
                        @pqCode, @prCode, @rid, 0, @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @company, @vendorId, @brand, @origin, @isImported,
                        @offeredPrice, @bidPrice, @finalPrice, @paymentTerms, @supplierQty,
                        @legend, @deliverySchedule, @poNumber, @remarks, @canvassedBy,
                        @budgetCode, GETDATE(), @isServed
                    )`);
            }

            console.log(`${detailsData.length} canvassing request details inserted`);

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
    static async updateCanvassingRequest(headerData, detailsData, updaterName) {
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

            const pqCode = headerData.pqCode;

            // Extract number from referenceNum (remove 'COQ-' prefix)
            const referenceNumOnly = parseInt(headerData.referenceNum.replace('COQ-', ''));

            // Update header
            const updateHeaderQuery = `
                UPDATE [PURCHASE.QUOTATIONHEADER.1]
                SET REFERENCENUM = @referenceNum,
                    PQREMARKS = @pqRemarks,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @modifiedBy
                WHERE PQCODE = @pqCode
            `;

            const headerResult = await transaction.request()
                .input('pqCode', pqCode)
                .input('referenceNum', referenceNumOnly)
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

                await transaction.request()
                    .input('pqCode', pqCode)
                    .input('prCode', detail.prCode || '')
                    .input('rid', detail.rid || `${pqCode}-${i + 1}`)
                    .input('itemNumber', detail.itemNumber)
                    .input('itemDescription', detail.itemDescription)
                    .input('unitOfMeasure', detail.unitOfMeasure)
                    .input('quantity', detail.quantity)
                    .input('company', detail.company || headerData.company || '')
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
                    .query(`INSERT INTO [PURCHASE.QUOTATIONDETAILS.1] (
                        PQCODE, PRCODE, RID, PQDPOSTSTATUS, ITEMNMBR, ITEMDESC,
                        UOFM, QUANTITY, COMPANY, VENDORID, BRAND, ORIGIN, IS_IMPORTED,
                        OFFEREDPRICE, BIDPRICE, FINALPRICE, PYMTRMID, SUPPLIERQTY,
                        LEGEND, DELIVERYSCHEDULE, PONUMBER, REMARKS, CANVASSED_BY,
                        BUDGETCODE, DATECREATED, MODIFIEDBY, MODIFIEDDATE, IS_SERVED
                    ) VALUES (
                        @pqCode, @prCode, @rid, 0, @itemNumber, @itemDescription,
                        @unitOfMeasure, @quantity, @company, @vendorId, @brand, @origin, @isImported,
                        @offeredPrice, @bidPrice, @finalPrice, @paymentTerms, @supplierQty,
                        @legend, @deliverySchedule, @poNumber, @remarks, @canvassedBy,
                        @budgetCode, GETDATE(), @modifiedBy, GETDATE(), @isServed
                    )`);
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

    // Post canvassing request (change status to posted)
    static async postCanvassingRequest(pqCode, posterName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for canvassing request posting');

            // Update header post status to 1 (POSTED)
            const updateHeaderQuery = `
                UPDATE [PURCHASE.QUOTATIONHEADER.1]
                SET POSTSTATUS = 1,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @posterName
                WHERE PQCODE = @pqCode
            `;

            const result = await transaction.request()
                .input('pqCode', pqCode)
                .input('posterName', posterName)
                .query(updateHeaderQuery);

            // Update details post status to 1 (POSTED)
            const updateDetailsQuery = `
                UPDATE [PURCHASE.QUOTATIONDETAILS.1]
                SET PQDPOSTSTATUS = 1,
                    MODIFIEDDATE = GETDATE(),
                    APPROVALSTATUS = 'PENDING',
                    MODIFIEDBY = @posterName
                WHERE PQCODE = @pqCode
            `;

            const resultDetails = await transaction.request()
                .input('pqCode', pqCode)
                .input('posterName', posterName)
                .query(updateDetailsQuery);

            if (result.rowsAffected[0] === 0 || resultDetails.rowsAffected[0] === 0) {
                throw new Error('Canvassing request not found');
            }

            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @posterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Canvassing Request ${pqCode} posted by ${posterName}`)
                .input('posterName', posterName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Canvassing request posted successfully'
            };
        } catch (error) {
            console.error('Error posting canvassing request:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to post canvassing request: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
        }
    }

    // Delete canvassing request
    static async deleteCanvassingRequest(pqCode, deleterName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for canvassing request deletion');

            // Delete details first (foreign key constraint)
            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.QUOTATIONDETAILS.1]
                WHERE PQCODE = @pqCode
            `;

            const detailsResult = await transaction.request()
                .input('pqCode', pqCode)
                .query(deleteDetailsQuery);

            console.log(`${detailsResult.rowsAffected[0]} canvassing request details deleted`);

            // Delete header
            const deleteHeaderQuery = `
                DELETE FROM [PURCHASE.QUOTATIONHEADER.1]
                WHERE PQCODE = @pqCode
            `;

            const headerResult = await transaction.request()
                .input('pqCode', pqCode)
                .query(deleteHeaderQuery);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Canvassing request not found');
            }

            console.log('Canvassing request header deleted');

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @deleterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Canvassing Request ${pqCode} deleted by ${deleterName}`)
                .input('deleterName', deleterName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Canvassing request deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting canvassing request:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to delete canvassing request: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
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

    // Get next reference number with QUO- prefix
    static async getNextReferenceNumber() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get the highest reference number (REFERENCENUM is int column)
            const query = `
                SELECT TOP 1 REFERENCENUM
                FROM [PURCHASE.QUOTATIONHEADER.1]
                ORDER BY REFERENCENUM DESC
            `;

            const result = await connection.request().query(query);

            let nextNumber = 1;
            if (result.recordset.length > 0) {
                const lastNumber = result.recordset[0].REFERENCENUM;
                nextNumber = lastNumber + 1;
            }

            return `COQ-${nextNumber}`;
        } catch (error) {
            console.error('Error getting next reference number:', error);
            throw new Error('Failed to generate reference number: ' + error.message);
        }
    }

    // Check existing suppliers for given RIDs
    static async checkExistingSuppliersForRIDs(rids) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            if (!rids || rids.length === 0) {
                return new Map();
            }

            // Create placeholders for the IN clause
            const placeholders = rids.map((_, index) => `@rid${index}`).join(', ');

            const query = `
                SELECT DISTINCT RID, VENDORID
                FROM [PURCHASE.QUOTATIONDETAILS.1]
                WHERE RID IN (${placeholders})
            `;

            const request = connection.request();
            rids.forEach((rid, index) => {
                request.input(`rid${index}`, rid);
            });

            const result = await request.query(query);

            // Create a Map of RID -> vendorId
            const existingSuppliers = new Map();
            result.recordset.forEach(record => {
                existingSuppliers.set(record.RID, record.VENDORID);
            });

            return existingSuppliers;
        } catch (error) {
            console.error('Error checking existing suppliers for RIDs:', error);
            throw new Error('Failed to check existing suppliers: ' + error.message);
        }
    }

    // Get purchase request details that are FOR CANVASSING or already canvassed (POSTSTATUS = 1)
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
                  rh.ADDRESSEDTO as addressedTo,
                  rh.DATEREQUESTED as dateRequested,
                  rh.LOCNCODE as location,
                  rh.REFERENCENO as requestId
                FROM [PURCHASE.REQUESTDETAILS.1] rd
                INNER JOIN [PURCHASE.REQUESTHEADER.1] rh ON rd.REFERENCENO = rh.REFERENCENO
                WHERE rd.ITEMSTATUS = 'FOR CANVASSING' 
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by addressed to (only show PRs addressed to the user for non-admin users)
            if (filterByAddressedTo && user?.empName) {
                query += ` AND UPPER(rh.ADDRESSEDTO) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: user.empName });
                paramIndex++;
            }

            query += ` ORDER BY rh.DATECREATED, rd.RID`;

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
                addressedTo: record.addressedTo,
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

    // Get canvassing statistics (both postStatus and approvalStatus)
    static async getCanvassingStats(user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Query for postStatus counts
            let postStatusQuery = `
                SELECT
                    POSTSTATUS,
                    COUNT(*) as count
                FROM [PURCHASE.QUOTATIONHEADER.1]
                WHERE 1=1
            `;

            // Query for approvalStatus counts
            let approvalStatusQuery = `
                SELECT
                    PQD.APPROVALSTATUS,
                    COUNT(*) as count
                FROM [PURCHASE.QUOTATIONDETAILS.1] PQD
                INNER JOIN [PURCHASE.QUOTATIONHEADER.1] PQH ON PQD.PQCODE = PQH.PQCODE
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by created by (only show stats for canvassing requests created by the user)
            if (user) {
                const userName = user.empName;
                postStatusQuery += ` AND UPPER(CREATEDBY) = UPPER(@userName${paramIndex})`;
                approvalStatusQuery += ` AND UPPER(CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            postStatusQuery += ` GROUP BY POSTSTATUS`;
            approvalStatusQuery += ` GROUP BY APPROVALSTATUS`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            // Execute both queries
            const postStatusResult = await request.query(postStatusQuery);
            const approvalStatusResult = await request.query(approvalStatusQuery);

            // Process postStatus results
            const stats = {
                postStatus: {},
                approvalStatus: {},
                total: 0
            };

            postStatusResult.recordset.forEach(record => {
                stats.postStatus[record.POSTSTATUS] = record.count;
                stats.total += record.count;
            });

            approvalStatusResult.recordset.forEach(record => {
                if (record.APPROVALSTATUS) {
                    stats.approvalStatus[record.APPROVALSTATUS.trim()] = record.count;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error fetching canvassing stats:', error);
            throw new Error('Failed to fetch canvassing stats: ' + error.message);
        }
    }

    // Get all suppliers
    static async getAllSuppliers() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT
                    ROWID,
                    VENDORID,
                    VENDNAME,
                    PYMTRMID
                FROM [SUPPLIER.1]
                ORDER BY VENDNAME
            `;

            const result = await connection.request().query(query);

            return result.recordset.map(record => ({
                id: record.ROWID,
                vendorId: record.VENDORID,
                vendorName: record.VENDNAME,
                paymentTerms: record.PYMTRMID
            }));
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            throw new Error('Failed to fetch suppliers: ' + error.message);
        }
    }

    // Get all payment terms
    static async getAllPaymentTerms() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_NAME);

            const query = `
                SELECT
                    ROWID,
                    PYMTRMID,
                    DUEDTDS,
                    ACTIVE,
                    DATECREATED,
                    DATEMODIFIED
                FROM [PAYMENT.TERMS.1]
                WHERE ACTIVE = 1
                ORDER BY PYMTRMID
            `;

            const result = await connection.request().query(query);

            return result.recordset.map(record => ({
                id: record.ROWID,
                paymentTermId: record.PYMTRMID,
                dueDays: record.DUEDTDS,
                active: record.ACTIVE,
                dateCreated: record.DATECREATED,
                dateModified: record.DATEMODIFIED
            }));
        } catch (error) {
            console.error('Error fetching payment terms:', error);
            throw new Error('Failed to fetch payment terms: ' + error.message);
        }
    }
}

export default Canvassing;

