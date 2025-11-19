'use server';

import LoginModel from '@/models/Login.js';
import OTPModel from '@/models/OTP.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';
import { checkRateLimit, recordLoginAttempt, resetLoginAttempts } from '@/utils/rateLimiter.js';

export async function loginUser(email, password) {
  try {
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    // Check rate limit
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Too many login attempts. Please try again in ${rateLimit.minutesRemaining} minute(s).`
      };
    }

    const user = await LoginModel.authenticate(email, password);

    if (!user || !user.authenticated) {
      recordLoginAttempt(email);
      return {
        success: false,
        message: 'Your email or password is incorrect. Also check if your account is approved.'
      };
    }

    // Reset attempts on successful authentication
    resetLoginAttempts(email);

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
      buttonText: 'Verify Now',
      buttonUrl: 'http://localhost:3000/OTP?email=' + encodeURIComponent(email),
      companyEmail: 'j.valencia@santehfeeds.com',
      companyPhone: '+63 2 8584 4572',
      unsubscribeUrl: '#',
      preferencesUrl: '#'
    });

    return {
      success: true,
      email: user.email,
      empName: user.empName,
      department: user.department,
      isApproved: user.isApproved,
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
