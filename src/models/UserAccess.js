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
  },

  // Add new user to the system
  async addUserToConfirmBy(locnCode, confirmName, active = 1) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Check if user already exists
      const checkQuery = `
        SELECT ROWID, LOCNCODE, CONFIRMNAME, ACTIVE
        FROM [SETTINGS.CONFIRMBY.1]
        WHERE LOCNCODE = @locnCode AND CONFIRMNAME = @confirmName
      `;

      const checkResult = await connection.request()
        .input('locnCode', locnCode)
        .input('confirmName', confirmName)
        .query(checkQuery);

      if (checkResult.recordset.length > 0) {
        const existingUser = checkResult.recordset[0];
        // If user exists but is inactive, activate them
        if (existingUser.ACTIVE === 0 || existingUser.ACTIVE === '0') {
          const activateQuery = `
            UPDATE [SETTINGS.CONFIRMBY.1]
            SET ACTIVE = @active
            WHERE ROWID = @rowId
          `;

          const activateResult = await connection.request()
            .input('active', active)
            .input('rowId', existingUser.ROWID)
            .query(activateQuery);

          if (activateResult.rowsAffected[0] > 0) {
            return { success: true, message: "User activated successfully" };
          } else {
            return { success: false, message: "Failed to activate user" };
          }
        } else {
          // User already exists and is active
          return { success: true, message: "User is already active as a Purchase Order Confirmation Officer" };
        }
      }

      // Insert new user
      const insertQuery = `
        INSERT INTO [SETTINGS.CONFIRMBY.1]
        (LOCNCODE, CONFIRMNAME, ACTIVE)
        VALUES
        (@locnCode, @confirmName, @active)
      `;

      const result = await connection.request()
        .input('locnCode', locnCode)
        .input('confirmName', confirmName)
        .input('active', active)
        .query(insertQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "User added successfully" };
      } else {
        return { success: false, message: "Failed to add user" };
      }
    } catch (error) {
      console.error("Add user error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get confirm by users for a specific user
  async getConfirmByUsersForUser(confirmName) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT ROWID, LOCNCODE, CONFIRMNAME, ACTIVE
        FROM [SETTINGS.CONFIRMBY.1]
        WHERE CONFIRMNAME = @confirmName
        ORDER BY CONFIRMNAME
      `;

      const result = await connection.request()
        .input('confirmName', confirmName)
        .query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get confirm by users for user error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Update user status
  async updateUserStatus(rowId, active) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        UPDATE [SETTINGS.CONFIRMBY.1]
        SET ACTIVE = @active
        WHERE ROWID = @rowId
      `;

      const result = await connection.request()
        .input('rowId', rowId)
        .input('active', active)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "User status updated successfully" };
      } else {
        return { success: false, message: "No user found to update" };
      }
    } catch (error) {
      console.error("Update user status error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Add new user to the APPROVEBY table
  async addUserToApproveBy(locnCode, approveName, active = 1) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Check if user already exists
      const checkQuery = `
        SELECT ROWID
        FROM [SETTINGS.APPROVEBY.1]
        WHERE LOCNCODE = @locnCode AND APPROVENAME = @approveName
      `;

      const checkResult = await connection.request()
        .input('locnCode', locnCode)
        .input('approveName', approveName)
        .query(checkQuery);

      if (checkResult.recordset.length > 0) {
        return { success: false, message: "User already exists with this location code and name" };
      }

      // Insert new user
      const insertQuery = `
        INSERT INTO [SETTINGS.APPROVEBY.1]
        (LOCNCODE, APPROVENAME, ACTIVE)
        VALUES
        (@locnCode, @approveName, @active)
      `;

      const result = await connection.request()
        .input('locnCode', locnCode)
        .input('approveName', approveName)
        .input('active', active)
        .query(insertQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "User added successfully" };
      } else {
        return { success: false, message: "Failed to add user" };
      }
    } catch (error) {
      console.error("Add user to approve by error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get all users from APPROVEBY table
  async getAllApproveByUsers() {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT ROWID, LOCNCODE, APPROVENAME, ACTIVE
        FROM [SETTINGS.APPROVEBY.1]
        ORDER BY APPROVENAME
      `;

      const result = await connection.request().query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get all approve by users error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get users from APPROVEBY table for a specific user
  async getApproveByUsersForUser(approveName) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT ROWID, LOCNCODE, APPROVENAME, ACTIVE
        FROM [SETTINGS.APPROVEBY.1]
        WHERE APPROVENAME = @approveName
        ORDER BY LOCNCODE
      `;

      const result = await connection.request()
        .input('approveName', approveName)
        .query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get approve by users for user error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Update user status in APPROVEBY table
  async updateApproveByUserStatus(rowId, active) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        UPDATE [SETTINGS.APPROVEBY.1]
        SET ACTIVE = @active
        WHERE ROWID = @rowId
      `;

      const result = await connection.request()
        .input('rowId', rowId)
        .input('active', active)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "User status updated successfully" };
      } else {
        return { success: false, message: "No user found to update" };
      }
    } catch (error) {
      console.error("Update approve by user status error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get accessible modules with child module information
  async getAccessibleModulesWithChildren(employeeId) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Get user's accessible modules
      const accessQuery = `
        SELECT ua.MODULE, ua.HASACCESS, ua.CREATEDBY, ua.DATECREATED
        FROM [SYSTEM.USERACCESS.1] ua
        WHERE ua.EMPLOYEEID = @employeeId AND ua.HASACCESS = 1
      `;

      const accessResult = await connection.request()
        .input('employeeId', employeeId)
        .query(accessQuery);

      const accessibleModuleIds = accessResult.recordset.map(record => record.MODULE);

      if (accessibleModuleIds.length === 0) {
        return [];
      }

      // Get module details for accessible modules
      const modulesQuery = `
        SELECT
          m.module_id,
          m.module_name,
          m.module_link,
          m.parent_name,
          m.description,
          m.module_type,
          m.is_active,
          m.icon,
          ua.CREATEDBY as access_granted_by,
          ua.DATECREATED as access_granted_date
        FROM (
          -- Parent modules
          SELECT
            LINK as module_id,
            PARENTNAME as module_name,
            '/' + LINK as module_link,
            NULL as parent_name,
            DESCRIPTION as description,
            'parent' as module_type,
            IS_ACTIVE as is_active,
            ICON as icon
          FROM [SETTINGS.PARENTMODULE.1]
          WHERE LINK IN (${accessibleModuleIds.map((_, i) => `@module${i}`).join(',')})

          UNION ALL

          -- Child modules
          SELECT
            LINK as module_id,
            CHILDNAME as module_name,
            '/' + LINK as module_link,
            PARENTNAME as parent_name,
            DESCRIPTION as description,
            'child' as module_type,
            IS_ACTIVE as is_active,
            ICON as icon
          FROM [SETTINGS.CHILDMODULE1.1]
          WHERE LINK IN (${accessibleModuleIds.map((_, i) => `@module${i}`).join(',')})
        ) m
        INNER JOIN [SYSTEM.USERACCESS.1] ua ON ua.MODULE = m.module_id AND ua.EMPLOYEEID = @employeeId AND ua.HASACCESS = 1
        WHERE m.is_active = 1
        ORDER BY
          CASE WHEN m.parent_name IS NULL THEN 0 ELSE 1 END,
          m.parent_name,
          m.module_type DESC,
          m.module_name
      `;

      // Prepare the request with all module parameters
      const request = connection.request().input('employeeId', employeeId);
      accessibleModuleIds.forEach((moduleId, index) => {
        request.input(`module${index}`, moduleId);
      });

      const modulesResult = await request.query(modulesQuery);

      return modulesResult.recordset;
    } catch (error) {
      console.error("Get accessible modules with children error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Grant access to parent module and all its child modules
  async grantAccessWithChildren(employeeId, employeeName, parentModule, createdBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Start a transaction
      const transaction = connection.transaction();
      await transaction.begin();

      try {
        // Get all child modules for this parent
        const childQuery = `
          SELECT LINK, CHILDNAME
          FROM [SETTINGS.CHILDMODULE1.1]
          WHERE PARENTNAME = @parentModule AND IS_ACTIVE = 1
        `;

        const childResult = await transaction.request()
          .input('parentModule', parentModule)
          .query(childQuery);

        const childModules = childResult.recordset;

        // Grant access to parent module
        await this._grantAccessInTransaction(transaction, employeeId, employeeName, parentModule, createdBy);

        // Grant access to all child modules
        for (const child of childModules) {
          await this._grantAccessInTransaction(transaction, employeeId, employeeName, child.LINK, createdBy);
        }

        await transaction.commit();

        return {
          success: true,
          message: `Access granted to parent module and ${childModules.length} child modules`,
          childModulesCount: childModules.length
        };

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error("Grant access with children error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Helper function for granting access within a transaction
  async _grantAccessInTransaction(transaction, employeeId, employeeName, module, createdBy) {
    // First check if record exists
    const existingQuery = `
      SELECT ROWID, HASACCESS
      FROM [SYSTEM.USERACCESS.1]
      WHERE EMPLOYEEID = @employeeId AND MODULE = @module
    `;

    const existingResult = await transaction.request()
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

      await transaction.request()
        .input('modifiedBy', createdBy)
        .input('rowId', existingResult.recordset[0].ROWID)
        .query(updateQuery);
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO [SYSTEM.USERACCESS.1]
        (EMPLOYEEID, EMPLOYEENAME, MODULE, HASACCESS, CREATEDBY, DATECREATED)
        VALUES
        (@employeeId, @employeeName, @module, 1, @createdBy, GETDATE())
      `;

      await transaction.request()
        .input('employeeId', employeeId)
        .input('employeeName', employeeName)
        .input('module', module)
        .input('createdBy', createdBy)
        .query(insertQuery);
    }
  },

  // Revoke access from parent module and all its child modules
  async revokeAccessWithChildren(employeeId, parentModule, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Start a transaction
      const transaction = connection.transaction();
      await transaction.begin();

      try {
        // Get all child modules for this parent
        const childQuery = `
          SELECT LINK
          FROM [SETTINGS.CHILDMODULE1.1]
          WHERE PARENTNAME = @parentModule AND IS_ACTIVE = 1
        `;

        const childResult = await transaction.request()
          .input('parentModule', parentModule)
          .query(childQuery);

        const childModules = childResult.recordset;

        // Revoke access from parent module
        await this._revokeAccessInTransaction(transaction, employeeId, parentModule, modifiedBy);

        // Revoke access from all child modules
        for (const child of childModules) {
          await this._revokeAccessInTransaction(transaction, employeeId, child.LINK, modifiedBy);
        }

        await transaction.commit();

        return {
          success: true,
          message: `Access revoked from parent module and ${childModules.length} child modules`,
          childModulesCount: childModules.length
        };

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error("Revoke access with children error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Helper function for revoking access within a transaction
  async _revokeAccessInTransaction(transaction, employeeId, module, modifiedBy) {
    const query = `
      UPDATE [SYSTEM.USERACCESS.1]
      SET HASACCESS = 0, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
      WHERE EMPLOYEEID = @employeeId AND MODULE = @module
    `;

    await transaction.request()
      .input('employeeId', employeeId)
      .input('module', module)
      .input('modifiedBy', modifiedBy)
      .query(query);
  }
};

export default USERACCESS;
