const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, VerificationRequest, Confession, Comment, Session, Like, College } = require('../models');

// Configure admin defaults from env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@offcampus.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'OffCampus@2026';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// Helper to check credentials and generate token
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (email !== ADMIN_EMAIL) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }

  // Allow plain text comparison or hash comparison. Let's do direct string compare to ensure simplicity, 
  // or compare with prehashed if admin password is pre-configured. Since this is an admin panel for dev, 
  // direct check matching the python code is best. In python:
  // bcrypt.checkpw(request.password.encode(), ADMIN_PASSWORD_HASH.encode())
  // Wait! The python code hashes ADMIN_PASSWORD from env, so it matches. Let's do bcrypt compare:
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const isMatch = bcrypt.compareSync(password, hash);

  if (!isMatch) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }

  // Create JWT Token
  const token = jwt.sign(
    { sub: ADMIN_EMAIL, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ access_token: token, token_type: 'bearer' });
};

const adminMe = async (req, res) => {
  res.json({ email: req.adminEmail, role: 'admin' });
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const verifiedUsers = await User.count({ where: { verification_status: 'verified' } });
    const pendingUsers = await User.count({ where: { verification_status: 'pending' } });
    const premiumUsers = await User.count({ where: { is_premium: true } });
    const onCampus = await User.count({ where: { is_on_campus: true } });
    const totalConfessions = await Confession.count();
    const totalColleges = await College.count();
    
    // matches count in python: total_matches = db.likes.count({"is_match": True}) // 2
    const totalLikesMatch = await Like.count({ where: { is_match: true } });
    const totalMatches = Math.floor(totalLikesMatch / 2);

    res.json({
      total_users: totalUsers,
      verified_users: verifiedUsers,
      pending_verifications: pendingUsers,
      premium_users: premiumUsers,
      users_on_campus: onCampus,
      total_confessions: totalConfessions,
      total_matches: totalMatches,
      total_colleges: totalColleges
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ detail: 'Failed to retrieve stats' });
  }
};

const listUsers = async (req, res) => {
  const { status, search } = req.query;
  const limit = parseInt(req.query.limit) || 100;

  const whereClause = {};
  if (status) {
    whereClause.verification_status = status;
  }
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  try {
    const users = await User.findAll({
      where: whereClause,
      limit
    });
    res.json({ users, count: users.length });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ detail: 'Failed to search users' });
  }
};

const deleteUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    await user.destroy(); // Cascade deletes will handle sessions, likes, and requests if foreign keys are configured, 
    // but let's clean them manually just in case constraints aren't active in local MySQL:
    await Session.destroy({ where: { user_id } });
    await Like.destroy({ where: { [Op.or]: [{ from_user_id: user_id }, { to_user_id: user_id }] } });
    await VerificationRequest.destroy({ where: { user_id } });

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ detail: 'Failed to delete user' });
  }
};

const grantPremium = async (req, res) => {
  const { user_id } = req.params;
  const days = parseInt(req.query.days) || 30;

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const premiumUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    user.is_premium = true;
    user.premium_until = premiumUntil;
    await user.save();

    res.json({ message: `Premium granted for ${days} days` });
  } catch (error) {
    console.error('Grant premium error:', error);
    res.status(500).json({ detail: 'Failed to update user premium status' });
  }
};

const getVerificationRequests = async (req, res) => {
  try {
    const requests = await VerificationRequest.findAll({
      where: { status: 'pending' }
    });
    res.json({ requests });
  } catch (error) {
    console.error('Get verification requests error:', error);
    res.status(500).json({ detail: 'Failed to retrieve verification requests' });
  }
};

const approveVerification = async (req, res) => {
  const { request_id } = req.params;
  const adminEmail = req.adminEmail;

  try {
    const request = await VerificationRequest.findByPk(request_id);
    if (!request) {
      return res.status(404).json({ detail: 'Request not found' });
    }

    request.status = 'verified';
    request.reviewed_at = new Date();
    request.reviewed_by = adminEmail;
    await request.save();

    // Verify user profile
    await User.update(
      { verification_status: 'verified' },
      { where: { user_id: request.user_id } }
    );

    res.json({ message: 'Verification approved' });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({ detail: 'Failed to approve request' });
  }
};

const rejectVerification = async (req, res) => {
  const { request_id } = req.params;
  const adminEmail = req.adminEmail;

  try {
    const request = await VerificationRequest.findByPk(request_id);
    if (!request) {
      return res.status(404).json({ detail: 'Request not found' });
    }

    request.status = 'rejected';
    request.reviewed_at = new Date();
    request.reviewed_by = adminEmail;
    await request.save();

    // Reject user profile verification status
    await User.update(
      { verification_status: 'rejected' },
      { where: { user_id: request.user_id } }
    );

    res.json({ message: 'Verification rejected' });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({ detail: 'Failed to reject request' });
  }
};

const deleteConfession = async (req, res) => {
  const { confession_id } = req.params;

  try {
    const confession = await Confession.findByPk(confession_id);
    if (!confession) {
      return res.status(404).json({ detail: 'Confession not found' });
    }

    await confession.destroy();
    await Comment.destroy({ where: { confession_id } });

    res.json({ message: 'Confession deleted' });
  } catch (error) {
    console.error('Delete confession error:', error);
    res.status(500).json({ detail: 'Failed to delete confession' });
  }
};

module.exports = {
  adminLogin,
  adminMe,
  getStats,
  listUsers,
  deleteUser,
  grantPremium,
  getVerificationRequests,
  approveVerification,
  rejectVerification,
  deleteConfession
};
