const { sequelize } = require('../config/db');
const User = require('../models/User');
const College = require('../models/College');
const Event = require('../models/Event');
const EventAttendee = require('../models/EventAttendee');
const cloudinary = require('cloudinary').v2;

// Helper to upload base64 string to Cloudinary
const uploadToCloudinary = async (base64Str) => {
  try {
    let formattedStr = base64Str;
    if (!formattedStr.startsWith('data:')) {
      formattedStr = `data:image/jpeg;base64,${formattedStr}`;
    }
    const uploadResponse = await cloudinary.uploader.upload(formattedStr, {
      folder: 'off_campus_events',
      resource_type: 'image'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('[Event Cloudinary Upload Error]:', error);
    throw error;
  }
};

// 1. Get Approved Events Feed
exports.getEventsFeed = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get current user information (to check college_id and premium status)
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Determine query filter
    const whereClause = { status: 'approved' };
    
    // Non-premium users can only see events from their own college or global (college_id is null)
    if (!user.is_premium) {
      if (user.college_id) {
        whereClause.college_id = user.college_id;
      } else {
        // If user doesn't have a college_id set, only show global events (if any) or nothing
        whereClause.college_id = null;
      }
    }

    // Fetch approved events
    const events = await Event.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'host', attributes: ['user_id', 'name', 'photos'] },
        { model: College, as: 'college', attributes: ['college_id', 'name', 'short_name'] }
      ],
      order: [['date', 'ASC']]
    });

    // Check which events the user has RSVP'd to
    const userRSVPs = await EventAttendee.findAll({
      where: { user_id: userId },
      attributes: ['event_id']
    });
    
    const rsvpSet = new Set(userRSVPs.map(r => r.event_id));

    // Map through events to append is_attending status
    const eventsWithStatus = events.map(event => {
      const plainEvent = event.toJSON();
      plainEvent.is_attending = rsvpSet.has(plainEvent.event_id);
      return plainEvent;
    });

    return res.status(200).json({ events: eventsWithStatus });
  } catch (error) {
    console.error('[GetEventsFeed Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve events feed: ' + error.message });
  }
};

// 2. Create Event
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      title,
      host_name,
      category,
      date,
      location,
      description,
      cover_image, // base64 string
      gallery_photos // array of base64 strings
    } = req.body;

    if (!title || !host_name || !date || !location || !description) {
      return res.status(400).json({ detail: 'Required fields are missing' });
    }

    // Fetch user to get their college_id
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Upload cover image to Cloudinary if provided
    let coverUrl = null;
    if (cover_image) {
      console.log('[Event Cloudinary] Uploading event cover image...');
      coverUrl = await uploadToCloudinary(cover_image);
    }

    // Upload gallery photos to Cloudinary if provided
    const galleryUrls = [];
    if (gallery_photos && Array.isArray(gallery_photos)) {
      console.log(`[Event Cloudinary] Uploading ${gallery_photos.length} gallery images...`);
      for (const photo of gallery_photos) {
        if (photo) {
          const url = await uploadToCloudinary(photo);
          galleryUrls.push(url);
        }
      }
    }

    // Create unique event ID
    const eventId = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const newEvent = await Event.create({
      event_id: eventId,
      title,
      host_name,
      host_user_id: userId,
      category: category || 'fest',
      date,
      attendee_count: 0,
      location,
      description,
      cover_image: coverUrl,
      gallery_photos: galleryUrls,
      status: 'pending',
      college_id: user.college_id
    });

    return res.status(201).json({
      detail: 'Event created successfully and is pending administrator approval',
      event: newEvent
    });
  } catch (error) {
    console.error('[CreateEvent Error]:', error);
    return res.status(500).json({ detail: 'Failed to create event: ' + error.message });
  }
};

// 3. Toggle RSVP
exports.toggleRSVP = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.user_id;
    const eventId = req.params.id;

    // Check if event exists
    const event = await Event.findOne({
      where: { event_id: eventId },
      transaction
    });

    if (!event) {
      await transaction.rollback();
      return res.status(404).json({ detail: 'Event not found' });
    }

    // Check if attendee record already exists
    const existingAttendee = await EventAttendee.findOne({
      where: { event_id: eventId, user_id: userId },
      transaction
    });

    let isAttending = false;
    if (existingAttendee) {
      // Remove RSVP
      await EventAttendee.destroy({
        where: { event_id: eventId, user_id: userId },
        transaction
      });
      // Decrement attendee count
      event.attendee_count = Math.max(0, event.attendee_count - 1);
      await event.save({ transaction });
      isAttending = false;
    } else {
      // Create RSVP
      await EventAttendee.create({
        event_id: eventId,
        user_id: userId
      }, { transaction });
      // Increment attendee count
      event.attendee_count = event.attendee_count + 1;
      await event.save({ transaction });
      isAttending = true;
    }

    await transaction.commit();

    return res.status(200).json({
      detail: isAttending ? 'RSVP registered' : 'RSVP cancelled',
      is_attending: isAttending,
      attendee_count: event.attendee_count
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[ToggleRSVP Error]:', error);
    return res.status(500).json({ detail: 'Failed to toggle RSVP: ' + error.message });
  }
};
