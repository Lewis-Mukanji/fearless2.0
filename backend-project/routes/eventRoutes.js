// eventsRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController'); // Import the controller

// Route for ticket purchase
router.post('/purchase-ticket', eventController.purchaseTicket);

module.exports = router;
