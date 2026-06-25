const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');

const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Public endpoints
router.post('/auth/verify-otp', authController.verifyOTP);
router.get('/colleges/list', authController.getCollegesList);
router.get('/colleges/:id', authController.getCollegeById);

// Protected endpoints
router.get('/auth/me', authMiddleware, authController.getCurrentUser);
router.post('/auth/onboard', authMiddleware, authController.onboard);
router.patch('/profile/update', authMiddleware, authController.onboard);
router.post('/profile/photos', authMiddleware, authController.uploadPhoto);
router.delete('/profile/photos/:index', authMiddleware, authController.deletePhoto);
router.post('/verification/submit', authMiddleware, authController.submitVerification);

// Admin endpoints (Public Login, rest Protected)
router.post('/admin/login', adminController.login);
router.get('/admin/stats', authMiddleware, adminMiddleware, adminController.getStats);
router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getUsers);
router.delete('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.deleteUser);
router.post('/admin/users/:userId/grant-premium', authMiddleware, adminMiddleware, adminController.grantPremium);
router.get('/admin/verification-requests', authMiddleware, adminMiddleware, adminController.getVerificationRequests);
router.post('/admin/verification/:id/approve', authMiddleware, adminMiddleware, adminController.approveVerification);
router.post('/admin/verification/:id/reject', authMiddleware, adminMiddleware, adminController.rejectVerification);
router.delete('/admin/confessions/:id', authMiddleware, adminMiddleware, adminController.deleteConfession);
router.get('/admin/pending-events', authMiddleware, adminMiddleware, adminController.getPendingEvents);
router.post('/admin/events/:id/approve', authMiddleware, adminMiddleware, adminController.approveEvent);
router.post('/admin/events/:id/reject', authMiddleware, adminMiddleware, adminController.rejectEvent);

// Event endpoints (Protected)
router.get('/events/feed', authMiddleware, eventController.getEventsFeed);
router.post('/events/create', authMiddleware, eventController.createEvent);
router.post('/events/:id/rsvp', authMiddleware, eventController.toggleRSVP);

module.exports = router;

