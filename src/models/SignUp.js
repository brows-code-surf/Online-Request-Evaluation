import connectToDatabase from "../lib/db.js";
import bcrypt from "bcryptjs";
import { broadcastUserApprovalUpdate } from "../app/_actions/socket.js";

export const UserAccount = {
  async checkEmailExists(email) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT COUNT(*) as count
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMAIL = @email AND IS_APPROVED IN ('APPROVED', 'PENDING')
      `;

      const result = await connection.request()
        .input('email', email)
        .query(query);

      return result.recordset[0].count > 0;
    } catch (error) {
      console.error("Check email error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  async checkEmployeeIDExists(employeeid) {
    let connection;
    try {
      connection = await connectToDatabase();
      const query = `
        SELECT COUNT(*) as count
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMPLOYEEIDNO = @employeeid
      `;
      const result = await connection.request()
        .input('employeeid', employeeid)
        .query(query);
      return result.recordset[0].count > 0;
    } catch (error) {
      console.error("Check employee ID error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  async createUser(formData) {
    let connection;
    try {
      connection = await connectToDatabase();
      const hashedPassword = await bcrypt.hash(formData.password, 10);

      const query = `
        INSERT INTO [SYSTEM.USERACCOUNT.1] 
        (EMPLOYEENAME, EMAIL, PASSWORDHASH, LOCATION, DEPARTMENT, JOBTITLE, EMPLOYEEIDNO, DATEREQUESTED, IS_APPROVED) 
        VALUES 
        (@name, @email, @pass, @loc, @dept, @job, @empid, GETDATE(), @status)
      `;

      const params = {
        name: formData.fullName,
        email: formData.email,
        pass: hashedPassword,
        loc: formData.location,
        dept: formData.department,
        job: formData.jobTitle,
        empid: formData.employeeid,
        daterequested: new Date(),
        status: 'PENDING'
      };

      const result = await connection.request()
        .input('name', params.name)
        .input('email', params.email)
        .input('pass', params.pass)
        .input('loc', params.loc)
        .input('dept', params.dept)
        .input('job', params.job)
        .input('empid', params.empid)
        .input('daterequested', params.daterequested)
        .input('status', params.status)
        .query(query);

      if (result.rowsAffected[0] > 0) {
        // Broadcast new signup to user-approval page
        await broadcastUserApprovalUpdate('new-account-signup', {
          email: params.email,
          name: params.name,
          employeeID: params.empid,
          location: params.loc,
          department: params.dept,
          jobTitle: params.job,
          timestamp: new Date().toISOString()
        });

        // Notify MIS department about new pending user
        try {
          await this.notifyMisNewUserApproval(
            params.email,
            params.name,
            params.dept,
            params.empid
          );
          console.log('MIS department notified about new user pending approval');
        } catch (notifyError) {
          console.error('Failed to notify MIS department:', notifyError.message);
          // Don't fail the creation if notification fails
        }

        return {
          success: true,
          message: "User created successfully"
        };
      }
      throw new Error("Database insert failed");

    } catch (error) {
      console.error("Detailed error:", error);
      throw new Error(
        error.message.includes('duplicate') ?
          'Email already exists' :
          'Database error: ' + error.message
      );
    }
  },

  async getApprovedUsersByDepartment(department) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT EMPLOYEENAME, EMAIL, LOCATION, DEPARTMENT, JOBTITLE
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE DEPARTMENT = @department AND IS_APPROVED = 'APPROVED' AND STATUS = 'ACTIVE'
      `;

      const result = await connection.request()
        .input('department', department)
        .query(query);

      return result.recordset;
    } catch (error) {
      console.error("Get approved users by department error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  async notifyMisNewUserApproval(email, name, department, employeeId) {
    try {
      const { sendEmailWithTemplate } = await import('../utils/emailService.js');

      // Default company details for MIS notification
      const companyDetails = {
        title: 'New User Account Pending Approval',
        companyName: 'Santeh Feeds Corporation',
        greeting: 'MIS Department',
        body: `A new user account request requires your approval. Please review and process the account in the system.

        <b>Details:</b><br>
        Name: ${name}<br>
        Email: ${email}<br>
        Department: ${department}<br>
        Employee ID: ${employeeId}<br>
        Request Date: ${new Date().toLocaleDateString()}

        Please log into the system to approve or reject this account request.`,
        companyEmail: 'mis@santehfeeds.com',
        companyPhone: '(+63) 123-456-7890',
        unsubscribeUrl: 'https://tateh.com/unsubscribe',
        preferencesUrl: 'https://tateh.com/preferences',
        subject: 'New Pending Account for Approval'
      };

      // Get all approved MIS users to send notification
      const misUsers = await this.getApprovedUsersByDepartment('MIS');

      if (misUsers.length === 0) {
        console.log('No MIS users found to notify');
        return { success: true, message: 'No MIS users to notify' };
      }

      for (const user of misUsers) {
        try {
          await sendEmailWithTemplate({
            email: user.EMAIL,
            name: user.EMPLOYEENAME,
            ...companyDetails
          });
        } catch (emailError) {
          console.error(`Failed to send notification to ${user.EMAIL}:`, emailError.message);
          // Continue with other users
        }
      }

      return { success: true, message: `Notification sent to ${misUsers.length} MIS users` };
    } catch (error) {
      console.error('MIS notification error:', error);
      throw new Error('Failed to send MIS notification: ' + error.message);
    }
  },

  async emailUserConfirmation(email, title, companyName, greeting, name, body, buttonText, buttonUrl, companyEmail, companyPhone, unsubscribeUrl, preferencesUrl) {
    try {
      const { sendEmailWithTemplate } = await import('../utils/emailService.js');

      const result = await sendEmailWithTemplate({
        email,
        title,
        companyName,
        greeting,
        name,
        body,
        buttonText,
        buttonUrl,
        companyEmail,
        companyPhone,
        unsubscribeUrl,
        preferencesUrl,
        subject: 'Account Creation Confirmation'
      });

      return result;
    } catch (error) {
      console.log('Email sending error:', error);
      throw new Error('Failed to send confirmation email: ' + error.message);
    }
  }
};

export default UserAccount;
