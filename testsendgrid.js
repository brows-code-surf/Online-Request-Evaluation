// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import sgMail from '@sendgrid/mail';

// Set your API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Compose the email
const msg = {
  to: 'j.valencia@santehfeeds.com',           // your email
  from: 'j.valencia@santehfeeds.com',         // must be verified in SendGrid
  subject: 'Test Email from SendGrid',
  text: 'Hello Jairus! This is a test email sent via SendGrid.',
  html: '<strong>Hello Jairus! This is a test email sent via SendGrid.</strong>',
};

// Send the email
try {
  await sgMail.send(msg);
  console.log('Email sent successfully!');
} catch (error) {
  console.error('Error sending email:', error);
}
