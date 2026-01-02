import connectToDatabase from "../lib/db.js";
import bcrypt from "bcryptjs";

export const ForgotPasswordModel = {
  async getUserByEmail(email) {
    let connection;
    try {
      connection = await connectToDatabase();
      const query = `
        SELECT TOP 1 EMPLOYEEIDNO, EMPLOYEENAME, EMAIL, IS_APPROVED
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMAIL = @email AND IS_APPROVED = 'APPROVED'
      `;
      const result = await connection.request()
        .input('email', email)
        .query(query);
      
      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      console.error("Get user error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  async saveOTP(email, otp) {
    let connection;
    try {
      connection = await connectToDatabase();
      const query = `
        INSERT INTO [SYSTEM.OTPHISTORY.1] (EMAIL, OTP, DATECREATED, VERIFIED)
        VALUES (@email, @otp, GETDATE(), 0)
      `;
      const result = await connection.request()
        .input('email', email)
        .input('otp', otp)
        .query(query);
      
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error("Save OTP error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

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
        SELECT TOP 1 ROWID
        FROM [SYSTEM.OTPHISTORY.1]
        WHERE EMAIL = @email AND OTP = @otp AND DATEADD(MINUTE, 10, DATECREATED) > GETDATE() AND VERIFIED = 0
        ORDER BY DATECREATED DESC
      `;
      const result = await connection.request()
        .input('email', email)
        .input('otp', otp)
        .query(query);
      
      if (result.recordset.length > 0) {
        // Mark OTP as verified
        const updateQuery = `UPDATE [SYSTEM.OTPHISTORY.1] SET VERIFIED = 1, DATEVERIFIED = GETDATE() WHERE ROWID = @otpId`;
        await connection.request()
          .input('otpId', result.recordset[0].ROWID)
          .query(updateQuery);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Verify OTP error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  async resetPassword(email, newPassword) {
    let connection;
    try {
      connection = await connectToDatabase();
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const query = `
        UPDATE [SYSTEM.USERACCOUNT.1]
        SET PASSWORDHASH = @hashedPassword
        WHERE EMAIL = @email
      `;
      const result = await connection.request()
        .input('email', email)
        .input('hashedPassword', hashedPassword)
        .query(query);
      
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error("Reset password error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },

  async sendOTPEmail(email, name, otp) {
    try {
      const { sendEmailWithTemplate } = await import('../utils/emailService.js');

      const result = await sendEmailWithTemplate({
        email,
        title: 'Password Reset OTP',
        companyName: 'SANTEH FEEDS CORPORATION',
        greeting: 'Hello!',
        name,
        body: `Your One-Time Password (OTP) for password reset is: ${otp}. This code expires in 10 minutes.`,
        buttonText: 'Go to Reset Page',
        buttonUrl: 'http://localhost:3000/forgot-password',
        companyEmail: 'j.valencia@santehfeeds.com',
        companyPhone: '+63 2 8584 4572',
        subject: 'Password Reset OTP'
      });

      return result;
    } catch (error) {
      console.log('Email sending error:', error);
      throw new Error('Failed to send OTP email: ' + error.message);
    }
  },

  async markExpiredOTPsAsVerified(email) {
    let connection;
    try {
      connection = await connectToDatabase();
      const query = `
        UPDATE [SYSTEM.OTPHISTORY.1]
        SET VERIFIED = 1, DATEVERIFIED = GETDATE()
        WHERE EMAIL = @email AND VERIFIED = 0
      `;
      await connection.request()
        .input('email', email)
        .query(query);
      
      return true;
    } catch (error) {
      console.error("Mark OTPs error:", error);
      throw new Error('Database error: ' + error.message);
    }
  },
};

export default ForgotPasswordModel;
