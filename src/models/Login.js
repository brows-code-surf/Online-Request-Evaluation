import connectToDatabase from "../lib/db.js";
import bcrypt from "bcryptjs";

export class LoginModel {
  async authenticate(email, password) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT
          EMPLOYEENAME as empName,
          EMAIL as email,
          PASSWORDHASH,
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

      if (user.isApproved !== 'APPROVED') {
        return {
          email: user.email,
          empName: user.empName,
          isApproved: user.isApproved,
          authenticated: false
        };
      }

      return {
        email: user.email,
        empName: user.empName,
        isApproved: user.isApproved,
        authenticated: false
      };

    } catch (error) {
      console.error("Authentication error:", error);
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
      connection = await connectToDatabase();

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
        WHERE ID = @id
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
