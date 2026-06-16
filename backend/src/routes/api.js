const express = require('express');
const router = express.Router();

// Import middlewares
const { authenticate, verifyAdmin } = require('../middlewares/auth');

// Import controllers
const authController = require('../controllers/authController');
const collegeController = require('../controllers/collegeController');
const discoveryController = require('../controllers/discoveryController');
const confessionController = require('../controllers/confessionController');
const messageController = require('../controllers/messageController');
const adminController = require('../controllers/adminController');
const socialController = require('../controllers/socialController');
const paymentController = require('../controllers/paymentController');

// ============= HEALTH CHECKS =============
router.get('/', (req, res) => res.json({ message: 'Off Campus API', status: 'online' }));
router.get('/health', (req, res) => res.json({ status: 'healthy' }));

// ============= AUTHENTICATION & PROFILES =============
router.post('/auth/google-session', authController.googleSessionLogin);
router.post('/auth/bypass-login', authController.bypassLogin);
router.get('/auth/me', authenticate, authController.getMe);
router.post('/auth/logout', authenticate, authController.logout);

router.patch('/profile/update', authenticate, authController.updateProfile);
router.post('/profile/photos', authenticate, authController.addPhoto);
router.delete('/profile/photos/:index', authenticate, authController.deletePhoto);
router.post('/profile/spotify', authenticate, authController.updateSpotify);

// ============= COLLEGES & VERIFICATION =============
router.get('/colleges/list', collegeController.listColleges);
router.get('/colleges/:college_id', collegeController.getCollege);
router.post('/verification/submit', authenticate, collegeController.submitVerification);

// ============= LOCATION & CHECK-INS =============
router.post('/location/update', authenticate, collegeController.updateLocation);
router.get('/location/campus-users', authenticate, collegeController.getCampusUsers);

// ============= DISCOVERY & MATCHING =============
router.get('/discovery/profiles', authenticate, discoveryController.getDiscoveryProfiles);
router.post('/discovery/like', authenticate, discoveryController.likeUser);
router.post('/discovery/pass', authenticate, discoveryController.passUser);
router.get('/discovery/matches', authenticate, discoveryController.getMatches);

// ============= RATING SYSTEM =============
router.post('/ratings/create', authenticate, discoveryController.createRating);

// ============= CONFESSIONS FEED =============
router.post('/confessions/create', authenticate, confessionController.createConfession);
router.get('/confessions/feed', authenticate, confessionController.getConfessionsFeed);
router.post('/confessions/:confession_id/like', authenticate, confessionController.likeConfession);
router.post('/confessions/:confession_id/comment', authenticate, confessionController.addComment);
router.get('/confessions/:confession_id/comments', authenticate, confessionController.getComments);

// ============= CHAT & MESSAGING =============
router.post('/messages/send', authenticate, messageController.sendMessage);
router.get('/messages/conversations', authenticate, messageController.getConversations);
router.get('/messages/:other_user_id', authenticate, messageController.getMessages);

// ============= STRIPE & PAYMENTS =============
router.post('/premium/checkout', authenticate, paymentController.createCheckout);
router.get('/premium/status/:session_id', authenticate, paymentController.checkPaymentStatus);

// ============= LEADERBOARD =============
router.get('/leaderboard/top-vibes', authenticate, socialController.topVibes);

// ============= EVENTS & FESTS =============
router.post('/events/create', authenticate, socialController.createEvent);
router.get('/events/feed', authenticate, socialController.eventsFeed);
router.post('/events/:event_id/rsvp', authenticate, socialController.rsvpEvent);
router.get('/events/:event_id/attendees', authenticate, socialController.eventAttendees);

// ============= ACTIVE STORIES (24h) =============
router.post('/stories/create', authenticate, socialController.createStory);
router.get('/stories/feed', authenticate, socialController.storiesFeed);
router.post('/stories/:story_id/view', authenticate, socialController.viewStory);

// ============= ADMIN BACKOFFICE PANEL =============
router.post('/admin/login', adminController.adminLogin);
router.get('/admin/me', verifyAdmin, adminController.adminMe);
router.get('/admin/stats', verifyAdmin, adminController.getStats);
router.get('/admin/users', verifyAdmin, adminController.listUsers);
router.delete('/admin/users/:user_id', verifyAdmin, adminController.deleteUser);
router.post('/admin/users/:user_id/grant-premium', verifyAdmin, adminController.grantPremium);
router.get('/admin/verification-requests', verifyAdmin, adminController.getVerificationRequests);
router.post('/admin/verification/:request_id/approve', verifyAdmin, adminController.approveVerification);
router.post('/admin/verification/:request_id/reject', verifyAdmin, adminController.rejectVerification);
router.delete('/admin/confessions/:confession_id', verifyAdmin, adminController.deleteConfession);

module.exports = router;
