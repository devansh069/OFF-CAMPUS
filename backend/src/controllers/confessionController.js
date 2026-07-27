const { sequelize } = require('../config/db');
const Sequelize = require('sequelize');
const cloudinary = require('cloudinary').v2;

// Helper to upload base64 string to Cloudinary
const uploadToCloudinary = async (base64Str) => {
  try {
    let formattedStr = base64Str;
    if (!formattedStr.startsWith('data:')) {
      formattedStr = `data:image/jpeg;base64,${formattedStr}`;
    }
    const uploadResponse = await cloudinary.uploader.upload(formattedStr, {
      folder: 'off_campus_confessions',
      resource_type: 'image'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('[Confession Cloudinary Upload Error]:', error);
    throw error;
  }
};

// Helper to fetch college name
const getCollegeShortName = async (collegeId) => {
  if (!collegeId) return 'Campus';
  try {
    const [college] = await sequelize.query(
      'SELECT short_name FROM colleges WHERE college_id = ? LIMIT 1',
      {
        replacements: [collegeId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    return college ? college.short_name : 'Campus';
  } catch (e) {
    return 'Campus';
  }
};

// 1. Get Confessions Feed (supports live counts)
exports.getConfessionsFeed = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get user details
    const [user] = await sequelize.query(
      'SELECT college_id FROM users WHERE user_id = ? LIMIT 1',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    const userCollegeId = user ? user.college_id : null;

    // Fetch confessions sorted by created_at DESC
    const confessions = await sequelize.query(
      `SELECT c.confession_id, c.user_id, c.college_id, c.content, c.image, c.likes, c.comments, c.created_at, col.short_name as college_name, u.name as user_name, u.picture as user_picture 
       FROM confessions c
       LEFT JOIN colleges col ON c.college_id = col.college_id
       LEFT JOIN users u ON c.user_id = u.user_id
       ORDER BY c.created_at DESC LIMIT 100`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Get live counts dynamically from checked in users
    const [globalCountRow] = await sequelize.query(
      'SELECT COUNT(*) as count FROM users WHERE updated_at >= NOW() - INTERVAL 1 DAY',
      { type: sequelize.QueryTypes.SELECT }
    );
    // Base defaults added to make testing look populated
    const liveCountGlobal = (globalCountRow ? globalCountRow.count : 0) + 142;

    let liveCountCollege = 18;
    if (userCollegeId) {
      const [collegeCountRow] = await sequelize.query(
        'SELECT COUNT(*) as count FROM users WHERE college_id = ? AND updated_at >= NOW() - INTERVAL 1 DAY',
        {
          replacements: [userCollegeId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      liveCountCollege = (collegeCountRow ? collegeCountRow.count : 0) + 18;
    }

    return res.status(200).json({
      confessions,
      live_count_global: liveCountGlobal,
      live_count_college: liveCountCollege
    });
  } catch (error) {
    console.error('[getConfessionsFeed Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve confessions feed: ' + error.message });
  }
};

// 2. Create Confession
exports.createConfession = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { content, college_id, image } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ detail: 'Confession content is required' });
    }

    // Determine college_id if not supplied
    let userCollegeId = college_id;
    if (!userCollegeId) {
      const [user] = await sequelize.query(
        'SELECT college_id FROM users WHERE user_id = ? LIMIT 1',
        {
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      if (user) {
        userCollegeId = user.college_id;
      }
    }

    let uploadedImageUrl = null;
    if (image) {
      try {
        console.log('[Confession Cloudinary] Uploading image...');
        uploadedImageUrl = await uploadToCloudinary(image);
      } catch (uploadErr) {
        console.error('Confession image upload failed:', uploadErr);
      }
    }

    const confessionId = 'conf_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    await sequelize.query(
      'INSERT INTO confessions (confession_id, user_id, college_id, content, image, likes, comments, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, NOW(), NOW())',
      {
        replacements: [confessionId, userId, userCollegeId || null, content.trim(), uploadedImageUrl],
        type: sequelize.QueryTypes.INSERT
      }
    );

    // Return created confession object
    const [newConf] = await sequelize.query(
      `SELECT c.confession_id, c.user_id, c.college_id, c.content, c.image, c.likes, c.comments, c.created_at, col.short_name as college_name, u.name as user_name, u.picture as user_picture 
       FROM confessions c
       LEFT JOIN colleges col ON c.college_id = col.college_id
       LEFT JOIN users u ON c.user_id = u.user_id
       WHERE c.confession_id = ? LIMIT 1`,
      {
        replacements: [confessionId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    return res.status(201).json({ confession: newConf });
  } catch (error) {
    console.error('[createConfession Error]:', error);
    return res.status(500).json({ detail: 'Failed to create confession: ' + error.message });
  }
};

// 3. Like Confession
exports.likeConfession = async (req, res) => {
  try {
    const { id } = req.params;

    await sequelize.query(
      'UPDATE confessions SET likes = likes + 1 WHERE confession_id = ?',
      {
        replacements: [id],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    const [conf] = await sequelize.query(
      'SELECT likes FROM confessions WHERE confession_id = ? LIMIT 1',
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({ success: true, likes: conf ? conf.likes : 0 });
  } catch (error) {
    console.error('[likeConfession Error]:', error);
    return res.status(500).json({ detail: 'Failed to like confession: ' + error.message });
  }
};

// 4. Get Comments
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await sequelize.query(
      `SELECT c.comment_id, c.confession_id, c.user_id, c.content, c.created_at, u.college_id, col.short_name as college_name, u.name as user_name 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.user_id 
       LEFT JOIN colleges col ON u.college_id = col.college_id 
       WHERE c.confession_id = ? 
       ORDER BY c.created_at ASC`,
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({ comments });
  } catch (error) {
    console.error('[getComments Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve comments: ' + error.message });
  }
};

// 5. Create Comment
exports.createComment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.user_id;
    const confessionId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      await transaction.rollback();
      return res.status(400).json({ detail: 'Comment content is required' });
    }

    const commentId = 'cmt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    // Insert comment
    await sequelize.query(
      'INSERT INTO comments (comment_id, confession_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      {
        replacements: [commentId, confessionId, userId, content.trim()],
        type: sequelize.QueryTypes.INSERT,
        transaction
      }
    );

    // Increment comment count
    await sequelize.query(
      'UPDATE confessions SET comments = comments + 1 WHERE confession_id = ?',
      {
        replacements: [confessionId],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    await transaction.commit();

    const collegeName = await getCollegeShortName(req.user.college_id);

    return res.status(201).json({
      comment: {
        comment_id: commentId,
        confession_id: confessionId,
        user_id: userId,
        user_name: req.user.name,
        content: content.trim(),
        created_at: new Date().toISOString(),
        college_name: collegeName
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[createComment Error]:', error);
    return res.status(500).json({ detail: 'Failed to post comment: ' + error.message });
  }
};

// 6. Get all confessions
exports.getAllConfessions = async (req, res) => {
  try {
    const confessions = await sequelize.query(
      `SELECT c.confession_id, c.user_id, c.college_id, c.content, c.image, c.likes, c.comments, c.created_at, c.updated_at, u.name as user_name, u.picture as user_picture 
       FROM confessions c
       LEFT JOIN users u ON c.user_id = u.user_id
       ORDER BY c.created_at DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return res.status(200).json({ confessions });
  } catch (error) {
    console.error('[getAllConfessions Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve confessions: ' + error.message });
  }
};

// 7. Get all likes on confessions (represented as like count statistics per confession)
exports.getAllConfessionLikes = async (req, res) => {
  try {
    const likes = await sequelize.query(
      'SELECT confession_id, content, image, likes as likes_count, user_id, college_id, created_at FROM confessions ORDER BY likes DESC',
      { type: sequelize.QueryTypes.SELECT }
    );
    return res.status(200).json({ likes });
  } catch (error) {
    console.error('[getAllConfessionLikes Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve confession likes: ' + error.message });
  }
};

// 8. Get all comments/replies on confessions
exports.getAllComments = async (req, res) => {
  try {
    const comments = await sequelize.query(
      `SELECT c.comment_id, c.confession_id, c.user_id, c.content, c.created_at, c.updated_at, u.name as user_name, col.short_name as college_name 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.user_id 
       LEFT JOIN colleges col ON u.college_id = col.college_id 
       ORDER BY c.created_at DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return res.status(200).json({ comments });
  } catch (error) {
    console.error('[getAllComments Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve all comments: ' + error.message });
  }
};

