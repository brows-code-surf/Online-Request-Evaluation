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
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          1 as IS_ACTIVE,
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
          CREATEDBY,
          DATECREATED,
          MODIFIEDBY,
          DATEMODIFIED,
          1 as IS_ACTIVE,
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

      // Get parent modules (assuming all are active since no IS_ACTIVE column)
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
          1 as IS_ACTIVE,
          'parent' as module_type
        FROM [SETTINGS.PARENTMODULE.1]
      `;

      // Get child modules (assuming all are active since no IS_ACTIVE column)
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
          1 as IS_ACTIVE,
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
          1 as IS_ACTIVE,
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
          1 as IS_ACTIVE,
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
          1 as IS_ACTIVE,
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
          1 as IS_ACTIVE,
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

      // Check if module identifier already exists in both tables
      const parentCheckQuery = `SELECT ROWID FROM [SETTINGS.PARENTMODULE.1] WHERE LINK = @moduleIdentifier`;
      const childCheckQuery = `SELECT ROWID FROM [SETTINGS.CHILDMODULE1.1] WHERE LINK = @moduleIdentifier`;

      const [parentCheckResult, childCheckResult] = await Promise.all([
        connection.request().input('moduleIdentifier', moduleData.module).query(parentCheckQuery),
        connection.request().input('moduleIdentifier', moduleData.module).query(childCheckQuery)
      ]);

      if (parentCheckResult.recordset.length > 0 || childCheckResult.recordset.length > 0) {
        throw new Error('Module identifier already exists');
      }

      let insertQuery, result;

      if (isChildModule) {
        // Insert child module
        insertQuery = `
          INSERT INTO [SETTINGS.CHILDMODULE1.1]
          (PARENTNAME, CHILDNAME, LINK, DESCRIPTION, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
          VALUES
          (@parentName, @childName, @link, @description, @createdBy, GETDATE(), @modifiedBy, GETDATE())
        `;

        result = await connection.request()
          .input('parentName', moduleData.submodule)
          .input('childName', moduleData.submodulename)
          .input('link', moduleData.module)
          .input('description', moduleData.description || null)
          .input('createdBy', createdBy)
          .input('modifiedBy', createdBy)
          .query(insertQuery);
      } else {
        // Insert parent module
        insertQuery = `
          INSERT INTO [SETTINGS.PARENTMODULE.1]
          (PARENTNAME, LINK, DESCRIPTION, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
          VALUES
          (@parentName, @link, @description, @createdBy, GETDATE(), @modifiedBy, GETDATE())
        `;

        result = await connection.request()
          .input('parentName', moduleData.name)
          .input('link', moduleData.module)
          .input('description', moduleData.description || null)
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

      // Check if module identifier already exists in both tables (excluding current module)
      const parentDupCheckQuery = `SELECT ROWID FROM [SETTINGS.PARENTMODULE.1] WHERE LINK = @moduleIdentifier AND ROWID != @moduleId`;
      const childDupCheckQuery = `SELECT ROWID FROM [SETTINGS.CHILDMODULE1.1] WHERE LINK = @moduleIdentifier AND ROWID != @moduleId`;

      const [parentDupResult, childDupResult] = await Promise.all([
        connection.request().input('moduleIdentifier', moduleData.module).input('moduleId', moduleId).query(parentDupCheckQuery),
        connection.request().input('moduleIdentifier', moduleData.module).input('moduleId', moduleId).query(childDupCheckQuery)
      ]);

      if (parentDupResult.recordset.length > 0 || childDupResult.recordset.length > 0) {
        throw new Error('Module identifier already exists');
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
            SET PARENTNAME = @parentName, CHILDNAME = @childName, LINK = @link, DESCRIPTION = @description,
            MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
            WHERE ROWID = @moduleId
          `;

          result = await connection.request()
            .input('parentName', moduleData.submodule)
            .input('childName', moduleData.submodulename)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
            .input('modifiedBy', modifiedBy)
            .input('moduleId', moduleId)
            .query(updateQuery);
        } else {
          // Convert parent module to child module (move to child table)
          // First, get the current parent module data
          const getParentQuery = `
            SELECT PARENTNAME, LINK, DESCRIPTION, CREATEDBY, DATECREATED
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
            (PARENTNAME, CHILDNAME, LINK, DESCRIPTION, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
            VALUES
            (@parentName, @childName, @link, @description, @createdBy, @dateCreated, @modifiedBy, GETDATE())
          `;

          result = await connection.request()
            .input('parentName', moduleData.submodule)
            .input('childName', moduleData.submodulename)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
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
            SET PARENTNAME = @parentName, LINK = @link, DESCRIPTION = @description,
            MODIFIEDBY = @modifiedBy, DATEMODIFIED = GETDATE()
            WHERE ROWID = @moduleId
          `;

          result = await connection.request()
            .input('parentName', moduleData.name)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
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
            (PARENTNAME, LINK, DESCRIPTION, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
            VALUES
            (@parentName, @link, @description, @createdBy, @dateCreated, @modifiedBy, GETDATE())
          `;

          result = await connection.request()
            .input('parentName', moduleData.name)
            .input('link', moduleData.module)
            .input('description', moduleData.description || null)
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

  // Deactivate module (not supported in new table structure - all modules are active)
  async deactivateModule(moduleId, modifiedBy) {
    return { success: false, message: "Module deactivation is not supported in the current system configuration" };
  },

  // Activate module (not supported in new table structure - all modules are active)
  async activateModule(moduleId, modifiedBy) {
    return { success: false, message: "Module activation is not supported in the current system configuration" };
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
  }
};

export default MODULE;
