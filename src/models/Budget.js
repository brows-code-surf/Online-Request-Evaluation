'use server';

import 'server-only';
import connectToDatabase from '@/lib/db.js';

class Budget {
    // Get all budget accounts for selection
    static async getAllBudgetAccounts() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            const query = `
                SELECT
                    ROWID,
                    BUDGETYEAR,
                    COMPANY,
                    LOCATION,
                    LOCNCODE2,
                    DEPARTMENT,
                    AREA,
                    EXPENSETYPE,
                    BUDGETCATEGORY,
                    BUDGETCODE,
                    PARTICULAR,
                    ACTIVE,
                    DATECREATED,
                    USERNAME
                FROM [PURCHASE.BUDGETACCOUNT.1]
                WHERE ACTIVE = 1
                ORDER BY BUDGETYEAR DESC, COMPANY, DEPARTMENT, BUDGETCATEGORY, PARTICULAR
            `;

            const result = await connection.request().query(query);
            return result.recordset.map(record => ({
                id: record.ROWID,
                budgetYear: record.BUDGETYEAR,
                company: record.COMPANY,
                location: record.LOCATION,
                locationCode2: record.LOCNCODE2,
                department: record.DEPARTMENT,
                area: record.AREA,
                expenseType: record.EXPENSETYPE,
                budgetCategory: record.BUDGETCATEGORY,
                budgetCode: record.BUDGETCODE,
                particular: record.PARTICULAR,
                active: record.ACTIVE,
                dateCreated: record.DATECREATED,
                username: record.USERNAME
            }));
        } catch (error) {
            console.error('Error fetching budget accounts:', error);
            throw new Error('Failed to fetch budget accounts: ' + error.message);
        }
    }
}

export default Budget;
