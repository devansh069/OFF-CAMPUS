const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const User = require('../models/User');
const College = require('../models/College');
const Like = require('../models/Like');
const Message = require('../models/Message');
const Referral = require('../models/Referral');
const VibeScoreLog = require('../models/VibeScoreLog');
const Report = require('../models/Report');
const DailyLikeCount = require('../models/DailyLikeCount');
const PassedProfile = require('../models/PassedProfile');
const Op = {
  in: '$in',
  notIn: '$notIn',
  ne: '$ne',
  or: '$or',
  and: '$and',
  notLike: '$notLike',
  like: '$like'
};
const { sequelize } = require('../config/db');
const cloudinary = require('cloudinary').v2;
const emailService = require('../utils/emailService');

if (process.env.CLOUDINARY_URL) {
  console.log('[Cloudinary] Configured automatically via CLOUDINARY_URL');
} else {
  console.log('[Cloudinary] Configured manually via individual keys');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY || '12345',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'abcde',
  });
}

// Helper to upload base64 string to Cloudinary
const uploadToCloudinary = async (base64Str) => {
  try {
    let formattedStr = base64Str;
    if (!formattedStr.startsWith('data:')) {
      formattedStr = `data:image/jpeg;base64,${formattedStr}`;
    }
    const uploadResponse = await cloudinary.uploader.upload(formattedStr, {
      folder: 'off_campus_profiles',
      resource_type: 'image'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('[Cloudinary Upload Error]:', error);
    throw error;
  }
};

// Helper to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  try {
    if (!url || !url.includes('/image/upload/')) return null;
    const parts = url.split('/image/upload/');
    const pathAndVersion = parts[1];
    const cleanPath = pathAndVersion.replace(/^v\d+\//, '');
    const publicId = cleanPath.substring(0, cleanPath.lastIndexOf('.')) || cleanPath;
    return publicId;
  } catch (err) {
    return null;
  }
};

// Helper to generate JWT Token
const generateToken = (userId, phoneNumber) => {
  return jwt.sign(
    { user_id: userId, phone_number: phoneNumber },
    process.env.JWT_SECRET || 'super-secret-key-change-me',
    { expiresIn: '30d' }
  );
};

const emailOtps = new Map();

// 1. Verify OTP token from Firebase Client and handle initial login
exports.verifyOTP = async (req, res) => {
  try {
    const { firebaseToken, referralCode } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ detail: 'Firebase ID token is required' });
    }

    let uid, phone_number, email, name, picture;

    // Check for development bypass token
    if ((!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_BYPASS === 'true') && firebaseToken.startsWith('dev-token-')) {
      const devVal = firebaseToken.replace('dev-token-', '');
      if (devVal.includes('@')) {
        email = devVal;
        uid = 'dev_user_' + email.replace(/[^a-zA-Z0-9]/g, '');
        name = 'Mock Google User';
      } else {
        phone_number = devVal;
        uid = 'dev_user_' + phone_number.replace(/\D/g, '');
      }
      console.log(`[Auth Dev Bypass] Logging in with dev bypass: ${devVal}`);
    } else {
      // Verify token using Firebase Admin SDK
      const decodedToken = await auth.verifyIdToken(firebaseToken);
      uid = decodedToken.uid;
      phone_number = decodedToken.phone_number;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;

      if (!phone_number && !email) {
        return res.status(400).json({ detail: 'Firebase token must contain a verified phone number or email' });
      }
    }

    // Check if user exists by firebase_uid, phone_number, or email
    let user = await User.findOne({
      where: { firebase_uid: uid }
    });

    if (!user) {
      if (phone_number) {
        user = await User.findOne({
          where: { phone_number: phone_number }
        });
      } else if (email) {
        user = await User.findOne({
          where: { email: email }
        });
      }

      if (user) {
        // Link firebase_uid if it wasn't set yet
        user.firebase_uid = uid;
        if (email && !user.email) user.email = email;
        await user.save();
      }
    }

    let exists = false;

    // User already exists in database
    if (user) {
      // Check if profile is complete (using year / course as onboarding complete proxy, as name is pre-filled from Google)
      exists = !!(user.college_id && user.age);
    } else {
      // Create a shell user record
      const uniqueSuffix = Math.random().toString(36).substring(2, 9);
      user = await User.create({
        user_id: uid,
        firebase_uid: uid,
        phone_number: phone_number || null,
        email: email || null,
        name: name || '',
        picture: picture || null,
        verification_status: 'pending',
        vibe_score: 10,
        interests: [],
        photos: picture ? [picture] : [],
        spotify_data: {},
        is_premium: false,
        is_on_campus: false,
        referral_code: `REF_${phone_number ? phone_number.replace(/\D/g, '') : uniqueSuffix}`
      });
    }

    // Handle Referral Logic — runs for ALL users (new & returning), duplicate-safe
    if (referralCode) {
      try {
        const referrer = await User.findOne({ where: { referral_code: referralCode } });
        if (referrer && referrer.user_id !== user.user_id) {
          // Strict duplicate check — one referral per referred user, ever
          const existingReferral = await Referral.findOne({ where: { referred_id: user.user_id } });
          if (!existingReferral) {
            console.log(`[Referral] Recording referral: ${referrer.user_id} referred ${user.user_id}`);

            // Record in referrals table
            await Referral.create({
              referrer_id: referrer.user_id,
              referred_id: user.user_id
            });

            // Increment referral count
            referrer.total_referrals = (referrer.total_referrals || 0) + 1;
            const tr = referrer.total_referrals;
            console.log(`[Referral] ${referrer.user_id} now has ${tr} total referral(s)`);

            const oldScore = (referrer.vibe_score !== null && referrer.vibe_score !== undefined)
              ? parseFloat(referrer.vibe_score)
              : 10.0;

            if (tr === 1) {
              referrer.vibe_score = Math.min(oldScore + 2, 10);
              await VibeScoreLog.create({
                user_id: referrer.user_id,
                reason: '1st Referral: Friend joined using your code',
                change_amount: parseFloat((referrer.vibe_score - oldScore).toFixed(2)),
                new_score: referrer.vibe_score
              });
            } else if (tr === 3) {
              referrer.profile_visibility = 1.5;
              await VibeScoreLog.create({
                user_id: referrer.user_id,
                reason: '3rd Referral: 1.5x Profile Visibility unlocked',
                change_amount: 0,
                new_score: referrer.vibe_score
              });
            } else if (tr === 5) {
              referrer.vibe_score = 10;
              await VibeScoreLog.create({
                user_id: referrer.user_id,
                reason: '5th Referral: Instant 10/10 Vibe Score!',
                change_amount: parseFloat((10 - oldScore).toFixed(2)),
                new_score: 10
              });
            } else if (tr === 7) {
              referrer.profile_visibility = 2.0;
              await VibeScoreLog.create({
                user_id: referrer.user_id,
                reason: '7th Referral: 2.0x Ultimate Visibility unlocked',
                change_amount: 0,
                new_score: referrer.vibe_score
              });
            } else if (tr >= 10 && !referrer.has_event_pass) {
              referrer.has_event_pass = true;
              await VibeScoreLog.create({
                user_id: referrer.user_id,
                reason: '10th Referral: Free Off-Campus Event Pass earned!',
                change_amount: 0,
                new_score: referrer.vibe_score
              });
            } else {
              // Log every other referral too (2nd, 4th, 6th, 8th, 9th)
              await VibeScoreLog.create({
                user_id: referrer.user_id,
                reason: `Referral #${tr}: Friend joined using your code`,
                change_amount: 0,
                new_score: referrer.vibe_score
              });
            }

            await referrer.save();
            console.log(`[Referral] Referrer ${referrer.user_id} saved. New vibe_score: ${referrer.vibe_score}, total_referrals: ${referrer.total_referrals}`);
          } else {
            console.log(`[Referral] Skipped: ${user.user_id} was already referred by someone.`);
          }
        } else {
          console.log(`[Referral] Code invalid or self-referral attempt. referrer found: ${!!referrer}`);
        }
      } catch (refErr) {
        console.error('[Referral Error] Referral processing failed silently:', refErr);
      }
    }



    // Fetch refreshed user record including associated college details
    const fullUser = await User.findOne({
      where: { user_id: user.user_id },
      include: [{ model: College, as: 'college' }]
    });

    // Generate session JWT token
    const token = generateToken(user.user_id, user.phone_number);

    return res.status(200).json({
      exists,
      user: fullUser || user,
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
      bio,
      gender,
      gender_preference,
      height,
      location,
      latitude,
      longitude,
      photos,
      picture,
      cover_photo,
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
    user.bio = bio !== undefined ? bio : user.bio;
    user.gender = gender || user.gender;
    user.gender_preference = gender_preference || user.gender_preference;
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

    // Main Photo & Cover Photo explicitly provided or fallback
    if (picture) user.picture = picture;
    if (cover_photo) user.cover_photo = cover_photo;

    // Handle array / JSON types
    if (photos) {
      const photosArray = Array.isArray(photos) ? photos : JSON.parse(photos);
      const updatedPhotos = [];
      for (let photo of photosArray) {
        if (photo.startsWith('data:image') || photo.length > 1000) {
          try {
            console.log('[Cloudinary] Uploading onboarding profile photo...');
            const cloudinaryUrl = await uploadToCloudinary(photo);
            updatedPhotos.push(cloudinaryUrl);
          } catch (uploadErr) {
            console.error('[Onboarding Photo Upload Failure]:', uploadErr.message || uploadErr);
            // Fallback to a placeholder URL instead of saving massive base64 strings to DB
            updatedPhotos.push('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop');
          }
        } else {
          updatedPhotos.push(photo);
        }
      }
      user.photos = updatedPhotos;

      // Automatically assign Main Photo (picture) to photo 1 if not set
      if (updatedPhotos.length > 0 && !user.picture) {
        user.picture = updatedPhotos[0];
      }
      // Automatically assign Cover Photo to photo 2 (or photo 1 fallback) if not set
      if (updatedPhotos.length > 0 && !user.cover_photo) {
        user.cover_photo = updatedPhotos[1] || updatedPhotos[0];
      }
    }
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

// 3. Submit ID Verification (Manual review up to 12 hrs)
exports.submitVerification = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { college_id, id_card_image } = req.body;

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    if (college_id && !college_id.startsWith('col_custom_')) {
      user.college_id = college_id;
    }
    if (id_card_image) {
      if (id_card_image.startsWith('data:')) {
        try {
          console.log('[Verification] Uploading ID card image to Cloudinary...');
          const cloudUrl = await uploadToCloudinary(id_card_image);
          user.picture = cloudUrl;
        } catch (cloudErr) {
          console.warn('[Verification] Cloudinary upload failed, storing fallback string:', cloudErr.message);
          user.picture = id_card_image.substring(0, 50000); // prevent MySQL text column overflow
        }
      } else {
        user.picture = id_card_image;
      }
    }
    user.verification_status = 'pending';
    await user.save();

    console.log(`[Verification] User ${userId} submitted ID card for manual verification.`);
    return res.status(200).json({
      detail: 'Verification submitted successfully. Admin review takes up to 12 hours.',
      user
    });
  } catch (error) {
    console.error('[Submit Verification Error]:', error);
    return res.status(500).json({ detail: 'Failed to submit verification: ' + error.message });
  }
};

