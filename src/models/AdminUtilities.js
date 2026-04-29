'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';
import { broadcastRequestEvaluationUpdate } from '@/lib/socketBroadcast.js';

class AdminUtilities {
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

            if (filters.postStatus !== undefined) {
                query += ` AND h.POSTSTATUS = @postStatus${paramIndex}`;
                params.push({ name: `postStatus${paramIndex}`, value: filters.postStatus });
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
                postStatus: Number(record.POSTSTATUS) || 0,
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
                    postStatus: Number(header.POSTSTATUS) || 0,
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

    static async unpostReceivingEntry(referenceNo, unposterName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for unposting receiving entry');

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

            if (checkResult.recordset[0].POSTSTATUS === 0) {
                throw new Error('Receiving entry is not posted');
            }

            // Get RIDs from receiving entry
            const receivingRidsQuery = `SELECT RID FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const receivingRidsResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(receivingRidsQuery);
            const rids = receivingRidsResult.recordset.map(row => row.RID);

            let poDetailsResult = { recordset: [] };
            if (rids.length > 0) {
                // Get PO details for RIDs in this receiving entry
                const poDetailsQuery = `SELECT RID, PONUMBER, PRCODE FROM [PURCHASE.ORDERDETAILS.1] WHERE RID IN (${rids.map((_, i) => `@rid${i}`).join(',')})`;
                const poDetailsRequest = transaction.request();
                rids.forEach((rid, i) => poDetailsRequest.input(`rid${i}`, rid));
                poDetailsResult = await poDetailsRequest.query(poDetailsQuery);
            }

            const unpostQuery = `
                UPDATE [PURCHASE.RECEIVEHEADER.1] SET
                    POSTSTATUS = 0,
                    DATEMODIFIED = GETDATE(),
                    MODIFIEDBY = @unposterName
                WHERE REFERENCENO = @referenceNo
            `;

            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('unposterName', unposterName)
                .query(unpostQuery);

            console.log('Receiving entry unposted successfully');

            // Delete distribution accounts for this receiving entry
            const deleteDistributionAccountsQuery = `DELETE FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] WHERE REFERENCENO = @referenceNo`;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteDistributionAccountsQuery);

            // Get quantities from receiving details
            const receivingQuantitiesQuery = `SELECT RID, QUANTITY FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const receivingQuantitiesResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(receivingQuantitiesQuery);
            const quantitiesMap = {};
            receivingQuantitiesResult.recordset.forEach(row => {
                quantitiesMap[row.RID] = row.QUANTITY || 0;
            });

            // Reverse updates: subtract from QTYSERVED, add back to QTYALLOCATED
            const prCodes = [];
            for (const row of poDetailsResult.recordset) {
                const { RID, PRCODE, PONUMBER } = row;
                const quantity = quantitiesMap[RID] || 0;
                if (PRCODE) {
                    prCodes.push(PRCODE);
                }
                // Reverse: subtract from QTYSERVED, add back to QTYALLOCATED
                if (quantity > 0) {
                    await transaction.request()
                        .input('poNumber', PONUMBER)
                        .input('rid', RID)
                        .input('quantity', quantity)
                        .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED - @quantity, QTYALLOCATED = QTYALLOCATED + @quantity WHERE PONUMBER = @poNumber AND RID = @rid`);

                    // Update ITEMSTATUS based on whether still fully served
                    await transaction.request()
                        .input('poNumber', PONUMBER)
                        .input('rid', RID)
                        .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET ITEMSTATUS = CASE WHEN QTYSERVED = 0 THEN 'P.O. APPROVED' WHEN QTYORDER > QTYSERVED THEN 'PARTIALLY SERVED' ELSE 'SERVED' END WHERE PONUMBER = @poNumber AND RID = @rid`);
                }
            }

            // Update REQUESTDETAILS ITEMSTATUS to match ORDERDETAILS after unposting
            for (const row of poDetailsResult.recordset) {
                const { PRCODE, RID } = row;
                if (PRCODE) {
                    await transaction.request()
                        .input('prCode', PRCODE)
                        .input('rid', RID)
                        .query(`UPDATE rd SET ITEMSTATUS = od.ITEMSTATUS FROM [PURCHASE.REQUESTDETAILS.1] rd INNER JOIN [PURCHASE.ORDERDETAILS.1] od ON rd.REFERENCENO = od.PRCODE AND rd.RID = od.RID WHERE rd.REFERENCENO = @prCode AND rd.RID = @rid`);
                }
            }

