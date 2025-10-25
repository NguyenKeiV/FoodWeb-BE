// routes/shipping.route.js
const express = require("express");
const ShippingController = require("../controllers/shipping");
const router = express.Router();

// Calculate shipping fee based on ward
router.post("/fee", ShippingController.calculateFee);

// Get all shipping rates
router.get("/rates", ShippingController.getAllRates);

// Validate ward
router.post("/validate", ShippingController.validateWard);

module.exports = router;