// 3b. Send OTP to College Email for Instant Verification
exports.sendEmailOTP = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ detail: 'Please enter a valid college email address' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    emailOtps.set(userId, {
      email,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Dynamically reload .env so any edits to backend/.env take effect instantly without restarting server
    require('dotenv').config();

    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;

    let emailSent = false;
    if (smtpUser) {
      try {
        await emailService.sendVerificationOTP(email, otp);
        console.log(`[Email Verification] Successfully sent live OTP email via emailService to ${email}`);
        emailSent = true;
      } catch (mailErr) {
        console.error(`[EmailService Error]: Failed to send live email: ${mailErr.message}`);
        console.log(`[Email Verification Fallback] OTP for ${email} is: [ ${otp} ]`);
      }
    } else {
      console.log(`\n======================================================`);
      console.log(`[EmailService] SMTP not configured in .env (SMTP_USER/SMTP_PASS).`);
      console.log(`To enable sending live emails to user inbox, add credentials to backend/.env.`);
      console.log(`Sent verification email to: ${email}`);
      console.log(`YOUR COLLEGE EMAIL OTP IS: [ ${otp} ]`);
      console.log(`======================================================\n`);
    }

    return res.status(200).json({
      detail: emailSent ? 'Live OTP email dispatched via Resend!' : 'SMTP not configured or failed to send. Use dev code to test.',
      dev_otp: !emailSent ? otp : undefined
    });
  } catch (error) {
    console.error('[Send Email OTP Error]:', error);
    return res.status(500).json({ detail: 'Failed to send OTP: ' + error.message });
  }
};

