const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public endpoints
router.post('/auth/verify-otp', authController.verifyOTP);

// Protected endpoints
router.post('/auth/onboard', authMiddleware, authController.onboard);
router.patch('/profile/update', authMiddleware, authController.onboard);
router.post('/verification/submit', authMiddleware, authController.submitVerification);

module.exports = router;
