const CampusAmbassador = require('../models/CampusAmbassador');

// 1. Submit Campus Ambassador Application
exports.applyAmbassador = async (req, res) => {
  try {
    const { name, email, phone, college, year, course, city, instagram, reason } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !college || !year || !course || !city || !reason) {
      return res.status(400).json({ detail: 'Please fill in all required fields.' });
    }

    const application = await CampusAmbassador.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      college: college.trim(),
      year: year.trim(),
      course: course.trim(),
      city: city.trim(),
      instagram: instagram ? instagram.trim() : null,
      reason: reason.trim()
    });

    return res.status(201).json({ success: true, application });
  } catch (error) {
    console.error('[applyAmbassador Error]:', error);
    return res.status(500).json({ detail: 'Failed to submit application: ' + error.message });
  }
};

// 2. Fetch All Campus Ambassador Applications
exports.getAllAmbassadors = async (req, res) => {
  try {
    const applications = await CampusAmbassador.findAll({
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ ambassadors: applications });
  } catch (error) {
    console.error('[getAllAmbassadors Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve applications: ' + error.message });
  }
};
