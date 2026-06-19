const crypto = require('crypto');
const { Op } = require('sequelize');
const { Confession, Comment, User, College } = require('../models');

/**
 * Creates an anonymous confession post
 */
const createConfession = async (req, res) => {
  const { content, college_id } = req.body;
  const user = req.user;

  if (!content) {
    return res.status(400).json({ detail: 'Confession content is required' });
  }

  try {
    const confessionId = `conf_${crypto.randomBytes(6).toString('hex')}`;
    const confession = await Confession.create({
      confession_id: confessionId,
      user_id: user.user_id,
      college_id: college_id || null,
      content,
      likes: 0,
      comments: 0
    });

    res.json({ confession: confession.toJSON() });
  } catch (error) {
    console.error('Create confession error:', error);
    res.status(500).json({ detail: 'Failed to post confession' });
  }
};

/**
 * Returns latest confessions, filtered by college or general
 */
const getConfessionsFeed = async (req, res) => {
  const user = req.user;
  const collegeId = req.query.college_id;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const whereClause = {};

    if (collegeId) {
      whereClause.college_id = collegeId;
    } else if (user.college_id) {
      // Show general confessions or confessions belonging to user's college
      whereClause[Op.or] = [
        { college_id: user.college_id },
        { college_id: null }
      ];
    }

    const confessions = await Confession.findAll({
      where: whereClause,
      attributes: { exclude: ['user_id'] }, // Hide for anonymity
      order: [['created_at', 'DESC']],
      limit
    });

    res.json({ confessions });
  } catch (error) {
    console.error('Get confessions feed error:', error);
    res.status(500).json({ detail: 'Failed to retrieve confessions feed' });
  }
};

/**
 * Likes a confession and increments its like count
 */
const likeConfession = async (req, res) => {
  const { confession_id } = req.params;

  try {
    const confession = await Confession.findByPk(confession_id);
    if (!confession) {
      return res.status(404).json({ detail: 'Confession not found' });
    }

    confession.likes += 1;
    await confession.save();

    res.json({ message: 'Liked' });
  } catch (error) {
    console.error('Like confession error:', error);
    res.status(500).json({ detail: 'Failed to process like action' });
  }
};

/**
 * Adds an anonymous comment to a confession post
 */
const addComment = async (req, res) => {
  const { confession_id } = req.params;
  const { content, parent_id } = req.body;
  const user = req.user;

  if (!content) {
    return res.status(400).json({ detail: 'Comment content is required' });
  }

  try {
    const confession = await Confession.findByPk(confession_id);
    if (!confession) {
      return res.status(404).json({ detail: 'Confession not found' });
    }

    const commentId = `cmt_${crypto.randomBytes(6).toString('hex')}`;
    const comment = await Comment.create({
      comment_id: commentId,
      confession_id,
      user_id: user.user_id,
      content,
      parent_id: parent_id || null
    });

    // Increment confession comments counter
    confession.comments += 1;
    await confession.save();

    // Remove user_id to keep response payload anonymous
    const responseComment = comment.toJSON();
    delete responseComment.user_id;

    // Fetch user's college name
    const commentUser = await User.findByPk(user.user_id, {
      include: [{ model: College, as: 'college', attributes: ['short_name'] }]
    });
    responseComment.college_name = commentUser?.college?.short_name || 'Campus';

    res.json({ comment: responseComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ detail: 'Failed to add comment' });
  }
};

/**
 * Returns comments list for specific confession
 */
const getComments = async (req, res) => {
  const { confession_id } = req.params;

  try {
    const comments = await Comment.findAll({
      where: { confession_id },
      include: [
        {
          model: User,
          attributes: ['college_id'],
          include: [
            {
              model: College,
              as: 'college',
              attributes: ['short_name']
            }
          ]
        }
      ],
      order: [['created_at', 'ASC']],
      limit: 100
    });

    const formattedComments = comments.map(c => {
      const commentJson = c.toJSON();
      const collegeShortName = commentJson.User?.college?.short_name || 'Campus';
      
      delete commentJson.User;
      delete commentJson.user_id;
      
      return {
        ...commentJson,
        college_name: collegeShortName
      };
    });

    res.json({ comments: formattedComments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ detail: 'Failed to retrieve comments' });
  }
};

module.exports = {
  createConfession,
  getConfessionsFeed,
  likeConfession,
  addComment,
  getComments
};
