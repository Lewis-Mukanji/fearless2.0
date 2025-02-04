const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Step 1: Create a transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Your Gmail address
    pass: process.env.EMAIL_PASS,  // App password (from .env)
  },
});

// Function to read and populate the HTML template
const getEmailTemplate = async (templateData) => {
  try {
    // Read the HTML template file
    let template = await fs.readFile(path.join(__dirname, 'email.html'), 'utf8');
    
    // Replace placeholders with actual data
    template = template.replace('{name}', templateData.name || '');
    template = template.replace('{email}', templateData.email || '');
    template = template.replace('{phone}', templateData.phone || '');
    template = template.replace('{message}', templateData.message || '');
    
    return template;
  } catch (error) {
    console.error('Error reading template:', error);
    throw error;
  }
};

// Enhanced function to send emails with HTML template
const sendEmail = async (to, subject, templateData) => {
  try {
    // Get populated HTML template
    const htmlContent = await getEmailTemplate(templateData);
    
    // Create plain text version
    const textContent = `
Contact Form Submission

Name: ${templateData.name}
Email: ${templateData.email}
Phone: ${templateData.phone}

Message:
${templateData.message}
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: textContent,  // Fallback plain text version
      html: htmlContent,  // HTML version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Export the function
module.exports = sendEmail;