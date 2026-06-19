const crypto = require('crypto');
const { Op } = require('sequelize');
const { Event, Story, User, Like } = require('../models');
const { saveBase64Image } = require('../utils/fileUpload');

// ============= EVENTS CONTROLLERS =============

const createEvent = async (req, res) => {
  const { title, description, college_id, location, date, cover_image, category } = req.body;
  const user = req.user;

  if (!title || !description || !location || !date) {
    return res.status(400).json({ detail: 'Title, description, location, and date are required' });
  }

  try {
    const eventId = `event_${crypto.randomBytes(6).toString('hex')}`;
    let savedCoverPath = null;
    if (cover_image) {
      savedCoverPath = saveBase64Image(cover_image, 'events');
    }

    const event = await Event.create({
      event_id: eventId,
      title,
      description,
      college_id: college_id || user.college_id,
      location,
      date,
      cover_image: savedCoverPath,
      category: category || 'fest',
      host_user_id: user.user_id,
      host_name: user.name,
      attendees: [],
      attendee_count: 0
    });

    res.json({ event: event.toJSON() });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ detail: 'Failed to create event' });
  }
};

const eventsFeed = async (req, res) => {
  const user = req.user;
  const query = {};

  // Non-premium users only see fests/events from their own college
  if (!user.is_premium && user.college_id) {
    query.college_id = user.college_id;
  }

  try {
    const events = await Event.findAll({
      where: query,
      order: [['date', 'ASC']],
      limit: 50
    });

    const feedEvents = events.map(e => {
      const eventJson = e.toJSON();
      eventJson.is_attending = (eventJson.attendees || []).includes(user.user_id);
      return eventJson;
    });

    res.json({ events: feedEvents });
  } catch (error) {
    console.error('Get events feed error:', error);
    res.status(500).json({ detail: 'Failed to retrieve events feed' });
  }
};

const rsvpEvent = async (req, res) => {
  const { event_id } = req.params;
  const user = req.user;

  try {
    const event = await Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    let attendees = [...(event.attendees || [])];
    let attending = false;

    if (attendees.includes(user.user_id)) {
      attendees = attendees.filter(id => id !== user.user_id);
      attending = false;
    } else {
      attendees.push(user.user_id);
      attending = true;
    }

    event.attendees = attendees;
    event.attendee_count = attendees.length;
    await event.save();

    res.json({
      attending,
      attendee_count: attendees.length
    });
  } catch (error) {
    console.error('RSVP event error:', error);
    res.status(500).json({ detail: 'Failed to process RSVP request' });
  }
};

const eventAttendees = async (req, res) => {
  const { event_id } = req.params;

  try {
    const event = await Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ detail: 'Event not found' });
    }

    const attendeeIds = event.attendees || [];
    if (attendeeIds.length === 0) {
      return res.json({ attendees: [], count: 0 });
    }

    const attendees = await User.findAll({
      where: {
        user_id: { [Op.in]: attendeeIds }
      },
      attributes: { exclude: ['email'] }
    });

    res.json({ attendees, count: attendees.length });
  } catch (error) {
    console.error('Event attendees error:', error);
    res.status(500).json({ detail: 'Failed to retrieve attendees list' });
  }
};

// ============= STORIES CONTROLLERS =============

const createStory = async (req, res) => {
  const { image, caption, audience } = req.body; // image as base64 string, audience: 'matches' | 'college' | 'global'
  const user = req.user;

  if (!image) {
    return res.status(400).json({ detail: 'Story image is required' });
  }

  try {
    const storyId = `story_${crypto.randomBytes(6).toString('hex')}`;
    const imagePath = saveBase64Image(image, 'stories');
    
    // Set 24 hour expiry duration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const userPicture = user.picture || (user.photos && user.photos.length > 0 ? user.photos[0] : null);

    const story = await Story.create({
      story_id: storyId,
      user_id: user.user_id,
      user_name: user.name,
      user_picture: userPicture,
      college_id: user.college_id,
      image: imagePath,
      caption: caption || null,
      audience: audience || 'college',
      views: [],
      expires_at: expiresAt
    });

    res.json({ story: story.toJSON() });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ detail: 'Failed to upload story' });
  }
};