// 3c. Verify College Email OTP (Instant Blue Tick)
exports.verifyEmailOTP = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ detail: 'OTP is required' });
    }

    const record = emailOtps.get(userId);
    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ detail: 'OTP has expired or not requested. Please resend.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ detail: 'Invalid OTP entered. Please try again.' });
    }

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    user.email = record.email;
    user.verification_status = 'verified';
    await user.save();

    emailOtps.delete(userId);
    console.log(`[Email Verification] User ${userId} successfully verified college email ${record.email}! Blue tick awarded.`);

    return res.status(200).json({
      detail: 'Email verified! You have been awarded the verified blue tick.',
      user
    });
  } catch (error) {
    console.error('[Verify Email OTP Error]:', error);
    return res.status(500).json({ detail: 'Failed to verify OTP: ' + error.message });
  }
};

// 4. Get currently logged in user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await User.findOne({
      where: { user_id: userId },
      include: [{ model: College, as: 'college' }]
    });

    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    checkHandshakeReset(user);
    if (user.changed()) {
      await user.save();
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('[getCurrentUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve user profile: ' + error.message });
  }
};

// 5. Get list of all colleges
exports.getCollegesList = async (req, res) => {
  try {
    const colleges = await College.findAll();
    return res.status(200).json({ colleges });
  } catch (error) {
    console.error('[getCollegesList Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve colleges: ' + error.message });
  }
};

// 6. Get college by ID
exports.getCollegeById = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await College.findOne({ where: { college_id: id } });
    if (!college) {
      return res.status(404).json({ detail: 'College not found' });
    }
    return res.status(200).json({ college });
  } catch (error) {
    console.error('[getCollegeById Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve college: ' + error.message });
  }
};

// 7. Upload single profile photo to Cloudinary and append to user's photos array
exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { photo } = req.body; // base64 string

    if (!photo) {
      return res.status(400).json({ detail: 'Photo data is required' });
    }

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    console.log('[Cloudinary] Uploading single profile photo...');
    const cloudinaryUrl = await uploadToCloudinary(photo);

    // Append to user's photos list
    const currentPhotos = user.photos || [];
    user.photos = [...currentPhotos, cloudinaryUrl];
    await user.save();

    return res.status(200).json({
      detail: 'Photo uploaded successfully',
      photoUrl: cloudinaryUrl,
      photos: user.photos
    });
  } catch (error) {
    console.error('[uploadPhoto Error]:', error);
    return res.status(500).json({ detail: 'Failed to upload photo: ' + error.message });
  }
};

// 8. Delete single profile photo by index
exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { index } = req.params;
    const photoIdx = parseInt(index, 10);

    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    const currentPhotos = user.photos || [];
    if (photoIdx < 0 || photoIdx >= currentPhotos.length) {
      return res.status(400).json({ detail: 'Invalid photo index' });
    }

    const deletedPhotoUrl = currentPhotos[photoIdx];

    // Remove from array
    const updatedPhotos = [...currentPhotos];
    updatedPhotos.splice(photoIdx, 1);
    user.photos = updatedPhotos;
    await user.save();

    // Try to delete from Cloudinary asynchronously
    try {
      const publicId = getPublicIdFromUrl(deletedPhotoUrl);
      if (publicId) {
        console.log(`[Cloudinary] Deleting image from Cloudinary: ${publicId}`);
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (destroyErr) {
      console.warn('[Cloudinary Delete Warning]: Failed to delete image from Cloudinary storage:', destroyErr.message);
    }

    return res.status(200).json({
      detail: 'Photo deleted successfully',
      photos: user.photos
    });
  } catch (error) {
    console.error('[deletePhoto Error]:', error);
    return res.status(500).json({ detail: 'Failed to delete photo: ' + error.message });
  }
};

