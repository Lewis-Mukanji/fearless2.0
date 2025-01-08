const express = require("express");
const mysql = require("mysql2");
const app = express();
const port = 3000;

// MySQL Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", // Replace with your password
    database: "fearlessdb"  // Replace with your database name
});

// Check database connection
db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL Database!");
    }
});

// Route to fetch users (example)
app.get("/users", (req, res) => {
    db.query("SELECT * FROM users", (err, results) => {
        if (err) {
            console.error("Error fetching data:", err);
            res.status(500).send("Error fetching data");
        } else {
            res.json(results);
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
