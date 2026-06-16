const crypto = require('crypto');
const { Op } = require('sequelize');
const { Like, User, Rating } = require('../models');

/**
 * Returns list of matching profiles for discovery swiping
 */
const getDiscoveryProfiles = async (req, res) => {
  const user = req.user;
  const limit = parseInt(req.query.limit) || 20;

  if (!user.college_id) {
    return res.status(400).json({ detail: 'Please complete your profile and select a college' });
  }

  try {
    // Find already liked users by this user
    const likedLikes = await Like.findAll({
      where: { from_user_id: user.user_id },
      attributes: ['to_user_id']
    });
    const likedUserIds = likedLikes.map(like => like.to_user_id);

    // Build query
    const whereClause = {
      user_id: {
        [Op.not]: user.user_id,
        [Op.notIn]: likedUserIds.length > 0 ? likedUserIds : ['']
      },
      verification_status: 'verified',
      // In SQL, we check if photos JSON array is not empty
      photos: {
        [Op.ne]: []
      }
    };

    // Non-premium users only discover people in their own college
    if (!user.is_premium) {
      whereClause.college_id = user.college_id;
    }

    const profiles = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['email'] },
      limit
    });

    res.json({ profiles });
  } catch (error) {
    console.error('Get discovery profiles error:', error);
    res.status(500).json({ detail: 'Failed to retrieve discovery profiles' });
  }
};

/**
 * Handles liking a target user, checks for matches
 */
const likeUser = async (req, res) => {
  const { target_user_id } = req.body;
  const user = req.user;

  if (!target_user_id) {
    return res.status(400).json({ detail: 'Target user ID is required' });
  }

  try {
    // Check if like already exists
    const existingLike = await Like.findOne({
      where: {
        from_user_id: user.user_id,
        to_user_id: target_user_id
      }
    });

    if (existingLike) {
      return res.json({
        message: 'Already liked',
        is_match: existingLike.is_match
      });
    }

    // Check if reverse like exists (a match!)
    const reverseLike = await Like.findOne({
      where: {
        from_user_id: target_user_id,
        to_user_id: user.user_id
      }
    });

    const isMatch = !!reverseLike;
    const likeId = `like_${crypto.randomBytes(6).toString('hex')}`;

    await Like.create({
      like_id: likeId,
      from_user_id: user.user_id,
      to_user_id: target_user_id,
      is_match: isMatch
    });

    // Update reverse like if it is a match
    if (isMatch) {
      reverseLike.is_match = true;
      await reverseLike.save();
    }

    res.json({
      message: 'Liked',
      is_match: isMatch
    });
  } catch (error) {
    console.error('Like user error:', error);
    res.status(500).json({ detail: 'Failed to process like action' });
  }
};

/**
 * Handles passing on a user (stub only, no storage needed)
 */
const passUser = async (req, res) => {
  res.json({ message: 'Passed' });
};

/**
 * Returns list of matched user profiles
 */
const getMatches = async (req, res) => {
  const user = req.user;

  try {
    const matches = await Like.findAll({
      where: {
        from_user_id: user.user_id,
        is_match: true
      }
    });

    const matchUserIds = matches.map(m => m.to_user_id);
    
    if (matchUserIds.length === 0) {
      return res.json({ matches: [] });
    }

    const matchUsers = await User.findAll({
      where: {
        user_id: { [Op.in]: matchUserIds }
      },
      attributes: { exclude: ['email'] }
    });

    res.json({ matches: matchUsers });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ detail: 'Failed to retrieve matches' });
  }
};

/**
 * Rates another user and updates their average vibe score
 */
const createRating = async (req, res) => {
  const { to_user_id, score } = req.body;
  const user = req.user;

  if (!to_user_id || score === undefined) {
    return res.status(400).json({ detail: 'Target user ID and rating score are required' });
  }

  const ratingScore = parseFloat(score);
  if (ratingScore < 1 || ratingScore > 5) {
    return res.status(400).json({ detail: 'Score must be between 1 and 5' });
  }

  try {
    const targetUser = await User.findByPk(to_user_id);
    if (!targetUser) {
      return res.status(404).json({ detail: 'Target user not found' });
    }

    // Check if user already rated this target
    const existingRating = await Rating.findOne({
      where: {
        from_user_id: user.user_id,
        to_user_id
      }
    });

    if (existingRating) {
      // Find diff in score
      const diff = ratingScore - existingRating.score;
      existingRating.score = ratingScore;
      await existingRating.save();

      // Update sum of scores
      targetUser.rating_sum += diff;
      await targetUser.save();
    } else {
      const ratingId = `rate_${crypto.randomBytes(6).toString('hex')}`;
      await Rating.create({
        rating_id: ratingId,
        from_user_id: user.user_id,
        to_user_id,
        score: ratingScore
      });

      // Update target ratings count
      targetUser.total_ratings += 1;
      targetUser.rating_sum += ratingScore;
      await targetUser.save();
    }

    // Recalculate average vibe score
    if (targetUser.total_ratings > 0) {
      const newVibeScore = targetUser.rating_sum / targetUser.total_ratings;
      targetUser.vibe_score = parseFloat(newVibeScore.toFixed(2));
      await targetUser.save();
    }

    res.json({ message: 'Rating submitted' });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({ detail: 'Failed to submit rating' });
  }
};

module.exports = {
  getDiscoveryProfiles,
  likeUser,
  passUser,
  getMatches,
  createRating
};