// 6. Get discovery profiles to swipe
exports.getDiscoveryProfiles = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    // Fetch the full current user profile to get their preferences
    const currentUser = await User.findOne({
      where: { user_id: currentUserId }
    });

    if (!currentUser) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Find all users current user has already liked or passed
    const swipedLikes = await Like.findAll({
      where: { from_user_id: currentUserId },
      attributes: ['to_user_id']
    });

    const passedProfiles = await PassedProfile.findAll({
      where: { from_user_id: currentUserId },
      attributes: ['to_user_id']
    });

    const swipedUserIds = [
      ...swipedLikes.map(l => l.to_user_id),
      ...passedProfiles.map(p => p.to_user_id),
      currentUserId
    ];

    const whereClause = {
      user_id: { [Op.notIn]: swipedUserIds },
      name: { [Op.ne]: null }, // Only show real (onboarded) profiles
      verification_status: 'verified' // Only show verified profiles in Vibe page!
    };





    // Find other users
    const profiles = await User.findAll({
      where: whereClause,
      include: [{ model: College, as: 'college' }]
    });

    // If targetUserId is requested, prepend them to the list
    let finalProfiles = profiles;
    const targetUserId = req.query.targetUserId;
    if (targetUserId) {
      try {
        const targetProfile = await User.findOne({
          where: { user_id: targetUserId },
          include: [{ model: College, as: 'college' }]
        });
        if (targetProfile) {
          finalProfiles = [targetProfile, ...profiles.filter(p => p.user_id !== targetUserId)];
        }
      } catch (e) {
        console.error('[targetUserId Prepend Error]:', e);
      }
    }

    return res.status(200).json({ profiles: finalProfiles });
  } catch (error) {
    console.error('[getDiscoveryProfiles Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch profiles: ' + error.message });
  }
};

// 7. Like a user profile (with Free tier 6 likes/day limit, reset at 5:30 AM IST)
exports.likeUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { target_user_id } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ detail: 'target_user_id is required' });
    }

    // Check if user is premium
    const currentUser = await User.findOne({ where: { user_id: currentUserId } });
    if (!currentUser || currentUser.verification_status !== 'verified') {
      return res.status(403).json({
        error: 'unverified_user',
        detail: 'You must verify your student profile before sending likes to anyone!',
        verification_status: currentUser ? currentUser.verification_status : 'unverified',
        rejection_reason: currentUser ? currentUser.rejection_reason : null
      });
    }

    const isPremium = currentUser ? currentUser.is_premium : false;

    const todayDate = new Date().toISOString().split('T')[0]; // Resets at 00:00 UTC = 5:30 AM IST

    let likesRemaining = null;

    if (!isPremium) {
      let [dailyRecord] = await DailyLikeCount.findOrCreate({
        where: { user_id: currentUserId, reset_date: todayDate },
        defaults: { count: 0 }
      });

      if (dailyRecord.count >= 6) {
        return res.status(403).json({
          error: 'daily_limit_reached',
          detail: 'Free daily limit of 6 likes reached! Upgrade to Premium for unlimited likes.',
          likes_remaining: 0,
          is_premium: false
        });
      }

      dailyRecord.count += 1;
      await dailyRecord.save();
      likesRemaining = Math.max(0, 6 - dailyRecord.count);
    }

    // Check if target user has liked current user
    const receivedLike = await Like.findOne({
      where: { from_user_id: target_user_id, to_user_id: currentUserId }
    });

    let isMatch = false;
    const likeId = `${currentUserId}_${target_user_id}`;

    if (receivedLike) {
      isMatch = true;
      receivedLike.is_match = true;
      await receivedLike.save();

      await Like.upsert({
        like_id: likeId,
        from_user_id: currentUserId,
        to_user_id: target_user_id,
        is_match: true
      });
    } else {
      await Like.upsert({
        like_id: likeId,
        from_user_id: currentUserId,
        to_user_id: target_user_id,
        is_match: false
      });
    }

    return res.status(200).json({
      is_match: isMatch,
      likes_remaining: likesRemaining,
      is_premium: isPremium
    });
  } catch (error) {
    console.error('[likeUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to like user: ' + error.message });
  }
};

// 8. Pass a user profile (and record for rewind)
exports.passUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { target_user_id } = req.body;

    if (target_user_id) {
      await PassedProfile.create({
        from_user_id: currentUserId,
        to_user_id: target_user_id
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[passUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to pass user: ' + error.message });
  }
};

// 8a. Revert last rejected profile for Premium users (1-revert limit)
exports.revertPassUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const currentUser = await User.findOne({ where: { user_id: currentUserId } });

    if (!currentUser || !currentUser.is_premium) {
      return res.status(403).json({
        error: 'premium_required',
        detail: 'Reverting a rejected profile is a Premium feature. Upgrade to Premium!'
      });
    }

    // Find the latest passed record for this user
    const lastPass = await PassedProfile.findOne({
      where: { from_user_id: currentUserId },
      order: [['created_at', 'DESC']]
    });

    if (!lastPass) {
      return res.status(404).json({ detail: 'No rejected profile available to revert.' });
    }

    const revertedUserId = lastPass.to_user_id;
    await lastPass.destroy(); // Remove from PassedProfile so they can be suggested again once

    const revertedProfile = await User.findOne({
      where: { user_id: revertedUserId },
      include: [{ model: College, as: 'college' }]
    });

    return res.status(200).json({
      success: true,
      profile: revertedProfile,
      detail: 'Last rejected profile reverted successfully.'
    });
  } catch (error) {
    console.error('[revertPassUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to revert pass: ' + error.message });
  }
};

