const jwt = require('jsonwebtoken');
const emailService = require('../utils/emailService');
const { sendPushToUser } = require('../utils/pushNotification');
const { sequelize } = require('../config/db');
const User = require('../models/User');
const College = require('../models/College');
const CollegeMaster = require('../models/CollegeMaster');
const CollegeRequest = require('../models/CollegeRequest');
const Event = require('../models/Event');
const Op = {
  ne: '$ne',
  in: '$in',
  or: '$or',
  and: '$and',
  like: '$like',
  notLike: '$notLike'
};

// Helper to run query and return count
const getTableCount = async (queryStr, replacements = []) => {
  try {
    const [results] = await sequelize.query(queryStr, { replacements });
    return results[0]?.count || 0;
  } catch (err) {
    console.warn(`Query failed: ${queryStr}`, err.message);
    return 0;
  }
};

// 1. Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@offcampus.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'OffCampus@2026';

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ detail: 'Invalid administrator credentials' });
    }

    // Generate Admin JWT Token
    const access_token = jwt.sign(
      { user_id: 'admin_user', phone_number: 'admin', role: 'admin' },
      process.env.JWT_SECRET || 'super-secret-key-change-me',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      access_token,
      message: 'Admin authentication successful'
    });
  } catch (error) {
    console.error('[Admin Login Error]:', error);
    return res.status(500).json({ detail: 'Internal server error: ' + error.message });
  }
};

// 2. Admin Dashboard Stats
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await getTableCount('SELECT COUNT(*) as count FROM users');
    const verifiedUsers = await getTableCount("SELECT COUNT(*) as count FROM users WHERE verification_status = 'verified'");
    const pendingVerifications = await getTableCount("SELECT COUNT(*) as count FROM users WHERE verification_status = 'pending'");
    const premiumUsers = await getTableCount('SELECT COUNT(*) as count FROM users WHERE is_premium = 1');
    const usersOnCampus = await getTableCount('SELECT COUNT(*) as count FROM users WHERE is_on_campus = 1');
    const totalConfessions = await getTableCount('SELECT COUNT(*) as count FROM confessions');
    const totalMatches = await getTableCount('SELECT COUNT(*) as count FROM likes WHERE is_match = 1');
    const totalColleges = await getTableCount('SELECT COUNT(*) as count FROM college_master');

    return res.status(200).json({
      total_users: totalUsers,
      verified_users: verifiedUsers,
      pending_verifications: pendingVerifications,
      premium_users: premiumUsers,
      users_on_campus: usersOnCampus,
      total_confessions: totalConfessions,
      total_matches: totalMatches,
      total_colleges: totalColleges
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve stats: ' + error.message });
  }
};

// 3. Get User List
exports.getUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '200', 10);
    const users = await User.findAll({
      limit,
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ users });
  } catch (error) {
    console.error('[Admin GetUsers Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve users: ' + error.message });
  }
};

