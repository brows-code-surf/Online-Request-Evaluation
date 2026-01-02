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
          'parent' as module_type
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
          'child' as module_type
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
          'parent' as module_type
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
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'child' as module_type
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
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          IS_ACTIVE,
          'child' as module_type
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
          (PARENTNAME, CHILDNAME, LINK, DESCRIPTION, ICON, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
          VALUES
          (@parentName, @childName, @link, @description, @icon, @createdBy, GETDATE(), @modifiedBy, GETDATE())
        `;

        result = await connection.request()
          .input('parentName', moduleData.submodule)
          .input('childName', moduleData.submodulename)
          .input('link', moduleData.module)
          .input('description', moduleData.description || null)
          .input('icon', moduleData.icon || null)
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
          .input('parentName', moduleData.name)
          .input('link', moduleData.module)
          .input('description', moduleData.description || null)
          .input('icon', moduleData.icon || null)
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

      // First, determine which table the module is currently in
      const parentCheckQuery = `SELECT ROWID FROM [SETTINGS.PARENTMODULE.1] WHERE ROWID = @moduleId`;
      const childCheckQuery = `SELECT ROWID FROM [SETTINGS.CHILDMODULE1.1] WHERE ROWID = @moduleId`;

      const [parentCheckResult, childCheckResult] = await Promise.all([
        connection.request().input('moduleId', moduleId).query(parentCheckQuery),
        connection.request().input('moduleId', moduleId).query(childCheckQuery)
      ]);

      const isCurrentlyParent = parentCheckResult.recordset.length > 0;
      const isCurrentlyChild = childCheckResult.recordset.length > 0;

      if (!isCurrentlyParent && !isCurrentlyChild) {
        throw new Error('Module not found');
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
            SET PARENTNAME = @parentName, CHILDNAME = @childName, LINK = @link, DESCRIPTION = @description, ICON = @icon,
            MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
            WHERE ROWID = @moduleId
          `;

          result = await connection.request()
            .input('parentName', moduleData.submodule)
            .input('childName', moduleData.submodulename)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
            .input('icon', moduleData.icon || null)
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
            (PARENTNAME, CHILDNAME, LINK, DESCRIPTION, ICON, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
            VALUES
            (@parentName, @childName, @link, @description, @icon, @createdBy, @dateCreated, @modifiedBy, GETDATE())
          `;

          result = await connection.request()
            .input('parentName', moduleData.submodule)
            .input('childName', moduleData.submodulename)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
            .input('icon', moduleData.icon || null)
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
            .input('parentName', moduleData.name)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
            .input('icon', moduleData.icon || null)
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
            .input('parentName', moduleData.name)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
            .input('icon', moduleData.icon || null)
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
