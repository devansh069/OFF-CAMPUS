const User = require('../models/User');
const Referral = require('../models/Referral');

exports.getMyStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await User.findOne({ where: { user_id: userId } });
    
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Fetch the actual referred users
    const referrals = await Referral.findAll({
      where: { referrer_id: userId },
      include: [{ model: User, as: 'ReferredUser', attributes: ['name', 'phone_number'] }]
    });

    const referredUsers = referrals.map(r => ({
      name: r.ReferredUser?.name || 'New User',
      phone: r.ReferredUser?.phone_number || '',
      date: r.created_at
    }));
    
    return res.status(200).json({
      referral_code: user.referral_code,
      referral_count: user.total_referrals || 0,
      rewards_earned_days: 0,
      premium_days_remaining: 0,
      referred_users: referredUsers
    });
  } catch (error) {
    console.error('[getMyStats Error]:', error);
    return res.status(500).json({ detail: 'Server error fetching referral stats' });
  }
};
