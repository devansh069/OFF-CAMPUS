const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const User = require('../models/User');
const College = require('../models/College');
const Like = require('../models/Like');
const Message = require('../models/Message');
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
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ detail: 'Firebase ID token is required' });
    }

    let uid, phone_number;

    // Check for development bypass token
    if ((!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_BYPASS === 'true') && firebaseToken.startsWith('dev-token-')) {
      phone_number = firebaseToken.replace('dev-token-', '');
      uid = 'dev_user_' + phone_number.replace(/\D/g, '');
      console.log(`[Auth Dev Bypass] Logging in with test number: ${phone_number}`);
    } else {
      // Verify token using Firebase Admin SDK
      const decodedToken = await auth.verifyIdToken(firebaseToken);
      uid = decodedToken.uid;
      phone_number = decodedToken.phone_number;

      if (!phone_number) {
        return res.status(400).json({ detail: 'Firebase token must contain a verified phone number' });
      }
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
      gender,
      looking_for,
      gender_preference,
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

    // Find all users current user has already liked
    const swipedLikes = await Like.findAll({
      where: { from_user_id: currentUserId },
      attributes: ['to_user_id']
    });
    const swipedUserIds = swipedLikes.map(l => l.to_user_id);
    swipedUserIds.push(currentUserId); // Don't show self

    const whereClause = {
      user_id: { [Op.notIn]: swipedUserIds },
      name: { [Op.ne]: null } // Only show real (onboarded) profiles
    };





    // Find other users
    const profiles = await User.findAll({
      where: whereClause,
      include: [{ model: College, as: 'college' }]
    });

    return res.status(200).json({ profiles });
  } catch (error) {
    console.error('[getDiscoveryProfiles Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch profiles: ' + error.message });
  }
};

// 7. Like a user profile
exports.likeUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const { target_user_id } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ detail: 'target_user_id is required' });
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

    return res.status(200).json({ is_match: isMatch });
  } catch (error) {
    console.error('[likeUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to like user: ' + error.message });
  }
};

// 8. Pass a user profile
exports.passUser = async (req, res) => {
  try {
    // Nothing is saved in the database when a user is passed/rejected
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[passUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to pass user: ' + error.message });
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
      attributes: ['from_user_id']
    });

    const senderIds = receivedLikes.map(l => l.from_user_id);

    const likes = await User.findAll({
      where: {
        user_id: { [Op.in]: senderIds }
      },
      include: [{ model: College, as: 'college' }]
    });

    return res.status(200).json({ likes });
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
      attributes: ['to_user_id']
    });

    const matchUserIds = matchesList.map(m => m.to_user_id);

    const matches = await User.findAll({
      where: {
        user_id: { [Op.in]: matchUserIds }
      },
      include: [{ model: College, as: 'college' }]
    });

    return res.status(200).json({ matches });
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

      conversations.push({
        user: partner,
        last_message: lastMessage,
        unread_count: unreadCount
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

    await sequelize.query(
      `INSERT INTO reports (report_id, from_user_id, to_user_id, reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [reportId, currentUserId, target_user_id, reason]
      }
    );

    await executeUnmatch(currentUserId, target_user_id);

    return res.status(200).json({ success: true, detail: 'Report submitted successfully and user unmatched' });
  } catch (error) {
    console.error('[reportUser Error]:', error);
    return res.status(500).json({ detail: 'Failed to report user: ' + error.message });
  }
};