// 4. Delete User
exports.deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ detail: 'User not found' });
    }

    const replacements = { userId };

    // 2. Delete comments on confessions made by this user, then comments made by this user
    await sequelize.query('DELETE FROM comments WHERE confession_id IN (SELECT confession_id FROM confessions WHERE user_id = :userId)', { replacements, transaction });
    await sequelize.query('DELETE FROM comments WHERE user_id = :userId', { replacements, transaction });

    // 3. Delete confession likes on confessions made by this user, then likes made by this user
    try {
      await sequelize.query('DELETE FROM confession_likes WHERE confession_id IN (SELECT confession_id FROM confessions WHERE user_id = :userId)', { replacements, transaction });
      await sequelize.query('DELETE FROM confession_likes WHERE user_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 4. Delete confessions made by this user
    await sequelize.query('DELETE FROM confessions WHERE user_id = :userId', { replacements, transaction });

    // 5. Delete event stars/attendees associated with user's hosted events, then the user's stars/attendee entries
    try {
      await sequelize.query('DELETE FROM event_stars WHERE event_id IN (SELECT event_id FROM events WHERE host_user_id = :userId)', { replacements, transaction });
      await sequelize.query('DELETE FROM event_stars WHERE user_id = :userId', { replacements, transaction });
    } catch (e) {}

    await sequelize.query('DELETE FROM event_attendees WHERE event_id IN (SELECT event_id FROM events WHERE host_user_id = :userId)', { replacements, transaction });
    await sequelize.query('DELETE FROM event_attendees WHERE user_id = :userId', { replacements, transaction });

    // 6. Delete events hosted by this user
    await sequelize.query('DELETE FROM events WHERE host_user_id = :userId', { replacements, transaction });

    // 7. Delete stories
    await sequelize.query('DELETE FROM stories WHERE user_id = :userId', { replacements, transaction });

    // 8. Delete likes
    await sequelize.query('DELETE FROM likes WHERE from_user_id = :userId OR to_user_id = :userId', { replacements, transaction });

    // 9. Delete passed profiles
    try {
      await sequelize.query('DELETE FROM passed_profiles WHERE from_user_id = :userId OR to_user_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 10. Delete ratings
    await sequelize.query('DELETE FROM ratings WHERE from_user_id = :userId OR to_user_id = :userId', { replacements, transaction });

    // 11. Delete messages
    await sequelize.query('DELETE FROM messages WHERE from_user_id = :userId OR to_user_id = :userId', { replacements, transaction });

    // 12. Delete reports
    try {
      await sequelize.query('DELETE FROM reports WHERE from_user_id = :userId OR to_user_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 13. Delete referrals
    try {
      await sequelize.query('DELETE FROM referrals WHERE referrer_id = :userId OR referred_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 14. Delete notifications
    try {
      await sequelize.query('DELETE FROM notifications WHERE user_id = :userId OR sender_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 15. Delete coupon usages
    try {
      await sequelize.query('DELETE FROM coupon_usages WHERE user_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 16. Delete user sessions
    await sequelize.query('DELETE FROM user_sessions WHERE user_id = :userId', { replacements, transaction });

    // 17. Delete daily like counts
    try {
      await sequelize.query('DELETE FROM daily_like_counts WHERE user_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 18. Delete vibe score logs
    try {
      await sequelize.query('DELETE FROM vibe_score_logs WHERE user_id = :userId', { replacements, transaction });
    } catch (e) {}

    // 19. Delete verification requests
    await sequelize.query('DELETE FROM verification_requests WHERE user_id = :userId', { replacements, transaction });

    // 20. Delete primary user record
    await sequelize.query('DELETE FROM users WHERE user_id = :userId', { replacements, transaction });

    await transaction.commit();
    return res.status(200).json({ detail: 'User deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('[Admin DeleteUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to delete user: ' + error.message });
  }
};

// 5. Grant Premium
exports.grantPremium = async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days || '30', 10);

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    user.is_premium = true;
    user.premium_until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await user.save();

    try {
      if (user.email) {
        await emailService.sendPremiumWelcome(user.email, user.name);
        console.log(`[Admin Premium] Premium welcome email dispatched to ${user.email}`);
      }
    } catch (emailErr) {
      console.error(`[Admin Premium Email Error]: Failed to send welcome email: ${emailErr.message}`);
    }

    sendPushToUser({
      userId: user.user_id,
      title: 'You got Premium! 🎁',
      body: `You've been gifted ${days} days of Premium membership!`,
      data: { type: 'grant_premium', deepLink: '/(tabs)/profile' },
      category: 'premium'
    });

    return res.status(200).json({ detail: `Premium granted for ${days} days`, user });
  } catch (error) {
    console.error('[Admin GrantPremium Error]:', error);
    return res.status(500).json({ detail: 'Failed to grant premium: ' + error.message });
  }
};

// 6. Get Pending ID Verifications
exports.getVerificationRequests = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        verification_status: 'pending',
        picture: { [Op.ne]: null }
      },
      order: [['updated_at', 'DESC']]
    });

    const requests = users.map(u => ({
      request_id: u.user_id,
      user_id: u.user_id,
      id_card_image: u.picture,
      submitted_at: u.updated_at
    }));

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('[Admin GetVerifs Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve verification requests: ' + error.message });
  }
};

// 7. Approve ID Verification
exports.approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    user.verification_status = 'verified';
    user.verification_method = 'manual';
    user.rejection_reason = null;
    await user.save();

    try {
      if (user.email) {
        await emailService.sendVerificationApproval(user.email, user.name);
        console.log(`[Admin Verification] Approval email dispatched to ${user.email}`);
      }
    } catch (emailErr) {
      console.error(`[Admin Verification Email Error]: Failed to send approval email: ${emailErr.message}`);
    }

    sendPushToUser({
      userId: user.user_id,
      title: "You're verified! ✅",
      body: "Your student ID has been verified. Start exploring now!",
      data: { type: 'verification_approved', deepLink: '/(tabs)/discover' },
      category: 'verification'
    });

    return res.status(200).json({ detail: 'Verification approved successfully', user });
  } catch (error) {
    console.error('[Admin ApproveVerif Error]:', error);
    return res.status(500).json({ detail: 'Failed to approve verification: ' + error.message });
  }
};

// 8. Reject ID Verification
exports.rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = await User.findOne({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const rejectionReason = reason || 'The uploaded ID card image was blurry or invalid.';
    user.verification_status = 'rejected';
    user.rejection_reason = rejectionReason;
    await user.save();

    try {
      if (user.email) {
        await emailService.sendVerificationRejection(user.email, user.name, rejectionReason);
        console.log(`[Admin Verification] Rejection email dispatched to ${user.email}`);
      }
    } catch (emailErr) {
      console.error(`[Admin Verification Email Error]: Failed to send rejection email: ${emailErr.message}`);
    }

    sendPushToUser({
      userId: user.user_id,
      title: "Verification Update ⚠️",
      body: `Your ID verification was not approved. Reason: ${rejectionReason}`,
      data: { type: 'verification_rejected', deepLink: '/onboarding/verification' },
      category: 'verification'
    });

    return res.status(200).json({ detail: 'Verification rejected successfully', user });
  } catch (error) {
    console.error('[Admin RejectVerif Error]:', error);
    return res.status(500).json({ detail: 'Failed to reject verification: ' + error.message });
  }
};

// 9. Delete Confession
exports.deleteConfession = async (req, res) => {
  try {
    const { id } = req.params;
    await sequelize.query('DELETE FROM confessions WHERE confession_id = ?', {
      replacements: [id]
    });
    return res.status(200).json({ detail: 'Confession deleted successfully' });
  } catch (error) {
    console.error('[Admin DeleteConfession Error]:', error);
    return res.status(500).json({ detail: 'Failed to delete confession: ' + error.message });
  }
};

// 10. Get Pending Events
exports.getPendingEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'host', attributes: ['user_id', 'name', 'photos'] },
        { model: College, as: 'college', attributes: ['college_id', 'name', 'short_name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ events });
  } catch (error) {
    console.error('[Admin GetPendingEvents Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve pending events: ' + error.message });
  }
};

// 11. Approve Event
exports.approveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ where: { event_id: id } });
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    event.status = 'approved';
    await event.save();

    sendPushToUser({
      userId: event.host_user_id,
      title: 'Event Approved! 🎉',
      body: `Your event "${event.title}" is now live and visible to everyone!`,
      data: { type: 'event_approved', eventId: id, deepLink: '/(tabs)/events' },
      category: 'events'
    });

    return res.status(200).json({ detail: 'Event approved successfully', event });
  } catch (error) {
    console.error('[Admin ApproveEvent Error]:', error);
    return res.status(500).json({ detail: 'Failed to approve event: ' + error.message });
  }
};

