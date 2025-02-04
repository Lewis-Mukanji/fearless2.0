const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Ensure your DB config is correctly imported

// POST route for contact form
router.post('/contactus', async (req, res) => {
    const { email, phone, name, message } = req.body;

    if (!email || !phone || !name || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Insert the data into your database
        const sql = "INSERT INTO contact (email, phone, name, message) VALUES (?, ?, ?, ?)";
        await db.promise().query(sql, [email, phone, name, message]);
        res.status(200).json({ success: "Your message has been sent!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong!" });
    }
});

module.exports = router;
