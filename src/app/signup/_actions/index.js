'use server';

import UserAccount from '../../../models/SignUp';

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
