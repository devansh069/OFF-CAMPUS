const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/db');
const User = require('../models/User');
const College = require('../models/College');
const Event = require('../models/Event');
const { Op } = require('sequelize');

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

    return res.status(200).json({ access_token });
  } catch (error) {
    console.error('[Admin Login Error]:', error);
    return res.status(500).json({ detail: 'Admin login failed: ' + error.message });
  }
};

// 2. Get Dashboard Stats
exports.getStats = async (req, res) => {
  try {
    // Run counts directly using SQL queries to cover unmodeled tables
    const totalUsers = await User.count();
    const verifiedUsers = await User.count({ where: { verification_status: 'verified' } });
    const pendingVerifications = await User.count({
      where: {
        verification_status: 'pending',
        picture: { [Op.ne]: null }
      }
    });
    const premiumUsers = await User.count({ where: { is_premium: true } });
    const usersOnCampus = await User.count({ where: { is_on_campus: true } });

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
  try {
    const { userId } = req.params;
    const deleted = await User.destroy({ where: { user_id: userId } });
    if (!deleted) {
      return res.status(404).json({ detail: 'User not found' });
    }
    return res.status(200).json({ detail: 'User deleted successfully' });
  } catch (error) {
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
      request_id: u.user_id, // Map request_id to user_id for simplicity
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
    const { id } = req.params; // request_id maps to user_id
    const user = await User.findOne({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    user.verification_status = 'verified';
    await user.save();

    return res.status(200).json({ detail: 'Verification approved successfully', user });
  } catch (error) {
    console.error('[Admin ApproveVerif Error]:', error);
    return res.status(500).json({ detail: 'Failed to approve verification: ' + error.message });
  }
};

// 8. Reject ID Verification
exports.rejectVerification = async (req, res) => {
  try {
    const { id } = req.params; // request_id maps to user_id
    const user = await User.findOne({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    user.verification_status = 'rejected';
    await user.save();

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

    return res.status(200).json({ detail: 'Event rejected successfully', event });
  } catch (error) {
    console.error('[Admin RejectEvent Error]:', error);
    return res.status(500).json({ detail: 'Failed to reject event: ' + error.message });
  }
};
