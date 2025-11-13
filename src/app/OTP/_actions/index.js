'use server';

import OTPModel from '@/models/OTP.js';
import LoginModel from '@/models/Login.js';
import UserProfile from '@/models/UserProfile.js';
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

    try {
      const user = await UserProfile.getUserByEmail(email);

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const token = LoginModel.createToken({ ...user, authenticated: true });

      return {
        success: true,
        user: { email: user.email, empName: user.empName, authenticated: true, department: user.department, 
                jobTitle: user.jobTitle, employeeID: user.employeeID, location: user.location },
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

    // Mark all previous unverified OTPs as verified
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
    } catch (error) {
      console.error('Error marking old OTPs:', error);
    }

    // Generate and save new OTP
    try {
      const newOtp = OTPModel.generateOTP();
      await OTPModel.saveOTP(email, newOtp);

      // Get user info to send email
      const user = await UserProfile.getUserByEmail(email);
      if (user) {
        const { sendEmailWithTemplate } = await import('@/utils/emailService.js');
        await sendEmailWithTemplate({
          email,
          title: 'Your New OTP',
          companyName: 'SANTEH FEEDS CORPORATION',
          greeting: 'Hello!',
          name: user.empName || user.EMPLOYEENAME,
          body: `Your new One-Time Password (OTP) is: ${newOtp}. This code expires in 10 minutes.`,
          buttonText: 'Verify Now',
          buttonUrl: 'http://localhost:3000/OTP?email=' + encodeURIComponent(email),
          companyEmail: 'j.valencia@santehfeeds.com',
          companyPhone: '+63 2 8584 4572',
          subject: 'Your New OTP'
        });
      }
    } catch (error) {
      console.error('Error sending new OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP email'
      };
    }

    return {
      success: true,
      message: 'New OTP sent successfully'
    };

  } catch (error) {
    console.error('Resend OTP error:', error);
    return {
      success: false,
      message: 'Failed to resend OTP: ' + error.message
    };
  }
}
