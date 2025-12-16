// config/email.js
// This file serves as the module to send emails to users
// One use of this would be to allow them to reset a forgotton password

const nodemailer = require('nodemailer');

// Create a transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,        
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// The transporter handles:
// - Connecting to Gmail's SMTP (Simple Mail Transfer Protocol) servers
// - Authenticating with your Gmail account using your credentials
// - Sending emails through Gmail's infrastructure
// - Handling the technical details of email delivery
//
// Once created, you can reuse this transporter object to send multiple emails
// without having to reconnect each time.

// Function to send a plain text email
async function sendEmail(to, subject, text) {
  try {
	const errors = [];

	// Validate the inputs
	if (!to || !subject || !text) {
          errors.push("Missing form inputs.");
	}

        const info = await transporter.sendMail({
            from: process.env.GMAIL_USER,  // Sender address
            to: to,                         // Recipient address
            subject: subject,               // Email subject
            text: text                     // Plain text body
        });
        
    } catch (error) {
        errors.push("Failed to send email.");
    }
    return {
      valid: errors.length === 0,
      errors
    }
}

module.exports = {
    sendEmail
};
