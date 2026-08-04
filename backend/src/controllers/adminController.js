const CollegeRequest = require('../models/CollegeRequest');
const CollegeMaster = require('../models/CollegeMaster');
const College = require('../models/College');
const User = require('../models/User');

// Get all pending college requests for Admin
exports.getPendingCollegeRequests = async (req, res) => {
  try {
    const requests = await CollegeRequest.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('[Admin College Requests Error]:', error);
    return res.status(500).json({ detail: 'Failed to fetch pending college requests.' });
  }
};

// Approve a college request
exports.approveCollegeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;

    const request = await CollegeRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ detail: 'College request not found.' });
    }

    const collegeName = request.college_name;
    const collegeId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Add to CollegeMaster table
    await CollegeMaster.upsert({
      college_id: collegeId,
      college_name: collegeName,
      short_name: collegeName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 8),
      affiliation_university: request.affiliation_university || null,
      city: request.city || 'Delhi NCR',
      type: 'Private'
    });

    // 2. Add to College active table
    await College.upsert({
      college_id: collegeId,
      name: collegeName,
      short_name: collegeName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 8),
      location: request.city || 'Delhi NCR',
      latitude: 28.6139,
      longitude: 77.2090,
      email_domains: [],
      type: 'Private',
      city: request.city || 'Delhi NCR'
    });

    // 3. Update Request status
    request.status = 'approved';
    request.admin_notes = adminNotes || 'Approved by Admin';
    await request.save();

    // 4. Update requesting user profile to link college & grant full access
    const user = await User.findByPk(request.user_id);
    if (user) {
      user.college_id = collegeId;
      user.college_name = collegeName;
      user.college_request_status = 'approved';
      await user.save();
    }

    return res.status(200).json({
      message: `College "${collegeName}" approved and added to system master data. User access unlocked.`,
      request,
      user
    });
  } catch (error) {
    console.error('[Approve College Request Error]:', error);
    return res.status(500).json({ detail: 'Failed to approve college request.' });
  }
};

// Reject a college request
exports.rejectCollegeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;

    const request = await CollegeRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ detail: 'College request not found.' });
    }

    request.status = 'rejected';
    request.admin_notes = adminNotes || 'Rejected by Admin';
    await request.save();

    const user = await User.findByPk(request.user_id);
    if (user) {
      user.college_request_status = 'rejected';
      await user.save();
    }

    return res.status(200).json({
      message: 'College request rejected.',
      request
    });
  } catch (error) {
    console.error('[Reject College Request Error]:', error);
    return res.status(500).json({ detail: 'Failed to reject college request.' });
  }
};
