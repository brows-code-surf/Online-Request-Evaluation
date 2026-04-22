'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';

class ReceivingEntry {
    static async getAllReceivingEntries(filters = {}, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT DISTINCT
                    h.ROWID,
                    h.REFERENCENO,
                    h.PONUMBER,
                    h.VENDORID,
                    h.VENDNAME,
                    h.INVENTORYDESCRIPTION as RECEIVEDBY,
                    h.RECEIVEDATE as DATERECEIVED,
                    h.DATECREATED,
                    h.CREATEDBY,
                    h.RECEIPTTYPE as RECEIVING_STATUS,
                    h.POSTSTATUS,
                    h.HREMARKS as REMARKS,
                    COUNT(d.RID) as itemCount
                FROM [PURCHASE.RECEIVEHEADER.1] h
                LEFT JOIN [PURCHASE.RECEIVEDETAILS.1] d ON h.REFERENCENO = d.REFERENCENO
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (user && !isAdmin) {
                const userName = user.empName;
                query += ` AND UPPER(h.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            if (filters.status) {
                query += ` AND h.RECEIPTTYPE = @status${paramIndex}`;
                params.push({ name: `status${paramIndex}`, value: filters.status });
                paramIndex++;
            }

            if (filters.poNumber) {
                query += ` AND h.PONUMBER LIKE @poNumber${paramIndex}`;
                params.push({ name: `poNumber${paramIndex}`, value: `%${filters.poNumber}%` });
                paramIndex++;
            }

            if (filters.vendorId) {
                query += ` AND h.VENDORID = @vendorId${paramIndex}`;
                params.push({ name: `vendorId${paramIndex}`, value: filters.vendorId });
                paramIndex++;
            }

            if (filters.dateFrom) {
                query += ` AND h.RECEIVEDATE >= @dateFrom${paramIndex}`;
                params.push({ name: `dateFrom${paramIndex}`, value: new Date(filters.dateFrom) });
                paramIndex++;
            }

            if (filters.dateTo) {
                query += ` AND h.RECEIVEDATE <= @dateTo${paramIndex}`;
                params.push({ name: `dateTo${paramIndex}`, value: new Date(filters.dateTo) });
                paramIndex++;
            }

            query += `
                GROUP BY h.ROWID, h.REFERENCENO, h.PONUMBER, h.VENDORID, h.VENDNAME, h.INVENTORYDESCRIPTION, 
                         h.RECEIVEDATE, h.DATECREATED, h.CREATEDBY, h.RECEIPTTYPE, h.POSTSTATUS, h.HREMARKS
                ORDER BY h.RECEIVEDATE DESC, h.REFERENCENO DESC
            `;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                referenceNo: record.REFERENCENO,
                poNumber: record.PONUMBER,
                vendorId: record.VENDORID,
                vendName: record.VENDNAME,
                receivedBy: record.RECEIVEDBY,
                dateReceived: record.DATERECEIVED,
                dateCreated: record.DATECREATED,
                createdBy: record.CREATEDBY,
                receivingStatus: record.RECEIVING_STATUS || 'PENDING',
                postStatus: record.POSTSTATUS || 0,
                remarks: record.REMARKS,
                itemCount: record.itemCount
            }));
        } catch (error) {
            console.error('Error fetching receiving entries:', error);
            throw new Error('Failed to fetch receiving entries: ' + error.message);
        }
    }

    static async getReceivingEntryByNumber(referenceNo, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            if (user && !isAdmin) {
                const userName = user.empName;
                const accessQuery = `
                    SELECT COUNT(*) as count FROM [PURCHASE.RECEIVEHEADER.1]
                    WHERE REFERENCENO = @referenceNo AND UPPER(CREATEDBY) = UPPER(@userName)
                `;
                const accessResult = await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('userName', userName)
                    .query(accessQuery);

                if (accessResult.recordset[0].count === 0) {
                    throw new Error('Access denied: You can only view receiving entries you created');
                }
            }

            const headerQuery = `
                SELECT ROWID, REFERENCENO, REFERENCEID, LOCNCODE, RECEIPTTYPE, RECEIVEDATE, PONUMBER, VENDORID, VENDNAME, VNDDOCNM, PYMTRMID, INVENTORYDESCRIPTION, HREMARKS, POSTSTATUS, DATECREATED, 
                       CREATEDBY, DATEMODIFIED, MODIFIEDBY
                FROM [PURCHASE.RECEIVEHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;
            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(headerQuery);

            if (headerResult.recordset.length === 0) {
                throw new Error('Receiving entry not found');
            }

            const header = headerResult.recordset[0];

            const detailsQuery = `
                SELECT ROWID, REFERENCENO, RID, RRID, ITEMNMBR, ITEMDESC, UOFM, INVENTORYQUANTITY, QUANTITY, UNITCOST, UCOSTNETOFVAT, VATUNITCOST
                FROM [PURCHASE.RECEIVEDETAILS.1]
                WHERE REFERENCENO = @referenceNo
                ORDER BY ROWID
            `;
            const detailsResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(detailsQuery);

            return {
                header: {
                    id: header.ROWID,
                    referenceNo: header.REFERENCENO,
                    referenceId: header.REFERENCEID,
                    locnCode: header.LOCNCODE,
                    receiptType: header.RECEIPTTYPE,
                    dateReceived: header.RECEIVEDATE,
                    poNumber: header.PONUMBER,
                    vendorId: header.VENDORID,
                    vendName: header.VENDNAME,
                    vndDocNm: header.VNDDOCNM,
                    pymtTermId: header.PYMTRMID,
                    inventoryDescription: header.INVENTORYDESCRIPTION,
                    dateCreated: header.DATECREATED,
                    createdBy: header.CREATEDBY,
                    receivingStatus: header.RECEIPTTYPE || 'PENDING',
                    postStatus: header.POSTSTATUS || 0,
                    remarks: header.HREMARKS,
                    dateModified: header.DATEMODIFIED,
                    modifiedBy: header.MODIFIEDBY
                },
                details: detailsResult.recordset.map(detail => ({
                    id: detail.ROWID,
                    referenceNo: detail.REFERENCENO,
                    rid: detail.RID,
                    rrid: detail.RRID,
                    itemNmbr: detail.ITEMNMBR,
                    itemDesc: detail.ITEMDESC,
                    uofm: detail.UOFM,
                    inventoryQuantity: detail.INVENTORYQUANTITY,
                    quantity: detail.QUANTITY,
                    unitCost: detail.UNITCOST,
                    uCostNetOfVat: detail.UCOSTNETOFVAT,
                    vatUnitCost: detail.VATUNITCOST,
                    extdCost: (detail.UNITCOST || 0) * (detail.QUANTITY || 0),
                    qtyReturned: 0,
                    itemStatus: 'RECEIVED'
                }))
            };
        } catch (error) {
            console.error('Error fetching receiving entry:', error);
            throw new Error('Failed to fetch receiving entry: ' + error.message);
        }
    }

    static async createReceivingEntry(headerData, detailsData, creatorName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for receiving entry creation');

            let referenceNo = headerData.referenceNo;
            if (!referenceNo) {
                referenceNo = await this.getNextReceivingNumber();
            }

            const checkRefQuery = `SELECT COUNT(*) as count FROM [PURCHASE.RECEIVEHEADER.1] WHERE REFERENCENO = @referenceNo`;
            const refCheckResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(checkRefQuery);

            if (refCheckResult.recordset[0].count > 0) {
                referenceNo = await this.getNextReceivingNumber();
            }

            const headerQuery = `
                INSERT INTO [PURCHASE.RECEIVEHEADER.1] (
                    REFERENCENO, REFERENCEID, LOCNCODE, RECEIPTTYPE, RECEIVEDATE, PONUMBER, VENDORID, VENDNAME, 
                    VNDDOCNM, PYMTRMID, INVENTORYDESCRIPTION, HREMARKS, POSTSTATUS, DATECREATED, CREATEDBY
                ) VALUES (
                    @referenceNo, @referenceId, @locnCode, @receiptType, @dateReceived, @poNumber, @vendorId, @vendName,
                    @vndDocNm, @pymtTermId, @inventoryDescription, @remarks, @postStatus, GETDATE(), @createdBy
                )
            `;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('referenceId', headerData.referenceId || '')
                .input('locnCode', headerData.locnCode || '')
                .input('receiptType', headerData.receiptType || 'RECEIVED')
                .input('dateReceived', headerData.dateReceived ? new Date(headerData.dateReceived) : new Date())
                .input('poNumber', headerData.poNumber || '')
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('vndDocNm', headerData.vndDocNm || '')
                .input('pymtTermId', headerData.pymtTermId || '')
                .input('inventoryDescription', headerData.inventoryDescription || '')
                .input('remarks', headerData.remarks || '')
                .input('postStatus', 0)
                .input('createdBy', creatorName)
                .query(headerQuery);

            console.log('Receiving entry header inserted');

            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.RECEIVEDETAILS.1] (
                        REFERENCENO, RID, RRID, ITEMNMBR, ITEMDESC, UOFM, INVENTORYQUANTITY, 
                        QUANTITY, UNITCOST, UCOSTNETOFVAT, VATUNITCOST
                    ) VALUES (
                        @referenceNo, @rid, @rrid, @itemNmbr, @itemDesc, @uofm, @inventoryQuantity,
                        @quantity, @unitCost, @uCostNetOfVat, @vatUnitCost
                    )
                `;

                await transaction.request()
                    .input('referenceNo', referenceNo)
                    .input('rid', detail.rid || '')
                    .input('rrid', detail.rrid || '')
                    .input('itemNmbr', detail.itemNmbr || '')
                    .input('itemDesc', detail.itemDesc || '')
                    .input('uofm', detail.uofm || '')
                    .input('inventoryQuantity', detail.inventoryQuantity || 0)
                    .input('quantity', detail.quantity || 0)
                    .input('unitCost', detail.unitCost || 0)
                    .input('uCostNetOfVat', detail.uCostNetOfVat || 0)
                    .input('vatUnitCost', detail.vatUnitCost || 0)
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} receiving entry details inserted`);

