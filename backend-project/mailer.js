const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Create transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to read and populate the HTML template
const getEmailTemplate = async (templateData) => {
  try {
    let template = await fs.readFile(path.join(__dirname, 'email.html'), 'utf8');
    
    // Replace placeholders with actual data
    template = template.replace(/{name}/g, templateData.name || '');
    template = template.replace(/{email}/g, templateData.email || '');
    template = template.replace(/{phone}/g, templateData.phone || '');
    template = template.replace(/{message}/g, templateData.message || '');
    
    return template;
  } catch (error) {
    console.error('Error reading template:', error);
    throw error;
  }
};

// Enhanced function to send emails with HTML template
const sendEmail = async (to, subject, templateData) => {
  try {
    const htmlContent = await getEmailTemplate(templateData);
    
    // Create plain text version
    const textContent = `
Contact Form Submission from About Page

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
      text: textContent,
      html: htmlContent,
      replyTo: templateData.email // Add reply-to header with the sender's email
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;