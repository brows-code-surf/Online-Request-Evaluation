import connectToDatabase from '@/lib/db.js';
import bcrypt from "bcryptjs";
import next from 'next';

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
          JOBLEVEL as jobLevel,
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
          JOBLEVEL as jobLevel,
          LOCATION as location,
          LOGGEDIN as loggedIn
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
          JOBLEVEL as jobLevel,
          LOCATION as location,
          DATEREQUESTED as dateRequested,
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
                JOBLEVEL = @jobLevel,
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
                .input('jobLevel', profileData.jobLevel || null)
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

    static async getEmailByEmployeeName(employeeName) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
        SELECT EMAIL as email
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMPLOYEENAME = @employeeName
      `;

            const result = await connection.request()
                .input('employeeName', employeeName)
                .query(query);

            if (result.recordset.length === 0) {
                return null;
            }

            return result.recordset[0].email;
        } catch (error) {
            console.error('Error fetching email by employee name:', error);
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

    static async getUserSettings(employeeID) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                SELECT
                    IS_DARK_MODE as isDarkMode
                FROM [SYSTEM.USERACCOUNT.1]
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .query(query);

            if (result.recordset.length === 0) {
                return null;
            }

            const settings = result.recordset[0];
            return {
                isDarkMode: settings.isDarkMode || 0
            };
        } catch (error) {
            console.error('Error fetching user settings:', error);
            throw error;
        }
    }

    static async updateDarkMode(employeeID, isDarkMode) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                IS_DARK_MODE = @isDarkMode,
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .input('isDarkMode', isDarkMode ? 1 : 0)
                .query(query);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating dark mode:', error);
            throw error;
        }
    }

    static async getNextOTP(employeeID) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                SELECT NEXT_OTP
                FROM [SYSTEM.USERACCOUNT.1]
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .query(query);

            if (result.recordset.length === 0) {
                return null;
            }

            return result.recordset[0].NEXT_OTP;
        } catch (error) {
            console.error('Error fetching NEXT_OTP:', error);
            throw error;
        }
    }

    static async updateNextOTP(employeeID, nextOTPDate) {
        let connection;
        try {
            connection = await connectToDatabase();

            const query = `
                UPDATE [SYSTEM.USERACCOUNT.1]
                SET
                NEXT_OTP = @nextOTP,
                MODIFIEDDATE = GETDATE()
                WHERE EMPLOYEEIDNO = @employeeID
            `;

            const result = await connection.request()
                .input('employeeID', employeeID)
                .input('nextOTP', nextOTPDate)
                .query(query);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating NEXT_OTP:', error);
            throw error;
        }
    }

    static async shouldRequireOTP(employeeID) {
        try {
            const nextOTP = await UserProfile.getNextOTP(employeeID);
            const user = await UserProfile.getUserByEmployeeID(employeeID);
            const loggedIn = user?.loggedIn;

            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];

            // Check NEXT_OTP date
            let nextOTPDateStr = null;
            if (nextOTP) {
                let nextOTPDate;
                if (typeof nextOTP === 'string') {
                    // Handle different date string formats
                    let dateStr = nextOTP.trim();
                    if (dateStr.includes(' ')) {
                        // Format like '2026-01-05 06:42:00' or '2026-01-05 06:42:00.000'
                        const parts = dateStr.split(' ');
                        if (parts.length === 2) {
                            nextOTPDateStr = parts[0]; // Just the date part
                        }
                    } else {
                        nextOTPDateStr = dateStr.split('T')[0]; // If already ISO, take date part
                    }
                } else {
                    nextOTPDate = new Date(nextOTP);
                    nextOTPDateStr = nextOTPDate.toISOString().split('T')[0];
                }
            }

            // Check LOGGEDIN date
            let loggedInDateStr = null;
            if (loggedIn) {
                let loggedInDate;
                if (typeof loggedIn === 'string') {
                    loggedInDateStr = loggedIn.split(' ')[0]; // Assume format 'YYYY-MM-DD HH:MM:SS'
                } else {
                    loggedInDate = new Date(loggedIn);
                    loggedInDateStr = loggedInDate.toISOString().split('T')[0];
                }
            }

            // Require OTP if NEXT_OTP date is past or equal to today, or if LOGGEDIN date is today
            const requireDueToNextOTP = nextOTPDateStr && nextOTPDateStr <= today;
            const requireDueToLoggedIn = loggedInDateStr && loggedInDateStr === today;
            console.log('shouldRequireOTP:', nextOTPDateStr );

            return requireDueToNextOTP || !nextOTP; // Also require if no NEXT_OTP set
        } catch (error) {
            console.error('Error checking if OTP is required:', error);
            return true; // Default to requiring OTP on error
        }
    }
}

export default UserProfile;
