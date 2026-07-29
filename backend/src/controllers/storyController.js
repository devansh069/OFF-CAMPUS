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

    // Fetch user's college and matches to enforce audience privacy
    const [currentUser] = await sequelize.query('SELECT college_id FROM users WHERE user_id = ? LIMIT 1', { replacements: [userId], type: sequelize.QueryTypes.SELECT });
    const userCollegeId = currentUser ? currentUser.college_id : null;
    
    const matchesList = await sequelize.query('SELECT to_user_id FROM likes WHERE from_user_id = ? AND is_match = true', { replacements: [userId], type: sequelize.QueryTypes.SELECT });
    const matchUserIds = matchesList.map(m => m.to_user_id);

    const filteredStories = activeStories.filter(story => {
      if (story.user_id === userId) return true; // always see own stories (global, college, matches)
      
      // Confessions feed only shows global and college stories for others!
      if (story.audience === 'matches') return false;

      if (story.audience === 'global') return true;
      if (story.audience === 'college' && story.college_id === userCollegeId) return true;
      return false; // hide otherwise
    });

    const userMap = {};

    for (const story of filteredStories) {
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

    // Enrich views for the current logged-in user's own stories
    for (const group of users_with_stories) {
      if (group.user_id === userId) {
        for (const story of group.stories) {
          if (Array.isArray(story.views) && story.views.length > 0) {
            const viewerIds = story.views
              .map(v => (typeof v === 'string' ? v : (v && v.user_id ? v.user_id : null)))
              .filter(Boolean);

            if (viewerIds.length > 0) {
              const viewerUsers = await sequelize.query(
                `SELECT user_id, name, picture, photos FROM users WHERE user_id IN (?)`,
                { replacements: [viewerIds], type: sequelize.QueryTypes.SELECT }
              );

              const viewerMatches = await sequelize.query(
                `SELECT to_user_id FROM likes WHERE from_user_id = ? AND to_user_id IN (?) AND is_match = true`,
                { replacements: [userId, viewerIds], type: sequelize.QueryTypes.SELECT }
              );
              const matchedViewerIds = new Set(viewerMatches.map(m => m.to_user_id));

              const userDetailsMap = {};
              for (const u of viewerUsers) {
                let pic = u.picture;
                if (!pic && u.photos) {
                  try {
                    const parsed = typeof u.photos === 'string' ? JSON.parse(u.photos) : u.photos;
                    if (Array.isArray(parsed) && parsed.length > 0) pic = parsed[0];
                  } catch (e) {}
                }
                userDetailsMap[u.user_id] = {
                  name: u.name || 'Student',
                  picture: pic || null
                };
              }

              story.views = story.views.map(v => {
                const vId = typeof v === 'string' ? v : (v && v.user_id ? v.user_id : null);
                const details = userDetailsMap[vId] || {};
                return {
                  user_id: vId,
                  name: details.name || 'Student',
                  picture: details.picture || null,
                  viewed_at: typeof v === 'object' && v.viewed_at ? v.viewed_at : new Date().toISOString(),
                  is_match: matchedViewerIds.has(vId)
                };
              });
            }
          }
        }
      }
    }

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
      'SELECT name, picture, photos, college_id, is_premium FROM users WHERE user_id = ? LIMIT 1',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!user) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    if (audience === 'global' && !user.is_premium) {
      return res.status(403).json({
        error: 'premium_required',
        detail: 'Uploading stories to Global feed requires a Premium membership. Upgrade to Premium!'
      });
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

    // Emit real-time event via Socket.io to appropriate users
    const io = req.app.get('io');
    if (io) {
      const payload = {
        story_id: storyId,
        user_id: userId,
        user_name: user.name || 'Anonymous Student',
        user_picture: userPicture || null,
        college_id: user.college_id || null,
        image: storyImageUrl,
        caption: caption || null,
        audience: audience || 'global',
        views: [],
        createdAt: new Date().toISOString()
      };

      if (audience === 'global') {
        console.log('[Socket] Broadcasting new_story globally');
        io.emit('new_story', payload);
      } else if (audience === 'college' && user.college_id) {
        console.log('[Socket] Broadcasting new_story to college mates');
        const collegeUsers = await sequelize.query(
          'SELECT user_id FROM users WHERE college_id = ?',
          { replacements: [user.college_id], type: sequelize.QueryTypes.SELECT }
        );
        collegeUsers.forEach(u => {
          if (u.user_id !== userId) io.to(u.user_id).emit('new_story', payload);
        });
      } else if (audience === 'matches') {
        console.log('[Socket] Broadcasting new_story to matches');
        const matchesList = await sequelize.query(
          'SELECT to_user_id FROM likes WHERE from_user_id = ? AND is_match = true',
          { replacements: [userId], type: sequelize.QueryTypes.SELECT }
        );
        matchesList.forEach(m => {
          io.to(m.to_user_id).emit('new_story', payload);
        });
      }
    }

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

// 4. Get All Stories
exports.getAllStories = async (req, res) => {
  try {
    const stories = await sequelize.query(
      'SELECT story_id, user_id, user_name, user_picture, college_id, image, caption, audience, views, expires_at, created_at, updated_at FROM stories ORDER BY created_at DESC',
      { type: sequelize.QueryTypes.SELECT }
    );
    return res.status(200).json({ stories });
  } catch (error) {
    console.error('[getAllStories Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve all stories: ' + error.message });
  }
};

