'use server';

import UserAccount from '../../../models/SignUp';

export async function checkEmailExists(email) {
  try {
    const exists = await UserAccount.checkEmailExists(email);
    return {
      success: true,
      exists: exists
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to check email'
    };
  }
}

export async function checkEmployeeIDExists(empId) {
  try {
    const exists = await UserAccount.checkEmployeeIDExists(empId);
    return {
      success: true,
      exists: exists
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to check employee ID'
    };
  }
}

export async function createUser(formData) {
  try {
    const result = await UserAccount.createUser(formData);
    return result;
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create user account'
    };
  }
}
export async function sendConfirmationEmail(emailData) {
  try {
    await UserAccount.emailUserConfirmation(
      emailData.email,
      emailData.title,
      emailData.companyName,
      emailData.greeting,
      emailData.name,
      emailData.body,
      emailData.buttonText,
      emailData.buttonUrl,
      emailData.companyEmail,
      emailData.companyPhone,
      emailData.unsubscribeUrl,
      emailData.preferencesUrl
    );
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