            if (headerData.poNumber) {
                const updatePODetailsQuery = `UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED + @qtyServed WHERE PONUMBER = @poNumber AND RID = @rid`;

                for (const detail of detailsData) {
                    if (detail.rid && headerData.poNumber) {
                        await transaction.request()
                            .input('poNumber', headerData.poNumber)
                            .input('rid', detail.rid)
                            .input('qtyServed', detail.quantity || 0)
                            .query(updatePODetailsQuery);
                    }
                }
            }

            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Receiving Entry ${referenceNo} created by ${creatorName}`)
                .input('creatorName', creatorName)
                .query(activityQuery);

            console.log('Activity log inserted');

            await transaction.commit();
            console.log('Transaction committed successfully');

            broadcastRequestEvaluationUpdate("receiving-created", {
                referenceNo: referenceNo,
                receivingStatus: 'RECEIVED'
            });

            return {
                referenceNo: referenceNo,
                message: 'Receiving entry created successfully'
            };

        } catch (error) {
            console.error('Error creating receiving entry:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to create receiving entry: ' + error.message);
        }
    }

    static async updateReceivingEntry(referenceNo, headerData, detailsData, updaterName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for receiving entry update');

            const checkQuery = `
                SELECT POSTSTATUS, ROWID FROM [PURCHASE.RECEIVEHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;
            const checkResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Receiving entry not found');
            }

