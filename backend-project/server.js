const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('./mailer');
const QRCode = require('qrcode');
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

// ==================== DATABASE TABLES CREATION ====================

// Update your users table creation to include new fields
db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating users table:', err);
    } else {
        console.log('Users table created or already exists.');
    }
});

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
);`, (err) => {
    if (err) {
        console.error('Error creating donations table:', err);
    } else {
        console.log('Donations table created or already exists.');
    }
});

// Create tickets table
db.query(`CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    ticket_number VARCHAR(50) NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating tickets table:', err);
    } else {
        console.log('Tickets table created or already exists.');
    }
});

// Create orders table
db.query(`CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    items JSON NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating orders table:', err);
    } else {
        console.log('Orders table created or already exists.');
    }
});

// Create emails table (for contact form submissions)
db.query(`CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating emails table:', err);
    } else {
        console.log('Emails table created or already exists.');
    }
});

//create admin  table
db.query(`CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`, (err) => {
    if (err) {
        console.error('Error creating admin table:', err);
    } else {
        console.log('Admin table created or already exists.');
    }
}
);
// Add this with your other table creation queries
db.query(`CREATE TABLE IF NOT EXISTS auth_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
)`, (err) => {
    if (err) {
        console.error('Error creating auth_users table:', err);
    } else {
        console.log('Auth_users table ready');
    }
});


// ==================== AUTHENTICATION FUNCTIONS ====================

// Function to send login notification email
const sendLoginNotification = async (email, username, loginTime, ipAddress) => {
    try {
        const templateData = {
            username,
            loginTime: new Date(loginTime).toLocaleString(),
            ipAddress
        };

        await sendEmail(
            email, 
            'Login Notification', 
            templateData, 
            'login'
        );
    } catch (error) {
        console.error('Error sending login notification:', error);
    }
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ 
            success: false, 
            message: 'No token provided' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// ==================== AUTHENTICATION ROUTES ====================

// ==================== ADMIN LOGIN ====================

// ==================== ADMIN REGISTRATION ====================
app.post('/api/register-admin', async (req, res) => {
    const { username, password, is_super_admin = false, email } = req.body;

    try {
        // Validate required fields
        if (!username || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, password, and email are required' 
            });
        }

        // Check if admin already exists
        const [existingAdmin] = await db.promise().query(
            'SELECT * FROM admin WHERE username = ? OR email = ?', 
            [username, email]
        );

        if (existingAdmin.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Admin username or email already exists' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new admin
        await db.promise().query(
            'INSERT INTO admin (username, password, is_super_admin, email) VALUES (?, ?, ?, ?)', 
            [username, hashedPassword, is_super_admin, email]
        );

        // Send welcome email to the new admin with their credentials
        try {
            await sendEmail(
                email,
                'Your Admin Account Credentials',
                { 
                    username, 
                    is_super_admin, 
                    password // This is the plain text password - consider security implications
                },
                'admin-created'
            );
        } catch (emailError) {
            console.error('Failed to send admin creation email:', emailError);
            // Don't fail the request, just log the error
        }

        res.status(201).json({
            success: true,
            message: 'Admin created successfully'
        });

    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during admin registration',
            error: error.message 
        });
    }
});


// Update the registration endpoint to send welcome email
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'All fields are required' 
        });
    }

    try {
        // Check if user exists
        const [existing] = await db.promise().query(
            'SELECT * FROM auth_users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        await db.promise().query(
            'INSERT INTO auth_users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        // Send welcome email to the new user
        try {
            await sendEmail(
                email,
                'Welcome to The Fearless Movement!',
                { 
                    username, 
                    email,
                    password // Note: This is the plain text password - consider security implications
                },
                'user-welcome'
            );
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the request, just log the error
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});
 
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    try {
        // Find user
        const [users] = await db.promise().query(
            'SELECT * FROM auth_users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await db.promise().query(
            'UPDATE auth_users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Create token
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            redirectTo: user.role === 'admin' ? 'admin.html' : 'dashboard.html'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});


// Protected Admin Route Example
app.get('/api/admin-dashboard', authenticateToken, (req, res) => {
    // Only authenticated admin users can access this route
    res.json({ 
        success: true, 
        message: 'Welcome to admin dashboard',
        user: req.user 
    });
});

// ==================== APPLICATION ROUTES ====================

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

// Route to handle ticket purchases
app.post('/api/purchase-ticket', async (req, res) => {
    try {
        const { name, email, phone, ticketType, quantity, totalCost } = req.body;

        if (!name || !email || !phone || !ticketType || !quantity || !totalCost) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.'
            });
        }

        // Generate a unique ticket number
        const ticketNumber = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Generate QR code
        const qrCodeData = `Ticket Number: ${ticketNumber}\nEvent: The Fearless Movement Camp\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`;
        const qrCodeImage = await QRCode.toDataURL(qrCodeData);

        // Save ticket to database
        const sql = 'INSERT INTO tickets (user_email, ticket_number, qr_code) VALUES (?, ?, ?)';
        db.query(sql, [email, ticketNumber, qrCodeImage], (err, result) => {
            if (err) {
                console.error('Error saving ticket to database:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save ticket'
                });
            }

            // Send email with ticket details
            const templateData = {
                name,
                email,
                phone,
                ticketType,
                quantity,
                totalCost,
                ticketNumber,
                qrCodeImage,
            };

            sendEmail(
                email,
                'Your Ticket Purchase Confirmation',
                templateData,
                'ticket'
            );

            res.status(200).json({
                success: true,
                message: 'Ticket purchased successfully',
                ticketNumber,
                qrCodeImage,
            });
        });
    } catch (error) {
        console.error('Error processing ticket purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process ticket purchase',
            error: error.message
        });
    }
});


//route to handle admin registration 
app.post('/api/register', async (req, res) => {
    try {
        const { email, firstName, lastName, password, phone } = req.body;

        // Validate required fields
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Email, first name, last name, and password are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                message: 'Please enter a valid email address' 
            });
        }

        // Validate password strength (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create username (email before @)
        const username = email.split('@')[0];

        // Insert new user
        await db.promise().query(
            'INSERT INTO users (username, email, password, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, email, hashedPassword, firstName, lastName, phone || null]
        );

        // In a real application, you would:
        // 1. Send a verification email
        // 2. Maybe generate a JWT token for immediate login
        // 3. Log the registration event

        res.status(201).json({
            success: true,
            message: 'Registration successful'
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration',
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

// Root route
app.get('/', (req, res) => {
    res.send('Get ready for the fearless!!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});