// 8b. Get Daily Likes Status
exports.getDailyLikesStatus = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const currentUser = await User.findOne({ where: { user_id: currentUserId } });
    const isPremium = currentUser ? currentUser.is_premium : false;

    if (isPremium) {
      return res.status(200).json({
        is_premium: true,
        likes_remaining: 999,
        likes_used: 0
      });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const record = await DailyLikeCount.findOne({
      where: { user_id: currentUserId, reset_date: todayDate }
    });

    const likesUsed = record ? record.count : 0;
    const likesRemaining = Math.max(0, 6 - likesUsed);

    return res.status(200).json({
      is_premium: false,
      likes_used: likesUsed,
      likes_remaining: likesRemaining
    });
  } catch (error) {
    console.error('[getDailyLikesStatus Error]:', error);
    return res.status(500).json({ detail: 'Failed to get daily likes status: ' + error.message });
  }
};

// 8c. Get Skipped/Passed Profiles for Revisit (Premium Feature)
exports.getSkippedProfiles = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const currentUser = await User.findOne({ where: { user_id: currentUserId } });

    if (!currentUser || !currentUser.is_premium) {
      return res.status(403).json({
        error: 'premium_required',
        detail: 'Revisiting skipped profiles is a Premium feature. Upgrade to Premium!'
      });
    }

    const passedRecords = await PassedProfile.findAll({
      where: { from_user_id: currentUserId },
      order: [['created_at', 'DESC']],
      limit: 20
    });

    const passedUserIds = passedRecords.map(p => p.to_user_id);

    const profiles = await User.findAll({
      where: {
        user_id: { [Op.in]: passedUserIds }
      },
      include: [{ model: College, as: 'college' }]
    });

    return res.status(200).json({ profiles });
  } catch (error) {
    console.error('[getSkippedProfiles Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch skipped profiles: ' + error.message });
  }
};

// 9. Get likes received
exports.getLikesReceived = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    // Get all likes received where is_match = 0 and is not a pass
    const receivedLikes = await Like.findAll({
      where: { 
        to_user_id: currentUserId, 
        is_match: false,
        like_id: { [Op.notLike]: 'pass_%' }
      },
      attributes: ['from_user_id', 'is_handshake']
    });

    const senderIds = receivedLikes.map(l => l.from_user_id);
    const handshakeMap = receivedLikes.reduce((acc, l) => {
      acc[l.from_user_id] = l.is_handshake;
      return acc;
    }, {});

    const likes = await User.findAll({
      where: {
        user_id: { [Op.in]: senderIds }
      },
      include: [{ model: College, as: 'college' }]
    });

    const formattedLikes = likes.map(user => {
      const u = user.toJSON();
      u.is_handshake = handshakeMap[u.user_id] || false;
      return u;
    });

    return res.status(200).json({ likes: formattedLikes });
  } catch (error) {
    console.error('[getLikesReceived Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve likes received: ' + error.message });
  }
};

// 10. Get matched profiles
exports.getMatches = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    // Matches are rows in likes where is_match = 1 and from_user_id = currentUserId
    const matchesList = await Like.findAll({
      where: { from_user_id: currentUserId, is_match: true },
      attributes: ['to_user_id', 'tag']
    });

    const matchUserIds = matchesList.map(m => m.to_user_id);
    const tagMap = matchesList.reduce((acc, m) => {
      acc[m.to_user_id] = m.tag;
      return acc;
    }, {});

    const matches = await User.findAll({
      where: {
        user_id: { [Op.in]: matchUserIds }
      },
      include: [{ model: College, as: 'college' }]
    });

    const formattedMatches = matches.map(user => {
      const u = user.toJSON();
      u.assigned_tag = tagMap[u.user_id] || null;
      return u;
    });

    return res.status(200).json({ matches: formattedMatches });
  } catch (error) {
    console.error('[getMatches Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve matches: ' + error.message });
  }
};

// 11. Get conversations lists
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    // A conversation exists if there is a match or messages exchanged
    const matchesList = await Like.findAll({
      where: { from_user_id: currentUserId, is_match: true },
      attributes: ['to_user_id']
    });

    const uniqueChats = await sequelize.query(
      `SELECT DISTINCT 
        CASE 
          WHEN from_user_id = :userId THEN to_user_id 
          ELSE from_user_id 
        END as partner_id
       FROM messages 
       WHERE from_user_id = :userId OR to_user_id = :userId`,
      {
        replacements: { userId: currentUserId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const chatPartnerIds = uniqueChats.map(c => c.partner_id);
    const matchPartnerIds = matchesList.map(m => m.to_user_id);

    // Union both lists of user IDs
    const partnerIdsSet = new Set([...chatPartnerIds, ...matchPartnerIds]);
    const partnerIds = Array.from(partnerIdsSet);

    const conversations = [];

    for (const partnerId of partnerIds) {
      const partner = await User.findOne({
        where: { user_id: partnerId },
        include: [{ model: College, as: 'college' }]
      });

      if (!partner) continue;

      // Get last message
      const lastMessage = await Message.findOne({
        where: {
          [Op.or]: [
            { from_user_id: currentUserId, to_user_id: partnerId },
            { from_user_id: partnerId, to_user_id: currentUserId }
          ]
        },
        order: [['created_at', 'DESC']]
      });

      // Get unread count
      const unreadCount = await Message.count({
        where: {
          from_user_id: partnerId,
          to_user_id: currentUserId,
          read: false
        }
      });

      // Find the tag assigned to this partner
      const likeRel = await Like.findOne({
        where: { from_user_id: currentUserId, to_user_id: partnerId, is_match: true },
        attributes: ['tag']
      });

      conversations.push({
        user: partner,
        last_message: lastMessage,
        unread_count: unreadCount,
        assigned_tag: likeRel ? likeRel.tag : null
      });
    }

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error('[getConversations Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve conversations: ' + error.message });
  }
};