exports.getMatchesStoriesFeed = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Fetch active stories (expires_at > NOW()) and join user metadata
    const activeStories = await sequelize.query(
      `SELECT s.story_id, s.user_id, s.user_name, s.user_picture, s.college_id, s.image, s.caption, s.audience, s.views, s.expires_at, s.created_at,
              u.name as u_name, u.picture as u_picture, u.photos as u_photos
       FROM stories s
       LEFT JOIN users u ON s.user_id = u.user_id
       WHERE s.expires_at > NOW() AND s.audience = 'matches'
       ORDER BY s.created_at ASC`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );

    const matchesList = await sequelize.query('SELECT to_user_id FROM likes WHERE from_user_id = ? AND is_match = true', { replacements: [userId], type: sequelize.QueryTypes.SELECT });
    const matchUserIds = matchesList.map(m => m.to_user_id);

    const filteredStories = activeStories.filter(story => {
      // Must be own story, or from a match
      return story.user_id === userId || matchUserIds.includes(story.user_id);
    });

    const userMap = {};

    for (const story of filteredStories) {
      if (!userMap[story.user_id]) {
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
          user_name: story.user_id === userId ? 'Your Story' : (story.user_name || story.u_name || 'Anonymous Match'),
          user_picture: picture || null,
          has_unviewed: false,
          stories: []
        };
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

    // Keep own story at the top if it exists
    const users_with_stories = Object.values(userMap);
    users_with_stories.sort((a, b) => {
      if (a.user_id === userId) return -1;
      if (b.user_id === userId) return 1;
      return 0;
    });

    // Enrich views for own stories
    for (const group of users_with_stories) {
      if (group.user_id === userId) {
        for (const story of group.stories) {
          if (Array.isArray(story.views) && story.views.length > 0) {
            const viewerIds = story.views
              .map(v => (typeof v === 'string' ? v : (v && v.user_id ? v.user_id : null)))
              .filter(Boolean);

            if (viewerIds.length > 0) {
              const viewerUsers = await sequelize.query(
                `SELECT user_id, name, picture, photos FROM users WHERE user_id IN (?)`,
                { replacements: [viewerIds], type: sequelize.QueryTypes.SELECT }
              );

              const userDetailsMap = {};
              for (const u of viewerUsers) {
                let pic = u.picture;
                if (!pic && u.photos) {
                  try {
                    const parsed = typeof u.photos === 'string' ? JSON.parse(u.photos) : u.photos;
                    if (Array.isArray(parsed) && parsed.length > 0) pic = parsed[0];
                  } catch (e) {}
                }
                userDetailsMap[u.user_id] = {
                  name: u.name || 'Student',
                  picture: pic || null
                };
              }

              story.views = story.views.map(v => {
                const vId = typeof v === 'string' ? v : (v && v.user_id ? v.user_id : null);
                const details = userDetailsMap[vId] || {};
                return {
                  user_id: vId,
                  name: details.name || 'Student',
                  picture: details.picture || null,
                  isMatch: true
                };
              });
            }
          }
        }
      }
    }

    return res.status(200).json({ feed: users_with_stories });
  } catch (error) {
    console.error('[getMatchesStoriesFeed Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve matches stories: ' + error.message });
  }
};

// 6. Delete Story
exports.deleteStory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Check if the story exists and belongs to the user
    const [story] = await sequelize.query(
      'SELECT user_id FROM stories WHERE story_id = ? LIMIT 1',
      { replacements: [id], type: sequelize.QueryTypes.SELECT }
    );

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this story' });
    }

    // Delete the story
    await sequelize.query(
      'DELETE FROM stories WHERE story_id = ?',
      { replacements: [id] }
    );

    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('[deleteStory Error]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

