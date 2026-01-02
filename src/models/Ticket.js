import connectToDatabase from "../lib/db.js";

export class TicketModel {
  async getAllTickets(filters = {}, user = null) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      let query = `
        SELECT
          ROWID,
          SUBJECT,
          DESCRIPTION,
          CATEGORY,
          STATUS,
          DATECREATED,
          DATEMODIFIED,
          CREATEDBY
        FROM [SYSTEM.TICKET.1]
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // If user is provided and not an admin, filter to show only their tickets
      if (user) {
        const isAdmin = user.department && user.department.trim().toUpperCase() === 'MIS';
        if (!isAdmin) {
          query += ` AND UPPER(CREATEDBY) = UPPER(@createdBy${paramIndex})`;
          params.push({ name: `createdBy${paramIndex}`, value: user.empName });
          paramIndex++;
        }
      }

      if (filters.status) {
        query += ` AND STATUS = @status${paramIndex}`;
        params.push({ name: `status${paramIndex}`, value: filters.status });
        paramIndex++;
      }

      if (filters.category) {
        query += ` AND CATEGORY = @category${paramIndex}`;
        params.push({ name: `category${paramIndex}`, value: filters.category });
        paramIndex++;
      }

      if (filters.subject) {
        query += ` AND SUBJECT LIKE @subject${paramIndex}`;
        params.push({ name: `subject${paramIndex}`, value: `%${filters.subject}%` });
        paramIndex++;
      }

      query += ` ORDER BY DATEMODIFIED DESC, DATECREATED DESC`;

      const request = connection.request();
      params.forEach(param => request.input(param.name, param.value));

      const result = await request.query(query);
      return result.recordset.map(record => ({
        id: record.ROWID,
        subject: record.SUBJECT,
        description: record.DESCRIPTION,
        category: record.CATEGORY,
        status: record.STATUS,
        dateCreated: record.DATECREATED,
        dateModified: record.DATEMODIFIED,
        createdBy: record.CREATEDBY
      }));
    } catch (error) {
      console.error("Get all tickets error:", error);
      throw new Error('Failed to fetch tickets: ' + error.message);
    }
  }

  async getTicketById(ticketId, user = null) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      let query = `
        SELECT
          ROWID,
          SUBJECT,
          DESCRIPTION,
          CATEGORY,
          STATUS,
          DATECREATED,
          DATEMODIFIED,
          CREATEDBY
        FROM [SYSTEM.TICKET.1]
        WHERE ROWID = @ticketId
      `;

      const params = [];
      let paramIndex = 1;

      // If user is provided and not an admin, they can only access tickets they created
      if (user) {
        const isAdmin = user.department && user.department.trim().toUpperCase() === 'MIS';
        if (!isAdmin) {
          console.log(`Non-admin user ${user.empName} trying to access ticket ${ticketId} - checking ownership`);
          query += ` AND UPPER(CREATEDBY) = UPPER(@createdBy${paramIndex})`;
          params.push({ name: `createdBy${paramIndex}`, value: user.empName });
          paramIndex++;
        } else {
          console.log(`Admin user accessing ticket ${ticketId} - allowing access`);
        }
      } else {
        console.log(`No user provided for ticket ${ticketId} access - allowing access`);
      }

      const request = connection.request();
      request.input('ticketId', ticketId);
      params.forEach(param => request.input(param.name, param.value));

      const result = await request.query(query);

      if (result.recordset.length === 0) {
        throw new Error('Ticket not found or you do not have permission to access it');
      }

      const record = result.recordset[0];
      return {
        id: record.ROWID,
        subject: record.SUBJECT,
        description: record.DESCRIPTION,
        category: record.CATEGORY,
        status: record.STATUS,
        dateCreated: record.DATECREATED,
        dateModified: record.DATEMODIFIED,
        createdBy: record.CREATEDBY
      };
    } catch (error) {
      console.error("Get ticket by ID error:", error);
      throw new Error('Failed to fetch ticket: ' + error.message);
    }
  }

  async createTicket(ticketData, creatorName = null) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      // First, insert the ticket
      const insertQuery = `
        INSERT INTO [SYSTEM.TICKET.1] (SUBJECT, DESCRIPTION, CATEGORY, STATUS, DATECREATED, DATEMODIFIED, CREATEDBY)
        VALUES (@subject, @description, @category, @status, GETDATE(), NULL, @createdBy)
      `;

      const request = connection.request()
        .input('subject', ticketData.subject)
        .input('description', ticketData.description || '')
        .input('category', ticketData.category)
        .input('status', ticketData.status)
        .input('createdBy', creatorName);

      await request.query(insertQuery);

      // Then get the ROWID of the newly inserted record
      const selectQuery = `
        SELECT TOP 1 ROWID
        FROM [SYSTEM.TICKET.1]
        WHERE SUBJECT = @subject AND CATEGORY = @category AND STATUS = @status AND CREATEDBY = @createdBy
        ORDER BY ROWID DESC
      `;

      const result = await connection.request()
        .input('subject', ticketData.subject)
        .input('category', ticketData.category)
        .input('status', ticketData.status)
        .input('createdBy', creatorName)
        .query(selectQuery);

      if (result.recordset.length === 0) {
        throw new Error('Failed to retrieve ticket ID after creation');
      }

      return result.recordset[0].ROWID;
    } catch (error) {
      console.error("Create ticket error:", error);
      throw new Error('Failed to create ticket: ' + error.message);
    }
  }

  async updateTicket(ticketId, ticketData) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        UPDATE [SYSTEM.TICKET.1]
        SET SUBJECT = @subject,
            CATEGORY = @category,
            STATUS = @status,
            DATEMODIFIED = GETDATE()
        WHERE ROWID = @ticketId
      `;

      await connection.request()
        .input('ticketId', ticketId)
        .input('subject', ticketData.subject)
        .input('category', ticketData.category)
        .input('status', ticketData.status)
        .query(query);

      return true;
    } catch (error) {
      console.error("Update ticket error:", error);
      throw new Error('Failed to update ticket: ' + error.message);
    }
  }

  async deleteTicket(ticketId) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `DELETE FROM [SYSTEM.TICKET.1] WHERE ROWID = @ticketId`;

      await connection.request()
        .input('ticketId', ticketId)
        .query(query);

      return true;
    } catch (error) {
      console.error("Delete ticket error:", error);
      throw new Error('Failed to delete ticket: ' + error.message);
    }
  }

  async getTicketStats(user = null) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      let query = `
        SELECT
          STATUS,
          COUNT(*) as count
        FROM [SYSTEM.TICKET.1]
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // If user is provided and not an admin, filter to show only their tickets' stats
      if (user) {
        const isAdmin = user.department && user.department.trim().toUpperCase() === 'MIS';
        if (!isAdmin) {
          query += ` AND UPPER(CREATEDBY) = UPPER(@createdBy${paramIndex})`;
          params.push({ name: `createdBy${paramIndex}`, value: user.empName });
          paramIndex++;
        }
      }

      query += ` GROUP BY STATUS`;

      const request = connection.request();
      params.forEach(param => request.input(param.name, param.value));

      const result = await request.query(query);

      const stats = {};
      result.recordset.forEach(record => {
        stats[record.STATUS] = record.count;
      });

      return stats;
    } catch (error) {
      console.error("Get ticket stats error:", error);
      throw new Error('Failed to fetch ticket stats: ' + error.message);
    }
  }
}

export default new TicketModel();
