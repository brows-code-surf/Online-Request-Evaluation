import connectToDatabase from '@/lib/db.js';
import { TABLES_TO_UPDATE, updateNameInTable, getAffectedRowsCount } from '@/utils/nameChangeUtils.js';

class NameChange {
    static async changeEmployeeName(employeeID, newName, modifiedBy) {
        let mainConnection;
        const results = {
            success: false,
            updatedTables: [],
            totalAffectedRows: 0,
            errors: []
        };

        try {
            // First, get the current name
            mainConnection = await connectToDatabase();
            const getCurrentNameQuery = `
                SELECT EMPLOYEENAME as currentName
                FROM [SYSTEM.USERACCOUNT.1]
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const currentNameResult = await mainConnection.request()
                .input('employeeID', employeeID)
                .query(getCurrentNameQuery);

            if (currentNameResult.recordset.length === 0) {
                throw new Error('Employee not found');
            }

            const oldName = currentNameResult.recordset[0].currentName;

            if (oldName === newName) {
                throw new Error('New name is the same as current name');
            }

            // Update the main employee record
            const updateMainQuery = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                EMPLOYEENAME = @newName,
                MODIFIEDBY = @modifiedBy,
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const updateResult = await mainConnection.request()
                .input('employeeID', employeeID)
                .input('newName', newName)
                .input('modifiedBy', modifiedBy)
                .query(updateMainQuery);

            if (updateResult.rowsAffected[0] === 0) {
                throw new Error('Failed to update main employee record');
            }

            // Now update all related tables
            for (const tableConfig of TABLES_TO_UPDATE) {
                const dbName = tableConfig.db;

                for (const column of tableConfig.columns) {
                    try {
                        // Get connection pool for this database
                        const connection = await connectToDatabase(dbName);

                        // Check how many rows will be affected
                        const affectedCount = await getAffectedRowsCount(connection, tableConfig.table, column, oldName);

                        if (affectedCount > 0) {
                            // Perform the update
                            const updatedRows = await updateNameInTable(connection, tableConfig.table, column, oldName, newName);

                            results.updatedTables.push({
                                table: tableConfig.table,
                                column: column,
                                affectedRows: updatedRows
                            });

                            results.totalAffectedRows += updatedRows;
                        }
                    } catch (error) {
                        results.errors.push({
                            table: tableConfig.table,
                            column: column,
                            error: error.message
                        });
                        console.error(`Error updating ${tableConfig.table}.${column}:`, error);
                    }
                }
            }

            results.success = results.errors.length === 0;
            return results;

        } catch (error) {
            console.error('Error in changeEmployeeName:', error);
            results.errors.push({ general: error.message });
            return results;
        }
    }

    static async previewNameChange(employeeID, newName) {
        let mainConnection;
        const preview = {
            currentName: null,
            newName: newName,
            affectedTables: [],
            totalAffectedRows: 0,
            errors: []
        };

        try {
            // Get the current name
            mainConnection = await connectToDatabase();
            const getCurrentNameQuery = `
                SELECT EMPLOYEENAME as currentName
                FROM [SYSTEM.USERACCOUNT.1]
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const currentNameResult = await mainConnection.request()
                .input('employeeID', employeeID)
                .query(getCurrentNameQuery);

            if (currentNameResult.recordset.length === 0) {
                throw new Error('Employee not found');
            }

            preview.currentName = currentNameResult.recordset[0].currentName;

            if (preview.currentName === newName) {
                preview.errors.push('New name is the same as current name');
                return preview;
            }

            // Preview affected rows in all tables
            for (const tableConfig of TABLES_TO_UPDATE) {
                const dbName = tableConfig.db;

                for (const column of tableConfig.columns) {
                    try {
                        // Get connection pool for this database
                        const connection = await connectToDatabase(dbName);

                        const affectedCount = await getAffectedRowsCount(connection, tableConfig.table, column, preview.currentName);

                        if (affectedCount > 0) {
                            preview.affectedTables.push({
                                table: tableConfig.table,
                                column: column,
                                affectedRows: affectedCount
                            });

                            preview.totalAffectedRows += affectedCount;
                        }
                    } catch (error) {
                        preview.errors.push(`Error checking ${tableConfig.table}.${column}: ${error.message}`);
                        console.error(`Error previewing ${tableConfig.table}.${column}:`, error);
                    }
                }
            }

            return preview;

        } catch (error) {
            console.error('Error in previewNameChange:', error);
            preview.errors.push(error.message);
            return preview;
        }
    }
}

export default NameChange;
