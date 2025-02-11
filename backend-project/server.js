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

// Create donations table
db.query(`CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    message TEXT,
    donor_type VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

// Create orders table
db.query(`CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    items JSON NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

// Route to handle merchandise orders
app.post('/api/send-order', async (req, res) => {
    try {
        const { items, total } = req.body;

        if (!items || !total) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Create email content
        const templateData = {
            items,
            total,
            orderDate: new Date().toLocaleString()
        };

        // Send email notification
        await sendEmail(
            'thefearlessmovement1@gmail.com',
            'New Merchandise Order',
            templateData,
            'order'
        );

        // Save to database
        const sql = 'INSERT INTO orders (items, total) VALUES (?, ?)';
        db.query(sql, [JSON.stringify(items), total], (err, result) => {
            if (err) {
                console.error('Error saving order to database:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save order'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Order processed successfully'
            });
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process order',
            error: error.message
        });
    }
});

// Route to handle donation submissions
app.post('/api/send-donation', async (req, res) => {
    try {
        const { 
            name, 
            email, 
            phone, 
            address,
            message,
            donorType,
            paymentMethod,
            amount,
            to,
            subject
        } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !address || !donorType || !paymentMethod || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Prepare template data for email
        const templateData = {
            name,
            email,
            phone,
            address,
            message: message || 'No message provided',
            donorType,
            paymentMethod,
            amount
        };

        // Send email notification
        await sendEmail(to, subject, templateData, 'donation');

        // Save to database
        const sql = `INSERT INTO donations 
            (name, email, phone, address, message, donor_type, payment_method, amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(sql, [
            name, 
            email, 
            phone, 
            address, 
            message || null, 
            donorType, 
            paymentMethod, 
            amount
        ], (err, result) => {
            if (err) {
                console.error('Error saving donation to database:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to save donation' 
                });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Donation processed successfully' 
            });
        });
    } catch (error) {
        console.error('Error processing donation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process donation', 
            error: error.message 
        });
    }
});

// Existing routes
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, name, email, phone, message } = req.body;
        
        if (!to || !subject || !name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. Please provide to, subject, name, email, and message.' 
            });
        }

        const templateData = {
            name,
            email,
            phone: phone || 'Not provided',
            message
        };
        
        await sendEmail(to, subject, templateData, 'contact');
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

app.post('/api/submit-form', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !phone || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const templateData = {
            name,
            email,
            phone,
            message
        };

        await sendEmail(
            process.env.RECEIVER_EMAIL || 'thefearlessmovement1@gmail.com',
            `New Contact Form Submission from ${name}`,
            templateData,
            'contact'
        );

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

app.get('/', (req, res) => {
    res.send('Get ready for the fearless!!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});