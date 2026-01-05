// Utility for managing name change updates across multiple tables
export const TABLES_TO_UPDATE = [
    {
        table: '[ACTIVITY.LOGS.1]',
        db: process.env.DB_SFC,
        columns: ['CREATEDBY']
    },
    {
        table: '[PURCHASE.REQUESTHEADER.1]',
        db: process.env.DB_SFC, // default DB
        columns: ['REQUESTEDBY', 'REVIEWER', 'REVIEWEDBY', 'APPROVER', 'APPROVEDBY' , 'ADDRESSEDTO', 'RECEIVEDBY', 'CREATEDBY', 'POSTEDBY']
    },
    {
        table: '[SETTINGS.CHILDMODULE1.1]',
        db: process.env.DB_NAME,
        columns: ['CREATEDBY', 'MODIFIEDBY']
    },
    {
        table: '[SETTINGS.PARENTMODULE.1]',
        db: process.env.DB_NAME,
        columns: ['CREATEDBY', 'MODIFIEDBY']
    },
    {
        table: '[SYSTEM.TICKET.1]',
        db: process.env.DB_NAME,
        columns: ['CREATEDBY']
    },
    {
        table: '[SYSTEM.USERACCESS.1]',
        db: process.env.DB_NAME,
        columns: ['CREATEDBY', 'MODIFIEDBY']
    },
    {
        table: '[SYSTEM.NOTIFICATION.1]',
        db: process.env.DB_NAME,
        columns: ['RECIPIENT', 'CREATEDBY']
    }
];

export const updateNameInTable = async (connection, tableName, columnName, oldName, newName) => {
    const query = `
        UPDATE ${tableName}
        SET ${columnName} = @newName
        WHERE ${columnName} = @oldName
    `;

    const result = await connection.request()
        .input('newName', newName)
        .input('oldName', oldName)
        .query(query);

    return result.rowsAffected[0];
};

export const getAffectedRowsCount = async (connection, tableName, columnName, oldName) => {
    const query = `
        SELECT COUNT(*) as count
        FROM ${tableName}
        WHERE ${columnName} = @oldName
    `;

    const result = await connection.request()
        .input('oldName', oldName)
        .query(query);

    return result.recordset[0].count;
};
