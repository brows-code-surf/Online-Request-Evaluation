'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';
import { Notification } from './Notification.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';
import UserProfile from './UserProfile.js';

class PurchaseOrder {
    // Get all purchase orders with filtering and role-based access
    static async getAllPurchaseOrders(filters = {}, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT DISTINCT
                    h.ROWID,
                    h.POSTSTATUS,
                    h.PO_STATUS,
                    h.PONUMBER,
                    h.DATECREATED,
                    h.CREATEDBY,
                    h.VENDORID,
                    h.VENDNAME,
                    h.PYMTRMID,
                    h.REFDOCTYPE,
                    h.DELIVERY_TO,
                    h.PODATE,
                    h.DATENEEDED,
                    h.PROMISEDDATE,
                    h.PROMISEDSHIPDATE,
                    h.CANVASSEDBY,
                    h.CONFIRMEDBY_1,
                    h.CONFIRMEDBY_2,
                    h.APPROVEDBY,
                    h.IS_BUDGETNO,
                    h.IS_PRNO,
                    h.CAPEX,
                    h.IS_PERADVISE,
                    h.REMARKS,
                    h.SUBTOTAL,
                    h.BUDGETNOLIST,
                    h.PRLISTS,
                    COUNT(d.RID) as itemCount
                FROM [PURCHASE.ORDERHEADER.1] h
                LEFT JOIN [PURCHASE.ORDERDETAILS.1] d ON h.PONUMBER = d.PONUMBER
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by created by (only show POs created by the user for non-admin users)
            if (user && !isAdmin) {
                const userName = user.empName;
                query += ` AND UPPER(h.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            // Apply filters
            if (filters.status) {
                if (filters.status === 'POSTED') {
                    query += ` AND h.POSTSTATUS = 1`;
                } else if (filters.status === 'NOT POSTED') {
                    query += ` AND h.POSTSTATUS = 0`;
                }
                paramIndex++;
            }

            if (filters.vendorId) {
                query += ` AND h.VENDORID = @vendorId${paramIndex}`;
                params.push({ name: `vendorId${paramIndex}`, value: filters.vendorId });
                paramIndex++;
            }

            if (filters.dateFrom) {
                query += ` AND h.DATECREATED >= @dateFrom${paramIndex}`;
                params.push({ name: `dateFrom${paramIndex}`, value: new Date(filters.dateFrom) });
                paramIndex++;
            }

            if (filters.dateTo) {
                query += ` AND h.DATECREATED <= @dateTo${paramIndex}`;
                params.push({ name: `dateTo${paramIndex}`, value: new Date(filters.dateTo) });
                paramIndex++;
            }

            query += `
                GROUP BY h.ROWID, h.POSTSTATUS, h.PO_STATUS, h.PONUMBER, h.DATECREATED, h.CREATEDBY, h.VENDORID, h.VENDNAME,
                         h.PYMTRMID, h.REFDOCTYPE, h.DELIVERY_TO, h.PODATE, h.DATENEEDED, h.PROMISEDDATE,
                         h.PROMISEDSHIPDATE, h.CANVASSEDBY, h.CONFIRMEDBY_1, h.CONFIRMEDBY_2, h.APPROVEDBY, h.IS_BUDGETNO,
                         h.IS_PRNO, h.CAPEX, h.IS_PERADVISE, h.REMARKS, h.SUBTOTAL, h.BUDGETNOLIST, h.PRLISTS
                ORDER BY h.DATECREATED DESC, h.PONUMBER DESC
            `;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                postStatus: record.POSTSTATUS,
                poStatus: record.PO_STATUS || 'PENDING',
                poNumber: record.PONUMBER,
                dateCreated: record.DATECREATED,
                createdBy: record.CREATEDBY,
                vendorId: record.VENDORID,
                vendName: record.VENDNAME,
                pymtrmid: record.PYMTRMID,
                refDocType: record.REFDOCTYPE,
                deliveryTo: record.DELIVERY_TO,
                poDate: record.PODATE,
                dateNeeded: record.DATENEEDED,
                promisedDate: record.PROMISEDDATE,
                promisedShipDate: record.PROMISEDSHIPDATE,
                canvassedBy: record.CANVASSEDBY,
                confirmedBy_1: record.CONFIRMEDBY_1,
                confirmedBy_2: record.CONFIRMEDBY_2,
                approvedBy: record.APPROVEDBY,
                isBudgetNo: record.IS_BUDGETNO,
                isPrNo: record.IS_PRNO,
                capex: record.CAPEX,
                isPerAdvise: record.IS_PERADVISE,
                remarks: record.REMARKS,
                subtotal: record.SUBTOTAL,
                budgetNoList: record.BUDGETNOLIST,
                prList: record.PRLISTS,
                itemCount: record.itemCount,
                confirmedBy: [record.CONFIRMEDBY_1, record.CONFIRMEDBY_2].filter(name => name && name.trim()).join(' , '),
                dateConfirmed: record.DATECONFIRMED_1 || record.DATECONFIRMED_2
            }));
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            throw new Error('Failed to fetch purchase orders: ' + error.message);
        }
    }

    // Get purchase order by PO number with details
    static async getPurchaseOrderByPONumber(poNumber, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check access permissions - only allow if user is the creator (unless admin)
            if (user && !isAdmin) {
                const userName = user.empName;
                const accessQuery = `
                    SELECT COUNT(*) as count FROM [PURCHASE.ORDERHEADER.1]
                    WHERE PONUMBER = @poNumber AND UPPER(CREATEDBY) = UPPER(@userName)
                `;
                const accessResult = await connection.request()
                    .input('poNumber', poNumber)
                    .input('userName', userName)
                    .query(accessQuery);

                if (accessResult.recordset[0].count === 0) {
                    throw new Error('Access denied: You can only view purchase orders you created');
                }
            }

            // Get header
            const headerQuery = `
                SELECT ROWID, POSTSTATUS, PONUMBER, DATECREATED, CREATEDBY, VENDORID, VENDNAME,
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
                throw new Error('Purchase order not found');
            }

            const header = headerResult.recordset[0];

            // Get details
            const detailsQuery = `
                SELECT ROWID, PONUMBER, RID, PQCODE, PRCODE, ITEMNMBR, ITEMDESC, UOFM, QTYORDER, QTYCANCEL,
                       QTYALLOCATED, UNITCOST, EXTDCOST, BRAND, ORIGIN, QTYSERVED, BUDGETNO
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
                    confirmedBy: [header.CONFIRMEDBY_1, header.CONFIRMEDBY_2].filter(name => name && name.trim()).join(' , '),
                    dateConfirmed: header.DATECONFIRMED_1 || header.DATECONFIRMED_2
                },
                details: detailsResult.recordset.map(detail => ({
                    id: detail.ROWID,
                    poNumber: detail.PONUMBER,
                    rid: detail.RID,
                    pqCode: detail.PQCODE,
                    prCode: detail.PRCODE,
                    itemNmbr: detail.ITEMNMBR,
                    itemDesc: detail.ITEMDESC,
                    uofm: detail.UOFM,
                    qtyOrder: detail.QTYORDER,
                    qtyCancel: detail.QTYCANCEL,
                    qtyAllocated: detail.QTYALLOCATED,
                    unitCost: detail.UNITCOST,
                    extdCost: detail.EXTDCOST,
                    brand: detail.BRAND,
                    origin: detail.ORIGIN,
                    qtyServed: detail.QTYSERVED,
                    // itemStatus: detail.ITEMSTATUS,
                    budgetNo: detail.BUDGETNO
                }))
            };
        } catch (error) {
            console.error('Error fetching purchase order:', error);
            throw new Error('Failed to fetch purchase order: ' + error.message);
        }
    }

    // Create new purchase order with transaction safety
    static async createPurchaseOrder(headerData, detailsData, creatorName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for purchase order creation');

            // Generate PO number if not provided
            let poNumber = headerData.poNumber;
            if (!poNumber) {
                poNumber = await this.getNextPONumber();
            }

            // Check if PO number is already taken
            const checkRefQuery = `
                SELECT COUNT(*) as count FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;

            const refCheckResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(checkRefQuery);

            if (refCheckResult.recordset[0].count > 0) {
                // PO number taken, generate new one
                poNumber = await this.getNextPONumber();
            }

            // Insert Purchase Order header
            const headerQuery = `
                INSERT INTO [PURCHASE.ORDERHEADER.1] (
                    PONUMBER, DATECREATED, CREATEDBY, VENDORID, VENDNAME, PYMTRMID,
                    REFDOCTYPE, DELIVERY_TO, PODATE, DATENEEDED, PROMISEDDATE, PROMISEDSHIPDATE,
                    CANVASSEDBY, CONFIRMEDBY_1, CONFIRMEDBY_2, APPROVEDBY, IS_BUDGETNO, IS_PRNO, CAPEX, IS_PERADVISE, REMARKS,
                    SUBTOTAL, BUDGETNOLIST, PRLISTS, POSTSTATUS, PO_STATUS
                ) VALUES (
                    @poNumber, GETDATE(), @createdBy, @vendorId, @vendName, @pymtrmid,
                    @refDocType, @deliveryTo, GETDATE(), @dateNeeded, @promisedDate, @promisedShipDate,
                    @canvassedBy, @confirmedBy_1, @confirmedBy_2, @approvedBy, @isBudgetNo, @isPrNo, @capex, @isPerAdvise, @remarks,
                    @subtotal, @budgetNoList, @prList, @postStatus, @poStatus
                )
            `;

            await transaction.request()
                .input('poNumber', poNumber)
                .input('createdBy', creatorName)
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('pymtrmid', headerData.pymtrmid || '')
                .input('refDocType', headerData.refDocType || '')
                .input('deliveryTo', headerData.deliveryTo || '')
                .input('dateNeeded', headerData.dateNeeded || null)
                .input('promisedDate', headerData.promisedDate || null)
                .input('promisedShipDate', headerData.promisedShipDate || null)
                .input('canvassedBy', headerData.canvassedBy || creatorName)
                .input('confirmedBy_1', headerData.confirmedBy_1 || '')
                .input('confirmedBy_2', headerData.confirmedBy_2 || '')
                .input('approvedBy', headerData.approvedBy || '')
                .input('isBudgetNo', headerData.isBudgetNo || 0)
                .input('isPrNo', headerData.isPrNo || 0)
                .input('capex', headerData.capex || 0)
                .input('isPerAdvise', headerData.isPerAdvise || 0)
                .input('remarks', headerData.remarks || '')
                .input('subtotal', headerData.subtotal || 0)
                .input('budgetNoList', headerData.budgetNoList || '')
                .input('prList', headerData.prList || '')
                .input('postStatus', 0) // NOT POSTED
                .input('poStatus', 'PENDING')
                .query(headerQuery);

            console.log('Purchase order header inserted');

            // Insert Purchase Order items/details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];
                const rid = detail.rid;

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.ORDERDETAILS.1] (
                        PONUMBER, RID, PQCODE, PRCODE, ITEMNMBR, ITEMDESC, UOFM, QTYORDER,
                        QTYCANCEL, QTYALLOCATED, UNITCOST, EXTDCOST, BRAND, ORIGIN,
                        QTYSERVED, ITEMSTATUS, BUDGETNO
                    ) VALUES (
                        @poNumber, @rid, @pqCode, @prCode, @itemNmbr, @itemDesc, @uofm, @qtyOrder,
                        @qtyCancel, @qtyAllocated, @unitCost, @extdCost, @brand, @origin,
                        @qtyServed, @itemStatus, @budgetNo
                    )
                `;

                await transaction.request()
                    .input('poNumber', poNumber)
                    .input('rid', rid)
                    .input('pqCode', detail.pqCode || '')
                    .input('prCode', detail.prCode || '')
                    .input('itemNmbr', detail.itemNmbr || '')
                    .input('itemDesc', detail.itemDesc || '')
                    .input('uofm', detail.uofm || '')
                    .input('qtyOrder', detail.qtyOrder || 0)
                    .input('qtyCancel', detail.qtyCancel || 0)
                    .input('qtyAllocated', detail.qtyAllocated || 0)
                    .input('unitCost', detail.unitCost || 0)
                    .input('extdCost', (detail.unitCost || 0) * (detail.qtyOrder || 0))
                    .input('brand', detail.brand || '')
                    .input('origin', detail.origin || '')
                    .input('qtyServed', detail.qtyServed || 0)
                    .input('itemStatus', detail.itemStatus || 'PENDING')
                    .input('budgetNo', detail.budgetNo || '')
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} purchase order details inserted`);

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Purchase Order ${poNumber} created by ${creatorName}`)
                .input('creatorName', creatorName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                poNumber: poNumber,
                message: 'Purchase order created successfully'
            };

        } catch (error) {
            console.error('Error creating purchase order:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to create purchase order: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
        }
    }

    // Update purchase order with transaction safety
    static async updatePurchaseOrder(poNumber, headerData, detailsData, updaterName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for purchase order update');

            // Check if PO exists and is not posted
            const checkQuery = `
                SELECT POSTSTATUS, ROWID FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const checkResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            if (checkResult.recordset[0].POSTSTATUS === 1) {
                throw new Error('Cannot update posted purchase orders');
            }

            // Update Purchase Order header
            const headerUpdateQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1] SET
                    VENDORID = @vendorId,
                    VENDNAME = @vendName,
                    PYMTRMID = @pymtrmid,
                    REFDOCTYPE = @refDocType,
                    DELIVERY_TO = @deliveryTo,
                    DATENEEDED = @dateNeeded,
                    PROMISEDDATE = @promisedDate,
                    PROMISEDSHIPDATE = @promisedShipDate,
                    CANVASSEDBY = @canvassedBy,
                    CONFIRMEDBY_1 = @confirmedBy_1,
                    CONFIRMEDBY_2 = @confirmedBy_2,
                    APPROVEDBY = @approvedBy,
                    IS_BUDGETNO = @isBudgetNo,
                    IS_PRNO = @isPrNo,
                    CAPEX = @capex,
                    IS_PERADVISE = @isPerAdvise,
                    REMARKS = @remarks,
                    SUBTOTAL = @subtotal,
                    BUDGETNOLIST = @budgetNoList,
                    PRLISTS = @prList,
                    CONTACTPERSON = @contactPerson,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @modifiedBy
                WHERE PONUMBER = @poNumber
            `;

            await transaction.request()
                .input('poNumber', poNumber)
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('pymtrmid', headerData.pymtrmid || '')
                .input('refDocType', headerData.refDocType || '')
                .input('deliveryTo', headerData.deliveryTo || '')
                .input('dateNeeded', headerData.dateNeeded || null)
                .input('promisedDate', headerData.promisedDate || null)
                .input('promisedShipDate', headerData.promisedShipDate || null)
                .input('canvassedBy', headerData.canvassedBy || updaterName)
                .input('confirmedBy_1', headerData.confirmedBy_1 || '')
                .input('confirmedBy_2', headerData.confirmedBy_2 || '')
                .input('approvedBy', headerData.approvedBy || '')
                .input('isBudgetNo', headerData.isBudgetNo || 0)
                .input('isPrNo', headerData.isPrNo || 0)
                .input('capex', headerData.capex || 0)
                .input('isPerAdvise', headerData.isPerAdvise || 0)
                .input('remarks', headerData.remarks || '')
                .input('subtotal', headerData.subtotal || 0)
                .input('budgetNoList', headerData.budgetNoList || '')
                .input('prList', headerData.prList || '')
                .input('contactPerson', headerData.contactPerson || '')
                .input('modifiedBy', updaterName)
                .query(headerUpdateQuery);

            console.log('Purchase order header updated');

            // Delete existing details and reinsert (simplified approach)
            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.ORDERDETAILS.1]
                WHERE PONUMBER = @poNumber
            `;
            await transaction.request()
                .input('poNumber', poNumber)
                .query(deleteDetailsQuery);

            // Insert updated details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];
                const rid = detail.rid; // Use the RID from the request

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.ORDERDETAILS.1] (
                        PONUMBER, RID, PQCODE, PRCODE, ITEMNMBR, ITEMDESC, UOFM, QTYORDER,
                        QTYCANCEL, QTYALLOCATED, UNITCOST, EXTDCOST, BRAND, ORIGIN,
                        QTYSERVED, ITEMSTATUS, BUDGETNO
                    ) VALUES (
                        @poNumber, @rid, @pqCode, @prCode, @itemNmbr, @itemDesc, @uofm, @qtyOrder,
                        @qtyCancel, @qtyAllocated, @unitCost, @extdCost, @brand, @origin,
                        @qtyServed, @itemStatus, @budgetNo
                    )
                `;

                await transaction.request()
                    .input('poNumber', poNumber)
                    .input('rid', rid)
                    .input('pqCode', detail.pqCode || '')
                    .input('prCode', detail.prCode || '')
                    .input('itemNmbr', detail.itemNmbr || '')
                    .input('itemDesc', detail.itemDesc || '')
                    .input('uofm', detail.uofm || '')
                    .input('qtyOrder', detail.qtyOrder || 0)
                    .input('qtyCancel', detail.qtyCancel || 0)
                    .input('qtyAllocated', detail.qtyAllocated || 0)
                    .input('unitCost', detail.unitCost || 0)
                    .input('extdCost', (detail.unitCost || 0) * (detail.qtyOrder || 0))
                    .input('brand', detail.brand || '')
                    .input('origin', detail.origin || '')
                    .input('qtyServed', detail.qtyServed || 0)
                    .input('itemStatus', detail.itemStatus || 'PENDING')
                    .input('budgetNo', detail.budgetNo || '')
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} purchase order details updated`);

            // Insert audit/history log
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Purchase Order ${poNumber} updated by ${updaterName}`)
                .input('creatorName', updaterName)
                .query(activityQuery);

            console.log('Activity log inserted');

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Purchase order updated successfully'
            };

        } catch (error) {
            console.error('Error updating purchase order:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to update purchase order: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
        }
    }

    // Post purchase order (set POSTSTATUS = 1)
    static async postPurchaseOrder(poNumber, posterName) {
        let connection = null;
        let transaction = null;

        try {
            // Get connection from pool
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            // BEGIN TRANSACTION
            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for purchase order posting');

            // Check if PO exists and get RIDs
            const checkQuery = `
                SELECT h.POSTSTATUS, d.RID
                FROM [PURCHASE.ORDERHEADER.1] h
                LEFT JOIN [PURCHASE.ORDERDETAILS.1] d ON h.PONUMBER = d.PONUMBER
                WHERE h.PONUMBER = @poNumber
            `;
            const checkResult = await transaction.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            if (checkResult.recordset[0].POSTSTATUS === 1) {
                throw new Error('Purchase order is already posted');
            }

            // Get unique RIDs from PO details
            const rids = [...new Set(checkResult.recordset.map(row => row.RID).filter(rid => rid))];

            // Update POSTSTATUS to 1
            const updatePOQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET POSTSTATUS = 1,
                    MODIFIEDBY = @modifiedBy,
                    DATEMODIFIED = GETDATE()
                WHERE PONUMBER = @poNumber
            `;

            const poResult = await transaction.request()
                .input('poNumber', poNumber)
                .input('modifiedBy', posterName)
                .query(updatePOQuery);

            if (poResult.rowsAffected[0] === 0) {
                throw new Error('Purchase order not found or already posted');
            }

            // Update request item statuses to "P.O. POSTED" where RID matches
            let affectedPrCodes = [];
            if (rids.length > 0) {
                // First, get the REFERENCENOs (PRCODEs) for the RIDs being updated
                const getPrCodesQuery = `
                    SELECT DISTINCT REFERENCENO
                    FROM [PURCHASE.REQUESTDETAILS.1]
                    WHERE RID IN (${rids.map((rid, index) => `@rid${index}`).join(',')})
                `;

                const prCodeRequest = transaction.request();
                rids.forEach((rid, index) => {
                    prCodeRequest.input(`rid${index}`, rid);
                });

                const prCodeResult = await prCodeRequest.query(getPrCodesQuery);
                affectedPrCodes = prCodeResult.recordset.map(row => row.REFERENCENO);

                // Update request item statuses to "P.O. POSTED" where RID matches
                const ridParameters = rids.map((rid, index) => `@rid${index}`).join(',');
                const updateRequestQuery = `
                    UPDATE [PURCHASE.REQUESTDETAILS.1]
                    SET ITEMSTATUS = 'P.O. POSTED'
                    WHERE RID IN (${ridParameters})
                `;

                const request = transaction.request();
                rids.forEach((rid, index) => {
                    request.input(`rid${index}`, rid);
                });

                await request.query(updateRequestQuery);
                console.log(`Updated ${rids.length} request items to "P.O. POSTED" status`);
            }

            // Check and update request header status if all items are P.O. POSTED
            for (const prCode of affectedPrCodes) {
                // Check if all items for this REFERENCENO are P.O. POSTED
                const checkAllPostedQuery = `
                    SELECT
                        COUNT(*) as totalItems,
                        COUNT(CASE WHEN ITEMSTATUS = 'P.O. POSTED' THEN 1 END) as postedItems
                    FROM [PURCHASE.REQUESTDETAILS.1]
                    WHERE REFERENCENO = @prCode
                `;

                const checkResult = await transaction.request()
                    .input('prCode', prCode)
                    .query(checkAllPostedQuery);

                const { totalItems, postedItems } = checkResult.recordset[0];

                // If all items are P.O. POSTED, update the request header status
                if (totalItems > 0 && totalItems === postedItems) {
                    const updateHeaderQuery = `
                        UPDATE [PURCHASE.REQUESTHEADER.1]
                        SET REQUESTSTATUS = 'P.O. POSTED'
                        WHERE REFERENCENO = @prCode
                    `;

                    await transaction.request()
                        .input('prCode', prCode)
                        .query(updateHeaderQuery);

                    console.log(`Updated request ${prCode} header status to "P.O. POSTED"`);
                }
            }

            // Log activity for posted order
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @modifiedBy, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Purchase Order ${poNumber} posted by ${posterName}`)
                .input('modifiedBy', posterName)
                .query(activityQuery);

            // COMMIT TRANSACTION - All operations succeeded
            await transaction.commit();
            console.log('Transaction committed successfully for PO posting');

            return {
                success: true,
                message: 'Purchase order posted successfully'
            };
        } catch (error) {
            console.error('Error posting purchase order:', error);

            // ROLLBACK TRANSACTION - Any failure triggers rollback
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to post purchase order: ' + error.message);
        } finally {
            // Connection will be automatically released back to the pool
            // No need to explicitly close it
        }
    }

    // Delete purchase order
    static async deletePurchaseOrder(poNumber, deleterName) {
        let connection;
        try {
            console.log('deletePurchaseOrder called with:', { poNumber, deleterName });
            connection = await connectToDatabase(process.env.DB_SFC);

            // Update header status to DELETED (POSTSTATUS = 2)
            const deleteHeaderQuery = `
                DELETE FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;

            console.log('Executing query:', deleteHeaderQuery);
            console.log('With parameters:', { poNumber });

            const headerResult = await connection.request()
                .input('poNumber', poNumber)
                .query(deleteHeaderQuery);

            console.log('Delete result:', headerResult);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Purchase order not found');
            }

            const deleteDetailQuery = `
                DELETE FROM [PURCHASE.ORDERDETAILS.1]
                WHERE PONUMBER = @poNumber
            `;

            console.log('Executing query:', deleteDetailQuery);
            console.log('With parameters:', { poNumber });

            const detailResult = await connection.request()
                .input('poNumber', poNumber)
                .query(deleteDetailQuery);

            console.log('Delete result:', detailResult);

            if (detailResult.rowsAffected[0] === 0) {
                throw new Error('Purchase order details not found');
            }

            // Log activity for deleted order
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @deleterName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Order ${poNumber} deleted by ${deleterName}`)
                .input('deleterName', deleterName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Purchase order deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting purchase order:', error);
            throw new Error('Failed to delete purchase order: ' + error.message);
        }
    }

    // Submit purchase order for processing (update PO_STATUS to 'FOR P.O. CONFIRMATION')
    static async submitPurchaseOrderForProcessing(poNumber, submitterName) {
        let connection;
        try {
            console.log('submitPurchaseOrderForProcessing called with:', { poNumber, submitterName });
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if PO exists and get current status
            const checkQuery = `
                SELECT POSTSTATUS, PO_STATUS FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const checkResult = await connection.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            const currentPOStatus = checkResult.recordset[0].PO_STATUS;
            const postStatus = checkResult.recordset[0].POSTSTATUS;

            // Prevent submission if already posted
            if (postStatus === 1) {
                throw new Error('Purchase order is already posted');
            }

            // Prevent re-submission if already submitted for confirmation
            if (currentPOStatus === 'FOR P.O. CONFIRMATION') {
                throw new Error('Purchase order is already submitted for confirmation');
            }

            // Prevent submission if already approved (should use post action instead)
            if (currentPOStatus === 'P.O. APPROVED') {
                throw new Error('Purchase order is already approved. Please use the Post action instead.');
            }

            // Update PO_STATUS to 'FOR P.O. CONFIRMATION'
            const updateQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET PO_STATUS = 'FOR P.O. CONFIRMATION',
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @modifiedBy
                WHERE PONUMBER = @poNumber
            `;

            const updateResult = await connection.request()
                .input('poNumber', poNumber)
                .input('modifiedBy', submitterName)
                .query(updateQuery);

            if (updateResult.rowsAffected[0] === 0) {
                throw new Error('Failed to update purchase order status');
            }

            // Get confirmedBy for notifications
            const getConfirmedByQuery = `
                SELECT CONFIRMEDBY_1, CONFIRMEDBY_2
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const confirmedByResult = await connection.request()
                .input('poNumber', poNumber)
                .query(getConfirmedByQuery);

            const confirmedBy_1 = confirmedByResult.recordset[0]?.CONFIRMEDBY_1 || '';
            const confirmedBy_2 = confirmedByResult.recordset[0]?.CONFIRMEDBY_2 || '';
            const confirmedBy = [confirmedBy_1, confirmedBy_2].filter(Boolean).join(', ');

            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @submitterName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Order ${poNumber} submitted for processing by ${submitterName}`)
                .input('submitterName', submitterName)
                .query(activityQuery);

            // Send notifications and emails to confirmers
            if (confirmedBy && confirmedBy.trim()) {
                const confirmerNames = confirmedBy.split(', ').filter(name => name.trim());

                for (const confirmerName of confirmerNames) {
                    try {
                        // Get email for confirmer
                        const confirmerEmail = await UserProfile.getEmailByEmployeeName(confirmerName.trim());
                        if (confirmerEmail) {
                            // Send email notification
                            const emailData = {
                                email: confirmerEmail,
                                name: confirmerName.trim(),
                                subject: 'Purchase Order Submitted for Confirmation',
                                companyName: 'SANTEH',
                                greeting: 'Dear',
                                body: `A purchase order <strong style="font-size:20px;color:#2563eb;">${poNumber}</strong> has been submitted and is waiting for your confirmation. Please review and confirm the purchase order at your earliest convenience.`,
                                buttonText: 'View Purchase Order',
                                buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?id=${poNumber}`,
                                companyEmail: 'j.valencia@santehfeeds.com',
                                companyPhone: '+63 2 8584 4572',
                                unsubscribeUrl: '#',
                                preferencesUrl: '#'
                            };

                            await sendEmailWithTemplate(emailData);
                            console.log('Email sent to confirmer:', confirmerName.trim());

                            // Create notification
                            const notification = new Notification(
                                'Purchase Order Submitted for Confirmation',
                                `Purchase order ${poNumber} has been submitted and is waiting for your confirmation.`,
                                confirmerName.trim(),
                                `/procurement/request-evaluation?id=${poNumber}`
                            );

                            await notification.save(submitterName);
                            console.log('Notification created for confirmer:', confirmerName.trim());
                        } else {
                            console.log('No email found for confirmer:', confirmerName.trim());
                        }
                    } catch (error) {
                        console.error('Error sending notification to confirmer:', confirmerName.trim(), error);
                        // Don't throw error to avoid failing the submission process
                    }
                }
            }

            return {
                success: true,
                message: 'Purchase order submitted for processing successfully'
            };
        } catch (error) {
            console.error('Error submitting purchase order for processing:', error);
            throw new Error('Failed to submit purchase order for processing: ' + error.message);
        }
    }

    // Confirm purchase order (set CONFIRMEDBY_1/DATECONFIRMED_1 or CONFIRMEDBY_2/DATECONFIRMED_2)
    static async confirmPurchaseOrder(poNumber, confirmerName, step = 1) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if PO exists and is in FOR P.O. CONFIRMATION status
            const checkQuery = `
                SELECT PO_STATUS, CONFIRMEDBY_1, DATECONFIRMED_1, CONFIRMEDBY_2, DATECONFIRMED_2, CREATEDBY
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const checkResult = await connection.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            const po = checkResult.recordset[0];

            if (po.PO_STATUS !== 'FOR P.O. CONFIRMATION') {
                throw new Error('Purchase order is not in confirmation status');
            }

            // Determine which confirmation step to update
            let updateField, dateField;
            if (step === 1) {
                if (po.CONFIRMEDBY_1 && po.DATECONFIRMED_1) {
                    throw new Error('First confirmation already completed');
                }
                updateField = 'CONFIRMEDBY_1';
                dateField = 'DATECONFIRMED_1';
            } else if (step === 2) {
                if (!po.CONFIRMEDBY_1 || !po.DATECONFIRMED_1) {
                    throw new Error('First confirmation must be completed before second confirmation');
                }
                if (po.CONFIRMEDBY_2 && po.DATECONFIRMED_2) {
                    throw new Error('Second confirmation already completed');
                }
                updateField = 'CONFIRMEDBY_2';
                dateField = 'DATECONFIRMED_2';
            } else {
                throw new Error('Invalid confirmation step');
            }

            // Update the confirmation
            const updateQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET ${updateField} = @confirmerName,
                    ${dateField} = GETDATE(),
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @confirmerName
                WHERE PONUMBER = @poNumber
            `;

            await connection.request()
                .input('poNumber', poNumber)
                .input('confirmerName', confirmerName)
                .query(updateQuery);

            // Check if both confirmations are done, and update status to P.O. APPROVED
            const checkBothQuery = `
                SELECT CONFIRMEDBY_1, DATECONFIRMED_1, CONFIRMEDBY_2, DATECONFIRMED_2
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const bothResult = await connection.request()
                .input('poNumber', poNumber)
                .query(checkBothQuery);

            const both = bothResult.recordset[0];
            if (both.CONFIRMEDBY_1 && both.DATECONFIRMED_1 && both.CONFIRMEDBY_2 && both.DATECONFIRMED_2) {
                // Both confirmations done, update status to P.O. APPROVED
                const approveQuery = `
                    UPDATE [PURCHASE.ORDERHEADER.1]
                    SET PO_STATUS = 'P.O. APPROVED',
                        APPROVEDBY = @confirmerName,
                        DATEAPPROVED = GETDATE(),
                        DATEMODIFIED = GETDATE(),
                        MODIFIEDBY = @confirmerName
                    WHERE PONUMBER = @poNumber
                `;
                await connection.request()
                    .input('poNumber', poNumber)
                    .input('confirmerName', confirmerName)
                    .query(approveQuery);
            }

            // Log activity
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @confirmerName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Order ${poNumber} confirmed (step ${step}) by ${confirmerName}`)
                .input('confirmerName', confirmerName)
                .query(activityQuery);

            // Send notification/email to next confirmer or creator
            if (step === 1 && po.CONFIRMEDBY_2 && !both.DATECONFIRMED_2) {
                // Send notification for second confirmation
                const confirmerEmail = await UserProfile.getEmailByEmployeeName(po.CONFIRMEDBY_2);
                if (confirmerEmail) {
                    const emailData = {
                        email: confirmerEmail,
                        name: po.CONFIRMEDBY_2,
                        subject: 'Purchase Order Ready for Second Confirmation',
                        companyName: 'SANTEH',
                        greeting: 'Dear',
                        body: `A purchase order <strong style="font-size:20px;color:#2563eb;">${poNumber}</strong> has been confirmed by the first confirmer (${po.CONFIRMEDBY_1}) on ${new Date(both.DATECONFIRMED_1).toLocaleString()} and is now ready for your second confirmation. Please review and confirm the purchase order at your earliest convenience.`,
                        buttonText: 'View Purchase Order',
                        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?id=${poNumber}`,
                        companyEmail: 'j.valencia@santehfeeds.com',
                        companyPhone: '+63 2 8584 4572',
                        unsubscribeUrl: '#',
                        preferencesUrl: '#'
                    };

                    await sendEmailWithTemplate(emailData);

                    const notification = new Notification(
                        'Purchase Order Ready for Second Confirmation',
                        `Purchase order ${poNumber} has been confirmed by the first confirmer and is ready for your second confirmation.`,
                        po.CONFIRMEDBY_2,
                        `/procurement/request-evaluation?id=${poNumber}`
                    );

                    await notification.save(confirmerName);
                }
            } else if (step === 2) {
                // Both confirmations done, send approval notification
                const creatorEmail = await UserProfile.getEmailByEmployeeName(po.CREATEDBY);
                if (creatorEmail) {
                    const emailData = {
                        email: creatorEmail,
                        name: po.CREATEDBY,
                        subject: 'Purchase Order Approved',
                        companyName: 'SANTEH',
                        greeting: 'Dear',
                        body: `Your purchase order <strong style="font-size:20px;color:#2563eb;">${poNumber}</strong> has been fully confirmed and approved.<br><br><strong>Confirmation Details:</strong><br>First Confirmation: ${both.CONFIRMEDBY_1} on ${new Date(both.DATECONFIRMED_1).toLocaleString()}<br>Second Confirmation: ${both.CONFIRMEDBY_2} on ${new Date(both.DATECONFIRMED_2).toLocaleString()}<br><br>It is now ready for posting.`,
                        buttonText: 'View Purchase Order',
                        buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/request-evaluation?id=${poNumber}`,
                        companyEmail: 'j.valencia@santehfeeds.com',
                        companyPhone: '+63 2 8584 4572',
                        unsubscribeUrl: '#',
                        preferencesUrl: '#'
                    };

                    await sendEmailWithTemplate(emailData);

                    const notification = new Notification(
                        'Purchase Order Approved',
                        `Your purchase order ${poNumber} has been fully confirmed and approved.`,
                        po.CREATEDBY,
                        `/procurement/request-evaluation?id=${poNumber}`
                    );

                    await notification.save(confirmerName);
                }
            }

            return {
                success: true,
                message: `Purchase order confirmed (step ${step}) successfully`
            };
        } catch (error) {
            console.error('Error confirming purchase order:', error);
            throw new Error('Failed to confirm purchase order: ' + error.message);
        }
    }

    // Get approved purchase request items for creating PO
    static async getApprovedItemsForPO(user, filterByAssignedTo = true) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                    pqas.PQROWID,
                    pqh.PQCODE,
                    pqh.REFERENCENUM,
                    pqd.VENDORID,
                    s.VENDNAME as SUPPLIER_NAME,
                    pqd.PYMTRMID as PAYMENT_TERMS,
                    pqd.DELIVERYSCHEDULE,
                    pqd.BRAND,
                    pqd.ORIGIN,
                    pqd.IS_IMPORTED,
                    pqd.RID,
                    pqd.PRCODE,
                    pqd.ITEMNMBR as ITEM_NUMBER,
                    pqd.ITEMDESC as ITEM_DESCRIPTION,
                    pqd.UOFM,
                    pqd.QUANTITY,
                    pqd.BUDGETCODE as BUDGET_CODE,
                    pqd.OFFEREDPRICE as OFFERED_PRICE,
                    pqd.BIDPRICE as BID_PRICE,
                    pqd.FINALPRICE as FINAL_PRICE,
                    pqd.REMARKS,
                    pr.COMPANY,
                    pr.ADDRESSEDTO,
                    ISNULL(SUM(pod.QTYORDER), 0) as TOTAL_QTY_ORDERED
                FROM [PURCHASE.QUOTATIONAPPROVALSTATUS.1] pqas
                INNER JOIN [PURCHASE.QUOTATIONDETAILS.1] pqd ON pqas.PQROWID = pqd.ROWID
                INNER JOIN [PURCHASE.QUOTATIONHEADER.1] pqh ON pqd.PQCODE = pqh.PQCODE
                LEFT JOIN [SUPPLIER.1] s ON pqd.VENDORID = s.VENDORID
                INNER JOIN [PURCHASE.REQUESTHEADER.1] pr ON pqd.PRCODE = pr.REFERENCENO
                LEFT JOIN [PURCHASE.ORDERDETAILS.1] pod ON pqd.RID = pod.RID
                WHERE pqas.IS_APPROVED = 1
                AND pqh.POSTSTATUS = 1
                AND pqd.IS_SERVED = 0
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by user if requested (only show items addressed to the user)
            if (filterByAssignedTo && user) {
                const userName = user.empName;
                query += ` AND UPPER(pr.ADDRESSEDTO) = UPPER(@addressedTo${paramIndex})`;
                params.push({ name: `addressedTo${paramIndex}`, value: userName });
                paramIndex++;
            }

            query += `
                GROUP BY pqas.PQROWID, pqh.PQCODE, pqh.REFERENCENUM, pqh.DATEREQUESTED, pqd.VENDORID, s.VENDNAME,
                         pqd.PYMTRMID, pqd.DELIVERYSCHEDULE, pqd.BRAND, pqd.ORIGIN, pqd.IS_IMPORTED,
                         pqd.RID, pqd.PRCODE, pqd.ITEMNMBR, pqd.ITEMDESC, pqd.UOFM, pqd.QUANTITY,
                         pqd.BUDGETCODE, pqd.OFFEREDPRICE, pqd.BIDPRICE, pqd.FINALPRICE, pqd.REMARKS,
                         pr.COMPANY, pr.ADDRESSEDTO
                HAVING pqd.QUANTITY - ISNULL(SUM(pod.QTYORDER), 0) != 0
                ORDER BY pqh.DATEREQUESTED DESC, pqd.RID
            `;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.PQROWID,
                pqCode: record.PQCODE,
                referenceNum: record.REFERENCENUM,
                supplierName: record.SUPPLIER_NAME,
                vendorId: record.VENDORID,
                paymentTerms: record.PAYMENT_TERMS,
                deliverySchedule: record.DELIVERYSCHEDULE,
                brand: record.BRAND,
                origin: record.ORIGIN,
                isImported: record.IS_IMPORTED,
                rid: record.RID,
                prCode: record.PRCODE,
                itemNumber: record.ITEM_NUMBER,
                itemDescription: record.ITEM_DESCRIPTION,
                uofm: record.UOFM,
                quantity: record.QUANTITY,
                totalQtyOrdered: record.TOTAL_QTY_ORDERED,
                remaining: record.QUANTITY - record.TOTAL_QTY_ORDERED,
                budgetCode: record.BUDGET_CODE,
                offeredPrice: record.OFFERED_PRICE,
                bidPrice: record.BID_PRICE,
                finalPrice: record.FINAL_PRICE,
                remarks: record.REMARKS,
                company: record.COMPANY,
                addressedTo: record.ADDRESSEDTO,
                unitCost: record.FINAL_PRICE || record.BID_PRICE || record.OFFERED_PRICE || 0,
                qtyOrder: record.QUANTITY // Default quantity to order
            }));
        } catch (error) {
            console.error('Error fetching approved items for PO:', error);
            throw new Error('Failed to fetch approved items: ' + error.message);
        }
    }

    // Legacy method - kept for backward compatibility but now uses approved items
    static async getCanvassingDataForPO(user, filterByAssignedTo = true) {
        return await this.getApprovedItemsForPO(user, filterByAssignedTo);
    }

    // Get all suppliers from existing POs
    static async getAllSuppliers() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT DISTINCT VENDORID as vendorId, VENDNAME as vendorName, PYMTRMID as paymentTerms
                FROM [SUPPLIER.1]
                WHERE VENDORID IS NOT NULL AND VENDORID != ''
                ORDER BY VENDNAME
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                vendorId: record.vendorId,
                vendorName: record.vendorName,
                paymentTerms: record.paymentTerms
            }));
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            throw new Error('Failed to fetch suppliers: ' + error.message);
        }
    }

    // Get all payment terms from PAYMENT.TERMS.1 table
    static async getAllPaymentTerms() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_NAME);

            const query = `
                SELECT DISTINCT PYMTRMID as paymentTermId
                FROM [PAYMENT.TERMS.1]
                WHERE PYMTRMID IS NOT NULL AND PYMTRMID != ''
                ORDER BY PYMTRMID
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                paymentTermId: record.paymentTermId,
                description: record.description
            }));
        } catch (error) {
            console.error('Error fetching payment terms:', error);
            throw new Error('Failed to fetch payment terms: ' + error.message);
        }
    }

    //Get all supplier contact person
    static async getSupplierContactPersons(vendorId) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const query = `
                SELECT ROWID, VENDORID, CONTACTFOR, CONTACTPERSON, MOBILENO, EMAILADDRESS, ACTIVE, CREATEDBY
                FROM [SUPPLIER.CONTACTPERSON.1]
                WHERE VENDORID = @vendorId AND ACTIVE = 1
                ORDER BY CONTACTPERSON
            `;
            const result = await connection.request()
                .input('vendorId', vendorId)
                .query(query);
            return result.recordset.map(record => ({
                rowId: record.ROWID,
                vendorId: record.VENDORID,
                contactFor: record.CONTACTFOR,
                contactPerson: record.CONTACTPERSON,
                mobileNo: record.MOBILENO,
                emailAddress: record.EMAILADDRESS,
                active: record.ACTIVE,
                createdBy: record.CREATEDBY
            }));
        } catch (error) {
            console.error('Error fetching supplier contact persons:', error);
            throw new Error('Failed to fetch supplier contact persons: ' + error.message);
        }
    }

    // Get next PO number with PO- prefix
    static async getNextPONumber() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Get the highest PO number with PO- prefix
            const query = `
                SELECT TOP 1 PONUMBER
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER LIKE 'PO-%'
                ORDER BY CAST(SUBSTRING(PONUMBER, 4, LEN(PONUMBER)-3) AS INT) DESC
            `;

            const result = await connection.request().query(query);

            let nextNumber = 1;
            if (result.recordset.length > 0) {
                const lastPO = result.recordset[0].PONUMBER;
                const lastNumber = parseInt(lastPO.substring(3)); // Remove 'PO-' prefix
                nextNumber = lastNumber + 1;
            }

            return `PO-${nextNumber}`;
        } catch (error) {
            console.error('Error getting next PO number:', error);
            throw new Error('Failed to generate PO number: ' + error.message);
        }
    }

    // Get purchase order statistics
    static async getPurchaseOrderStats(user = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT
                    CASE
                        WHEN POSTSTATUS = 1 THEN 'POSTED'
                        WHEN POSTSTATUS = 2 THEN 'CANCELLED'
                        ELSE 'NOT POSTED'
                    END as status,
                    COUNT(*) as count
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filter by created by (only show stats for POs created by the user)
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
                stats[record.status] = record.count;
            });

            return stats;
        } catch (error) {
            console.error('Error fetching purchase order stats:', error);
            throw new Error('Failed to fetch purchase order stats: ' + error.message);
        }
    }

    // Get confirmed by options from SETTINGS.CONFIRMBY table
    static async getConfirmedBy() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_NAME);

            const query = `
                SELECT ROWID, CONFIRMNAME
                FROM [SETTINGS.CONFIRMBY.1]
                WHERE ACTIVE = 1 AND LOCNCODE = 'PURCHASING'
                ORDER BY CONFIRMNAME
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                name: record.CONFIRMNAME
            }));
        } catch (error) {
            console.error('Error fetching confirmed by options:', error);
            throw new Error('Failed to fetch confirmed by options: ' + error.message);
        }
    }

    // Get approved by options from SETTINGS.APPROVEBY table
    static async getApprovedBy() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_NAME);

            const query = `
                SELECT ROWID, APPROVENAME
                FROM [SETTINGS.APPROVEBY.1]
                WHERE ACTIVE = 1 AND LOCNCODE = 'PURCHASING'
                ORDER BY APPROVENAME
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                name: record.APPROVENAME
            }));
        } catch (error) {
            console.error('Error fetching approved by options:', error);
            throw new Error('Failed to fetch approved by options: ' + error.message);
        }
    }

    // Get delivery locations from SETTINGS.DELIVERY table
    static async getDeliveryLocations() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_NAME);

            const query = `
                SELECT ROWID, DELIVERYNAME
                FROM [SETTINGS.DELIVERY.1]
                WHERE ACTIVE = 1 AND LOCNCODE = 'PURCHASING'
                ORDER BY DELIVERYNAME
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                name: record.DELIVERYNAME
            }));
        } catch (error) {
            console.error('Error fetching delivery locations:', error);
            throw new Error('Failed to fetch delivery locations: ' + error.message);
        }
    }

    // Get document types from PURCHASE.ORDERHEADER.1 table (distinct values)
    static async getDocumentTypes() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT DISTINCT REFDOCTYPE as doctype
                FROM [PURCHASE.ORDERHEADER.1]
                WHERE REFDOCTYPE IS NOT NULL AND REFDOCTYPE != ''
                ORDER BY REFDOCTYPE
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                doctype: record.doctype
            }));
        } catch (error) {
            console.error('Error fetching document types:', error);
            throw new Error('Failed to fetch document types: ' + error.message);
        }
    }
}

export default PurchaseOrder;
