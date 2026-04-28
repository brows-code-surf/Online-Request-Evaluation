import connectToDatabase from "../lib/db.js";

export const MODULE = {
  // Get all modules (combines parent and child modules)
  async getAllModules() {
    let connection;
    try {
      connection = await connectToDatabase();

      // Get parent modules
      const parentQuery = `
        SELECT
          ROWID,
          PARENTNAME as NAME,
          LINK as MODULE,
          NULL as SUBMODULE,
          DESCRIPTION,
          ICON,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'parent' as module_type,
          1 as SHOWNAV
        FROM [SETTINGS.PARENTMODULE.1]
      `;

      // Get child modules
      const childQuery = `
        SELECT
          ROWID,
          CHILDNAME as NAME,
          LINK as MODULE,
          PARENTNAME as SUBMODULE,
          DESCRIPTION,
          ICON,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'child' as module_type,
          SHOWNAV
        FROM [SETTINGS.CHILDMODULE1.1]
      `;

      const [parentResult, childResult] = await Promise.all([
        connection.request().query(parentQuery),
        connection.request().query(childQuery)
      ]);

      // Combine and sort results
      const combinedModules = [...parentResult.recordset, ...childResult.recordset]
        .sort((a, b) => a.NAME.localeCompare(b.NAME));

      return combinedModules;
    } catch (error) {
      console.error("Get all modules error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get all active modules only (combines parent and child modules)
  async getActiveModules() {
    let connection;
    try {
      connection = await connectToDatabase();

      // Get active parent modules
      const parentQuery = `
        SELECT
          ROWID,
          PARENTNAME as NAME,
          LINK as MODULE,
          NULL as SUBMODULE,
          DESCRIPTION,
          ICON,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'parent' as module_type,
          1 as SHOWNAV
        FROM [SETTINGS.PARENTMODULE.1]
        WHERE IS_ACTIVE = 1
      `;

      // Get active child modules
      const childQuery = `
        SELECT
          ROWID,
          CHILDNAME as NAME,
          LINK as MODULE,
          PARENTNAME as SUBMODULE,
          DESCRIPTION,
          ICON,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'child' as module_type,
          SHOWNAV
        FROM [SETTINGS.CHILDMODULE1.1]
        WHERE IS_ACTIVE = 1
      `;

      const [parentResult, childResult] = await Promise.all([
        connection.request().query(parentQuery),
        connection.request().query(childQuery)
      ]);

      // Combine and sort results
      const combinedModules = [...parentResult.recordset, ...childResult.recordset]
        .sort((a, b) => a.NAME.localeCompare(b.NAME));

      return combinedModules;
    } catch (error) {
      console.error("Get active modules error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get module by ID (searches both parent and child tables)
  async getModuleById(moduleId) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Try parent modules first
      const parentQuery = `
        SELECT
          ROWID,
          PARENTNAME as NAME,
          LINK as MODULE,
          NULL as SUBMODULE,
          DESCRIPTION,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'parent' as module_type
        FROM [SETTINGS.PARENTMODULE.1]
        WHERE ROWID = @moduleId
      `;

      let result = await connection.request()
        .input('moduleId', moduleId)
        .query(parentQuery);

      if (result.recordset.length > 0) {
        return result.recordset[0];
      }

      // Try child modules
      const childQuery = `
        SELECT
          ROWID,
          CHILDNAME as NAME,
          LINK as MODULE,
          PARENTNAME as SUBMODULE,
          DESCRIPTION,
          ICON,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'child' as module_type,
          SHOWNAV
        FROM [SETTINGS.CHILDMODULE1.1]
        WHERE ROWID = @moduleId
      `;

      result = await connection.request()
        .input('moduleId', moduleId)
        .query(childQuery);

      if (result.recordset.length === 0) {
        throw new Error('Module not found');
      }

      return result.recordset[0];
    } catch (error) {
      console.error("Get module by ID error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get module by module identifier (searches both parent and child tables)
  async getModuleByIdentifier(moduleIdentifier) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Try parent modules first
      const parentQuery = `
        SELECT
          ROWID,
          PARENTNAME as NAME,
          LINK as MODULE,
          NULL as SUBMODULE,
          DESCRIPTION,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'parent' as module_type
        FROM [SETTINGS.PARENTMODULE.1]
        WHERE LINK = @moduleIdentifier
      `;

      let result = await connection.request()
        .input('moduleIdentifier', moduleIdentifier)
        .query(parentQuery);

      if (result.recordset.length > 0) {
        return result.recordset[0];
      }

      // Try child modules
      const childQuery = `
        SELECT
          ROWID,
          CHILDNAME as NAME,
          LINK as MODULE,
          PARENTNAME as SUBMODULE,
          DESCRIPTION,
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'child' as module_type
        FROM [SETTINGS.CHILDMODULE1.1]
        WHERE LINK = @moduleIdentifier
      `;

      result = await connection.request()
        .input('moduleIdentifier', moduleIdentifier)
        .query(childQuery);

      if (result.recordset.length === 0) {
        return null;
      }

      return result.recordset[0];
    } catch (error) {
      console.error("Get module by identifier error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Add new module
  async addModule(moduleData, createdBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Determine if this is a parent or child module
      const isChildModule = moduleData.submodule && moduleData.submodulename;

      let insertQuery, result;

      if (isChildModule) {
        // Insert child module
        insertQuery = `
          INSERT INTO [SETTINGS.CHILDMODULE1.1]
          (PARENTNAME, CHILDNAME, LINK, DESCRIPTION, ICON, SHOWNAV, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
          VALUES
          (@parentName, @childName, @link, @description, @icon, @showNav, @createdBy, GETDATE(), @modifiedBy, GETDATE())
        `;

        result = await connection.request()
          .input('parentName', ((moduleData.submodule || '').trim()).substring(0, 100))
          .input('childName', ((moduleData.submodulename || '').trim()).substring(0, 100))
          .input('link', ((moduleData.module || '').trim()).substring(0, 100))
          .input('description', moduleData.description ? ((moduleData.description.trim()).substring(0, 255)) : null)
          .input('icon', moduleData.icon ? ((moduleData.icon.trim()).substring(0, 50)) : null)
          .input('showNav', moduleData.showNav ? 1 : 0)
          .input('createdBy', createdBy)
          .input('modifiedBy', createdBy)
          .query(insertQuery);
      } else {
        // Insert parent module
        insertQuery = `
          INSERT INTO [SETTINGS.PARENTMODULE.1]
          (PARENTNAME, LINK, DESCRIPTION, ICON, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
          VALUES
          (@parentName, @link, @description, @icon, @createdBy, GETDATE(), @modifiedBy, GETDATE())
        `;

        result = await connection.request()
          .input('parentName', ((moduleData.name || '').trim()).substring(0, 100))
          .input('link', ((moduleData.module || '').trim()).substring(0, 100))
          .input('description', moduleData.description ? ((moduleData.description.trim()).substring(0, 255)) : null)
          .input('icon', moduleData.icon ? ((moduleData.icon.trim()).substring(0, 50)) : null)
          .input('createdBy', createdBy)
          .input('modifiedBy', createdBy)
          .query(insertQuery);
      }

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Module added successfully" };
      }
      throw new Error("Database insert failed");
    } catch (error) {
      console.error("Add module error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Update module
  async updateModule(moduleId, moduleData, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // First, determine which table the module is currently in and get current LINK
      let currentLink = null;
      const parentCheckQuery = `SELECT ROWID, LINK FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
      const childCheckQuery = `SELECT ROWID, LINK FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;

      const [parentCheckResult, childCheckResult] = await Promise.all([
        connection.request().input('moduleId', moduleId).query(parentCheckQuery),
        connection.request().input('moduleId', moduleId).query(childCheckQuery)
      ]);

      const isCurrentlyParent = parentCheckResult.recordset.length > 0;
      const isCurrentlyChild = childCheckResult.recordset.length > 0;

      if (!isCurrentlyParent && !isCurrentlyChild) {
        throw new Error('Module not found');
      }

      if (isCurrentlyParent) {
        currentLink = parentCheckResult.recordset[0].LINK;
      } else {
        currentLink = childCheckResult.recordset[0].LINK;
      }

      // Determine if this should be a child module based on form data
      const shouldBeChild = moduleData.submodule && moduleData.submodulename;

      let updateQuery, result;

      if (shouldBeChild) {
        // Should be a child module
        if (isCurrentlyChild) {
          // Update existing child module
          updateQuery = `
            UPDATE [SETTINGS.CHILDMODULE1.1]
            SET PARENTNAME = @parentName, CHILDNAME = @childName, LINK = @link, DESCRIPTION = @description, ICON = @icon, SHOWNAV = @showNav,
            MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
            WHERE ROWID = @moduleId
          `;

          result = await connection.request()
            .input('parentName', (moduleData.submodule || '').substring(0, 100))
            .input('childName', (moduleData.submodulename || '').substring(0, 100))
            .input('link', (moduleData.module || '').substring(0, 100))
            .input('description', moduleData.description ? (moduleData.description.substring(0, 255)) : null)
            .input('icon', moduleData.icon ? (moduleData.icon.substring(0, 50)) : null)
            .input('showNav', moduleData.showNav ? 1 : 0)
            .input('modifiedBy', modifiedBy)
            .input('moduleId', moduleId)
            .query(updateQuery);
        } else {
          // Convert parent module to child module (move to child table)
          // First, get the current parent module data
          const getParentQuery = `
            SELECT PARENTNAME, LINK, DESCRIPTION, ICON, CREATEDBY, DATECREATED
            FROM [SETTINGS.PARENTMODULE.1]
            WHERE ROWID = @moduleId
          `;

          const parentData = await connection.request()
            .input('moduleId', moduleId)
            .query(getParentQuery);

          if (parentData.recordset.length === 0) {
            throw new Error('Parent module not found');
          }

          // Insert into child table
          const insertChildQuery = `
            INSERT INTO [SETTINGS.CHILDMODULE1.1]
            (PARENTNAME, CHILDNAME, LINK, DESCRIPTION, ICON, SHOWNAV, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
            VALUES
            (@parentName, @childName, @link, @description, @icon, @showNav, @createdBy, @dateCreated, @modifiedBy, GETDATE())
          `;

          result = await connection.request()
            .input('parentName', (moduleData.submodule || '').substring(0, 100))
            .input('childName', (moduleData.submodulename || '').substring(0, 100))
            .input('link', (moduleData.module || '').substring(0, 100))
            .input('description', moduleData.description ? (moduleData.description.substring(0, 255)) : null)
            .input('icon', moduleData.icon ? (moduleData.icon.substring(0, 50)) : null)
            .input('showNav', moduleData.showNav ? 1 : 0)
            .input('createdBy', parentData.recordset[0].CREATEDBY)
            .input('dateCreated', parentData.recordset[0].DATECREATED)
            .input('modifiedBy', modifiedBy)
            .query(insertChildQuery);

          // Delete from parent table
          if (result.rowsAffected[0] > 0) {
            const deleteParentQuery = `DELETE FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
            await connection.request().input('moduleId', moduleId).query(deleteParentQuery);
          }
        }
      } else {
        // Should be a parent module
        if (isCurrentlyParent) {
          // Update existing parent module
          updateQuery = `
            UPDATE [SETTINGS.PARENTMODULE.1]
            SET PARENTNAME = @parentName, LINK = @link, DESCRIPTION = @description, ICON = @icon,
            MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
            WHERE ROWID = @moduleId
          `;

          result = await connection.request()
            .input('parentName', (moduleData.name || '').substring(0, 100))
            .input('link', (moduleData.module || '').substring(0, 100))
            .input('description', moduleData.description ? (moduleData.description.substring(0, 255)) : null)
            .input('icon', moduleData.icon ? (moduleData.icon.substring(0, 50)) : null)
            .input('modifiedBy', modifiedBy)
            .input('moduleId', moduleId)
            .query(updateQuery);
        } else {
          // Convert child module to parent module (move to parent table)
          // First, get the current child module data
          const getChildQuery = `
            SELECT CHILDNAME, LINK, DESCRIPTION, CREATEDBY, DATECREATED
            FROM [SETTINGS.CHILDMODULE1.1]
            WHERE ROWID = @moduleId
          `;

          const childData = await connection.request()
            .input('moduleId', moduleId)
            .query(getChildQuery);

          if (childData.recordset.length === 0) {
            throw new Error('Child module not found');
          }

          // Insert into parent table
          const insertParentQuery = `
            INSERT INTO [SETTINGS.PARENTMODULE.1]
            (PARENTNAME, LINK, DESCRIPTION, ICON, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
            VALUES
            (@parentName, @link, @description, @icon, @createdBy, @dateCreated, @modifiedBy, GETDATE())
          `;

          result = await connection.request()
            .input('parentName', (moduleData.name || '').substring(0, 100))
            .input('link', (moduleData.module || '').substring(0, 100))
            .input('description', moduleData.description ? (moduleData.description.substring(0, 255)) : null)
            .input('icon', moduleData.icon ? (moduleData.icon.substring(0, 50)) : null)
            .input('createdBy', childData.recordset[0].CREATEDBY)
            .input('dateCreated', childData.recordset[0].DATECREATED)
            .input('modifiedBy', modifiedBy)
            .query(insertParentQuery);

          // Delete from child table
          if (result.rowsAffected[0] > 0) {
            const deleteChildQuery = `DELETE FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;
            await connection.request().input('moduleId', moduleId).query(deleteChildQuery);
          }
        }
      }

      if (result.rowsAffected[0] > 0) {
        // Update user access records if LINK changed
        if (currentLink !== moduleData.module) {
          const updateAccessQuery = `
            UPDATE [SYSTEM.USERACCESS.1]
            SET MODULE = @newLink, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
            WHERE MODULE = @oldLink
          `;

          await connection.request()
            .input('newLink', moduleData.module)
            .input('oldLink', currentLink)
            .input('modifiedBy', modifiedBy)
            .query(updateAccessQuery);

          // Update notification URLs if LINK changed
          let notificationConnection;
          try {
            notificationConnection = await connectToDatabase('GDB');
            const updateNotificationQuery = `
              UPDATE [dbo].[SYSTEM.NOTIFICATION.1]
              SET URL = REPLACE(URL, @oldLink, @newLink)
              WHERE CHARINDEX(@oldLink, URL) > 0
            `;

            await notificationConnection.request()
              .input('newLink', moduleData.module)
              .input('oldLink', currentLink)
              .query(updateNotificationQuery);
          } finally {
            if (notificationConnection) {
              // Connection will be automatically released back to the pool
            }
          }
        }

        return { success: true, message: "Module updated successfully" };
      } else {
        return { success: false, message: "No module found to update" };
      }
    } catch (error) {
      console.error("Update module error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Deactivate module
  async deactivateModule(moduleId, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // First, determine which table the module is in
      const parentCheckQuery = `SELECT ROWID FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
      const childCheckQuery = `SELECT ROWID FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;

      const [parentCheckResult, childCheckResult] = await Promise.all([
        connection.request().input('moduleId', moduleId).query(parentCheckQuery),
        connection.request().input('moduleId', moduleId).query(childCheckQuery)
      ]);

      const isParent = parentCheckResult.recordset.length > 0;
      const isChild = childCheckResult.recordset.length > 0;

      if (!isParent && !isChild) {
        throw new Error('Module not found');
      }

      let updateQuery, result;

      if (isParent) {
        updateQuery = `
          UPDATE [SETTINGS.PARENTMODULE.1]
          SET IS_ACTIVE = 0, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
          WHERE ROWID = @moduleId
        `;
      } else {
        updateQuery = `
          UPDATE [SETTINGS.CHILDMODULE1.1]
          SET IS_ACTIVE = 0, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
          WHERE ROWID = @moduleId
        `;
      }

      result = await connection.request()
        .input('moduleId', moduleId)
        .input('modifiedBy', modifiedBy)
        .query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Module deactivated successfully" };
      } else {
        return { success: false, message: "No module found to deactivate" };
      }
    } catch (error) {
      console.error("Deactivate module error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Activate module
  async activateModule(moduleId, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // First, determine which table the module is in
      const parentCheckQuery = `SELECT ROWID FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
      const childCheckQuery = `SELECT ROWID FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;

      const [parentCheckResult, childCheckResult] = await Promise.all([
        connection.request().input('moduleId', moduleId).query(parentCheckQuery),
        connection.request().input('moduleId', moduleId).query(childCheckQuery)
      ]);

      const isParent = parentCheckResult.recordset.length > 0;
      const isChild = childCheckResult.recordset.length > 0;

      if (!isParent && !isChild) {
        throw new Error('Module not found');
      }

      let updateQuery, result;

      if (isParent) {
        updateQuery = `
          UPDATE [SETTINGS.PARENTMODULE.1]
          SET IS_ACTIVE = 1, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
          WHERE ROWID = @moduleId
        `;
      } else {
        updateQuery = `
          UPDATE [SETTINGS.CHILDMODULE1.1]
          SET IS_ACTIVE = 1, MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
          WHERE ROWID = @moduleId
        `;
      }

      result = await connection.request()
        .input('moduleId', moduleId)
        .input('modifiedBy', modifiedBy)
        .query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Module activated successfully" };
      } else {
        return { success: false, message: "No module found to activate" };
      }
    } catch (error) {
      console.error("Activate module error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Delete module permanently (removes from database)
  async deleteModule(moduleId, deletedBy) {
    let connection;
    try {
      connection = await connectToDatabase();

      // First, determine which table the module is in
      const parentCheckQuery = `SELECT ROWID FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
      const childCheckQuery = `SELECT ROWID FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;

      const [parentCheckResult, childCheckResult] = await Promise.all([
        connection.request().input('moduleId', moduleId).query(parentCheckQuery),
        connection.request().input('moduleId', moduleId).query(childCheckQuery)
      ]);

      const isParent = parentCheckResult.recordset.length > 0;
      const isChild = childCheckResult.recordset.length > 0;

      if (!isParent && !isChild) {
        throw new Error('Module not found');
      }

      let deleteQuery, result;

      if (isParent) {
        deleteQuery = `DELETE FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
      } else {
        deleteQuery = `DELETE FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;
      }

      result = await connection.request()
        .input('moduleId', moduleId)
        .query(deleteQuery);

      if (result.rowsAffected[0] > 0) {
        // Log the deletion in activity logs (optional - don't fail if logging fails)
        try {
          const activityQuery = `
            INSERT INTO [ACTIVITY.LOGS.1] (ACTIVITY, CREATEDBY, DATECREATED)
            VALUES (@activity, @deletedBy, GETDATE())
          `;
          await connection.request()
            .input('activity', `Module deleted by ${deletedBy}`)
            .input('deletedBy', deletedBy)
            .query(activityQuery);
        } catch (logError) {
          console.warn('Failed to log module deletion activity:', logError.message);
          // Continue with success since the main operation succeeded
        }

        return { success: true, message: "Module deleted successfully" };
      } else {
        return { success: false, message: "No module found to delete" };
      }
    } catch (error) {
      console.error("Delete module error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Check if module exists (searches both parent and child tables)
  async moduleExists(moduleIdentifier) {
    let connection;
    try {
      connection = await connectToDatabase();

      const parentQuery = `SELECT COUNT(*) as count FROM [SETTINGS.PARENTMODULE.1] WHERE LINK = @moduleIdentifier`;
      const childQuery = `SELECT COUNT(*) as count FROM [SETTINGS.CHILDMODULE1.1] WHERE LINK = @moduleIdentifier`;

      const [parentResult, childResult] = await Promise.all([
        connection.request().input('moduleIdentifier', moduleIdentifier).query(parentQuery),
        connection.request().input('moduleIdentifier', moduleIdentifier).query(childQuery)
      ]);

      return (parentResult.recordset[0].count > 0 || childResult.recordset[0].count > 0);
    } catch (error) {
      console.error("Check module exists error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get distinct parent modules from child modules table
  async getDistinctParentModules() {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT DISTINCT
          PARENTNAME as name,
          PARENTNAME as identifier
        FROM [SETTINGS.CHILDMODULE1.1]
        WHERE IS_ACTIVE = 1
        ORDER BY PARENTNAME
      `;

      const result = await connection.request().query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get distinct parent modules error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }
};

export default MODULE;