const storiesFeed = async (req, res) => {
  const user = req.user;

  try {
    const now = new Date();

    // Fetch user's mutual matches IDs
    const matches = await Like.findAll({
      where: { from_user_id: user.user_id, is_match: true },
      attributes: ['to_user_id']
    });
    const matchedUserIds = matches.map(m => m.to_user_id);

    // Build visibility filters for stories:
    // A story is visible to user B if:
    // - B is the creator of the story (user_id === B.user_id)
    // - OR (audience === 'matches' AND creator is in B's matches)
    // - OR (audience === 'college' AND creator's college_id === B's college_id)
    // - OR (audience === 'global' AND (B is premium OR creator's college_id === B's college_id))
    const visibilityConditions = [
      { user_id: user.user_id },
      {
        audience: 'matches',
        user_id: { [Op.in]: matchedUserIds.length > 0 ? matchedUserIds : [''] }
      },
      {
        audience: 'college',
        college_id: user.college_id || ''
      }
    ];

    if (user.is_premium) {
      visibilityConditions.push({
        audience: 'global'
      });
    } else {
      visibilityConditions.push({
        audience: 'global',
        college_id: user.college_id || ''
      });
    }

    const query = {
      expires_at: { [Op.gt]: now },
      [Op.or]: visibilityConditions
    };

    const stories = await Story.findAll({
      where: query,
      order: [['createdAt', 'DESC']]
    });

    // Group stories by user
    const groupedUsers = {};
    for (const story of stories) {
      const uid = story.user_id;
      if (!groupedUsers[uid]) {
        groupedUsers[uid] = {
          user_id: uid,
          user_name: story.user_name,
          user_picture: story.user_picture,
          stories: [],
          has_unviewed: false
        };
      }
      
      const storyJson = story.toJSON();
      
      // Check if user has viewed: support both old user_id strings and new user objects in views array
      const viewed = (storyJson.views || []).some(v => 
        typeof v === 'object' ? v.user_id === user.user_id : v === user.user_id
      );
      storyJson.viewed = viewed;
      
      if (!viewed && uid !== user.user_id) {
        groupedUsers[uid].has_unviewed = true;
      }
      groupedUsers[uid].stories.push(storyJson);
    }

    const groupedList = Object.values(groupedUsers);

    // Sort grouped users: own stories first, then users with unviewed stories
    groupedList.sort((a, b) => {
      if (a.user_id === user.user_id) return -1;
      if (b.user_id === user.user_id) return 1;
      
      // Sort users with unviewed stories higher
      if (a.has_unviewed && !b.has_unviewed) return -1;
      if (!a.has_unviewed && b.has_unviewed) return 1;
      return 0;
    });

    res.json({ users_with_stories: groupedList });
  } catch (error) {
    console.error('Get stories feed error:', error);
    res.status(500).json({ detail: 'Failed to retrieve stories' });
  }
};

const viewStory = async (req, res) => {
  const { story_id } = req.params;
  const user = req.user;

  try {
    const story = await Story.findByPk(story_id);
    if (!story) {
      return res.status(404).json({ detail: 'Story not found' });
    }

    // Add user detailed object to views array if not already present
    const views = [...(story.views || [])];
    const alreadyViewed = views.some(v => 
      typeof v === 'object' ? v.user_id === user.user_id : v === user.user_id
    );

    if (!alreadyViewed) {
      const userPicture = user.picture || (user.photos && user.photos.length > 0 ? user.photos[0] : null);
      views.push({
        user_id: user.user_id,
        user_name: user.name,
        user_picture: userPicture,
        viewed_at: new Date().toISOString()
      });
      story.views = views;
      await story.save();
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ detail: 'Failed to update story views' });
  }
};

// ============= LEADERBOARD CONTROLLER =============

const topVibes = async (req, res) => {
  const user = req.user;
  const limit = parseInt(req.query.limit) || 10;

  const query = {
    verification_status: 'verified',
    total_ratings: { [Op.gt]: 0 }
  };

  // Non-premium only views college specific top vibes leaderboard
  if (!user.is_premium && user.college_id) {
    query.college_id = user.college_id;
  }

  try {
    const topUsers = await User.findAll({
      where: query,
      attributes: { exclude: ['email', 'spotify_data', 'interests'] },
      order: [['vibe_score', 'DESC']],
      limit
    });

    res.json({ top_vibes: topUsers });
  } catch (error) {
    console.error('Get top vibes error:', error);
    res.status(500).json({ detail: 'Failed to retrieve vibes leaderboard' });
  }
};

module.exports = {
  createEvent,
  eventsFeed,
  rsvpEvent,
  eventAttendees,
  createStory,
  storiesFeed,
  viewStory,
  topVibes
};