// 12. Get messages with a user
exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { id: partnerId } = req.params;

    // Mark partner's messages to currentUser as read
    await Message.update(
      { read: true },
      { where: { from_user_id: partnerId, to_user_id: currentUserId, read: false } }
    );

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { from_user_id: currentUserId, to_user_id: partnerId },
          { from_user_id: partnerId, to_user_id: currentUserId }
        ]
      },
      order: [['created_at', 'ASC']]
    });

    return res.status(200).json({ messages });
  } catch (error) {
    console.error('[getMessages Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve messages: ' + error.message });
  }
};

// 13. Send a message to a user
exports.sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { to_user_id, content, message_type, image_url } = req.body;

    if (!to_user_id || (!content && !image_url)) {
      return res.status(400).json({ detail: 'to_user_id and content/image_url are required' });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message = await Message.create({
      message_id: messageId,
      from_user_id: currentUserId,
      to_user_id,
      content: content || 'Sent an image',
      message_type: message_type || 'text',
      image_url: image_url || null,
      read: false
    });

    // Emit real-time message event via Socket.io
    const io = req.app.get('io');
    if (io) {
      console.log(`[Socket] Broadcasting new_message to room: ${to_user_id}`);
      io.to(to_user_id).emit('new_message', message.toJSON());
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error('[sendMessage Error]:', error);
    return res.status(500).json({ detail: 'Failed to send message: ' + error.message });
  }
};

// 14. Upload chat image to Cloudinary
exports.uploadChatImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ detail: 'No image data provided' });
    }
    console.log('[Chat Cloudinary] Uploading chat image...');
    const imageUrl = await uploadToCloudinary(image);
    return res.status(200).json({ image_url: imageUrl });
  } catch (error) {
    console.error('[UploadChatImage Error]:', error);
    return res.status(500).json({ detail: 'Failed to upload chat image: ' + error.message });
  }
};

// Helper to perform unmatch (delete likes and messages between both users)
const executeUnmatch = async (userId, targetUserId) => {
  await Like.destroy({
    where: {
      [Op.or]: [
        { from_user_id: userId, to_user_id: targetUserId },
        { from_user_id: targetUserId, to_user_id: userId }
      ]
    }
  });

  await Message.destroy({
    where: {
      [Op.or]: [
        { from_user_id: userId, to_user_id: targetUserId },
        { from_user_id: targetUserId, to_user_id: userId }
      ]
    }
  });
};

// 14. Unmatch a user
exports.unmatchUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { target_user_id } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ detail: 'target_user_id is required' });
    }

    await executeUnmatch(currentUserId, target_user_id);

    return res.status(200).json({ success: true, detail: 'Successfully unmatched user' });
  } catch (error) {
    console.error('[unmatchUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to unmatch user: ' + error.message });
  }
};

// 15. Report and automatically unmatch a user
exports.reportUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { target_user_id, reason } = req.body;

    if (!target_user_id || !reason) {
      return res.status(400).json({ detail: 'target_user_id and reason are required' });
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await Report.create({
      report_id: reportId,
      from_user_id: currentUserId,
      to_user_id: target_user_id,
      reason: reason
    });

    // Calculate total reports against this user
    const totalReports = await Report.count({ where: { to_user_id: target_user_id } });

    // Apply the progressive penalty to vibe score
    const targetUser = await User.findOne({ where: { user_id: target_user_id } });
    if (targetUser) {
      const currentVibeScore = (targetUser.vibe_score !== null && targetUser.vibe_score !== undefined)
        ? parseFloat(targetUser.vibe_score)
        : 10.0;
      
      const penalty = 1.0;
      const newVibeScore = Math.max(0.0, parseFloat((currentVibeScore - penalty).toFixed(2)));
      const changeAmount = parseFloat((newVibeScore - currentVibeScore).toFixed(2));
      
      targetUser.vibe_score = newVibeScore;
      await targetUser.save();
      
      await VibeScoreLog.create({
        user_id: target_user_id,
        reason: `Reported by user (Total reports: ${totalReports})`,
        change_amount: changeAmount,
        new_score: newVibeScore
      });
    }

    await executeUnmatch(currentUserId, target_user_id);

    return res.status(200).json({ success: true, detail: 'Report submitted successfully and user unmatched' });
  } catch (error) {
    console.error('[reportUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to report user: ' + error.message });
  }
};

// 16. Get all data from users table
exports.getAllUsersData = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        { model: College, as: 'college', attributes: ['college_id', 'name', 'short_name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ users });
  } catch (error) {
    console.error('[getAllUsersData Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve all users data: ' + error.message });
  }
};

