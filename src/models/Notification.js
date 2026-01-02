import connectToDatabase from "../lib/db.js";
import { notifyUserUpdate } from "../lib/socketBroadcast.js";

export class Notification {
  constructor(title, description, recipient, url = null) {
    this.title = title;
    this.description = description;
    this.recipient = recipient;
    this.url = url;
    this.createdBy = null;
    this.dateCreated = new Date().toISOString();
    this.isRead = false;
    this.dateRead = null;
    this.rowId = null;
  }

  static async checkTableExists(connection, tableName) {
    try {
      const query = `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName`;
      const result = await connection.request()
        .input('tableName', tableName)
        .query(query);
      return result.recordset.length > 0;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  async save(createdBy) {
    // Validate input data before attempting to save
    this.validateData(createdBy);

    this.createdBy = createdBy;
    let connection;
    try {
      console.log(`Attempting to save notification:`, {
        title: this.title,
        recipient: this.recipient,
        createdBy: this.createdBy,
        dbName: process.env.DB_NAME
      });

      connection = await connectToDatabase(process.env.DB_NAME);

      // Check if notification table exists
      const tableExists = await Notification.checkTableExists(connection, 'SYSTEM.NOTIFICATION.1');
      if (!tableExists) {
        console.error('Notification table SYSTEM.NOTIFICATION.1 does not exist in database:', process.env.DB_NAME);
        throw new Error(`Notification table SYSTEM.NOTIFICATION.1 does not exist in database ${process.env.DB_NAME}`);
      }

      const query = `
        INSERT INTO [SYSTEM.NOTIFICATION.1]
        (TITLE, DESCRIPTION, RECIPIENT, CREATEDBY, DATECREATED,  URL, IS_READ, DATEREAD)
        VALUES
        (@title, @description, @recipient, @createdBy, GETDATE(), @url, @isRead, @dateRead)
      `;

      const request = connection.request()
        .input('title', this.title)
        .input('description', this.description)
        .input('recipient', this.recipient)
        .input('createdBy', this.createdBy)
        .input('url', this.url)
        .input('isRead', this.isRead ? 1 : 0)
        .input('dateRead', this.dateRead);

      const result = await request.query(query);

      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        // Get the inserted ROWID using SCOPE_IDENTITY()
        const identityQuery = `SELECT SCOPE_IDENTITY() as rowId`;
        const identityResult = await connection.request().query(identityQuery);

        if (identityResult.recordset && identityResult.recordset.length > 0) {
          this.rowId = identityResult.recordset[0].rowId;
        } else {
          console.warn('Could not retrieve SCOPE_IDENTITY() after notification insert');
          this.rowId = null;
        }

        console.log(`Notification saved successfully with ID: ${this.rowId}`);

        // Broadcast the new notification to the recipient
        try {
          notifyUserUpdate(this.recipient, 'new-notification', {
            id: this.rowId,
            title: this.title,
            description: this.description,
            createdBy: this.createdBy,
            dateCreated: this.dateCreated,
            url: this.url,
            isRead: this.isRead,
            dateRead: this.dateRead
          });
          console.log(`Notification broadcast sent to recipient: ${this.recipient}`);
        } catch (broadcastError) {
          console.error('Error broadcasting notification:', broadcastError);
          // Don't fail the save if broadcast fails
        }

        return {
          success: true,
          rowId: this.rowId,
          message: "Notification created successfully"
        };
      }

      console.error('Database insert failed - no rows affected');
      throw new Error("Database insert failed - no rows were affected");

    } catch (error) {
      console.error("Notification save error:", {
        error: error.message,
        stack: error.stack,
        notificationData: {
          title: this.title,
          description: this.description,
          recipient: this.recipient,
          createdBy: this.createdBy,
          url: this.url
        }
      });
      throw new Error(`Failed to save notification: ${error.message}`);
    }
  }

  validateData(createdBy) {
    if (!this.title || typeof this.title !== 'string' || this.title.trim().length === 0) {
      throw new Error('Notification title is required and must be a non-empty string');
    }

    if (!this.description || typeof this.description !== 'string' || this.description.trim().length === 0) {
      throw new Error('Notification description is required and must be a non-empty string');
    }

    if (!this.recipient || typeof this.recipient !== 'string' || this.recipient.trim().length === 0) {
      throw new Error('Notification recipient is required and must be a non-empty string');
    }

    if (!createdBy || typeof createdBy !== 'string' || createdBy.trim().length === 0) {
      throw new Error('CreatedBy parameter is required and must be a non-empty string');
    }

    // Trim whitespace from strings
    this.title = this.title.trim();
    this.description = this.description.trim();
    this.recipient = this.recipient.trim();
  }

  async markAsRead() {
    if (!this.rowId) {
      throw new Error("Notification must be saved before marking as read");
    }

    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        UPDATE [SYSTEM.NOTIFICATION.1]
        SET IS_READ = 1, DATEREAD = GETDATE()
        WHERE ROWID = @rowId
      `;

      const result = await connection.request()
        .input('rowId', this.rowId)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        this.isRead = true;
        this.dateRead = new Date();
        return {
          success: true,
          message: "Notification marked as read"
        };
      }
      throw new Error("Notification not found or already read");

    } catch (error) {
      console.error("Mark as read error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }

  static async getByRecipient(recipient, limit = 50) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        SELECT ROWID, TITLE, DESCRIPTION, RECIPIENT, CREATEDBY, 
               CONVERT(VARCHAR(30), DATECREATED, 121) AS DATECREATED,
               URL, IS_READ, 
               CONVERT(VARCHAR(30), DATEREAD, 121) AS DATEREAD
        FROM [SYSTEM.NOTIFICATION.1]
        WHERE RECIPIENT = @recipient
        ORDER BY DATECREATED DESC
        OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
      `;

      const result = await connection.request()
        .input('recipient', recipient)
        .input('limit', limit)
        .query(query);

      return result.recordset.map(row => {
        const notification = new Notification(row.TITLE, row.DESCRIPTION, row.RECIPIENT, row.URL);
        notification.rowId = row.ROWID;
        notification.createdBy = row.CREATEDBY;
        // Convert datetime to ISO string, treating as UTC
        notification.dateCreated = row.DATECREATED ? (typeof row.DATECREATED === 'string' ? row.DATECREATED : new Date(row.DATECREATED).toISOString()) : new Date().toISOString();
        notification.isRead = row.IS_READ === 1;
        notification.dateRead = row.DATEREAD ? (typeof row.DATEREAD === 'string' ? row.DATEREAD : new Date(row.DATEREAD).toISOString()) : null;
        return notification;
      });

    } catch (error) {
      console.error("Get notifications error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }

  static async getUnreadCount(recipient) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        SELECT COUNT(*) as count
        FROM [SYSTEM.NOTIFICATION.1]
        WHERE RECIPIENT = @recipient AND IS_READ = 0
      `;

      const result = await connection.request()
        .input('recipient', recipient)
        .query(query);

      return result.recordset[0].count;

    } catch (error) {
      console.error("Get unread count error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }

  // Get notification by rowId
  static async getById(rowId) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        SELECT ROWID, TITLE, DESCRIPTION, RECIPIENT, CREATEDBY, 
               CONVERT(VARCHAR(30), DATECREATED, 121) AS DATECREATED,
               URL, IS_READ, 
               CONVERT(VARCHAR(30), DATEREAD, 121) AS DATEREAD
        FROM [SYSTEM.NOTIFICATION.1]
        WHERE ROWID = @rowId
      `;

      const result = await connection.request()
        .input('rowId', rowId)
        .query(query);

      if (result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];
      const notification = new Notification(row.TITLE, row.DESCRIPTION, row.RECIPIENT, row.URL);
      notification.rowId = row.ROWID;
      notification.createdBy = row.CREATEDBY;
      // Convert datetime to ISO string, treating as UTC
      notification.dateCreated = row.DATECREATED ? (typeof row.DATECREATED === 'string' ? row.DATECREATED : new Date(row.DATECREATED).toISOString()) : new Date().toISOString();
      notification.isRead = row.IS_READ === 1;
      notification.dateRead = row.DATEREAD ? (typeof row.DATEREAD === 'string' ? row.DATEREAD : new Date(row.DATEREAD).toISOString()) : null;

      return notification;

    } catch (error) {
      console.error("Get notification by ID error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }
}

export default Notification;