            if (checkResult.recordset[0].POSTSTATUS === 1) {
                throw new Error('Cannot update posted receiving entries');
            }

            const headerUpdateQuery = `
                UPDATE [PURCHASE.RECEIVEHEADER.1] SET
                    REFERENCEID = @referenceId,
                    LOCNCODE = @locnCode,
                    RECEIPTTYPE = @receiptType,
                    RECEIVEDATE = @dateReceived,
                    PONUMBER = @poNumber,
                    VENDORID = @vendorId,
                    VENDNAME = @vendName,
                    VNDDOCNM = @vndDocNm,
                    PYMTRMID = @pymtTermId,
                    INVENTORYDESCRIPTION = @inventoryDescription,
                    HREMARKS = @remarks,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @modifiedBy
                WHERE REFERENCENO = @referenceNo
            `;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('referenceId', headerData.referenceId || '')
                .input('locnCode', headerData.locnCode || '')
                .input('receiptType', headerData.receiptType || 'RECEIVED')
                .input('dateReceived', headerData.dateReceived ? new Date(headerData.dateReceived) : new Date())
                .input('poNumber', headerData.poNumber || '')
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('vndDocNm', headerData.vndDocNm || '')
                .input('pymtTermId', headerData.pymtTermId || '')
                .input('inventoryDescription', headerData.inventoryDescription || '')
                .input('remarks', headerData.remarks || '')
                .input('modifiedBy', updaterName)
                .query(headerUpdateQuery);

