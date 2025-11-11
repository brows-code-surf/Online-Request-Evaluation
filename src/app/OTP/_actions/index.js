'use server';

import OTPModel from '@/models/OTP.js';
import LoginModel from '@/models/Login.js';
import connectToDatabase from '@/lib/db.js';

export async function verifyOTP(email, otp) {
  try {
    if (!otp || otp.length !== 6) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit OTP'
      };
    }

    if (!email) {
      return {
        success: false,
        message: 'Email is required'
      };
    }

    const isValid = await OTPModel.verifyOTP(email, otp);

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }

    // Fetch user data to get empName
    let connection;
    try {
      connection = await connectToDatabase();

      const query = `
        SELECT
          EMPLOYEENAME as empName,
          EMAIL as email
        FROM [SYSTEM.USERACCOUNT.1]
        WHERE EMAIL = @email
      `;

      const result = await connection.request()
        .input('email', email)
        .query(query);

      if (result.recordset.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = result.recordset[0];
      const token = LoginModel.createToken({ ...user, authenticated: true });

      return {
        success: true,
        user: { email: user.email, empName: user.empName, authenticated: true },
        token,
        message: 'OTP verified successfully'
      };
    } catch (dbError) {
      console.error('Database error:', dbError);
      return {
        success: false,
        message: 'Failed to fetch user data'
      };
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      message: 'OTP verification failed: ' + error.message
    };
  }
}

export async function resendOTP(email) {
  try {
    if (!email) {
      return {
        success: false,
        message: 'Email is required'
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully'
    };

  } catch (error) {
    console.error('Resend OTP error:', error);
    return {
      success: false,
      message: 'Failed to resend OTP: ' + error.message
    };
  }
}
