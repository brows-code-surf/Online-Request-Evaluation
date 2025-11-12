import connectToDatabase from "../lib/db.js"; 
import bcrypt from "bcryptjs";

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

  async emailUserConfirmation(email, title, companyName, greeting, name, body, buttonText, buttonUrl, companyEmail, companyPhone, unsubscribeUrl, preferencesUrl){
    try{
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
    }catch(error){
      console.log('Email sending error:', error);
      throw new Error('Failed to send confirmation email: ' + error.message);
    }
  }
};

export default UserAccount;
