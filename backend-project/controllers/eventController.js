// eventsController.js
const sendEmail = require('../mailer'); // Import the sendEmail function

exports.purchaseTicket = async (req, res) => {
  const { name, email } = req.body;

  try {
    // Send a confirmation email
    const subject = 'Your Ticket Confirmation';
    const text = `Hello ${name},\n\nThank you for purchasing a ticket. We'll see you at the event!\n\nBest regards,\nThe Team`;
    const html = `<h1>Hello, ${name}!</h1><p>Thank you for purchasing a ticket. See you soon!</p>`;

    await sendEmail(email, subject, text, html);

    res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email', error });
  }
};