exports.getVibeScoreHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const history = await VibeScoreLog.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json(history);
  } catch (error) {
    console.error('[getVibeScoreHistory Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch vibe score history.' });
  }
};

// Upload Audio (Voice Note) to Cloudinary
const uploadAudioToCloudinary = async (base64Str) => {
  try {
    let formattedStr = base64Str;
    if (!formattedStr.startsWith('data:')) {
      formattedStr = `data:audio/mp4;base64,${formattedStr}`;
    }
    const uploadResponse = await cloudinary.uploader.upload(formattedStr, {
      folder: 'off_campus_voice_notes',
      resource_type: 'video' // Required by Cloudinary for audio files
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('[Cloudinary Audio Upload Error]:', error);
    throw error;
  }
};

exports.uploadChatAudio = async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) {
      return res.status(400).json({ detail: 'No audio data provided' });
    }
    console.log('[Chat Cloudinary] Uploading voice note...');
    const audioUrl = await uploadAudioToCloudinary(audio);
    return res.status(200).json({ audio_url: audioUrl });
  } catch (error) {
    console.error('[UploadChatAudio Error]:', error);
    return res.status(500).json({ detail: 'Failed to upload voice note: ' + error.message });
  }
};

exports.getLiveCounts = async (req, res) => {
  try {
    const user = await User.findOne({ where: { user_id: req.user.user_id } });
    const globalCount = await User.count();
    let collegeCount = 0;
    if (user && user.college_id) {
      collegeCount = await User.count({ where: { college_id: user.college_id } });
    }
    return res.status(200).json({ global: globalCount, college: collegeCount });
  } catch (error) {
    console.error('[getLiveCounts Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch live counts' });
  }
};

exports.getChosenTags = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.user_id },
      attributes: ['chosen_tags']
    });
    let tags = [];
    if (user && user.chosen_tags) {
      tags = typeof user.chosen_tags === 'string' ? JSON.parse(user.chosen_tags) : user.chosen_tags;
    }
    return res.status(200).json({ tags });
  } catch (error) {
    console.error('[getChosenTags Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve chosen tags: ' + error.message });
  }
};

exports.saveChosenTags = async (req, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ detail: 'Tags must be an array' });
    }
    if (tags.length > 5) {
      return res.status(400).json({ detail: 'You can choose up to 5 tags only' });
    }
    const user = await User.findOne({ where: { user_id: req.user.user_id } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    user.chosen_tags = tags;
    await user.save();
    return res.status(200).json({ success: true, tags });
  } catch (error) {
    console.error('[saveChosenTags Error]:', error);
    return res.status(500).json({ detail: 'Failed to save chosen tags: ' + error.message });
  }
};

exports.assignTagToMatch = async (req, res) => {
  try {
    const { target_user_id, tag } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ detail: 'Target user ID is required' });
    }
    const like = await Like.findOne({
      where: { from_user_id: req.user.user_id, to_user_id: target_user_id, is_match: true }
    });
    if (!like) {
      return res.status(404).json({ detail: 'Match relationship not found' });
    }
    like.tag = tag || null;
    await like.save();
    return res.status(200).json({ success: true, tag: like.tag });
  } catch (error) {
    console.error('[assignTagToMatch Error]:', error);
    return res.status(500).json({ detail: 'Failed to assign tag: ' + error.message });
  }
};

// Nearby location matching controllers

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.updateCurrentLocation = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    await User.update(
      { current_latitude: latitude, current_longitude: longitude },
      { where: { user_id: currentUserId } }
    );

    return res.status(200).json({ success: true, message: 'Current location updated successfully' });
  } catch (e) {
    console.error('[updateCurrentLocation Error]:', e);
    return res.status(500).json({ detail: 'Failed to update location: ' + e.message });
  }
};

exports.getNearbyUsers = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const range = parseFloat(req.query.range) || 50; // default 50km

    // Fetch current user
    const currentUser = await User.findOne({
      where: { user_id: currentUserId }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    checkHandshakeReset(currentUser);
    if (currentUser.changed()) {
      await currentUser.save();
    }

    const myLat = currentUser.current_latitude !== null ? currentUser.current_latitude : currentUser.latitude;
    const myLon = currentUser.current_longitude !== null ? currentUser.current_longitude : currentUser.longitude;

    if (myLat === null || myLon === null) {
      return res.status(400).json({ error: 'Location coordinates not set for current user. Please update location first.' });
    }

    // Fetch sent likes by this user to determine matches and handshakes
    const sentLikes = await Like.findAll({
      where: { from_user_id: currentUserId }
    });
    const matchUserIds = new Set();
    const handshakeUserIds = new Set();
    for (const l of sentLikes) {
      if (l.is_match) {
        matchUserIds.add(l.to_user_id);
      } else if (l.is_handshake) {
        handshakeUserIds.add(l.to_user_id);
      }
    }

    // Fetch passed profiles by this user
    const passed = await PassedProfile.findAll({
      where: { from_user_id: currentUserId },
      attributes: ['to_user_id']
    });
    const passedUserIds = new Set(passed.map(p => p.to_user_id));

    // Fetch all onboarded and verified other users
    const allUsers = await User.findAll({
      where: {
        user_id: { [Op.ne]: currentUserId },
        name: { [Op.ne]: null },
        verification_status: 'verified'
      },
      include: [{ model: College, as: 'college' }]
    });

    const nearbyProfiles = [];

    for (const u of allUsers) {
      const uLat = u.current_latitude !== null ? u.current_latitude : u.latitude;
      const uLon = u.current_longitude !== null ? u.current_longitude : u.longitude;

      if (uLat !== null && uLon !== null) {
        const dist = getDistanceKm(myLat, myLon, uLat, uLon);
        if (dist <= range) {
          const userJSON = u.toJSON();
          userJSON.distance = parseFloat(dist.toFixed(1));
          
          if (matchUserIds.has(u.user_id)) {
            userJSON.is_connected = true;
            userJSON.nearby_status = 'connected';
          } else if (handshakeUserIds.has(u.user_id)) {
            userJSON.is_connected = false;
            userJSON.nearby_status = 'handshake_sent';
          } else if (passedUserIds.has(u.user_id)) {
            userJSON.is_connected = false;
            userJSON.nearby_status = 'rejected';
          } else {
            userJSON.is_connected = false;
            userJSON.nearby_status = 'none';
          }

          nearbyProfiles.push(userJSON);
        }
      }
    }

    // Sort by distance (closest first)
    nearbyProfiles.sort((a, b) => a.distance - b.distance);

    return res.status(200).json({
      profiles: nearbyProfiles,
      handshakes_remaining: currentUser.handshakes_remaining
    });
  } catch (error) {
    console.error('[getNearbyUsers Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch nearby users: ' + error.message });
  }
};

