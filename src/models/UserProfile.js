import connectToDatabase from '@/lib/db.js';
import bcrypt from "bcryptjs";

class UserProfile {
    static async getUserByEmail(email) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
        SELECT
          EMPLOYEENAME as empName,
          EMAIL as email,
          EMPLOYEEIDNO as employeeID,
          DEPARTMENT as department,
          JOBTITLE as jobTitle,
          LOCATION as location
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMAIL = @email
      `;

            const result = await connection.request()
                .input('email', email)
                .query(query);

            if (result.recordset.length === 0) {
                return null;
            }

            return result.recordset[0];
        } catch (error) {
            console.error('Error fetching user by email:', error);
            throw error;
        }
    }

    static async getUserByEmployeeID(employeeID) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
        SELECT
          EMPLOYEENAME as empName,
          EMAIL as email,
          EMPLOYEEIDNO as employeeID,
          DEPARTMENT as department,
          JOBTITLE as jobTitle,
          LOCATION as location
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMPLOYEEIDNO = @employeeID
      `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .query(query);

            if (result.recordset.length === 0) {
                return null;
            }

            return result.recordset[0];
        } catch (error) {
            console.error('Error fetching user by employee ID:', error);
            throw error;
        }
    }

    static async getAllUsers() {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
        SELECT
          EMPLOYEENAME as empName,
          EMAIL as email,
          EMPLOYEEIDNO as employeeID,
          DEPARTMENT as department,
          JOBTITLE as jobTitle,
          LOCATION as location,
          STATUS as status
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE IS_APPROVED = 'APPROVED'
      `;

            const result = await connection.request().query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    }

    static async updateUserProfile(employeeID, profileData, modifiedByEmployeeID) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                EMPLOYEENAME = @employeeName,
                EMAIL = @email,
                JOBTITLE = @jobTitle,
                DEPARTMENT = @department,
                LOCATION = @location,
                MODIFIEDBY = @modifiedBy,
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .input('employeeName', profileData.empName || null)
                .input('email', profileData.email || null)
                .input('jobTitle', profileData.jobTitle || null)
                .input('department', profileData.department || null)
                .input('location', profileData.location || null)
                .input('modifiedBy', modifiedByEmployeeID || null)
                .query(query);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    static async changePassword(employeeID, newPassword) {
        let connection;
        try {
            connection = await connectToDatabase();
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const query = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                PASSWORDHASH = @newPassword,
                MODIFIEDBY = @modifiedBy,
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;
            const result = await connection.request()
                .input('employeeID', employeeID)
                .input('newPassword', hashedPassword)
                .input('modifiedBy', employeeID)
                .query(query);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    static async verifyPassword(employeeID, password) {
        let connection;
        try {
            connection = await connectToDatabase();
            const query = `
                SELECT PASSWORDHASH
                FROM [SYSTEM.USERACCOUNT.1]
                WHERE EMPLOYEEIDNO = @employeeID
            `;
            const result = await connection.request()
                .input('employeeID', employeeID)
                .query(query);

            if (result.recordset.length === 0) {
                return false;
            }

            const storedHash = result.recordset[0].PASSWORDHASH;
            return await bcrypt.compare(password, storedHash);
        } catch (error) {
            console.error('Error verifying password:', error);
            throw error;
        }
    }

    static async setUserInactive(employeeID) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                STATUS = 'INACTIVE',
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .query(query);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error setting user inactive:', error);
            throw error;
        }
    }

    static async setUserActive(employeeID) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                STATUS = 'ACTIVE',
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .query(query);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error setting user active:', error);
            throw error;
        }
    }
}

export default UserProfile;
