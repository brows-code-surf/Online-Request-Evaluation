'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

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
                    h.CONFIRMEDBY,
                    h.APPROVEDBY,
                    h.IS_BUDGETNO,
                    h.IS_PRNO,
                    h.CAPEX,
                    h.IS_PERADVISE,
                    h.REMARKS,
                    h.SUBTOTAL,
                    h.BUDGETNOLIST,
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
                GROUP BY h.ROWID, h.POSTSTATUS, h.PONUMBER, h.DATECREATED, h.CREATEDBY, h.VENDORID, h.VENDNAME,
                         h.PYMTRMID, h.REFDOCTYPE, h.DELIVERY_TO, h.PODATE, h.DATENEEDED, h.PROMISEDDATE,
                         h.PROMISEDSHIPDATE, h.CANVASSEDBY, h.CONFIRMEDBY, h.APPROVEDBY, h.IS_BUDGETNO,
                         h.IS_PRNO, h.CAPEX, h.IS_PERADVISE, h.REMARKS, h.SUBTOTAL, h.BUDGETNOLIST
                ORDER BY h.DATECREATED DESC, h.PONUMBER DESC
            `;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                postStatus: record.POSTSTATUS,
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
                confirmedBy: record.CONFIRMEDBY,
                approvedBy: record.APPROVEDBY,
                isBudgetNo: record.IS_BUDGETNO,
                isPrNo: record.IS_PRNO,
                capex: record.CAPEX,
                isPerAdvise: record.IS_PERADVISE,
                remarks: record.REMARKS,
                subtotal: record.SUBTOTAL,
                budgetNoList: record.BUDGETNOLIST,
                itemCount: record.itemCount
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
                SELECT * FROM [PURCHASE.ORDERHEADER.1]
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
                       QTYALLOCATED, UNITCOST, EXTDCOST, BRAND, ORIGIN, QTYSERVED, ITEMSTATUS, BUDGETNO,
                       PODATE, CREATEDBY, DATEMODIFIED, MODIFIEDBY
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
                    confirmedBy: header.CONFIRMEDBY,
                    approvedBy: header.APPROVEDBY,
                    isBudgetNo: header.IS_BUDGETNO,
                    isPrNo: header.IS_PRNO,
                    capex: header.CAPEX,
                    isPerAdvise: header.IS_PERADVISE,
                    remarks: header.REMARKS,
                    subtotal: header.SUBTOTAL,
                    budgetNoList: header.BUDGETNOLIST
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
                    itemStatus: detail.ITEMSTATUS,
                    budgetNo: detail.BUDGETNO,
                    poDate: detail.PODATE,
                    createdBy: detail.CREATEDBY,
                    dateModified: detail.DATEMODIFIED,
                    modifiedBy: detail.MODIFIEDBY
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
                    CANVASSEDBY, IS_BUDGETNO, IS_PRNO, CAPEX, IS_PERADVISE, REMARKS,
                    SUBTOTAL, BUDGETNOLIST, POSTSTATUS
                ) VALUES (
                    @poNumber, GETDATE(), @createdBy, @vendorId, @vendName, @pymtrmid,
                    @refDocType, @deliveryTo, GETDATE(), @dateNeeded, @promisedDate, @promisedShipDate,
                    @canvassedBy, @isBudgetNo, @isPrNo, @capex, @isPerAdvise, @remarks,
                    @subtotal, @budgetNoList, @postStatus
                )
            `;

            await transaction.request()
                .input('poNumber', poNumber)
                .input('createdBy', creatorName)
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('pymtrmid', headerData.pymtrmid || '')
                .input('refDocType', headerData.refDocType || 'CANVASSING')
                .input('deliveryTo', headerData.deliveryTo || '')
                .input('dateNeeded', headerData.dateNeeded || null)
                .input('promisedDate', headerData.promisedDate || null)
                .input('promisedShipDate', headerData.promisedShipDate || null)
                .input('canvassedBy', headerData.canvassedBy || creatorName)
                .input('isBudgetNo', headerData.isBudgetNo || 0)
                .input('isPrNo', headerData.isPrNo || 0)
                .input('capex', headerData.capex || 0)
                .input('isPerAdvise', headerData.isPerAdvise || 0)
                .input('remarks', headerData.remarks || '')
                .input('subtotal', headerData.subtotal || 0)
                .input('budgetNoList', headerData.budgetNoList || '')
                .input('postStatus', 0) // NOT POSTED
                .query(headerQuery);

            console.log('Purchase order header inserted');

            // Insert Purchase Order items/details
            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];
                const rid = `${poNumber}-${i + 1}`; // Use PO number + item index for RID

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.ORDERDETAILS.1] (
                        PONUMBER, RID, PQCODE, PRCODE, ITEMNMBR, ITEMDESC, UOFM, QTYORDER,
                        QTYCANCEL, QTYALLOCATED, UNITCOST, EXTDCOST, BRAND, ORIGIN,
                        QTYSERVED, ITEMSTATUS, BUDGETNO, PODATE, CREATEDBY
                    ) VALUES (
                        @poNumber, @rid, @pqCode, @prCode, @itemNmbr, @itemDesc, @uofm, @qtyOrder,
                        @qtyCancel, @qtyAllocated, @unitCost, @extdCost, @brand, @origin,
                        @qtyServed, @itemStatus, @budgetNo, GETDATE(), @createdBy
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
                    .input('createdBy', creatorName)
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

    // Post purchase order (set POSTSTATUS = 1)
    static async postPurchaseOrder(poNumber, posterName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // Check if PO exists
            const checkQuery = `
                SELECT POSTSTATUS FROM [PURCHASE.ORDERHEADER.1]
                WHERE PONUMBER = @poNumber
            `;
            const checkResult = await connection.request()
                .input('poNumber', poNumber)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Purchase order not found');
            }

            if (checkResult.recordset[0].POSTSTATUS === 1) {
                throw new Error('Purchase order is already posted');
            }

            // Update POSTSTATUS to 1
            const updateQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET POSTSTATUS = 1,
                    POSTEDBY = @posterName,
                    DATEPOSTED = GETDATE()
                WHERE PONUMBER = @poNumber
            `;

            const result = await connection.request()
                .input('poNumber', poNumber)
                .input('posterName', posterName)
                .query(updateQuery);

            if (result.rowsAffected[0] === 0) {
                throw new Error('Purchase order not found or already posted');
            }

            // Log activity for posted order
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @posterName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Order ${poNumber} posted by ${posterName}`)
                .input('posterName', posterName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Purchase order posted successfully'
            };
        } catch (error) {
            console.error('Error posting purchase order:', error);
            throw new Error('Failed to post purchase order: ' + error.message);
        }
    }

    // Cancel purchase order
    static async cancelPurchaseOrder(poNumber, cancellerName, cancelReason = '') {
        let connection;
        try {
            console.log('cancelPurchaseOrder called with:', { poNumber, cancellerName, cancelReason });
            connection = await connectToDatabase(process.env.DB_SFC);

            // Update header status to CANCELLED
            const updateHeaderQuery = `
                UPDATE [PURCHASE.ORDERHEADER.1]
                SET POSTSTATUS = 2,
                    CANCELREMARKS = @cancelReason
                WHERE PONUMBER = @poNumber
            `;

            console.log('Executing query:', updateHeaderQuery);
            console.log('With parameters:', { poNumber, cancelReason });

            const headerResult = await connection.request()
                .input('poNumber', poNumber)
                .input('cancelReason', cancelReason)
                .query(updateHeaderQuery);

            console.log('Update result:', headerResult);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Purchase order not found');
            }

            // Verify the update by checking the result
            const verifyQuery = `SELECT CANCELREMARKS FROM [PURCHASE.ORDERHEADER.1] WHERE PONUMBER = @poNumber`;
            const verifyResult = await connection.request()
                .input('poNumber', poNumber)
                .query(verifyQuery);

            console.log('Verification query result:', verifyResult.recordset);

            // Log activity for cancelled order
            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @cancellerName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Purchase Order ${poNumber} cancelled by ${cancellerName}`)
                .input('cancellerName', cancellerName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Purchase order cancelled successfully'
            };
        } catch (error) {
            console.error('Error canceling purchase order:', error);
            throw new Error('Failed to cancel purchase order: ' + error.message);
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
                    pr.ADDRESSEDTO
                FROM [PURCHASE.QUOTATIONAPPROVALSTATUS.1] pqas
                INNER JOIN [PURCHASE.QUOTATIONDETAILS.1] pqd ON pqas.PQROWID = pqd.ROWID
                INNER JOIN [PURCHASE.QUOTATIONHEADER.1] pqh ON pqd.PQCODE = pqh.PQCODE
                LEFT JOIN [SUPPLIER.1] s ON pqd.VENDORID = s.VENDORID
                INNER JOIN [PURCHASE.REQUESTHEADER.1] pr ON pqd.PRCODE = pr.REFERENCENO
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

            query += ' ORDER BY pqh.DATEREQUESTED DESC, pqd.RID';

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
                FROM [PURCHASE.ORDERHEADER.1]
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

    // Get all payment terms from existing POs
    static async getAllPaymentTerms() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT DISTINCT PYMTRMID as paymentTermId, PYMTRMID as description
                FROM [PURCHASE.ORDERHEADER.1]
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
}

export default PurchaseOrder;