// 12. Reject Event
exports.rejectEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ where: { event_id: id } });
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    event.status = 'rejected';
    await event.save();

    sendPushToUser({
      userId: event.host_user_id,
      title: 'Event Update ⚠️',
      body: `Your event "${event.title}" was not approved.`,
      data: { type: 'event_rejected', deepLink: '/(tabs)/events' },
      category: 'events'
    });

    return res.status(200).json({ detail: 'Event rejected successfully', event });
  } catch (error) {
    console.error('[Admin RejectEvent Error]:', error);
    return res.status(500).json({ detail: 'Failed to reject event: ' + error.message });
  }
};

// 13. Get Pending College Requests
exports.getPendingCollegeRequests = async (req, res) => {
  try {
    const requests = await CollegeRequest.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('[Admin College Requests Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch pending college requests: ' + error.message });
  }
};

// 14. Approve College Request
exports.approveCollegeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;

    const request = await CollegeRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ detail: 'College request not found' });
    }

    const collegeName = request.college_name;
    const collegeId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Add to CollegeMaster table
    await CollegeMaster.upsert({
      college_id: collegeId,
      college_name: collegeName,
      short_name: collegeName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 8),
      affiliation_university: request.affiliation_university || null,
      city: request.city || 'Delhi NCR',
      type: 'Private'
    });

    // Add to College active table
    await College.upsert({
      college_id: collegeId,
      name: collegeName,
      short_name: collegeName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 8),
      location: request.city || 'Delhi NCR',
      latitude: 28.6139,
      longitude: 77.2090,
      email_domains: [],
      type: 'Private',
      city: request.city || 'Delhi NCR'
    });

    // Update Request status
    request.status = 'approved';
    request.admin_notes = adminNotes || 'Approved by Admin';
    await request.save();

    // Update requesting user profile
    const user = await User.findByPk(request.user_id);
    if (user) {
      user.college_id = collegeId;
      user.college_name = collegeName;
      user.college_request_status = 'approved';
      await user.save();

      sendPushToUser({
        userId: user.user_id,
        title: 'College Added! 🏫',
        body: `Your college "${collegeName}" has been added to Off-Campus!`,
        data: { type: 'college_approved', deepLink: '/(tabs)/profile' },
        category: 'general'
      });
    }

    return res.status(200).json({
      message: `College "${collegeName}" approved and added to system master data. User access unlocked.`,
      request,
      user
    });
  } catch (error) {
    console.error('[Approve College Request Error]:', error);
    return res.status(500).json({ detail: 'Failed to approve college request: ' + error.message });
  }
};

// 15. Reject College Request
exports.rejectCollegeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;

    const request = await CollegeRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ detail: 'College request not found' });
    }

    request.status = 'rejected';
    request.admin_notes = adminNotes || 'Rejected by Admin';
    await request.save();

    const user = await User.findByPk(request.user_id);
    if (user) {
      user.college_request_status = 'rejected';
      await user.save();
    }

    return res.status(200).json({
      message: 'College request rejected',
      request
    });
  } catch (error) {
    console.error('[Reject College Request Error]:', error);
    return res.status(500).json({ detail: 'Failed to reject college request: ' + error.message });
  }
};
