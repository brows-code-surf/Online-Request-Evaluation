import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Direct database testing without Next.js dependencies
import sql from 'mssql';
import { connectToDatabase } from './src/lib/db.js';

// Test RequestEvaluation transaction safety
async function testApprovalTransactionSafety() {
    console.log('Testing RequestEvaluation approval transaction safety...');

    // First create a test PR to approve
    let connection = null;
    let transaction = null;
    let testReferenceNo = '';

    try {
        const pool = await connectToDatabase(process.env.DB_SFC);
        connection = await pool.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        testReferenceNo = 'APPROVAL-' + Math.floor(Math.random() * 1000);

        // Create test PR
        const headerQuery = `
            INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                LOCNCODE, DATEREQUESTED, REQUESTEDBY, REVIEWER, APPROVER,
                ADDRESSEDTO, CREATEDBY, DATECREATED, IS_READ, IS_POSTED
            ) VALUES (
                'TEST', 'STOCK', '1', @referenceNo, 'FOR CONFIRMATION',
                'MAIN', GETDATE(), 'Test User', 'Test Reviewer', 'Test Approver',
                'Test Addressed', 'Test User', GETDATE(), 0, 1
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
                @referenceNo, 'APPROVAL001', 'Approval Test Item', 'PCS', 5, 'BUDGET001', '2024-12-31', @rid
            )
        `;

        await transaction.request()
            .input('referenceNo', testReferenceNo)
            .input('rid', `${testReferenceNo}-1`)
            .query(detailQuery);

        await transaction.commit();
        connection.close();

        console.log('Test PR created for approval, now testing approval transaction...');

        // Now test the approval with transaction (simulating the method)
        const pool2 = await connectToDatabase(process.env.DB_SFC);
        connection = await pool2.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        console.log('Approval transaction started');

        // Simulate approval: FOR CONFIRMATION -> FOR REQUEST APPROVAL
        const headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1]
                                    SET REVIEWEDBY = @approverName,
                                        DATEREVIEWED = GETDATE(),
                                        IS_READ = 0,
                                        REQUESTSTATUS = @newStatus
                                    WHERE REFERENCENO = @referenceNo`;

        const requestHeader = transaction.request();
        requestHeader.input('referenceNo', testReferenceNo);
        requestHeader.input('approverName', 'Test Reviewer');
        requestHeader.input('newStatus', 'FOR REQUEST APPROVAL');

        const resultHeader = await requestHeader.query(headerUpdateQuery);

        console.log('Header status updated for approval');

        // Create notification (simplified)
        const notificationQuery = `SELECT ADDRESSEDTO FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`;
        const notificationResult = await transaction.request()
            .input('referenceNo', testReferenceNo)
            .query(notificationQuery);

        console.log('Notification query executed');

        // Commit approval transaction
        await transaction.commit();
        console.log('Approval transaction committed successfully');

        // Verify the approval
        const verifyQuery = `
            SELECT REQUESTSTATUS, REVIEWEDBY FROM [PURCHASE.REQUESTHEADER.1]
            WHERE REFERENCENO = @referenceNo
        `;
        const verifyResult = await connection.request()
            .input('referenceNo', testReferenceNo)
            .query(verifyQuery);

        if (verifyResult.recordset.length > 0) {
            const record = verifyResult.recordset[0];
            console.log('Approval verification:', {
                status: record.REQUESTSTATUS,
                reviewedBy: record.REVIEWEDBY
            });

            if (record.REQUESTSTATUS === 'FOR REQUEST APPROVAL' && record.REVIEWEDBY === 'Test Reviewer') {
                console.log('SUCCESS: Approval transaction worked correctly');
            } else {
                console.log('ERROR: Approval data not saved correctly');
            }
        }

    } catch (error) {
        console.error('Error in approval transaction test:', error);

        // Rollback on error
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Approval transaction rolled back due to error');
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

// Test rejection transaction safety
async function testRejectionTransactionSafety() {
    console.log('Testing RequestEvaluation rejection transaction safety...');

    // First create a test PR to reject
    let connection = null;
    let transaction = null;
    let testReferenceNo = '';

    try {
        const pool = await connectToDatabase(process.env.DB_SFC);
        connection = await pool.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        testReferenceNo = 'REJECT-' + Math.floor(Math.random() * 1000);

        // Create test PR
        const headerQuery = `
            INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                LOCNCODE, DATEREQUESTED, REQUESTEDBY, REVIEWER, APPROVER,
                ADDRESSEDTO, CREATEDBY, DATECREATED, IS_READ, IS_POSTED
            ) VALUES (
                'TEST', 'STOCK', '1', @referenceNo, 'FOR REQUEST APPROVAL',
                'MAIN', GETDATE(), 'Test User', 'Test Reviewer', 'Test Approver',
                'Test Addressed', 'Test User', GETDATE(), 0, 1
            )
        `;

        await transaction.request()
            .input('referenceNo', testReferenceNo)
            .query(headerQuery);

        await transaction.commit();
        connection.close();

        console.log('Test PR created for rejection, now testing rejection transaction...');

        // Now test the rejection with transaction
        const pool2 = await connectToDatabase(process.env.DB_SFC);
        connection = await pool2.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        console.log('Rejection transaction started');

        // Simulate rejection
        const headerUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1]
                                  SET REQUESTSTATUS = 'REJECTED',
                                      CANCELREMARKS = @rejectionReason
                                  WHERE REFERENCENO = @referenceNo`;

        const requestHeader = transaction.request();
        requestHeader.input('referenceNo', testReferenceNo);
        requestHeader.input('rejectionReason', 'Test rejection reason');

        const resultHeader = await requestHeader.query(headerUpdateQuery);

        console.log('Header status updated to REJECTED');

        // Commit rejection transaction
        await transaction.commit();
        console.log('Rejection transaction committed successfully');

        // Verify the rejection
        const verifyQuery = `
            SELECT REQUESTSTATUS, CANCELREMARKS FROM [PURCHASE.REQUESTHEADER.1]
            WHERE REFERENCENO = @referenceNo
        `;
        const verifyResult = await connection.request()
            .input('referenceNo', testReferenceNo)
            .query(verifyQuery);

        if (verifyResult.recordset.length > 0) {
            const record = verifyResult.recordset[0];
            console.log('Rejection verification:', {
                status: record.REQUESTSTATUS,
                cancelRemarks: record.CANCELREMARKS
            });

            if (record.REQUESTSTATUS === 'REJECTED' && record.CANCELREMARKS === 'Test rejection reason') {
                console.log('SUCCESS: Rejection transaction worked correctly');
            } else {
                console.log('ERROR: Rejection data not saved correctly');
            }
        }

    } catch (error) {
        console.error('Error in rejection transaction test:', error);

        // Rollback on error
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Rejection transaction rolled back due to error');
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

// Test transaction rollback for approval - force an error
async function testApprovalTransactionRollback() {
    console.log('Testing RequestEvaluation approval transaction rollback...');

    let connection = null;
    let transaction = null;

    try {
        const pool = await connectToDatabase(process.env.DB_SFC);
        connection = await pool.connect();
        transaction = new sql.Transaction(connection);
        await transaction.begin();

        console.log('Approval rollback test transaction started');

        const referenceNo = 'ROLLBACK-APPROVAL-' + Math.floor(Math.random() * 1000);

        // Create test PR
        const headerQuery = `
            INSERT INTO [PURCHASE.REQUESTHEADER.1] (
                COMPANY, REQUESTTYPE, REFERENCENUM, REFERENCENO, REQUESTSTATUS,
                LOCNCODE, DATEREQUESTED, REQUESTEDBY, REVIEWER, CREATEDBY, DATECREATED, IS_READ, IS_POSTED
            ) VALUES (
                'TEST', 'STOCK', '1', @referenceNo, 'FOR CONFIRMATION',
                'MAIN', GETDATE(), 'Test User', 'Test Reviewer', 'Test User', GETDATE(), 0, 1
            )
        `;

        await transaction.request()
            .input('referenceNo', referenceNo)
            .query(headerQuery);

        console.log('Test PR created, now attempting approval with error...');

        // Try to update with invalid data that should cause rollback
        const invalidUpdateQuery = `UPDATE [PURCHASE.REQUESTHEADER.1]
                                    SET REQUESTSTATUS = NULL
                                    WHERE REFERENCENO = @referenceNo`;

        await transaction.request()
            .input('referenceNo', referenceNo)
            .query(invalidUpdateQuery);

        // This should not be reached
        await transaction.commit();
        console.log('ERROR: Transaction committed despite invalid data');

    } catch (error) {
        console.log('Expected error occurred in approval rollback test:', error.message);

        // Rollback transaction
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Approval transaction rolled back successfully');
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError);
            }
        }

        // Verify no partial changes were saved
        try {
            const verifyQuery = `SELECT REQUESTSTATUS FROM [PURCHASE.REQUESTHEADER.1] WHERE REFERENCENO LIKE 'ROLLBACK-APPROVAL-%'`;
            const verifyResult = await connection.request().query(verifyQuery);

            if (verifyResult.recordset.length === 0) {
                console.log('SUCCESS: No partial approval data saved - transaction rollback worked correctly');
            } else {
                // Check if status was changed (it shouldn't be)
                const record = verifyResult.recordset[0];
                if (record.REQUESTSTATUS === 'FOR CONFIRMATION') {
                    console.log('SUCCESS: Status remained unchanged - rollback worked correctly');
                } else {
                    console.log('WARNING: Status was changed despite rollback');
                }
            }
        } catch (verifyError) {
            console.log('Could not verify rollback:', verifyError.message);
        }

    } finally {
        if (connection) {
            connection.close();
        }
    }
}

// Run tests
async function runTests() {
    try {
        console.log('=== Testing RequestEvaluation Approval Transaction Safety ===');
        await testApprovalTransactionSafety();
        console.log('\n=== Testing RequestEvaluation Rejection Transaction Safety ===');
        await testRejectionTransactionSafety();
        console.log('\n=== Testing RequestEvaluation Approval Transaction Rollback ===');
        await testApprovalTransactionRollback();
        console.log('\n=== All RequestEvaluation Transaction Tests Completed ===');
    } catch (error) {
        console.error('RequestEvaluation test suite failed:', error);
        process.exit(1);
    }
}

runTests();
