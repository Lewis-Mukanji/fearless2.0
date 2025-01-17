const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Example route: Fetch all users
router.get('/users', (req, res) => {
    const sql = 'SELECT * FROM users'; // Replace 'users' with your table name
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

module.exports = router;
