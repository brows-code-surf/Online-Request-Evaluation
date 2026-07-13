'use server';

import 'server-only';
import sql from 'mssql';
import connectToDatabase from '@/lib/db.js';

class DistributionOfAccounts {
    // Save distributions for a receiving entry
    static async saveDistributions(referenceNo, distributions, ewt, userName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for saving distributions');

            // First, delete existing distributions for this reference no
            const deleteQuery = `
                DELETE FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1]
                WHERE REFERENCENO = @referenceNo
            `;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteQuery);

            // Insert new distributions
            for (const dist of distributions) {
                const insertQuery = `
                    INSERT INTO [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] (
                        REFERENCENO, ACCTNO, ACCOUNTTYPE, DEBITAMOUNT, CREDITAMOUNT, EWT,
                        DATECREATED, CREATEDBY, POSTSTATUS
                    ) VALUES (
                        @referenceNo, @acctNo, @accountType, @debitAmount, @creditAmount, @ewt,
                        GETDATE(), @createdBy, 0
                    )
                `;

                await transaction.request()
                    .input('referenceNo', referenceNo)
                    .input('acctNo', dist.accountNo)
                    .input('accountType', dist.accountType)
                    .input('debitAmount', dist.debit)
                    .input('creditAmount', dist.credit)
                    .input('ewt', ewt)
                    .input('createdBy', userName)
                    .query(insertQuery);
            }

            console.log(`Saved ${distributions.length} distributions for ${referenceNo}`);

            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Distributions saved successfully'
            };

        } catch (error) {
            console.error('Error saving distributions:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to save distributions: ' + error.message);
        }
    }

    // Get distributions by reference number
    static async getDistributionsByReferenceNo(referenceNo) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT PDA.ROWID, REFERENCENO, PDA.ACCTNO, ACCTNAME, ACCOUNTTYPE, DEBITAMOUNT, CREDITAMOUNT, EWT,
                        PDA.DATECREATED, PDA.CREATEDBY, PDA.DATEMODIFIED, PDA.MODIFIEDBY, POSTSTATUS
                FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] PDA INNER JOIN [SETTINGS.DISTRIBUTION.ACCOUNTS.1] SDA ON PDA.ACCTNO = SDA.ACCTNO
                WHERE REFERENCENO = @referenceNo
                ORDER BY ROWID
            `;

            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .query(query);

            return result.recordset.map(record => ({
                id: record.ROWID,
                referenceNo: record.REFERENCENO,
                acctNo: record.ACCTNO,
                acctName: record.ACCTNAME,
                accountType: record.ACCOUNTTYPE,
                debitAmount: record.DEBITAMOUNT,
                creditAmount: record.CREDITAMOUNT,
                ewt: record.EWT,
                dateCreated: record.DATECREATED,
                createdBy: record.CREATEDBY,
                dateModified: record.DATEMODIFIED,
                modifiedBy: record.MODIFIEDBY,
                postStatus: record.POSTSTATUS
            }));
        } catch (error) {
            console.error('Error fetching distributions:', error);
            throw new Error('Failed to fetch distributions: ' + error.message);
        }
    }

    // Update distributions (delete and re-insert)
    static async updateDistributions(referenceNo, distributions, ewt, userName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started for updating distributions');

            // Delete existing
            const deleteQuery = `
                DELETE FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1]
                WHERE REFERENCENO = @referenceNo
            `;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .query(deleteQuery);

            // Insert updated distributions
            for (const dist of distributions) {
                const insertQuery = `
                    INSERT INTO [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1] (
                        REFERENCENO, ACCTNO, ACCOUNTTYPE, DEBITAMOUNT, CREDITAMOUNT, EWT,
                        DATECREATED, CREATEDBY, POSTSTATUS
                    ) VALUES (
                        @referenceNo, @acctNo, @accountType, @debitAmount, @creditAmount, @ewt,
                        GETDATE(), @createdBy, 0
                    )
                `;

                await transaction.request()
                    .input('referenceNo', referenceNo)
                    .input('acctNo', dist.accountNo)
                    .input('accountType', dist.accountType)
                    .input('debitAmount', dist.debit)
                    .input('creditAmount', dist.credit)
                    .input('ewt', ewt)
                    .input('createdBy', userName)
                    .query(insertQuery);
            }

            console.log(`Updated ${distributions.length} distributions for ${referenceNo}`);

            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Distributions updated successfully'
            };

        } catch (error) {
            console.error('Error updating distributions:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to update distributions: ' + error.message);
        }
    }

    // Post distributions (update postStatus to 1)
    static async postDistributions(referenceNo, userName) {
        let connection = null;
        let transaction = null;

        try {
            const pool = await connectToDatabase(process.env.DB_SFC);
            connection = await pool.connect();

            transaction = new sql.Transaction(connection);
            await transaction.begin();

            console.log('Transaction started FOR SUBMISSION distributions');

            // Update postStatus to 1 for existing distributions
            const updateQuery = `
                UPDATE [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1]
                SET POSTSTATUS = 1, DATEMODIFIED = GETDATE(), MODIFIEDBY = @userName
                WHERE REFERENCENO = @referenceNo
            `;
            await transaction.request()
                .input('referenceNo', referenceNo)
                .input('userName', userName)
                .query(updateQuery);

            console.log(`Posted distributions for ${referenceNo}`);

            await transaction.commit();
            console.log('Transaction committed successfully');

            return {
                success: true,
                message: 'Distributions posted successfully'
            };

        } catch (error) {
            console.error('Error posting distributions:', error);

            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('Error during transaction rollback:', rollbackError);
                }
            }

            throw new Error('Failed to post distributions: ' + error.message);
        }
    }

    // Delete distributions for a reference number
    static async deleteDistributions(referenceNo, userName) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                DELETE FROM [PURCHASE.RECEIVE.DISTRIBUTION.ACCOUNTS.1]
                WHERE REFERENCENO = @referenceNo
            `;

            const result = await connection.request()
                .input('referenceNo', referenceNo)
                .query(query);

            // Log the activity (non-critical, don't fail if table doesn't exist)
            try {
                const activityQuery = `
                    INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
                    VALUES (@activity, @userName, GETDATE())
                `;
                await connection.request()
                    .input('activity', `Distributions deleted for receiving entry ${referenceNo} by ${userName}`)
                    .input('userName', userName)
                    .query(activityQuery);
            } catch (activityError) {
                console.warn('Failed to log activity for distribution deletion:', activityError.message);
            }

            return {
                success: true,
                message: 'Distributions deleted successfully',
                rowsAffected: result.rowsAffected[0]
            };
        } catch (error) {
            console.error('Error deleting distributions:', error);
            throw new Error('Failed to delete distributions: ' + error.message);
        }
    }
}

export default DistributionOfAccounts;