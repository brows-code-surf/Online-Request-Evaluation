import connectToDatabase from "../lib/db.js";
import bcrypt from "bcryptjs";
import UserProfile from "./UserProfile.js";

export class LoginModel {
  async authenticate(email, password) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        SELECT
          EMPLOYEENAME as empName,
          EMAIL as email,
          PASSWORDHASH,
          DEPARTMENT as department,
          IS_APPROVED as isApproved
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMAIL = @email
      `;

      const result = await connection.request()
        .input('email', email)
        .query(query);

      if (result.recordset.length === 0) {
        return null;
      }

      const user = result.recordset[0];

      const passwordMatch = await bcrypt.compare(password, user.PASSWORDHASH);

      if (!passwordMatch) {
        return null;
      }

      // Get employee ID for OTP check
      const employeeQuery = `
        SELECT EMPLOYEEIDNO
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMAIL = @email
      `;

      const employeeResult = await connection.request()
        .input('email', email)
        .query(employeeQuery);

      const employeeID = employeeResult.recordset[0]?.EMPLOYEEIDNO;

      // Check if user requires OTP
      const requiresOTP = employeeID ? await UserProfile.shouldRequireOTP(employeeID) : true;

      // If user does not require OTP yet (NEXT_OTP is in the future), update LOGGEDIN
      if (!requiresOTP) {
        const loggedInQuery = `UPDATE [SYSTEM.USERACCOUNT.1] SET LOGGEDIN = GETDATE() WHERE EMAIL = @email`;
        await connection.request()
          .input('email', email)
          .query(loggedInQuery);
      }

      return {
        email: user.email,
        empName: user.empName,
        department: user.department || '',
        isApproved: user.isApproved,
        authenticated: user.isApproved === 'APPROVED'
      };

    } catch (error) {
      console.error("Authentication error details:", {
        message: error.message,
        code: error.code,
        email: email
      });
      throw new Error('Database error: ' + error.message);
    }
  }

  async validateSession(token) {
    try {
      const user = JSON.parse(atob(token));
      return user;
    } catch (error) {
      return null;
    }
  }

  createToken(user) {
    return btoa(JSON.stringify(user));
  }

  async getUserById(id) {
    let connection;
    try {
      connection = await connectToDatabase(process.env.DB_NAME);

      const query = `
        SELECT 
          ROWID,
          EMPLOYEENAME as empName,
          EMAIL as email,
          LOCATION as location,
          DEPARTMENT as department,
          JOBTITLE as jobTitle,
          EMPLOYEEIDNO as employeeId
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE ROWID = @id AND IS_APPROVED = 'APPROVED' AND STATUS = 'ACTIVE'
      `;

      const result = await connection.request()
        .input('ROWID', id)
        .query(query);

      return result.recordset.length > 0 ? result.recordset[0] : null;

    } catch (error) {
      console.error("Get user error:", error);
      throw new Error('Database error: ' + error.message);
    }
  }
}

export default new LoginModel();
