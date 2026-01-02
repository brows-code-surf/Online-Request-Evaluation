'use server';

import ForgotPasswordModel from '../../../models/ForgotPassword';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendPasswordResetOTP(email) {
  try {
    const user = await ForgotPasswordModel.getUserByEmail(email);
    
    if (!user) {
      return {
        success: false,
        message: 'Email not found or account not approved'
      };
    }

    const otp = generateOTP();

    await ForgotPasswordModel.saveOTP(email, otp);
    await ForgotPasswordModel.sendOTPEmail(email, user.EMPLOYEENAME, otp);

    return {
      success: true,
      message: 'OTP sent to your email'
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to send OTP'
    };
  }
}

export async function resendPasswordResetOTP(email) {
  try {
    const user = await ForgotPasswordModel.getUserByEmail(email);
    
    if (!user) {
      return {
        success: false,
        message: 'Email not found or account not approved'
      };
    }

    // Mark all previous unverified OTPs as verified
    await ForgotPasswordModel.markExpiredOTPsAsVerified(email);

    const otp = generateOTP();

    await ForgotPasswordModel.saveOTP(email, otp);
    await ForgotPasswordModel.sendOTPEmail(email, user.EMPLOYEENAME, otp);

    return {
      success: true,
      message: 'OTP sent to your email'
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to resend OTP'
    };
  }
}

export async function verifyPasswordResetOTP(email, otp) {
  try {
    const isValid = await ForgotPasswordModel.verifyOTP(email, otp);
    
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }

    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify OTP'
    };
  }
}

export async function resetPassword(email, newPassword) {
  try {
    const result = await ForgotPasswordModel.resetPassword(email, newPassword);
    
    if (!result) {
      return {
        success: false,
        message: 'Failed to reset password'
      };
    }

    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to reset password'
    };
  }
}
