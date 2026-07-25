const User = require('../models/User');

exports.getMyStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await User.findOne({ where: { user_id: userId } });
    
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    return res.status(200).json({
      referral_code: user.referral_code,
      referral_count: user.total_referrals || 0,
      rewards_earned_days: 0,
      premium_days_remaining: 0,
      referred_users: [] // Can be updated later to fetch actual joined users
    });
  } catch (error) {
    console.error('[getMyStats Error]:', error);
    return res.status(500).json({ detail: 'Server error fetching referral stats' });
  }
};
