import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Direct database testing without Next.js dependencies
import sql from 'mssql';
import { connectToDatabase } from './src/lib/db.js';

// Test transaction safety directly with database operations
async function testTransactionSafety() {
    console.log('Testing transaction safety for PurchaseRequest operations...');

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

        // Test data
        const referenceNo = 'TEST-TX-' + Date.now();
        const creatorName = 'Test User';

        // 1. Insert Purchase Request header
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
            .input('company', 'TEST')
            .input('requestType', 'STOCK')
            .input('referenceNum', '1')
            .input('referenceNo', referenceNo)
            .input('locationCode', 'MAIN')
            .input('requestedBy', creatorName)
            .input('reviewer', 'TEST_REVIEWER')
            .input('approver', 'TEST_APPROVER')
            .input('addressedTo', 'TEST_MANAGER')
            .input('remarks', 'Transaction test')
            .input('isRush', 0)
            .input('createdBy', creatorName)
            .query(headerQuery);

        console.log('Purchase request header inserted');

        // 2. Insert Purchase Request items/details
        const detailQuery = `
            INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                REFERENCENO, ITEMNMBR, ITEMDESC,
                UOFM, QUANTITY, BUDGETCODE, REMARKS, DATENEEDED, RID
            ) VALUES (
                @referenceNo, @itemNumber, @itemDescription,
                @unitOfMeasure, @quantity, @budgetCode, @remarks, @dateNeeded, @rid
            )
        `;

        const rid = `${referenceNo}-1`;

        await transaction.request()
            .input('referenceNo', referenceNo)
            .input('itemNumber', 'TEST001')
            .input('itemDescription', 'Test Item 1')
            .input('unitOfMeasure', 'PCS')
            .input('quantity', 10)
            .input('budgetCode', 'BUDGET001')
            .input('remarks', 'Test remark')
            .input('dateNeeded', '2024-12-31')
            .input('rid', rid)
            .query(detailQuery);

        console.log('Purchase request details inserted');

        // 3. Insert audit/history log
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

        // Verify the data was saved
        const verifyQuery = `
            SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1]
            WHERE REFERENCENO = @referenceNo
        `;
        const verifyResult = await connection.request()
            .input('referenceNo', referenceNo)
            .query(verifyQuery);

        if (verifyResult.recordset[0].count > 0) {
            console.log('SUCCESS: All data persisted correctly');
        } else {
            console.log('ERROR: Data was not saved despite successful commit');
        }

        return { success: true, referenceNo };

    } catch (error) {
        console.error('Error during transaction:', error);

        // ROLLBACK TRANSACTION - Any failure triggers rollback
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('Error during transaction rollback:', rollbackError);
            }
        }

        throw error;
    } finally {
        // Ensure connection is properly released in all cases
        if (connection) {
            try {
                connection.close();
                console.log('Database connection released');
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
    }
}

// Test transaction rollback - force an error to test rollback
async function testTransactionRollback() {
    console.log('Testing transaction rollback with forced error...');

    let connection = null;
    let transaction = null;

    try {
        // Get connection from pool
        const pool = await connectToDatabase(process.env.DB_SFC);
        connection = await pool.connect();

        // BEGIN TRANSACTION
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        console.log('Transaction started for rollback test');

        const referenceNo = 'ROLLBACK-TEST-' + Date.now();

        // Insert header first
        const headerQuery = `
            INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                LOCNCODE, DATEREQUESTED, REQUESTEDBY, CREATEDBY, DATECREATED, IS_READ
            ) VALUES (
                @company, @requestType, @referenceNum, @referenceNo, 'FOR POSTING',
                @locationCode, GETDATE(), @requestedBy, @createdBy, GETDATE(), 0
            )
        `;

        await transaction.request()
            .input('company', 'TEST')
            .input('requestType', 'STOCK')
            .input('referenceNum', '1')
            .input('referenceNo', referenceNo)
            .input('locationCode', 'MAIN')
            .input('requestedBy', 'Test User')
            .input('createdBy', 'Test User')
            .query(headerQuery);

        console.log('Header inserted, now forcing an error...');

        // Force an error - try to insert invalid data
        const invalidQuery = `
            INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                REFERENCENO, ITEMNMBR, ITEMDESC, UOFM, QUANTITY
            ) VALUES (
                @referenceNo, NULL, @itemDescription, @unitOfMeasure, @quantity
            )
        `;

        await transaction.request()
            .input('referenceNo', referenceNo)
            .input('itemDescription', 'Test Item')
            .input('unitOfMeasure', 'PCS')
            .input('quantity', 10)
            .query(invalidQuery);

        // This should not be reached
        await transaction.commit();
        console.log('ERROR: Transaction committed despite forced error');

    } catch (error) {
        console.log('Expected error occurred:', error.message);

        // ROLLBACK TRANSACTION
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Transaction rolled back successfully');
            } catch (rollbackError) {
                console.error('Error during transaction rollback:', rollbackError);
            }
        }

        // Verify no partial data was saved
        try {
            const verifyQuery = `
                SELECT COUNT(*) as count FROM [PURCHASE.REQUESTHEADER.1]
                WHERE REFERENCENO LIKE 'ROLLBACK-TEST-%'
            `;
            const verifyResult = await connection.request().query(verifyQuery);

            if (verifyResult.recordset[0].count === 0) {
                console.log('SUCCESS: No partial data saved - transaction rollback worked correctly');
            } else {
                console.log('WARNING: Some data may have been saved despite rollback');
            }
        } catch (verifyError) {
            console.log('Could not verify rollback:', verifyError.message);
        }

    } finally {
        // Ensure connection is properly released
        if (connection) {
            try {
                connection.close();
                console.log('Database connection released');
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
    }
}

// Test update transaction safety
async function testUpdateTransactionSafety() {
    console.log('Testing update transaction safety...');

    // First create a test PR to update
    let connection = null;
    let transaction = null;
    let testReferenceNo = '';

    try {
        const pool = await connectToDatabase(process.env.DB_SFC);
        connection = await pool.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        testReferenceNo = 'U' + Math.floor(Math.random() * 1000);

        // Create test PR
        const headerQuery = `
            INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                LOCNCODE, DATEREQUESTED, REQUESTEDBY, REVIEWER, APPROVER,
                ADDRESSEDTO, CREATEDBY, DATECREATED, IS_READ
            ) VALUES (
                'TEST', 'STOCK', '1', @referenceNo, 'FOR POSTING',
                'MAIN', GETDATE(), 'Test User', 'TEST_REVIEWER', 'TEST_APPROVER',
                'TEST_MANAGER', 'Test User', GETDATE(), 0
            )
        `;

        await transaction.request()
            .input('referenceNo', testReferenceNo)
            .query(headerQuery);

        // Add test detail
        const detailQuery = `
            INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                REFERENCENO, ITEMNMBR, ITEMDESC, UOFM, QUANTITY, BUDGETCODE, DATENEEDED, RID
            ) VALUES (
                @referenceNo, 'UPDATE001', 'Original Item', 'PCS', 5, 'BUDGET001', '2024-12-31', @rid
            )
        `;

        await transaction.request()
            .input('referenceNo', testReferenceNo)
            .input('rid', `${testReferenceNo}-1`)
            .query(detailQuery);

        await transaction.commit();
        connection.close();

        console.log('Test PR created, now testing update transaction...');

        // Now test the update with transaction
        const pool2 = await connectToDatabase(process.env.DB_SFC);
        connection = await pool2.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        console.log('Update transaction started');

        // Update header
        const updateHeaderQuery = `
            UPDATE [PURCHASE.REQUESTHEADER.1]
            SET COMPANY = 'UPD_TEST',
                REQUESTTYPE = 'SERVICES',
                REMARKS = 'Updated remarks'
            WHERE REFERENCENO = @referenceNo
        `;

        const headerResult = await transaction.request()
            .input('referenceNo', testReferenceNo)
            .query(updateHeaderQuery);

        if (headerResult.rowsAffected[0] === 0) {
            throw new Error('Purchase request not found for update');
        }

        console.log('Header updated');

        // Delete existing details
        const deleteDetailsQuery = `DELETE FROM [PURCHASE.REQUESTDETAILS.1] WHERE REFERENCENO = @referenceNo`;
        await transaction.request()
            .input('referenceNo', testReferenceNo)
            .query(deleteDetailsQuery);

        console.log('Details deleted');

        // Insert updated details
        const updateDetailQuery = `
            INSERT INTO [PURCHASE.REQUESTDETAILS.1] (
                REFERENCENO, ITEMNMBR, ITEMDESC, UOFM, QUANTITY, BUDGETCODE, DATENEEDED, RID
            ) VALUES (
                @referenceNo, 'UPDATED001', 'Updated Item', 'BOX', 10, 'BUDGET002', '2024-12-31', @rid
            )
        `;

        await transaction.request()
            .input('referenceNo', testReferenceNo)
            .input('rid', `${testReferenceNo}-1`)
            .query(updateDetailQuery);

        console.log('Updated details inserted');

        // Insert activity log
        const activityQuery = `
            INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
            VALUES (@activity, @updaterName, GETDATE())
        `;
        await transaction.request()
            .input('activity', `Purchase Request ${testReferenceNo} updated by Test User`)
            .input('updaterName', 'Test User')
            .query(activityQuery);

        console.log('Activity log inserted');

        // Commit update transaction
        await transaction.commit();
        console.log('Update transaction committed successfully');

        // Verify the update
        const verifyQuery = `
            SELECT H.*, D.ITEMNMBR, D.ITEMDESC, D.UOFM, D.QUANTITY
            FROM [PURCHASE.REQUESTHEADER.1] H
            LEFT JOIN [PURCHASE.REQUESTDETAILS.1] D ON H.REFERENCENO = D.REFERENCENO
            WHERE H.REFERENCENO = @referenceNo
        `;
        const verifyResult = await connection.request()
            .input('referenceNo', testReferenceNo)
            .query(verifyQuery);

        if (verifyResult.recordset.length > 0) {
            const record = verifyResult.recordset[0];
            console.log('Update verification:', {
                company: record.COMPANY,
                requestType: record.REQUESTTYPE,
                itemNumber: record.ITEMNMBR,
                itemDesc: record.ITEMDESC,
                quantity: record.QUANTITY
            });

            if (record.COMPANY === 'UPD_TEST' && record.ITEMNMBR === 'UPDATED001') {
                console.log('SUCCESS: Update transaction worked correctly');
            } else {
                console.log('ERROR: Update data not saved correctly');
            }
        }

    } catch (error) {
        console.error('Error in update transaction test:', error);

        // Rollback on error
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Update transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError);
            }
        }

        throw error;
    } finally {
        if (connection) {
            connection.close();
        }
    }
}

// Run tests
async function runTests() {
    try {
        console.log('=== Testing Transaction Safety (Create) ===');
        await testTransactionSafety();
        console.log('\n=== Testing Transaction Rollback (Create) ===');
        await testTransactionRollback();
        console.log('\n=== Testing Update Transaction Safety ===');
        await testUpdateTransactionSafety();
        console.log('\n=== All Tests Completed ===');
    } catch (error) {
        console.error('Test suite failed:', error);
        process.exit(1);
    }
}

runTests();
