// eventsRoutes.js
const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController'); // Import the controller

// Route for ticket purchase
router.post('/purchase-ticket', eventsController.purchaseTicket);

module.exports = router;
