const express = require('express');
const sendEmail = require('../mailer'); // Import mailer function
const router = express.Router();

router.post('/send-email', async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const emailResponse = await sendEmail(to, subject, text, html);
        res.status(200).json({ message: 'Email sent successfully', response: emailResponse });
    } catch (error) {
        res.status(500).json({ error: 'Error sending email', details: error.message });
    }
});

module.exports = router;