function checkHandshakeReset(user) {
  const now = new Date();
  
  // Calculate last Sunday 4 AM
  const lastSunday = new Date(now);
  const day = lastSunday.getDay(); // 0: Sunday, 1: Mon, etc.
  const diff = lastSunday.getDate() - day;
  lastSunday.setDate(diff);
  lastSunday.setHours(4, 0, 0, 0);
  
  if (lastSunday > now) {
    lastSunday.setDate(lastSunday.getDate() - 7);
  }

  // If last_handshake_reset is older than lastSunday or null, reset!
  if (!user.last_handshake_reset || new Date(user.last_handshake_reset) < lastSunday) {
    user.handshakes_remaining = user.is_premium ? 5 : 1;
    user.last_handshake_reset = now;
  }
}

exports.sendHandshake = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { target_user_id } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ error: 'target_user_id is required' });
    }

    const currentUser = await User.findOne({ where: { user_id: currentUserId } });
    if (!currentUser || currentUser.verification_status !== 'verified') {
      return res.status(403).json({
        error: 'unverified_user',
        detail: 'You must verify your student profile before sending handshakes.'
      });
    }

    checkHandshakeReset(currentUser);
    if (currentUser.handshakes_remaining <= 0) {
      return res.status(403).json({
        error: 'no_handshakes_remaining',
        detail: 'Weekly handshakes limit reached! Upgrade to Premium for 5 weekly handshakes.',
        is_premium: currentUser.is_premium
      });
    }

    currentUser.handshakes_remaining -= 1;
    await currentUser.save();

    // Check if target user liked current user
    const receivedLike = await Like.findOne({
      where: { from_user_id: target_user_id, to_user_id: currentUserId }
    });

    let isMatch = false;
    const likeId = `${currentUserId}_${target_user_id}`;

    if (receivedLike) {
      isMatch = true;
      receivedLike.is_match = true;
      await receivedLike.save();

      await Like.upsert({
        like_id: likeId,
        from_user_id: currentUserId,
        to_user_id: target_user_id,
        is_match: true,
        is_handshake: true
      });
    } else {
      await Like.upsert({
        like_id: likeId,
        from_user_id: currentUserId,
        to_user_id: target_user_id,
        is_match: false,
        is_handshake: true
      });
    }

    return res.status(200).json({
      success: true,
      is_match: isMatch,
      handshakes_remaining: currentUser.handshakes_remaining
    });
  } catch (error) {
    console.error('[sendHandshake Error]:', error);
    return res.status(500).json({ detail: 'Failed to send handshake: ' + error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const Notification = require('../models/Notification');

    const list = await Notification.findAll({
      where: { user_id: currentUserId },
      order: [['created_at', 'DESC']]
    });

    const senderIds = [...new Set(list.map(n => n.sender_id))];

    const senders = await User.findAll({
      where: { user_id: senderIds },
      attributes: ['user_id', 'name', 'picture', 'photos']
    });

    const senderMap = senders.reduce((acc, u) => {
      acc[u.user_id] = u;
      return acc;
    }, {});

    const formattedList = list.map(n => {
      const json = n.toJSON();
      const sender = senderMap[n.sender_id];
      json.sender_name = sender ? sender.name : 'Someone';
      json.sender_picture = sender ? (sender.picture || (sender.photos && sender.photos[0]) || null) : null;
      return json;
    });

    return res.status(200).json({ notifications: formattedList });
  } catch (error) {
    console.error('[getNotifications Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch notifications: ' + error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { id } = req.params;
    const Notification = require('../models/Notification');

    const notif = await Notification.findOne({
      where: { notification_id: id, user_id: currentUserId }
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notif.is_read = true;
    await notif.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[markNotificationRead Error]:', error);
    return res.status(500).json({ detail: 'Failed to mark notification read: ' + error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { id } = req.params;
    const Notification = require('../models/Notification');

    const notif = await Notification.findOne({
      where: { notification_id: id, user_id: currentUserId }
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notif.destroy();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[deleteNotification Error]:', error);
    return res.status(500).json({ detail: 'Failed to delete notification: ' + error.message });
  }
};
