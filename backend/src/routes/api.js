const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public endpoints
router.post('/auth/verify-otp', authController.verifyOTP);

// Protected endpoints
router.post('/auth/onboard', authMiddleware, authController.onboard);

module.exports = router;
