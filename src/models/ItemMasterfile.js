import connectToDatabase from "../lib/db.js";

export const ITEM_MASTERFILE = {
  // Get all items
  async getAllItems() {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const query = `
        SELECT
          ITEMNMBR,
          ITEMDESC,
          LOCNCODE,
          ACTIVE,
          DATEMODIFIED,
          MODIFIEDBY,
          CREATDDT,
          CREATEDBY
        FROM IV00101
        ORDER BY ITEMNMBR
      `;

      const result = await connection.request().query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get all items error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Get item by item number
  async getItemByNumber(itemNumber) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const query = `
        SELECT
          ITEMNMBR,
          ITEMDESC,
          LOCNCODE,
          ACTIVE,
          DATEMODIFIED,
          MODIFIEDBY,
          CREATDDT,
          CREATEDBY
        FROM IV00101
        WHERE ITEMNMBR = @itemNumber
      `;

      const result = await connection.request()
        .input('itemNumber', itemNumber)
        .query(query);

      if (result.recordset.length === 0) {
        throw new Error('Item not found');
      }

      return result.recordset[0];
    } catch (error) {
      console.error("Get item by number error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Add new item
  async addItem(itemData, createdBy) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      // Check if item already exists
      const checkQuery = `SELECT COUNT(*) as count FROM IV00101 WHERE ITEMNMBR = @itemNumber`;
      const checkResult = await connection.request()
        .input('itemNumber', itemData.itemNumber)
        .query(checkQuery);

      if (checkResult.recordset[0].count > 0) {
        throw new Error('Item number already exists');
      }

      const insertQuery = `
        INSERT INTO IV00101
        (ITEMNMBR, ITEMDESC, LOCNCODE, CREATDDT, CREATEDBY, DATEMODIFIED, MODIFIEDBY)
        VALUES
        (@itemNumber, @itemDesc, 'HEAD OFFICE', GETDATE(), @createdBy, GETDATE(), @modifiedBy)
      `;

      const result = await connection.request()
        .input('itemNumber', itemData.itemNumber)
        .input('itemDesc', itemData.itemDesc || null)
        .input('locationCode', itemData.locationCode || null)
        .input('createdBy', createdBy)
        .input('modifiedBy', createdBy)
        .query(insertQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Item added successfully" };
      }
      throw new Error("Database insert failed");
    } catch (error) {
      console.error("Add item error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Update item
  async updateItem(itemNumber, itemData, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const updateQuery = `
        UPDATE IV00101
        SET ITEMDESC = @itemDesc,
            LOCNCODE = @locationCode,
            DATEMODIFIED = GETDATE(),
            MODIFIEDBY = @modifiedBy
        WHERE ITEMNMBR = @itemNumber
      `;

      const result = await connection.request()
        .input('itemNumber', itemNumber)
        .input('itemDesc', itemData.itemDesc || null)
        .input('locationCode', itemData.locationCode || null)
        .input('modifiedBy', modifiedBy)
        .query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Item updated successfully" };
      } else {
        return { success: false, message: "No item found to update" };
      }
    } catch (error) {
      console.error("Update item error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Delete item
  async deleteItem(itemNumber) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const deleteQuery = `DELETE FROM IV00101 WHERE ITEMNMBR = @itemNumber`;

      const result = await connection.request()
        .input('itemNumber', itemNumber)
        .query(deleteQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Item deleted successfully" };
      } else {
        return { success: false, message: "No item found to delete" };
      }
    } catch (error) {
      console.error("Delete item error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Check if item exists
  async itemExists(itemNumber) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const query = `SELECT COUNT(*) as count FROM IV00101 WHERE ITEMNMBR = @itemNumber`;

      const result = await connection.request()
        .input('itemNumber', itemNumber)
        .query(query);

      return result.recordset[0].count > 0;
    } catch (error) {
      console.error("Check item exists error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Search items
  async searchItems(searchTerm) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const query = `
        SELECT
          ITEMNMBR,
          ITEMDESC,
          UOMSCHDL,
          LOCNCODE,
          ACTIVE,
          DATEMODIFIED,
          MODIFIEDBY,
          CREATDDT,
          CREATEDBY
        FROM IV00101
        WHERE ITEMNMBR LIKE @searchTerm
           OR ITEMDESC LIKE @searchTerm
           OR LOCNCODE LIKE @searchTerm
        ORDER BY ITEMNMBR
      `;

      const result = await connection.request()
        .input('searchTerm', `%${searchTerm}%`)
        .query(query);

      return result.recordset;
    } catch (error) {
      console.error("Search items error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Activate item
  async activateItem(itemNumber, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const updateQuery = `
        UPDATE IV00101
        SET ACTIVE = 1,
            DATEMODIFIED = GETDATE(),
            MODIFIEDBY = @modifiedBy
        WHERE ITEMNMBR = @itemNumber
      `;

      const result = await connection.request()
        .input('itemNumber', itemNumber)
        .input('modifiedBy', modifiedBy)
        .query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Item activated successfully" };
      } else {
        return { success: false, message: "No item found to activate" };
      }
    } catch (error) {
      console.error("Activate item error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  // Deactivate item
  async deactivateItem(itemNumber, modifiedBy) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_SFC);

      const updateQuery = `
        UPDATE IV00101
        SET ACTIVE = 0,
            DATEMODIFIED = GETDATE(),
            MODIFIEDBY = @modifiedBy
        WHERE ITEMNMBR = @itemNumber
      `;

      const result = await connection.request()
        .input('itemNumber', itemNumber)
        .input('modifiedBy', modifiedBy)
        .query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        return { success: true, message: "Item deactivated successfully" };
      } else {
        return { success: false, message: "No item found to deactivate" };
      }
    } catch (error) {
      console.error("Deactivate item error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }
};

export default ITEM_MASTERFILE;
