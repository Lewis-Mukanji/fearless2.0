const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const getEmailTemplate = async (templateData, templateType = 'contact') => {
  try {
    let template;
    
    if (templateType === 'ticket') {
      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .ticket-info { margin-top: 20px; }
            .qr-code { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Your Ticket Purchase Confirmation</h2>
            <p>Thank you for purchasing a ticket. Below are your ticket details:</p>
            
            <div class="ticket-info">
              <p><strong>Ticket Number:</strong> ${templateData.ticketNumber}</p>
            </div>
            
            <div class="qr-code">
              <p><strong>QR Code:</strong></p>
              <img src="${templateData.qrCodeImage}" alt="QR Code" />
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (templateType === 'order') {
      const itemsList = templateData.items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">KSh ${item.price}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">KSh ${item.price * item.quantity}</td>
        </tr>
      `).join('');

      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8f9fa; text-align: left; padding: 10px; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Order Received</h2>
            <p>A new order has been placed from the merchandise store.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
            
            <p class="total">Total Amount: KSh ${templateData.total}</p>
            <p>Order Date: ${templateData.orderDate}</p>
          </div>
        </body>
        </html>
      `;
    } else if (templateType === 'donation') {
      template = await fs.readFile(path.join(__dirname, 'donations-email.html'), 'utf8');
      
      // Replace placeholders in the donation template
      template = template.replace(/{name}/g, templateData.name || '');
      template = template.replace(/{email}/g, templateData.email || '');
      template = template.replace(/{phone}/g, templateData.phone || '');
      template = template.replace(/{address}/g, templateData.address || '');
      template = template.replace(/{donorType}/g, templateData.donorType || '');
      template = template.replace(/{paymentMethod}/g, templateData.paymentMethod || '');
      template = template.replace(/{amount}/g, templateData.amount || '');
      template = template.replace(/{message}/g, templateData.message || 'No message provided');
    } else {
      // Default contact form template
      template = await fs.readFile(path.join(__dirname, 'email.html'), 'utf8');
      template = template.replace(/{name}/g, templateData.name || '');
      template = template.replace(/{email}/g, templateData.email || '');
      template = template.replace(/{phone}/g, templateData.phone || '');
      template = template.replace(/{message}/g, templateData.message || '');
    }
    
    return template;
  } catch (error) {
    console.error('Error reading template:', error);
    throw error;
  }
};

const sendEmail = async (to, subject, templateData, templateType = 'contact') => {
  try {
    const htmlContent = await getEmailTemplate(templateData, templateType);
    
    // Create plain text version based on template type
    let textContent;
    
    if (templateType === 'ticket') {
      textContent = `
Ticket Purchase Confirmation

Ticket Number: ${templateData.ticketNumber}

Please find your QR code in the HTML version of this email.
      `;
    } else if (templateType === 'order') {
      const itemsList = templateData.items.map(item => 
        `${item.name} x${item.quantity} - KSh ${item.price * item.quantity}`
      ).join('\n');

      textContent = `
New Order Received

Order Details:
${itemsList}

Total Amount: KSh ${templateData.total}
Order Date: ${templateData.orderDate}
      `;
    } else if (templateType === 'donation') {
      textContent = `
New Donation Submission

Donor Name: ${templateData.name}
Email: ${templateData.email}
Phone: ${templateData.phone}
Address: ${templateData.address}
Donor Type: ${templateData.donorType}
Payment Method: ${templateData.paymentMethod}
Amount: KES ${templateData.amount}

Message:
${templateData.message}
      `;
    } else {
      textContent = `
Contact Form Submission

Name: ${templateData.name}
Email: ${templateData.email}
Phone: ${templateData.phone}

Message:
${templateData.message}
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
      replyTo: templateData.email
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