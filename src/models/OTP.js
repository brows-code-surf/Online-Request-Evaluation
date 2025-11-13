import connectToDatabase from "../lib/db.js";

export class OTPModel {
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOTP(email, otp) {
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        INSERT INTO [SYSTEM.OTPHISTORY.1] (EMAIL, OTP, DATECREATED, VERIFIED)
        VALUES (@email, @otp, GETDATE(), 0)
      `;

      await connection.request()
        .input('email', email)
        .input('otp', otp)
        .query(query);

      return true;
    } catch (error) {
      console.error("Save OTP error:", error);
      throw new Error('Failed to save OTP: ' + error.message);
    }
  }

  async verifyOTP(email, otp) {
    let connection;
    try {
      connection = await connectToDatabase();

      // Mark expired OTPs as verified
      const expireQuery = `
        UPDATE [SYSTEM.OTPHISTORY.1] 
        SET VERIFIED = 1, DATEVERIFIED = GETDATE() 
        WHERE EMAIL = @email AND VERIFIED = 0 AND DATEADD(MINUTE, 10, DATECREATED) <= GETDATE()
      `;
      await connection.request()
        .input('email', email)
        .query(expireQuery);

      const query = `
        SELECT TOP 1 ROWID, OTP, VERIFIED
        FROM [SYSTEM.OTPHISTORY.1]
        WHERE EMAIL = @email AND DATEADD(MINUTE, 10, DATECREATED) > GETDATE()
        ORDER BY DATECREATED DESC
      `;

      const result = await connection.request()
        .input('email', email)
        .query(query);

      if (result.recordset.length === 0) {
        return false;
      }

      const record = result.recordset[0];

      if (record.OTP !== otp || record.VERIFIED === 1) {
        return false;
      }

      // Mark OTP as verified
      const updateQuery = `
        UPDATE [SYSTEM.OTPHISTORY.1]
        SET VERIFIED = 1, DATEVERIFIED = GETDATE()
        WHERE ROWID = @rowid
      `;

      await connection.request()
        .input('rowid', record.ROWID)
        .query(updateQuery);

      return true;
    } catch (error) {
      console.error("Verify OTP error:", error);
      throw new Error('OTP verification failed: ' + error.message);
    }
  }
}

export default new OTPModel();
