import connectToDatabase from "../lib/db.js";

export class AccountApprovalModel {
  async getPendingApprovals() {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT
          ROWID,
          EMPLOYEEIDNO AS employeeID,
          EMPLOYEENAME as requester,
          EMAIL as email,
          LOCATION as location,
          DEPARTMENT as department,
          JOBTITLE as jobTitle,
          EMPLOYEEIDNO as employeeId,
          IS_APPROVED as isApproved,
          DATEREQUESTED as requestDate,
          DATEPROCESSED as dateProcessed,
          PROCESSEDBY as processedBy,
          REMARKS as remarks
        FROM [SYSTEM.USERACCOUNT.1]
        ORDER BY DATEREQUESTED DESC
      `;

      const result = await connection.request().query(query);
      return result.recordset.map(record => ({
        id: record.ROWID,
        title: 'Account Creation Request',
        requester: record.requester,
        employeeID: record.employeeID,
        email: record.email,
        status: record.isApproved === 'REJECTED' ? 'rejected' : record.isApproved === 'APPROVED' ? 'approved' : 'pending',
        requestDate: record.requestDate.toISOString().split('T')[0],
        dateProcessed: record.dateProcessed ? record.dateProcessed.toISOString().split('T')[0] : null,
        processedBy: record.processedBy,
        remarks: record.remarks,
        department: record.department,
        jobTitle: record.jobTitle,
        location: record.location,
        description: `Request for new employee account creation for ${record.department} department.`,
        attachments: []
      }));
    } catch (error) {
      console.error("Get pending approvals error:", error);
      throw new Error('Failed to fetch approvals: ' + error.message);
    }
  }

  async approveAccount(userId, processedBy, password) {
    let connection;
    try {
      connection = await connectToDatabase();
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `
        UPDATE [SYSTEM.USERACCOUNT.1]
        SET IS_APPROVED = 'APPROVED', DATEPROCESSED = GETDATE(), PROCESSEDBY = @processedBy, REMARKS = 'Validated and Approved',
        PASSWORDHASH = @password, STATUS = 'ACTIVE'
        WHERE ROWID = @userId
      `;

      await connection.request()
        .input('userId', userId)
        .input('processedBy', processedBy)
        .input('password', hashedPassword)
        .query(query);

      return true;
    } catch (error) {
      console.error("Approve account error:", error);
      throw new Error('Failed to approve account: ' + error.message);
    }
  }

  async rejectAccount(userId, processedBy, remarks) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        UPDATE [SYSTEM.USERACCOUNT.1]
        SET IS_APPROVED = 'REJECTED', DATEPROCESSED = GETDATE(), PROCESSEDBY = @processedBy, REMARKS = @remarks
        WHERE ROWID = @userId
      `;

      await connection.request()
        .input('userId', userId)
        .input('processedBy', processedBy)
        .input('remarks', remarks)
        .query(query);

      return true;
    } catch (error) {
      console.error("Reject account error:", error);
      throw new Error('Failed to reject account: ' + error.message);
    }
  }
}

export default new AccountApprovalModel();
