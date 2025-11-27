import nodemailer from 'nodemailer';

// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jcvbrowsing@gmail.com',        // your Gmail address
    pass: 'qngh jzuu mojw kgry'            // the 16-character app password
  }
});

// Email options
const mailOptions = {
  from: 'jcvbrowsing@gmail.com',
  to: 'j.valencia@santehfeeds.com',
  subject: 'Test Email from Node.js',
  text: 'Hello! This is a test email sent using Nodemailer and Gmail SMTP.',
  // html: '<h1>Hello!</h1><p>This is a test email</p>'  // optional HTML
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
