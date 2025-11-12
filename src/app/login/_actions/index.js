'use server';

import LoginModel from '@/models/Login.js';
import OTPModel from '@/models/OTP.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';

export async function loginUser(email, password) {
  try {
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    const user = await LoginModel.authenticate(email, password);

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    if (user.isApproved !== 'APPROVED') {
      return {
        success: false,
        message: 'Your account is not approved yet'
      };
    }

    // Generate and save OTP
    const otp = OTPModel.generateOTP();
    await OTPModel.saveOTP(email, otp);

    // Send OTP email
    await sendEmailWithTemplate({
      email: email,
      subject: 'Your One-Time Password (OTP)',
      title: 'OTP Verification',
      companyName: 'SANTEH',
      greeting: 'Hello',
      name: user.empName,
      body: `<p>Your One-Time Password (OTP) is: <strong style="font-size:24px;color:#2563eb;">${otp}</strong></p><p>This OTP will expire in 10 minutes. Do not share this code with anyone.</p>`,
      companyEmail: 'contact@santeh.com',
      companyPhone: '+1-800-SANTEH',
      unsubscribeUrl: '#',
      preferencesUrl: '#'
    });

    return {
      success: true,
      email: user.email,
      empName: user.empName,
      department: user.department,
      message: 'OTP sent to your email. Please verify to continue.'
    };

  } catch (error) {
    console.error('Login action error:', error);
    return {
      success: false,
      message: 'Login failed: ' + error.message
    };
  }
}

export async function logoutUser() {
  try {
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Logout action error:', error);
    return {
      success: false,
      message: 'Logout failed'
    };
  }
}
