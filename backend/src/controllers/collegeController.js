const CollegeMaster = require('../models/CollegeMaster');
const CollegeRequest = require('../models/CollegeRequest');
const User = require('../models/User');

// Sequelize v3 compatibility operators mapping
const Op = {
  or: '$or',
  like: '$like'
};

// Search 2,000+ Delhi NCR colleges with live autocomplete
exports.searchColleges = async (req, res) => {
  try {
    const query = req.query.q ? String(req.query.q).trim() : '';

    if (!query || query.length < 1) {
      // Return top 25 default popular colleges if query is empty
      const defaultColleges = await CollegeMaster.findAll({
        limit: 25,
        order: [['college_name', 'ASC']]
      });
      return res.status(200).json({ colleges: defaultColleges });
    }

    const colleges = await CollegeMaster.findAll({
      where: {
        [Op.or]: [
          { college_name: { [Op.like]: `%${query}%` } },
          { short_name: { [Op.like]: `%${query}%` } },
          { affiliation_university: { [Op.like]: `%${query}%` } },
          { city: { [Op.like]: `%${query}%` } },
          { ncr_region: { [Op.like]: `%${query}%` } }
        ]
      },
      limit: 30,
      order: [['college_name', 'ASC']]
    });

    return res.status(200).json({ colleges });
  } catch (error) {
    console.error('[College Search Error]:', error);
    return res.status(500).json({ detail: 'Failed to search colleges.' });
  }
};

// Submit request for an unlisted college
exports.requestNewCollege = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { collegeName, affiliationUniversity, city } = req.body;

    if (!collegeName || !collegeName.trim()) {
      return res.status(400).json({ detail: 'College name is required.' });
    }

    const cleanName = collegeName.trim();
    const requestId = `col_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Create CollegeRequest entry
    const request = await CollegeRequest.create({
      request_id: requestId,
      user_id: userId,
      college_name: cleanName,
      affiliation_university: affiliationUniversity ? affiliationUniversity.trim() : null,
      city: city ? city.trim() : null,
      status: 'pending'
    });

    // 2. Update user profile status
    const user = await User.findByPk(userId);
    if (user) {
      user.college_name = cleanName;
      user.college_request_status = 'pending';
      await user.save();
    }

    return res.status(200).json({
      message: 'College request submitted successfully. Under review by Admin.',
      request,
      user
    });
  } catch (error) {
    console.error('[College Request Error]:', error);
    return res.status(500).json({ detail: 'Failed to submit college request.' });
  }
};
