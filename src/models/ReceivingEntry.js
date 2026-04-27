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
                    h.RECEIVEDATE as DATERECEIVED,
                    h.DATECREATED,
                    h.CREATEDBY,
                    h.RECEIPTTYPE as RECEIVING_STATUS,
                    h.POSTSTATUS,
                    h.HREMARKS as REMARKS,
                    COUNT(d.RID) as itemCount,
                    CASE WHEN EXISTS (SELECT 1 FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] WHERE REFERENCENO = h.REFERENCENO AND POSTSTATUS = 1) THEN 1 ELSE 0 END as hasDA
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
                GROUP BY h.ROWID, h.REFERENCENO, h.PONUMBER, h.VENDORID, h.VENDNAME,
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
                itemCount: record.itemCount,
                hasDA: record.hasDA === 1
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
                SELECT ROWID, REFERENCENO, REFERENCEID, LOCNCODE, RECEIPTTYPE, RECEIVEDATE, PONUMBER, VENDORID, VENDNAME, VNDDOCNM, PYMTRMID, HREMARKS, POSTSTATUS, DATECREATED,
                        CREATEDBY, DATEMODIFIED, MODIFIEDBY,
                        CASE WHEN EXISTS (SELECT 1 FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] WHERE REFERENCENO = [PURCHASE.RECEIVEHEADER.1].REFERENCENO AND POSTSTATUS = 1) THEN 1 ELSE 0 END as hasDA
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

            // Get currency from PO
            let currency = 'PHP';
            if (header.PONUMBER) {
                const poQuery = `SELECT CURRENCY FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber`;
                const poResult = await connection.request()
                    .input('poNumber', header.PONUMBER)
                    .query(poQuery);
                if (poResult.recordset[0]) {
                    currency = poResult.recordset[0].CURRENCY;
                }
            }

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
                    currency: currency,
                    dateCreated: header.DATECREATED,
                    createdBy: header.CREATEDBY,
                    receivingStatus: header.RECEIPTTYPE || 'PENDING',
                    postStatus: header.POSTSTATUS || 0,
                    remarks: header.HREMARKS,
                    dateModified: header.DATEMODIFIED,
                    modifiedBy: header.MODIFIEDBY,
                    hasDA: header.hasDA === 1
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
                    VNDDOCNM, PYMTRMID, HREMARKS, POSTSTATUS, DATECREATED, CREATEDBY
                ) VALUES (
                    @referenceNo, @referenceId, @locnCode, @receiptType, @dateReceived, @poNumber, @vendorId, @vendName,
                    @vndDocNm, @pymtTermId, @remarks, @postStatus, GETDATE(), @createdBy
                )
            `;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('referenceId', headerData.referenceId || '')
                .input('locnCode', headerData.locnCode || '')
                .input('receiptType', headerData.receiptType || 'RECEIVED')
                .input('dateReceived', headerData.dateReceived)
                .input('poNumber', headerData.poNumber || '')
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('vndDocNm', headerData.vndDocNm || '')
                .input('pymtTermId', headerData.pymtTermId || '')
                .input('remarks', headerData.remarks || '')
                .input('postStatus', 0)
                .input('createdBy', creatorName)
                .query(headerQuery);

            console.log('Receiving entry header inserted');

            // Generate RRID components
            const rrNumber = referenceNo.replace('RR-', '').replace(/^0+/, ''); // Remove RR- prefix and leading zeros
            const now = new Date();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const year = now.getFullYear().toString();
            const datePart = `${month}${day}${year}`;

            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];
                const rrid = `RR-${rrNumber}-${datePart}-${i + 1}`;

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
                    .input('rrid', rrid)
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
                const updatePODetailsQuery = `UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYALLOCATED = QTYALLOCATED + @qtyAllocated WHERE PONUMBER = @poNumber AND RID = @rid`;

                for (const detail of detailsData) {
                    if (detail.rid && headerData.poNumber) {
                        await transaction.request()
                            .input('poNumber', headerData.poNumber)
                            .input('rid', detail.rid)
                            .input('qtyAllocated', detail.quantity || 0)
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
                .input('dateReceived', headerData.dateReceived)
                .input('poNumber', headerData.poNumber || '')
                .input('vendorId', headerData.vendorId || '')
                .input('vendName', headerData.vendName || '')
                .input('vndDocNm', headerData.vndDocNm || '')
                .input('pymtTermId', headerData.pymtTermId || '')
                .input('remarks', headerData.remarks || '')
                .input('modifiedBy', updaterName)
                .query(headerUpdateQuery);

            console.log('Receiving entry header updated');

            // Get old quantities before deleting
            const oldQuantitiesQuery = `SELECT RID, QUANTITY FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const oldResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(oldQuantitiesQuery);
            const oldQuantities = {};
            oldResult.recordset.forEach(row => {
                oldQuantities[row.RID] = row.QUANTITY || 0;
            });

            const deleteDetailsQuery = `
                DELETE FROM [PURCHASE.RECEIVEDETAILS.1]
                WHERE REFERENCENO = @referenceNo
            `;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailsQuery);

            // Generate RRID components for updated details
            const rrNumber = referenceNo.replace('RR-', '').replace(/^0+/, ''); // Remove RR- prefix and leading zeros
            const now = new Date();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const year = now.getFullYear().toString();
            const datePart = `${month}${day}${year}`;

            for (let i = 0; i < detailsData.length; i++) {
                const detail = detailsData[i];
                const rrid = `RR-${rrNumber}-${datePart}-${i + 1}`;

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
                    .input('rrid', rrid)
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
                for (const detail of detailsData) {
                    const oldQty = oldQuantities[detail.rid] || 0;
                    const newQty = detail.quantity || 0;
                    const adjustment = newQty - oldQty;
                    if (adjustment !== 0) {
                        await transaction.request()
                            .input('poNumber', headerData.poNumber)
                            .input('rid', detail.rid)
                            .input('adjustment', adjustment)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYALLOCATED = QTYALLOCATED + @adjustment WHERE PONUMBER = @poNumber AND RID = @rid`);
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

    static async validateStatusToUpdate(referenceNo, dbConnection = null) {
        let connection = dbConnection;
        let shouldClose = false;
        try {
            if (!connection) {
                connection = await connectToDatabase(process.env.DB_SFC);
                shouldClose = true;
            }
            const query = `SELECT ITEMSTATUS FROM [PURCHASE.REQUESTDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .query(query);
            if (result.recordset.length === 0) {
                return null;
            }
            const itemStatuses = result.recordset.map(row => row.ITEMSTATUS);

            const allServed = itemStatuses.every(status => status === 'SERVED');
            const someServed = itemStatuses.some(status => status === 'SERVED');

            if (allServed) {
                return 'SERVED';
            } else if (someServed) {
                return 'PARTIALLY SERVED';
            }

        } catch (error) {
            throw error;
        } finally {
            if (shouldClose && connection) {
                connection.close();
            }
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

            // Get RIDs from receiving entry
            const receivingRidsQuery = `SELECT RID FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const receivingRidsResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(receivingRidsQuery);
            const rids = receivingRidsResult.recordset.map(row => row.RID);

            let poDetailsResult = { recordset: [] };
            if (rids.length > 0) {
                // Get PO details for RIDs in this receiving entry (supports multiple POs)
                const poDetailsQuery = `SELECT RID, PONUMBER, PRCODE FROM [PURCHASE.ORDERDETAILS.1] WHERE RID IN (${rids.map((_, i) => `@rid${i}`).join(',')})`;
                const poDetailsRequest = transaction.request();
                rids.forEach((rid, i) => poDetailsRequest.input(`rid${i}`, rid));
                poDetailsResult = await poDetailsRequest.query(poDetailsQuery);
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

            // Get quantities from receiving details
            const receivingQuantitiesQuery = `SELECT RID, QUANTITY FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const receivingQuantitiesResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(receivingQuantitiesQuery);
            const quantitiesMap = {};
            receivingQuantitiesResult.recordset.forEach(row => {
                quantitiesMap[row.RID] = row.QUANTITY || 0;
            });

            // Update ITEMSTATUS in REQUESTDETAILS and collect PRCODEs
            const prCodes = [];
            for (const row of poDetailsResult.recordset) {
                const { RID, PRCODE, PONUMBER } = row;
                const quantity = quantitiesMap[RID] || 0;
                if (PRCODE) {
                    await transaction.request()
                        .input('prCode', PRCODE)
                        .input('rid', RID)
                        .query(`UPDATE [PURCHASE.REQUESTDETAILS.1] SET ITEMSTATUS = 'SERVED' WHERE REFERENCENO = @prCode AND RID = @rid`);
                    prCodes.push(PRCODE);
                }
                // Update QTYSERVED and deduct from QTYALLOCATED in ORDERDETAILS
                if (quantity > 0) {
                    await transaction.request()
                        .input('poNumber', PONUMBER)
                        .input('rid', RID)
                        .input('quantity', quantity)
                        .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED + @quantity, QTYALLOCATED = QTYALLOCATED - @quantity WHERE PONUMBER = @poNumber AND RID = @rid`);
                }
            }

            // Update REQUESTSTATUS in REQUESTHEADER
            const uniquePrCodes = [...new Set(prCodes)];
            for (const prCode of uniquePrCodes) {
                const status = await this.validateStatusToUpdate(prCode, transaction);
                if (status) {
                    await transaction.request()
                        .input('prCode', prCode)
                        .input('status', status)
                        .query(`UPDATE [PURCHASE.REQUESTHEADER.1] SET REQUESTSTATUS = @status WHERE REFERENCENO = @prCode`);

                    broadcastRequestEvaluationUpdate("purchase-request-status-updated", {
                        referenceNo: prCode,
                        requestStatus: status
                    });
                }
            }

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

            // Get details and PO number before deleting
            const detailsQuery = `SELECT RID, QUANTITY FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const detailsResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(detailsQuery);

            const headerQuery = `SELECT PONUMBER FROM [PURCHASE.RECEIVEHEADER.1] WHERE REFERENCENO = @referenceNo`;
            const headerResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(headerQuery);

            const poNumber = headerResult.recordset[0]?.PONUMBER;

            const deleteHeaderQuery = `
                DELETE FROM [PURCHASE.RECEIVEHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;

            const delHeaderResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(deleteHeaderQuery);

            if (delHeaderResult.rowsAffected[0] === 0) {
                throw new Error('Receiving entry not found');
            }

            const deleteDetailQuery = `
                DELETE FROM [PURCHASE.RECEIVEDETAILS.1]
                WHERE REFERENCENO = @referenceNo
            `;

            const delDetailResult = await connection.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailQuery);

            // Update QTYALLOCATED
            if (poNumber) {
                for (const detail of detailsResult.recordset) {
                    await connection.request()
                        .input('poNumber', poNumber)
                        .input('rid', detail.RID)
                        .input('qtyToSubtract', detail.QUANTITY || 0)
                        .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYALLOCATED = QTYALLOCATED - @qtyToSubtract WHERE PONUMBER = @poNumber AND RID = @rid`);
                }
            }

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
                    h.PONUMBER, h.VENDORID, h.VENDNAME, h.PYMTRMID, h.DATECREATED, h.CREATEDBY,
                    h.DATENEEDED, h.PROMISEDDATE, h.DELIVERY_TO, h.PO_STATUS, h.POSTSTATUS,
                    d.ROWID as DETAIL_ROWID, d.RID, d.ITEMNMBR, d.ITEMDESC, d.UOFM,
                    d.QTYORDER, d.QTYALLOCATED, d.QTYSERVED, d.UNITCOST, d.EXTDCOST, d.BRAND, d.ORIGIN,
                    d.BUDGETNO, d.PRCODE, d.PURCHASETYPE, d.CURRENCY,
                    (d.QTYORDER - ISNULL(d.QTYALLOCATED, 0) - ISNULL(d.QTYSERVED, 0)) as QTY_REMAINING
                FROM [PURCHASE.ORDERHEADER.1] h
                INNER JOIN [PURCHASE.ORDERDETAILS.1] d ON h.PONUMBER = d.PONUMBER
                WHERE h.PO_STATUS = 'P.O. APPROVED'
                    AND (d.QTYORDER - ISNULL(d.QTYALLOCATED, 0) - ISNULL(d.QTYSERVED, 0)) > 0
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
                pymtTermId: record.PYMTRMID,
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
                qtyAllocated: record.QTYALLOCATED,
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

            // Format as RR-00000001 (8 digits with leading zeros)
            return `RR-${nextNumber.toString().padStart(8, '0')}`;
        } catch (error) {
            console.error('Error generating receiving number:', error);
            throw error;
        }
    }

    // Get purchase order by PO number for receiving entry operations (no creator access check - receiving entry access already validated)
    static async getPurchaseOrderForReceiving(poNumber, user = null, isAdmin = false) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            // No access check - user already has access to the receiving entry that references this PO

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
                SELECT ROWID, ITEMSTATUS, PONUMBER, RID, PQCODE, PRCODE, ITEMNMBR, ITEMDESC, UOFM, QTYORDER, QTYCANCEL,
                       QTYALLOCATED, UNITCOST, EXTDCOST, BRAND, ORIGIN, QTYSERVED, BUDGETNO, PURCHASETYPE, CURRENCY
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
                    itemStatus: detail.ITEMSTATUS,
                    budgetNo: detail.BUDGETNO,
                    purchaseType: detail.PURCHASETYPE,
                    currency: detail.CURRENCY
                }))
            };
        } catch (error) {
            console.error('Error fetching purchase order:', error);
            throw new Error('Failed to fetch purchase order: ' + error.message);
        }
    }
}

export default ReceivingEntry;