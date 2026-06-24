const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const User = require('../models/User');
const College = require('../models/College');

// Helper to generate JWT Token
const generateToken = (userId, phoneNumber) => {
  return jwt.sign(
    { user_id: userId, phone_number: phoneNumber },
    process.env.JWT_SECRET || 'super-secret-key-change-me',
    { expiresIn: '30d' }
  );
};

// 1. Verify OTP token from Firebase Client and handle initial login
exports.verifyOTP = async (req, res) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ detail: 'Firebase ID token is required' });
    }

    // Verify token using Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
      return res.status(400).json({ detail: 'Firebase token must contain a verified phone number' });
    }

    // Check if user exists by firebase_uid or phone_number
    let user = await User.findOne({
      where: { firebase_uid: uid }
    });

    if (!user) {
      user = await User.findOne({
        where: { phone_number: phone_number }
      });

      if (user) {
        // Link firebase_uid if it wasn't set yet
        user.firebase_uid = uid;
        await user.save();
      }
    }

    let exists = false;

    // User already exists in database
    if (user) {
      // Check if profile is complete (using name as proxy)
      exists = !!user.name;
    } else {
      // Create a shell user record
      const uniqueSuffix = Math.random().toString(36).substring(2, 9);
      user = await User.create({
        user_id: uid,
        firebase_uid: uid,
        phone_number: phone_number,
        verification_status: 'pending',
        vibe_score: 5,
        interests: [],
        photos: [],
        spotify_data: {},
        is_premium: false,
        is_on_campus: false,
        referral_code: `REF_${phone_number.replace(/\D/g, '') || uniqueSuffix}`
      });
    }

    // Generate session JWT token
    const token = generateToken(user.user_id, user.phone_number);

    return res.status(200).json({
      exists,
      user,
      token
    });
  } catch (error) {
    console.error('[verifyOTP Error]:', error);
    return res.status(401).json({ detail: 'Authentication failed: ' + error.message });
  }
};

// 2. Onboarding profile completion (Section 1 & 2)
exports.onboard = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Fetch shell user profile
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    const {
      name,
      age,
      gender,
      looking_for,
      height,
      location,
      latitude,
      longitude,
      photos,
      prompts,
      interests,
      religion,
      drink,
      smoke,
      weed,
      college_id,
      college_name,
      course,
      year
    } = req.body;

    // --- Onboarding Section 2: College Setup ---
    let collegeId = null;

    if (college_id) {
      const collegeExists = await College.findOne({ where: { college_id } });
      if (collegeExists) {
        collegeId = collegeExists.college_id;
      }
    }

    if (!collegeId && college_name) {
      // Search case-insensitively for existing college
      let college = await College.findOne({
        where: { name: college_name }
      });

      if (!college) {
        // If not found, dynamically generate a new college with auto-generated college_id
        const newCollegeId = 'col_' + Math.random().toString(36).substring(2, 9);
        const shortName = college_name.split(' ').map(w => w[0]).join('').toUpperCase() || 'COL';

        college = await College.create({
          college_id: newCollegeId,
          name: college_name,
          short_name: shortName,
          location: location || 'Unknown',
          latitude: latitude ? parseFloat(latitude) : 0.0,
          longitude: longitude ? parseFloat(longitude) : 0.0,
          email_domains: [],
          type: 'Other',
          city: 'Delhi' // default city fallback
        });
        console.log(`[Onboarding] Dynamically created new college: ${college_name} (${newCollegeId})`);
      }

      collegeId = college.college_id;
    }

    // --- Onboarding Section 1: Personal Profile Data ---
    // Update user details
    user.name = name || user.name;
    user.age = age ? parseInt(age, 10) : user.age;
    user.gender = gender || user.gender;
    user.looking_for = looking_for || user.looking_for;
    user.height = height ? parseInt(height, 10) : user.height;
    user.location = location || user.location;
    user.latitude = latitude ? parseFloat(latitude) : user.latitude;
    user.longitude = longitude ? parseFloat(longitude) : user.longitude;
    user.religion = religion || user.religion;
    user.drink = drink || user.drink;
    user.smoke = smoke || user.smoke;
    user.weed = weed || user.weed;
    user.course = course || user.course;
    user.year = year || user.year;
    user.college_id = collegeId || user.college_id;

    // Handle array / JSON types
    if (photos) user.photos = Array.isArray(photos) ? photos : JSON.parse(photos);
    if (prompts) user.prompts = typeof prompts === 'object' ? prompts : JSON.parse(prompts);
    if (interests) user.interests = Array.isArray(interests) ? interests : JSON.parse(interests);

    await user.save();

    // Fetch refreshed user record including associated college details
    const updatedUser = await User.findOne({
      where: { user_id: userId },
      include: [{ model: College, as: 'college' }]
    });

    return res.status(200).json({
      detail: 'Profile onboarding completed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('[Onboarding Error]:', error);
    return res.status(500).json({ detail: 'Failed to complete profile onboarding: ' + error.message });
  }
};

// 3. Submit ID Verification
exports.submitVerification = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { college_id, id_card_image } = req.body;

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    if (college_id) {
      user.college_id = college_id;
    }
    if (id_card_image) {
      user.picture = id_card_image;
    }
    user.verification_status = 'pending';
    await user.save();

    return res.status(200).json({
      detail: 'Verification submitted successfully',
      user
    });
  } catch (error) {
    console.error('[Submit Verification Error]:', error);
    return res.status(500).json({ detail: 'Failed to submit verification: ' + error.message });
  }
};
