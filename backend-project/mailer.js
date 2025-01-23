const nodemailer = require('nodemailer');

// Step 1: Create a transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use 'yahoo', 'outlook', or another service if needed
  auth: {
    user: 'mukanjilewis94@gmail.com', // Replace with your email
    pass: 'Dave#2005', // Replace with your email password or app password
  },
});

// Step 2: Create a sendEmail function using the transporter
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: 'mukanjilewis94@gmail.com', // Sender's email
      to,                          // Recipient's email
      subject,                     // Email subject
      text,                        // Plain text body
      html,                        // HTML body (optional)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Export the sendEmail function for use in other parts of your application
module.exports = sendEmail;
