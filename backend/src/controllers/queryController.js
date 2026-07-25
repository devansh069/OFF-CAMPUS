const Query = require('../models/Query');

// 1. Submit a Contact/Support Query
exports.submitQuery = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ detail: 'Name, email, and message are required fields.' });
    }

    const newQuery = await Query.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      subject: subject ? subject.trim() : null,
      message: message.trim()
    });

    return res.status(201).json({ success: true, query: newQuery });
  } catch (error) {
    console.error('[submitQuery Error]:', error);
    return res.status(500).json({ detail: 'Failed to submit query: ' + error.message });
  }
};

// 2. Fetch All Contact/Support Queries
exports.getAllQueries = async (req, res) => {
  try {
    const queries = await Query.findAll({
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ queries });
  } catch (error) {
    console.error('[getAllQueries Error]:', error);
    return res.status(500).json({ detail: 'Failed to retrieve queries: ' + error.message });
  }
};
