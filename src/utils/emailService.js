import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,       // your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD // 16-character App Password
  }
});

export async function sendEmailWithTemplate(emailData) {
  // Load and fill HTML template
  const templatePath = path.join(
    process.cwd(),
    "src/app/_components/email.html"
  );
  let htmlContent = fs.readFileSync(templatePath, "utf-8");

  htmlContent = htmlContent
    .replace(/{{title}}/g, emailData.title)
    .replace(/{{company_name}}/g, emailData.companyName)
    .replace(/{{greeting}}/g, emailData.greeting)
    .replace(/{{name}}/g, emailData.name)
    .replace(/{{body}}/g, emailData.body)
    .replace(/{{button_text}}/g, emailData.buttonText || "")
    .replace(/{{button_url}}/g, emailData.buttonUrl || "#")
    .replace(/{{company_email}}/g, emailData.companyEmail)
    .replace(/{{company_phone}}/g, emailData.companyPhone)
    .replace(/{{unsubscribe_url}}/g, emailData.unsubscribeUrl)
    .replace(/{{preferences_url}}/g, emailData.preferencesUrl)
    .replace(
      /{{logo_url}}/g,
      "https://drive.google.com/uc?export=view&id=1nhzsbYGquTzZlBFJ7F1q9OpisQAU14QT"
    );

  const mailOptions = {
    from: `"${process.env.GMAIL_SENDER_NAME || 'SANTEH System'}" <${process.env.GMAIL_USER}>`,
    to: emailData.email,
    subject: emailData.subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent via Gmail SMTP:", info.response);
    return { success: true, message: "Email sent via Gmail SMTP" };
  } catch (error) {
    console.error("Gmail SMTP error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
