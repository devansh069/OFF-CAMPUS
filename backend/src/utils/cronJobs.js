const { Op } = require('sequelize');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('./pushNotification');

/**
 * Checks for users whose premium subscription is expiring in 3 days or has expired
 */
const checkPremiumExpirations = async (io) => {
  try {
    const now = new Date();

    // 1. Check for Premium Expiring in 3 Days (2.5 to 3.5 days from now)
    const threeDaysFromNowStart = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);
    const threeDaysFromNowEnd = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);

    const expiringUsers = await User.findAll({
      where: {
        is_premium: true,
        premium_until: {
          [Op.between]: [threeDaysFromNowStart, threeDaysFromNowEnd]
        }
      }
    });

    for (const user of expiringUsers) {
      try {
        const notifId = 'notif_prem_exp_' + user.user_id + '_' + Date.now();

        // Prevent duplicate notification today
        const existing = await Notification.findOne({
          where: {
            user_id: user.user_id,
            type: 'premium_expiring_soon'
          }
        });

        if (!existing) {
          const notification = await Notification.create({
            notification_id: notifId,
            user_id: user.user_id,
            sender_id: 'system',
            type: 'premium_expiring_soon',
            confession_id: 'system',
            content: 'Your Premium membership expires in 3 days. Renew now to keep your perks!'
          });

          if (io) {
            io.to(user.user_id).emit('new_notification', notification.toJSON());
          }

          await sendPushToUser({
            userId: user.user_id,
            title: 'Premium Expiring Soon ⏳',
            body: 'Your Premium membership expires in 3 days. Renew now to keep your perks!',
            data: { type: 'premium_expiring', deepLink: '/premium' },
            category: 'premium'
          });
        }
      } catch (err) {
        console.error(`[PremiumCron] Error notifying user ${user.user_id}:`, err.message);
      }
    }

    // 2. Check for Expired Premium Users (premium_until < now, but is_premium is still 1)
    const expiredUsers = await User.findAll({
      where: {
        is_premium: true,
        premium_until: {
          [Op.lt]: now
        }
      }
    });

    for (const user of expiredUsers) {
      try {
        user.is_premium = false;
        user.profile_visibility = 1.0;
        await user.save();

        const notifId = 'notif_prem_expired_' + user.user_id + '_' + Date.now();
        const notification = await Notification.create({
          notification_id: notifId,
          user_id: user.user_id,
          sender_id: 'system',
          type: 'premium_expired',
          confession_id: 'system',
          content: 'Your Premium membership has expired. Renew to continue enjoying unlimited likes & perks.'
        });

        if (io) {
          io.to(user.user_id).emit('new_notification', notification.toJSON());
        }

        await sendPushToUser({
          userId: user.user_id,
          title: 'Premium Expired 😔',
          body: 'Your Premium membership has ended. Renew now to continue enjoying unlimited features.',
          data: { type: 'premium_expired', deepLink: '/premium' },
          category: 'premium'
        });
      } catch (err) {
        console.error(`[PremiumCron] Error resetting user ${user.user_id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[PremiumCron Error]:', error.message);
  }
};

/**
 * Initializes cron schedule (runs once every 12 hours)
 */
const initCronJobs = (app) => {
  const io = app ? app.get('io') : null;

  // Run initial check 30 seconds after server start
  setTimeout(() => {
    checkPremiumExpirations(io);
  }, 30000);

  // Run check every 12 hours
  setInterval(() => {
    checkPremiumExpirations(io);
  }, 12 * 60 * 60 * 1000);

  console.log('[CronJobs] Premium expiration monitor initialized.');
};

module.exports = {
  initCronJobs,
  checkPremiumExpirations
};
