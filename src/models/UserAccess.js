import connectToDatabase from "../lib/db.js";

export const USERACCESS = {
  // Get all access records for an employee
  async getAccessByEmployee(employeeId) {
    let connection;
    try {
      console.log('Model: getAccessByEmployee called with employeeId:', employeeId, typeof employeeId);
      connection = await connectToDatabase();

      const query = `
        SELECT ROWID, EMPLOYEEID, EMPLOYEENAME, MODULE, HASACCESS, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED
        FROM [SYSTEM.USERACCESS.1]
        WHERE EMPLOYEEID = @employeeId
        ORDER BY MODULE
      `;

      console.log('Model: Executing query:', query.replace('@employeeId', employeeId));
      const result = await connection.request()
        .input('employeeId', employeeId)
        .query(query);

      console.log('Model: Query result recordset:', result.recordset);
      return result.recordset;
    } catch (error) {
      console.error("Model: Get access by employee error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Check if employee has access to a specific module
  async checkAccess(employeeId, module) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT HASACCESS
        FROM [SYSTEM.USERACCESS.1]
        WHERE EMPLOYEEID = @employeeId AND MODULE = @module
      `;

      const result = await connection.request()
        .input('employeeId', employeeId)
        .input('module', module)
        .query(query);

      if (result.recordset.length === 0) {
        return false;
      }

      return result.recordset[0].HASACCESS === 1 || result.recordset[0].HASACCESS === '1' || result.recordset[0].HASACCESS === true;
    } catch (error) {
      console.error("Check access error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Grant access to a module for an employee
  async grantAccess(employeeId, employeeName, module, createdBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // First check if record exists
      const existingQuery = `
        SELECT ROWID, HASACCESS
        FROM [SYSTEM.USERACCESS.1]
        WHERE EMPLOYEEID = @employeeId AND MODULE = @module
      `;

      const existingResult = await connection.request()
        .input('employeeId', employeeId)
        .input('module', module)
        .query(existingQuery);

      if (existingResult.recordset.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE [SYSTEM.USERACCESS.1]
          SET HASACCESS = 1, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
          WHERE ROWID = @rowId
        `;

        await connection.request()
          .input('modifiedBy', createdBy)
          .input('rowId', existingResult.recordset[0].ROWID)
          .query(updateQuery);

        return { success: true, message: "Access granted successfully", action: "updated" };
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO [SYSTEM.USERACCESS.1]
          (EMPLOYEEID, EMPLOYEENAME, MODULE, HASACCESS, CREATEDBY, DATECREATED)
          VALUES
          (@employeeId, @employeeName, @module, 1, @createdBy, GETDATE())
        `;

        const result = await connection.request()
          .input('employeeId', employeeId)
          .input('employeeName', employeeName)
          .input('module', module)
          .input('createdBy', createdBy)
          .query(insertQuery);

        if (result.rowsAffected[0] > 0) {
          return { success: true, message: "Access granted successfully", action: "created" };
        }
        throw new Error("Database insert failed");
      }
    } catch (error) {
      console.error("Grant access error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Revoke access from a module for an employee
  async revokeAccess(employeeId, module, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        UPDATE [SYSTEM.USERACCESS.1]
        SET HASACCESS = 0, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
        WHERE EMPLOYEEID = @employeeId AND MODULE = @module
      `;

      const result = await connection.request()
        .input('employeeId', employeeId)
        .input('module', module)
        .input('modifiedBy', modifiedBy)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Access revoked successfully" };
      } else {
        return { success: false, message: "No access record found to revoke" };
      }
    } catch (error) {
      console.error("Revoke access error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get all USERACCESS records (for admin purposes)
  async getAllAccess() {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT ROWID, EMPLOYEEID, EMPLOYEENAME, MODULE, HASACCESS, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED
        FROM [SYSTEM.USERACCESS.1]
        ORDER BY EMPLOYEEID, MODULE
      `;

      const result = await connection.request()
        .query(query);

      return result.recordset;
    } catch (error) {
      console.error("Get all access error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Update access for a specific record
  async updateAccess(rowId, hasAccess, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        UPDATE [SYSTEM.USERACCESS.1]
        SET HASACCESS = @hasAccess, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
        WHERE ROWID = @rowId
      `;

      const result = await connection.request()
        .input('hasAccess', hasAccess)
        .input('modifiedBy', modifiedBy)
        .input('rowId', rowId)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Access updated successfully" };
      } else {
        return { success: false, message: "No record found to update" };
      }
    } catch (error) {
      console.error("Update access error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Delete access record
  async deleteAccess(rowId) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        DELETE FROM [SYSTEM.USERACCESS.1]
        WHERE ROWID = @rowId
      `;

      const result = await connection.request()
        .input('rowId', rowId)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Access record deleted successfully" };
      } else {
        return { success: false, message: "No record found to delete" };
      }
    } catch (error) {
      console.error("Delete access error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get modules accessible by employee
  async getAccessibleModules(employeeId) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT MODULE
        FROM [SYSTEM.USERACCESS.1]
        WHERE EMPLOYEEID = @employeeId AND HASACCESS = 1
        ORDER BY MODULE
      `;

      const result = await connection.request()
        .input('employeeId', employeeId)
        .query(query);

      return result.recordset.map(record => record.MODULE);
    } catch (error) {
      console.error("Get accessible modules error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }
};

export default USERACCESS;