            console.log('Receiving entry header updated');

            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.RECEIVEDETAILS.1]
                WHERE REFERENCENO = @referenceNo
            `;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailsQuery);

            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];

                const detailInsertQuery = `
                    INSERT INTO [PURCHASE.RECEIVEDETAILS.1] (
                        REFERENCENO, RID, RRID, ITEMNMBR, ITEMDESC, UOFM, INVENTORYQUANTITY, 
                        QUANTITY, UNITCOST, UCOSTNETOFVAT, VATUNITCOST
                    ) VALUES (
                        @referenceNo, @rid, @rrid, @itemNmbr, @itemDesc, @uofm, @inventoryQuantity,
                        @quantity, @unitCost, @uCostNetOfVat, @vatUnitCost
                    )
                `;

                await transaction.request()
                    .input('referenceNo', referenceNo)
                    .input('rid', detail.rid || '')
                    .input('rrid', detail.rrid || '')
                    .input('itemNmbr', detail.itemNmbr || '')
                    .input('itemDesc', detail.itemDesc || '')
                    .input('uofm', detail.uofm || '')
                    .input('inventoryQuantity', detail.inventoryQuantity || 0)
                    .input('quantity', detail.quantity || 0)
                    .input('unitCost', detail.unitCost || 0)
                    .input('uCostNetOfVat', detail.uCostNetOfVat || 0)
                    .input('vatUnitCost', detail.vatUnitCost || 0)
                    .query(detailInsertQuery);
            }

            console.log(`${detailsData.length} receiving entry details updated`);

            if (headerData.poNumber) {
                const getOldDetailsQuery = `SELECT RID, QUANTITY FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
                const oldDetailsResult = await transaction.request()
                    .input('referenceNo', referenceNo)
                    .query(getOldDetailsQuery);

                for (const oldDetail of oldDetailsResult.recordset) {
                    if (oldDetail.RID && headerData.poNumber) {
                        await transaction.request()
                            .input('poNumber', headerData.poNumber)
                            .input('rid', oldDetail.RID)
                            .input('qtyServed', oldDetail.QUANTITY || 0)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED - @qtyServed WHERE PONUMBER = @poNumber AND RID = @rid`);
                    }
                }

                for (const detail of detailsData) {
                    if (detail.rid && headerData.poNumber) {
                        await transaction.request()
                            .input('poNumber', headerData.poNumber)
                            .input('rid', detail.rid)
                            .input('qtyServed', detail.quantity || 0)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED + @qtyServed WHERE PONUMBER = @poNumber AND RID = @rid`);
                    }
                }
            }

            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @creatorName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Receiving Entry ${referenceNo} updated by ${updaterName}`)
                .input('creatorName', updaterName)
                .query(activityQuery);

            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Receiving entry updated successfully'
            };

        } catch (error) {
            console.error('Error updating receiving entry:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to update receiving entry: ' + error.message);
        }
    }

    static async postReceivingEntry(referenceNo, posterName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for posting receiving entry');

            const checkQuery = `
                SELECT POSTSTATUS, ROWID FROM [PURCHASE.RECEIVEHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;
            const checkResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Receiving entry not found');
            }

            if (checkResult.recordset[0].POSTSTATUS === 1) {
                throw new Error('Receiving entry is already posted');
            }

            const postQuery = `
                UPDATE [PURCHASE.RECEIVEHEADER.1] SET
                    POSTSTATUS = 1,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @posterName
                WHERE REFERENCENO = @referenceNo
            `;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('posterName', posterName)
                .query(postQuery);

            console.log('Receiving entry posted successfully');

            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @posterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Receiving Entry ${referenceNo} posted by ${posterName}`)
                .input('posterName', posterName)
                .query(activityQuery);

            await transaction.commit();
            console.log('Transaction committed successfully');

            broadcastRequestEvaluationUpdate("receiving-entry-posted", {
                referenceNo: referenceNo,
                postStatus: 1
            });

            return {
                success: true,
                message: 'Receiving entry posted successfully'
            };
        } catch (error) {
            console.error('Error posting receiving entry:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to post receiving entry: ' + error.message);
        }
    }

    static async deleteReceivingEntry(referenceNo, deleterName) {
        let connection;
        try {
            console.log('deleteReceivingEntry called with:', { referenceNo, deleterName });
            connection = await connectToDatabase(process.env.DB_SFC);

            const deleteHeaderQuery = `
                DELETE FROM [PURCHASE.RECEIVEHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;

            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(deleteHeaderQuery);

            if (headerResult.rowsAffected[0] === 0) {
                throw new Error('Receiving entry not found');
            }

            const deleteDetailQuery = `
                DELETE FROM [PURCHASE.RECEIVEDETAILS.1]
                WHERE REFERENCENO = @referenceNo
            `;

            const detailResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailQuery);

            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @deleterName, GETDATE())
            `;
            await connection.request()
                .input('activity', `Receiving Entry ${referenceNo} deleted by ${deleterName}`)
                .input('deleterName', deleterName)
                .query(activityQuery);

            return {
                success: true,
                message: 'Receiving entry deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting receiving entry:', error);
            throw new Error('Failed to delete receiving entry: ' + error.message);
        }
    }

    static async getPostedPurchaseOrdersForReceiving(user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT 
                    h.PONUMBER, h.VENDORID, h.VENDNAME, h.DATECREATED, h.CREATEDBY,
                    h.DATENEEDED, h.PROMISEDDATE, h.DELIVERY_TO, h.PO_STATUS, h.POSTSTATUS,
                    d.ROWID as DETAIL_ROWID, d.RID, d.ITEMNMBR, d.ITEMDESC, d.UOFM, 
                    d.QTYORDER, d.QTYSERVED, d.UNITCOST, d.EXTDCOST, d.BRAND, d.ORIGIN,
                    d.BUDGETNO, d.PRCODE, d.PURCHASETYPE, d.CURRENCY,
                    (d.QTYORDER - ISNULL(d.QTYSERVED, 0)) as QTY_REMAINING
                FROM [PURCHASE.ORDERHEADER.1] h
                INNER JOIN [PURCHASE.ORDERDETAILS.1] d ON h.PONUMBER = d.PONUMBER
                WHERE h.PO_STATUS = 'P.O. APPROVED'
                    AND (d.QTYORDER - ISNULL(d.QTYSERVED, 0)) > 0
            `;

            const params = [];
            let paramIndex = 1;

            if (user && !isAdmin) {
                const userName = user.empName;
                query += ` AND UPPER(h.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            query += ` ORDER BY h.DATECREATED`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const result = await request.query(query);
            return result.recordset.map(record => ({
                poNumber: record.PONUMBER,
                vendorId: record.VENDORID,
                vendName: record.VENDNAME,
                dateCreated: record.DATECREATED,
                createdBy: record.CREATEDBY,
                dateNeeded: record.DATENEEDED,
                promisedDate: record.PROMISEDDATE,
                deliveryTo: record.DELIVERY_TO,
                poStatus: record.PO_STATUS,
                postStatus: record.POSTSTATUS,
                detailRowId: record.DETAIL_ROWID,
                rid: record.RID,
                itemNmbr: record.ITEMNMBR,
                itemDesc: record.ITEMDESC,
                uofm: record.UOFM,
                qtyOrder: record.QTYORDER,
                qtyServed: record.QTYSERVED,
                qtyRemaining: record.QTY_REMAINING,
                unitCost: record.UNITCOST,
                extdCost: record.EXTDCOST,
                brand: record.BRAND,
                origin: record.ORIGIN,
                budgetNo: record.BUDGETNO,
                prCode: record.PRCODE,
                purchaseType: record.PURCHASETYPE,
                currency: record.CURRENCY
            }));
        } catch (error) {
            console.error('Error fetching posted purchase orders:', error);
            throw new Error('Failed to fetch posted purchase orders: ' + error.message);
        }
    }

    static async getNextReceivingNumber() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
            SELECT TOP 1 REFERENCENO
            FROM [PURCHASE.RECEIVEHEADER.1]
            WHERE REFERENCENO LIKE 'RR-%'
            ORDER BY CAST(SUBSTRING(REFERENCENO, 4, LEN(REFERENCENO)-3) AS INT) DESC
        `;

            const result = await connection.request().query(query);

            let nextNumber = 1;

            if (result.recordset.length > 0) {
                const lastRR = result.recordset[0].REFERENCENO;
                const lastNumber = parseInt(lastRR.replace('RR-', ''));
                nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
            }

            return `RR-${nextNumber}`;
        } catch (error) {
            console.error('Error generating receiving number:', error);
            throw error;
        }
    }
}

export default ReceivingEntry;