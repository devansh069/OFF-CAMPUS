const { sequelize } = require('../config/db');
const cloudinary = require('cloudinary').v2;

// Helper to upload base64 string to Cloudinary
const uploadToCloudinary = async (base64Str) => {
  try {
    let formattedStr = base64Str;
    if (!formattedStr.startsWith('data:')) {
      formattedStr = `data:image/jpeg;base64,${formattedStr}`;
    }
    const uploadResponse = await cloudinary.uploader.upload(formattedStr, {
      folder: 'off_campus_stories',
      resource_type: 'image'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('[Story Cloudinary Upload Error]:', error);
    throw error;
  }
};

// 1. Get Stories Feed (Grouped by User)
exports.getStoriesFeed = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Fetch active stories (expires_at > NOW()) and join user metadata
    const activeStories = await sequelize.query(
      `SELECT s.story_id, s.user_id, s.user_name, s.user_picture, s.college_id, s.image, s.caption, s.audience, s.views, s.expires_at, s.created_at,
              u.name as u_name, u.picture as u_picture, u.photos as u_photos
       FROM stories s
       LEFT JOIN users u ON s.user_id = u.user_id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at ASC`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );

    const userMap = {};

    for (const story of activeStories) {
      if (!userMap[story.user_id]) {
        // Resolve profile picture
        let picture = story.user_picture || story.u_picture;
        if (!picture && story.u_photos) {
          try {
            const photos = typeof story.u_photos === 'string' ? JSON.parse(story.u_photos) : story.u_photos;
            if (Array.isArray(photos) && photos.length > 0) {
              picture = photos[0];
            }
          } catch (e) {}
        }

        userMap[story.user_id] = {
          user_id: story.user_id,
          user_name: story.user_name || story.u_name || 'Anonymous Student',
          user_picture: picture || null,
          has_unviewed: false,
          stories: []
        };
      }

      // Parse views json
      let views = [];
      if (story.views) {
        try {
          views = typeof story.views === 'string' ? JSON.parse(story.views) : story.views;
        } catch (e) {
          views = [];
        }
      }

      if (!Array.isArray(views)) {
        views = [];
      }

      // If user hasn't viewed it and is not own story, mark has_unviewed
      const hasViewed = views.includes(userId);
      if (!hasViewed && story.user_id !== userId) {
        userMap[story.user_id].has_unviewed = true;
      }

      userMap[story.user_id].stories.push({
        story_id: story.story_id,
        image: story.image,
        caption: story.caption,
        audience: story.audience,
        views: views,
        createdAt: story.created_at
      });
    }

    const users_with_stories = Object.values(userMap);

    return res.status(200).json({ users_with_stories });
  } catch (error) {
    console.error('[getStoriesFeed Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve stories feed: ' + error.message });
  }
};

// 2. Create Story
exports.createStory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { image, audience, caption } = req.body;

    if (!image) {
      return res.status(400).json({ detail: 'Story image is required' });
    }

    // Get user details
    const [user] = await sequelize.query(
      'SELECT name, picture, photos, college_id FROM users WHERE user_id = ? LIMIT 1',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    // Determine picture url
    let userPicture = user.picture;
    if (!userPicture && user.photos) {
      try {
        const photos = typeof user.photos === 'string' ? JSON.parse(user.photos) : user.photos;
        if (Array.isArray(photos) && photos.length > 0) {
          userPicture = photos[0];
        }
      } catch (e) {}
    }

    // Upload story image to Cloudinary if it is base64 payload
    let storyImageUrl = image;
    if (image.startsWith('data:') || image.length > 1000) {
      console.log('[Story Cloudinary] Uploading story image to Cloudinary...');
      storyImageUrl = await uploadToCloudinary(image);
    }

    const storyId = 'story_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours

    await sequelize.query(
      `INSERT INTO stories (story_id, user_id, user_name, user_picture, college_id, image, caption, audience, views, expires_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [
          storyId,
          userId,
          user.name || 'Anonymous Student',
          userPicture || null,
          user.college_id || null,
          storyImageUrl,
          caption || null,
          audience || 'global',
          JSON.stringify([]),
          expiresAt
        ],
        type: sequelize.QueryTypes.INSERT
      }
    );

    return res.status(201).json({
      detail: 'Story created successfully',
      story: {
        story_id: storyId,
        user_id: userId,
        image: storyImageUrl,
        audience: audience || 'global',
        expires_at: expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('[createStory Error]:', error);
    return res.status(500).json({ detail: 'Failed to create story: ' + error.message });
  }
};

// 3. View Story
exports.viewStory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Fetch story views JSON
    const [story] = await sequelize.query(
      'SELECT views FROM stories WHERE story_id = ? LIMIT 1',
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!story) {
      return res.status(404).json({ detail: 'Story not found' });
    }

    let views = [];
    if (story.views) {
      try {
        views = typeof story.views === 'string' ? JSON.parse(story.views) : story.views;
      } catch (e) {
        views = [];
      }
    }

    if (!Array.isArray(views)) {
      views = [];
    }

    // Append user if not already viewed
    if (!views.includes(userId)) {
      views.push(userId);
      await sequelize.query(
        'UPDATE stories SET views = ? WHERE story_id = ?',
        {
          replacements: [JSON.stringify(views), id],
          type: sequelize.QueryTypes.UPDATE
        }
      );
    }

    return res.status(200).json({ success: true, views });
  } catch (error) {
    console.error('[viewStory Error]:', error);
    return res.status(500).json({ detail: 'Failed to record story view: ' + error.message });
  }
};
