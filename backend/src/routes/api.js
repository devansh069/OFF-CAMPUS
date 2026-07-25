const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');
const confessionController = require('../controllers/confessionController');
const storyController = require('../controllers/storyController');
const spotifyController = require('../controllers/spotifyController');
const ambassadorController = require('../controllers/ambassadorController');
const referralController = require('../controllers/referralController');

const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Public endpoints
router.post('/auth/verify-otp', authController.verifyOTP);
router.get('/colleges/list', authController.getCollegesList);
router.get('/colleges/:id', authController.getCollegeById);
router.get('/users/all', authController.getAllUsersData);

// Protected endpoints
router.get('/auth/me', authMiddleware, authController.getCurrentUser);
router.post('/auth/onboard', authMiddleware, authController.onboard);
router.patch('/profile/update', authMiddleware, authController.onboard);
router.post('/profile/photos', authMiddleware, authController.uploadPhoto);
router.delete('/profile/photos/:index', authMiddleware, authController.deletePhoto);
router.post('/verification/submit', authMiddleware, authController.submitVerification);
router.post('/verification/send-email-otp', authMiddleware, authController.sendEmailOTP);
router.post('/verification/verify-email-otp', authMiddleware, authController.verifyEmailOTP);
router.post('/profile/spotify', authMiddleware, spotifyController.exchangeCode);

// Discovery and matching routes (Protected)
router.get('/discovery/profiles', authMiddleware, authController.getDiscoveryProfiles);
router.post('/discovery/like', authMiddleware, authController.likeUser);
router.post('/discovery/pass', authMiddleware, authController.passUser);
router.get('/discovery/likes-received', authMiddleware, authController.getLikesReceived);
router.get('/discovery/matches', authMiddleware, authController.getMatches);
router.post('/discovery/unmatch', authMiddleware, authController.unmatchUser);
router.post('/discovery/report', authMiddleware, authController.reportUser);
router.get('/discovery/live-count', authMiddleware, authController.getLiveCounts);

// Messages and conversations routes (Protected)
router.get('/messages/conversations', authMiddleware, authController.getConversations);
router.post('/messages/send', authMiddleware, authController.sendMessage);
router.post('/messages/upload-image', authMiddleware, authController.uploadChatImage);
router.post('/messages/upload-audio', authMiddleware, authController.uploadChatAudio);
router.get('/messages/:id', authMiddleware, authController.getMessages);

// Admin endpoints (Public Login, rest Protected)
router.post('/admin/login', adminController.login);
router.get('/admin/stats', authMiddleware, adminMiddleware, adminController.getStats);
router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getUsers);
router.delete('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.deleteUser);
router.post('/admin/users/:userId/grant-premium', authMiddleware, adminMiddleware, adminController.grantPremium);
router.get('/admin/verification-requests', adminController.getVerificationRequests);
router.post('/admin/verification/:id/approve', adminController.approveVerification);
router.post('/admin/verification/:id/reject', adminController.rejectVerification);
router.delete('/admin/confessions/:id', authMiddleware, adminMiddleware, adminController.deleteConfession);
router.get('/admin/pending-events', adminController.getPendingEvents);
router.post('/admin/events/:id/approve', adminController.approveEvent);
router.post('/admin/events/:id/reject', adminController.rejectEvent);

// Event endpoints (Protected, except /events which is public)
router.get('/events', eventController.getAllEvents);
router.get('/events/feed', authMiddleware, eventController.getEventsFeed);
router.post('/events/create', authMiddleware, eventController.createEvent);
router.post('/events/:id/rsvp', authMiddleware, eventController.toggleRSVP);
router.post('/events/:id/star', authMiddleware, eventController.toggleStar);

// Confessions endpoints
router.get('/confessions/feed', authMiddleware, confessionController.getConfessionsFeed);
router.post('/confessions/create', authMiddleware, confessionController.createConfession);
router.post('/confessions/:id/like', authMiddleware, confessionController.likeConfession);
router.get('/confessions/:id/comments', authMiddleware, confessionController.getComments);
router.post('/confessions/:id/comment', authMiddleware, confessionController.createComment);
router.get('/confessions/all', confessionController.getAllConfessions);
router.get('/confessions/likes/all', confessionController.getAllConfessionLikes);
router.get('/confessions/comments/all', confessionController.getAllComments);

// Stories endpoints
router.get('/stories/feed', authMiddleware, storyController.getStoriesFeed);
router.post('/stories/create', authMiddleware, storyController.createStory);
router.post('/stories/:id/view', authMiddleware, storyController.viewStory);

// Campus Ambassador endpoints
router.post('/ambassadors/apply', ambassadorController.applyAmbassador);
router.get('/ambassadors/all', ambassadorController.getAllAmbassadors);

// Referral endpoints
router.get('/referrals/my-stats', authMiddleware, referralController.getMyStats);

module.exports = router;

