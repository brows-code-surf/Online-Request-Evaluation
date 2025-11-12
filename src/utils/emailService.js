import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmailWithTemplate(emailData) {
  try {
    // Validate environment variables
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not set in environment variables');
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@santehfeeds.com';

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL is not set in environment variables');
    }

    // Read the HTML template
    const templatePath = path.join(process.cwd(), 'src/app/_components/email.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders with actual values
    htmlContent = htmlContent
      .replace(/{{title}}/g, emailData.title)
      .replace(/{{company_name}}/g, emailData.companyName)
      .replace(/{{greeting}}/g, emailData.greeting)
      .replace(/{{name}}/g, emailData.name)
      .replace(/{{body}}/g, emailData.body)
      .replace(/{{button_text}}/g, emailData.buttonText || '')
      .replace(/{{button_url}}/g, emailData.buttonUrl || '#')
      .replace(/{{company_email}}/g, emailData.companyEmail)
      .replace(/{{company_phone}}/g, emailData.companyPhone)
      .replace(/{{unsubscribe_url}}/g, emailData.unsubscribeUrl)
      .replace(/{{preferences_url}}/g, emailData.preferencesUrl)
      .replace(
        /{{logo_url}}/g,
        'https://drive.google.com/uc?export=view&id=1nhzsbYGquTzZlBFJ7F1q9OpisQAU14QT'
      );


    const msg = {
      to: emailData.email,
      from: fromEmail,
      subject: emailData.subject || 'Account Confirmation',
      html: htmlContent,
    };

    console.log('Sending email from:', fromEmail);
    console.log('Sending email to:', emailData.email);

    await sgMail.send(msg);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('SendGrid detailed error:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    throw new Error('Failed to send email: ' + error.message);
  }
}
