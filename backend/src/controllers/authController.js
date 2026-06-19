const axios = require('axios');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Session, College } = require('../models');
const { generateReferralCode } = require('../utils/geo');
const { saveBase64Image } = require('../utils/fileUpload');

/**
 * Handles Google OAuth session validation and user sign-in/registration
 */
const googleSessionLogin = async (req, res) => {
  const { session_id, referral_code } = req.query; // parameters sent from client

  if (!session_id) {
    return res.status(400).json({ detail: 'Session ID is required' });
  }

  try {
    // Fetch session data from Emergent mock OAuth server
    let sessionData;
    try {
      const response = await axios.get(
        'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
        {
          headers: { 'X-Session-ID': session_id }
        }
      );
      sessionData = response.data;
    } catch (err) {
      console.error('Failed to fetch session data:', err.message);
      return res.status(401).json({ detail: 'Invalid session ID' });
    }

    const { email, name, picture, session_token } = sessionData;

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      // Update picture if it has changed
      if (picture && picture !== user.picture) {
        user.picture = picture;
        await user.save();
      }
    } else {
      // User registration flow
      const emailDomain = email.split('@')[1]?.toLowerCase() || '';

      // Auto-verify if email matches a seeded college domain
      // We search where email_domains JSON array contains emailDomain
      const matchingCollege = await College.findOne({
        where: {
          email_domains: {
            [Op.substring]: emailDomain // Simple substring search inside JSON or manual check
          }
        }
      });

      const refCode = generateReferralCode(name);
      const userId = `user_${crypto.randomBytes(6).toString('hex')}`;
      const verificationStatus = matchingCollege ? 'verified' : 'pending';
      const collegeId = matchingCollege ? matchingCollege.college_id : null;

      user = await User.create({
        user_id: userId,
        email,
        name,
        picture,
        verification_status: verificationStatus,
        college_id: collegeId,
        referral_code: refCode,
        referred_by: null,
        referral_count: 0,
        is_premium: false,
        premium_until: null
      });

      // Handle referral code processing
      if (referral_code) {
        const referrer = await User.findOne({ where: { referral_code } });
        if (referrer) {
          user.referred_by = referrer.user_id;
          await user.save();

          // Reward referrer with 7 days of premium
          let currentPremium = referrer.premium_until;
          let newPremiumDate;

          if (currentPremium && new Date(currentPremium) > new Date()) {
            newPremiumDate = new Date(new Date(currentPremium).getTime() + 7 * 24 * 60 * 60 * 1000);
          } else {
            newPremiumDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          }

          referrer.premium_until = newPremiumDate;
          referrer.is_premium = true;
          referrer.referral_count += 1;
          await referrer.save();
        }
      }
    }

    // Create a new user session (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Session.create({
      session_token,
      user_id: user.user_id,
      expires_at: expiresAt
    });

    res.json({
      session_token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Internal server error during authentication' });
  }
};

/**
 * Returns currently authenticated user profile
 */
const getMe = async (req, res) => {
  // req.user populated by authenticate middleware
  res.json({ user: req.user });
};

/**
 * Logs out and deletes active user session
 */
const logout = async (req, res) => {
  try {
    await Session.destroy({
      where: { session_token: req.token }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ detail: 'Failed to logout' });
  }
};

/**
 * Updates profile properties of active user
 */
const updateProfile = async (req, res) => {
  const { name, age, gender, college_id, year, course, bio, interests, looking_for } = req.body;
  const user = req.user;

  try {
    if (name !== undefined) user.name = name;
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender;
    if (college_id !== undefined) user.college_id = college_id;
    if (year !== undefined) user.year = year;
    if (course !== undefined) user.course = course;
    if (bio !== undefined) user.bio = bio;
    if (interests !== undefined) user.interests = interests;
    if (looking_for !== undefined) user.looking_for = looking_for;

    await user.save();
    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ detail: 'Failed to update profile' });
  }
};

/**
 * Uploads/adds profile photo to user photos array
 */
const addPhoto = async (req, res) => {
  const { photo } = req.body; // base64 string
  const user = req.user;

  if (!photo) {
    return res.status(400).json({ detail: 'Photo base64 data is required' });
  }

  try {
    const relativePath = saveBase64Image(photo, 'photos');

    // Append to user photos array
    const photos = [...user.photos, relativePath];
    user.photos = photos;
    await user.save();

    res.json({ user });
  } catch (error) {
    console.error('Add photo error:', error);
    res.status(500).json({ detail: 'Failed to upload photo' });
  }
};

/**
 * Removes photo by index from user photos array
 */
const deletePhoto = async (req, res) => {
  const index = parseInt(req.params.index);
  const user = req.user;

  try {
    const photos = [...user.photos];
    if (index >= 0 && index < photos.length) {
      photos.splice(index, 1);
      user.photos = photos;
      await user.save();
    }
    res.json({ user });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ detail: 'Failed to delete photo' });
  }
};

/**
 * Updates user spotify tracks & artists, awards vibe score bonus
 */
const updateSpotify = async (req, res) => {
  const { top_tracks, top_artists } = req.body;
  const user = req.user;

  try {
    user.spotify_data = {
      top_tracks: top_tracks || [],
      top_artists: top_artists || []
    };

    // Bonus vibe score (+0.5) if spotify data provided
    if ((top_tracks && top_tracks.length > 0) || (top_artists && top_artists.length > 0)) {
      user.vibe_score = Math.min(5.0, user.vibe_score + 0.5);
    }

    await user.save();
    res.json({ user });
  } catch (error) {
    console.error('Spotify update error:', error);
    res.status(500).json({ detail: 'Failed to update Spotify data' });
  }
};

/**
 * Bypasses Google OAuth for development, logging in directly with email
 */
const bypassLogin = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ detail: 'Email is required' });
  }

  try {
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create user automatically
      const name = email.split('@')[0];
      const refCode = generateReferralCode(name);
      const userId = `user_${crypto.randomBytes(6).toString('hex')}`;

      user = await User.create({
        user_id: userId,
        email,
        name,
        verification_status: 'verified',
        college_id: 'col_stephens', // default college
        referral_code: refCode,
        referred_by: null,
        referral_count: 0,
        is_premium: true,
        premium_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Create a new user session
    const sessionToken = `session_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      session_token: sessionToken,
      user_id: user.user_id,
      expires_at: expiresAt
    });

    res.json({
      session_token: sessionToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Bypass login error:', error);
    res.status(500).json({ detail: 'Internal server error during bypass login' });
  }
};

module.exports = {
  googleSessionLogin,
  bypassLogin,
  getMe,
  logout,
  updateProfile,
  addPhoto,
  deletePhoto,
  updateSpotify
};
