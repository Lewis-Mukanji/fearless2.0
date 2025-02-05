const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const sendEmail = require('./mailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Route to send general emails
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, name, email, phone, message } = req.body;
        
        // Validate required fields
        if (!to || !subject || !name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. Please provide to, subject, name, email, and message.' 
            });
        }

        // Prepare template data
        const templateData = {
            name,
            email,
            phone: phone || 'Not provided',
            message
        };
        
        await sendEmail(to, subject, templateData);
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

// Handle form submissions, send email, and save to MySQL
db.query(`CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

app.post('/api/submit-form', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !phone || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Prepare template data
        const templateData = {
            name,
            email,
            phone,
            message
        };

        // Send email
        await sendEmail(
            process.env.RECEIVER_EMAIL || 'mukanjilewis94@gmail.com',
            `New Contact Form Submission from ${name}`,
            templateData
        );

        // Insert data into MySQL database
        const sql = 'INSERT INTO emails (name, email, phone, message) VALUES (?, ?, ?, ?)';
        db.query(sql, [name, email, phone, message], (err, result) => {
            if (err) {
                console.error('Error inserting data into database:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            console.log('Data inserted into database:', result);
            res.status(200).json({ success: true, message: 'Form submitted successfully and saved to database' });
        });
    } catch (error) {
        console.error('Error processing form submission:', error);
        res.status(500).json({ success: false, message: 'Failed to submit form', error: error.message });
    }
});

// Default route
app.get('/', (req, res) => {
    res.send('Get ready for the fearless!!');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});