const crypto = require('crypto');
const { Op } = require('sequelize');
const { Like, Message, User } = require('../models');

/**
 * Sends a message to a matched user
 */
const sendMessage = async (req, res) => {
  const { to_user_id, content } = req.body;
  const user = req.user;

  if (!to_user_id || !content) {
    return res.status(400).json({ detail: 'Target user ID and content are required' });
  }

  try {
    // Verify that the users are matched
    const match = await Like.findOne({
      where: {
        from_user_id: user.user_id,
        to_user_id,
        is_match: true
      }
    });

    if (!match) {
      return res.status(403).json({ detail: 'You can only message matches' });
    }

    const messageId = `msg_${crypto.randomBytes(6).toString('hex')}`;
    const message = await Message.create({
      message_id: messageId,
      from_user_id: user.user_id,
      to_user_id,
      content,
      read: false
    });

    res.json({ message: message.toJSON() });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ detail: 'Failed to send message' });
  }
};

/**
 * Returns conversations list (matched users with last message and unread count)
 */
const getConversations = async (req, res) => {
  const user = req.user;

  try {
    // Find all matches
    const matches = await Like.findAll({
      where: {
        from_user_id: user.user_id,
        is_match: true
      }
    });

    const conversations = [];

    for (const match of matches) {
      const otherUserId = match.to_user_id;

      // Get other user details
      const otherUser = await User.findByPk(otherUserId, {
        attributes: { exclude: ['email'] }
      });

      if (!otherUser) continue;

      // Get last message exchanged between current user and other user
      const lastMessage = await Message.findOne({
        where: {
          [Op.or]: [
            { from_user_id: user.user_id, to_user_id: otherUserId },
            { from_user_id: otherUserId, to_user_id: user.user_id }
          ]
        },
        order: [['created_at', 'DESC']]
      });

      // Get count of unread messages sent by other user
      const unreadCount = await Message.count({
        where: {
          from_user_id: otherUserId,
          to_user_id: user.user_id,
          read: false
        }
      });

      conversations.push({
        user: otherUser.toJSON(),
        last_message: lastMessage ? lastMessage.toJSON() : null,
        unread_count: unreadCount
      });
    }

    // Sort conversations by last message timestamp descending
    conversations.sort((a, b) => {
      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return timeB - timeA;
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ detail: 'Failed to retrieve conversations list' });
  }
};

/**
 * Returns chat logs between current user and specified matched user, marks received as read
 */
const getMessages = async (req, res) => {
  const { other_user_id } = req.params;
  const user = req.user;

  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { from_user_id: user.user_id, to_user_id: other_user_id },
          { from_user_id: other_user_id, to_user_id: user.user_id }
        ]
      },
      order: [['created_at', 'ASC']],
      limit: 500
    });

    // Mark unread messages from other user as read
    await Message.update(
      { read: true },
      {
        where: {
          from_user_id: other_user_id,
          to_user_id: user.user_id,
          read: false
        }
      }
    );

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ detail: 'Failed to retrieve chat messages' });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages
};
