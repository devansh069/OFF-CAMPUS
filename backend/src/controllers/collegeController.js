const crypto = require('crypto');
const { Op } = require('sequelize');
const { College, User, VerificationRequest } = require('../models');
const { calculateDistance } = require('../utils/geo');
const { saveBase64Image } = require('../utils/fileUpload');

/**
 * Returns list of all seeded colleges
 */
const listColleges = async (req, res) => {
  try {
    const colleges = await College.findAll();
    res.json({ colleges });
  } catch (error) {
    console.error('List colleges error:', error);
    res.status(500).json({ detail: 'Failed to retrieve colleges list' });
  }
};

/**
 * Returns specific college details by ID
 */
const getCollege = async (req, res) => {
  const { college_id } = req.params;
  try {
    const college = await College.findByPk(college_id);
    if (!college) {
      return res.status(404).json({ detail: 'College not found' });
    }
    res.json({ college });
  } catch (error) {
    console.error('Get college error:', error);
    res.status(500).json({ detail: 'Failed to retrieve college details' });
  }
};

/**
 * Updates user location and calculates on-campus status
 */
const updateLocation = async (req, res) => {
  const { latitude, longitude } = req.body;
  const user = req.user;

  if (!latitude || !longitude) {
    return res.status(400).json({ detail: 'Latitude and longitude are required' });
  }

  if (!user.college_id) {
    return res.status(400).json({ detail: 'Please select a college first' });
  }

  try {
    const college = await College.findByPk(user.college_id);
    if (!college) {
      return res.status(404).json({ detail: 'User college record not found' });
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      college.latitude,
      college.longitude
    );

    const isOnCampus = distance <= 0.5; // within 500 meters

    user.is_on_campus = isOnCampus;
    user.last_location_update = new Date();
    await user.save();

    res.json({
      is_on_campus: isOnCampus,
      distance_km: parseFloat(distance.toFixed(2))
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ detail: 'Failed to update location' });
  }
};

/**
 * Returns list of verified users checked into the same campus within the last 30 minutes
 */
const getCampusUsers = async (req, res) => {
  const user = req.user;

  if (!user.college_id) {
    return res.json({ users: [], count: 0 });
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const campusUsers = await User.findAll({
      where: {
        college_id: user.college_id,
        is_on_campus: true,
        user_id: { [Op.ne]: user.user_id },
        verification_status: 'verified',
        last_location_update: { [Op.gte]: thirtyMinutesAgo }
      },
      attributes: { exclude: ['email'] }
    });

    res.json({
      users: campusUsers,
      count: campusUsers.length
    });
  } catch (error) {
    console.error('Get campus users error:', error);
    res.status(500).json({ detail: 'Failed to retrieve checked-in users' });
  }
};

/**
 * Submits student ID verification request
 */
const submitVerification = async (req, res) => {
  const { college_id, id_card_image } = req.body;
  const user = req.user;

  if (!college_id || !id_card_image) {
    return res.status(400).json({ detail: 'College ID and ID card image are required' });
  }

  try {
    // Save image to filesystem and get path
    const imagePath = saveBase64Image(id_card_image, 'verifications');
    const requestId = `req_${crypto.randomBytes(6).toString('hex')}`;

    await VerificationRequest.create({
      request_id: requestId,
      user_id: user.user_id,
      college_id,
      id_card_image: imagePath,
      status: 'pending'
    });

    // Update user properties
    user.college_id = college_id;
    user.verification_status = 'pending';
    await user.save();

    res.json({
      message: 'Verification request submitted',
      request_id: requestId
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({ detail: 'Failed to submit verification request' });
  }
};

module.exports = {
  listColleges,
  getCollege,
  updateLocation,
  getCampusUsers,
  submitVerification
};