            // Update REQUESTSTATUS in REQUESTHEADER
            const uniquePrCodes = [...new Set(prCodes)];
            for (const prCode of uniquePrCodes) {
                const status = await this.validatePRStatusToUpdate(prCode, transaction);
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

            const uniquePoNumbers = [...new Set(poDetailsResult.recordset.map(row => row.PONUMBER))];
            for (const poNumber of uniquePoNumbers) {
                const status = await this.validatePOStatusToUpdate(poNumber, transaction);
                if (status) {
                    await transaction.request()
                        .input('poNumber', poNumber)
                        .input('status', status)
                        .query(`UPDATE [PURCHASE.ORDERHEADER.1] SET PO_STATUS = @status WHERE PONUMBER = @poNumber`);

                    broadcastRequestEvaluationUpdate("purchase-order-status-updated", {
                        referenceNo: poNumber,
                        poStatus: status
                    });
                }
            }

            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @unposterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Receiving Entry ${referenceNo} unposted by ${unposterName}`)
                .input('unposterName', unposterName)
                .query(activityQuery);

            await transaction.commit();
            console.log('Transaction committed successfully');

            broadcastRequestEvaluationUpdate("receiving-entry-unposted", {
                referenceNo: referenceNo,
                postStatus: 0
            });

            return {
                success: true,
                message: 'Receiving entry unposted successfully'
            };
        } catch (error) {
            console.error('Error unposting receiving entry:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to unpost receiving entry: ' + error.message);
        }
    }

    static async deleteReceivingEntry(referenceNo, deleterName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for deleting receiving entry');

            const checkQuery = `
                SELECT POSTSTATUS, ROWID, PONUMBER FROM [PURCHASE.RECEIVEHEADER.1]
                WHERE REFERENCENO = @referenceNo
            `;
            const checkResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                throw new Error('Receiving entry not found');
            }

            const header = checkResult.recordset[0];
            const wasPosted = header.POSTSTATUS === 1;

            // Get RIDs from receiving entry
            const receivingRidsQuery = `SELECT RID FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const receivingRidsResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(receivingRidsQuery);
            const rids = receivingRidsResult.recordset.map(row => row.RID);

            let poDetailsResult = { recordset: [] };
            if (rids.length > 0) {
                // Get PO details for RIDs in this receiving entry
                const poDetailsQuery = `SELECT RID, PONUMBER, PRCODE FROM [PURCHASE.ORDERDETAILS.1] WHERE RID IN (${rids.map((_, i) => `@rid${i}`).join(',')})`;
                const poDetailsRequest = transaction.request();
                rids.forEach((rid, i) => poDetailsRequest.input(`rid${i}`, rid));
                poDetailsResult = await poDetailsRequest.query(poDetailsQuery);
            }

            // Get quantities from receiving details
            const receivingQuantitiesQuery = `SELECT RID, QUANTITY FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            const receivingQuantitiesResult = await transaction.request()
                .input('referenceNo', referenceNo)
                .query(receivingQuantitiesQuery);
            const quantitiesMap = {};
            receivingQuantitiesResult.recordset.forEach(row => {
                quantitiesMap[row.RID] = row.QUANTITY || 0;
            });

            // If was posted, reverse the posting effects
            const prCodes = [];
            if (wasPosted) {
                for (const row of poDetailsResult.recordset) {
                    const { RID, PRCODE, PONUMBER } = row;
                    const quantity = quantitiesMap[RID] || 0;
                    if (PRCODE) {
                        prCodes.push(PRCODE);
                    }
                    // Reverse: subtract from QTYSERVED, add back to QTYALLOCATED
                    if (quantity > 0) {
                        await transaction.request()
                            .input('poNumber', PONUMBER)
                            .input('rid', RID)
                            .input('quantity', quantity)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED - @quantity, QTYALLOCATED = QTYALLOCATED + @quantity WHERE PONUMBER = @poNumber AND RID = @rid`);
                    }
                }

                // Update ITEMSTATUS in ORDERDETAILS
                for (const row of poDetailsResult.recordset) {
                    const { PRCODE, RID, PONUMBER } = row;
                    if (PRCODE) {
                        await transaction.request()
                            .input('poNumber', PONUMBER)
                            .input('rid', RID)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET ITEMSTATUS = CASE WHEN QTYSERVED = 0 THEN 'P.O. APPROVED' WHEN QTYORDER > QTYSERVED THEN 'PARTIALLY SERVED' ELSE 'SERVED' END WHERE PONUMBER = @poNumber AND RID = @rid`);
                    }
                }


            } else {
                // If not posted, just reverse the allocation from creation
                for (const row of poDetailsResult.recordset) {
                    const { RID, PRCODE, PONUMBER } = row;
                    const quantity = quantitiesMap[RID] || 0;
                    if (PRCODE) {
                        prCodes.push(PRCODE);
                    }
                    // Subtract from QTYALLOCATED
                    if (quantity > 0) {
                        await transaction.request()
                            .input('poNumber', PONUMBER)
                            .input('rid', RID)
                            .input('quantity', quantity)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET QTYSERVED = QTYSERVED - @quantity WHERE PONUMBER = @poNumber AND RID = @rid`);

                        // Update ITEMSTATUS based on current QTYSERVED
                        await transaction.request()
                            .input('poNumber', PONUMBER)
                            .input('rid', RID)
                            .query(`UPDATE [PURCHASE.ORDERDETAILS.1] SET ITEMSTATUS = CASE WHEN QTYSERVED = 0 THEN 'P.O. APPROVED' WHEN QTYORDER > QTYSERVED THEN 'PARTIALLY SERVED' ELSE 'SERVED' END WHERE PONUMBER = @poNumber AND RID = @rid`);
                    }
                }
            }

            // Update REQUESTDETAILS ITEMSTATUS to match ORDERDETAILS
            for (const row of poDetailsResult.recordset) {
                const { PRCODE, RID } = row;
                if (PRCODE) {
                    console.log(`Updating REQUESTDETAILS for PRCODE: ${PRCODE}, RID: ${RID}`);
                    const updateResult = await transaction.request()
                        .input('prCode', PRCODE)
                        .input('rid', RID)
                        .query(`UPDATE rd SET ITEMSTATUS = 
                                CASE WHEN od.QTYSERVED = 0 THEN 'P.O. APPROVED'
                                WHEN rd.QUANTITY > od.QTYSERVED AND od.QTYSERVED != 0 THEN 'PARTIALLY SERVED'
                                END
                                FROM [PURCHASE.REQUESTDETAILS.1] rd
                                INNER JOIN [PURCHASE.ORDERDETAILS.1] od ON rd.REFERENCENO = od.PRCODE AND rd.RID = od.RID
                                WHERE rd.REFERENCENO = @prCode AND rd.RID = @rid`);
                    console.log(`REQUESTDETAILS update result: ${updateResult.rowsAffected} rows affected`);
                }
            }

            // Delete distribution accounts for this receiving entry
            const deleteDistributionAccountsQuery = `DELETE FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] WHERE REFERENCENO = @referenceNo`;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteDistributionAccountsQuery);

            // Delete receiving details
            const deleteDetailsQuery = `DELETE FROM [PURCHASE.RECEIVEDETAILS.1] WHERE REFERENCENO = @referenceNo`;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteDetailsQuery);

            // Delete receiving header
            const deleteHeaderQuery = `DELETE FROM [PURCHASE.RECEIVEHEADER.1] WHERE REFERENCENO = @referenceNo`;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteHeaderQuery);

            // Update REQUESTSTATUS in REQUESTHEADER
            const uniquePrCodes = [...new Set(prCodes)];
            for (const prCode of uniquePrCodes) {
                const status = await this.validatePRStatusToUpdate(prCode, transaction);
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

            const uniquePoNumbers = [...new Set(poDetailsResult.recordset.map(row => row.PONUMBER))];
            for (const poNumber of uniquePoNumbers) {
                const status = await this.validatePOStatusToUpdate(poNumber, transaction);
                if (status) {
                    await transaction.request()
                        .input('poNumber', poNumber)
                        .input('status', status)
                        .query(`UPDATE [PURCHASE.ORDERHEADER.1] SET PO_STATUS = @status WHERE PONUMBER = @poNumber`);

                    broadcastRequestEvaluationUpdate("purchase-order-status-updated", {
                        referenceNo: poNumber,
                        poStatus: status
                    });
                }
            }

            const activityQuery = `
                INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                VALUES (@activity, @deleterName, GETDATE())
            `;
            await transaction.request()
                .input('activity', `Receiving Entry ${referenceNo} deleted by ${deleterName}`)
                .input('deleterName', deleterName)
                .query(activityQuery);

            await transaction.commit();
            console.log('Transaction committed successfully');

            broadcastRequestEvaluationUpdate("receiving-entry-deleted", {
                referenceNo: referenceNo
            });

            return {
                success: true,
                message: 'Receiving entry deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting receiving entry:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to delete receiving entry: ' + error.message);
        }
    }

    static async validatePRStatusToUpdate(referenceNo, dbConnection = null) {
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
            } else {
                return 'P.O. APPROVED';
            }

        } catch (error) {
            throw error;
        } finally {
            if (shouldClose && connection) {
                connection.close();
            }
        }
    }

    static async validatePOStatusToUpdate(poNumber, dbConnection = null) {
        let connection = dbConnection;
        let shouldClose = false;
        try {
            if (!connection) {
                connection = await connectToDatabase(process.env.DB_SFC);
                shouldClose = true;
            }
            const query = `SELECT QTYSERVED, QTYORDER FROM [PURCHASE.ORDERDETAILS.1] WHERE PONUMBER = @poNumber`;
            const result = await connection.request()
                .input('poNumber', poNumber)
                .query(query);
            if (result.recordset.length === 0) {
                return null;
            }

            const poDetails = result.recordset;
            const allClosed = poDetails.every(status => (status.QTYORDER || 0) === (status.QTYSERVED || 0));
            const someServed = poDetails.some(status => (status.QTYSERVED || 0) > 0);

            if (allClosed) {
                return 'SERVED';
            } else if (someServed) {
                return 'PARTIALLY SERVED';
            } else {
                return 'P.O. APPROVED';
            }

        } catch (error) {
            throw error;
        } finally {
            if (shouldClose && connection) {
                connection.close();
            }
        }
    }
}

export default AdminUtilities;