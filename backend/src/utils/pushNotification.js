const { messaging } = require('../config/firebase');
const User = require('../models/User');

/**
 * Helper to send FCM push notification to a single user
 * @param {Object} params
 * @param {string} params.userId - Target user ID
 * @param {string} params.title - Push Title
 * @param {string} params.body - Push Body message
 * @param {Object} [params.data] - Key-value object for deep links/extra data
 * @param {string} [params.category] - Category identifier (e.g. 'chat', 'matches', 'likes', 'confessions', 'verification', 'events', 'premium')
 * @param {string} [params.threadId] - Thread/Grouping ID (e.g. sender_id for chat grouping)
 * @param {string} [params.collapseKey] - FCM collapse key for notification grouping
 */
const sendPushToUser = async ({
  userId,
  title,
  body,
  data = {},
  category = 'general',
  threadId = null,
  collapseKey = null
}) => {
  try {
    if (!userId || !title || !body) return null;

    // Fetch target user's push token and preferences
    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ['user_id', 'fcm_token', 'notification_preferences']
    });

    if (!user || !user.fcm_token) {
      return null;
    }

    // Check notification preferences (if configured)
    if (user.notification_preferences && typeof user.notification_preferences === 'object') {
      if (user.notification_preferences[category] === false) {
        console.log(`[PushNotification] User ${userId} disabled notifications for category: ${category}`);
        return null;
      }
    }

    // Ensure all data values are strings for FCM payload
    const stringifiedData = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        stringifiedData[key] = String(data[key]);
      });
    }
    stringifiedData.category = String(category);
    if (threadId) stringifiedData.threadId = String(threadId);

    // Group tag (for message grouping from same sender)
    const groupTag = threadId || collapseKey || category;

    const messagePayload = {
      token: user.fcm_token,
      notification: {
        title,
        body
      },
      data: stringifiedData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'offcampus_default',
          tag: groupTag // Groups notifications from same sender/topic on Android
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            'thread-id': groupTag // Groups notifications on iOS
          }
        }
      }
    };

    if (!messaging) {
      console.warn('[PushNotification] Firebase Messaging not initialized. Skipping push dispatch.');
      return null;
    }

    const response = await messaging.send(messagePayload);
    console.log(`[PushNotification] Push sent to user ${userId} (${category}):`, response);
    return response;
  } catch (error) {
    console.error(`[PushNotification Error] Failed to send push to user ${userId}:`, error.message);

    // Auto cleanup stale/invalid FCM tokens
    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      console.log(`[PushNotification] Cleaning up invalid FCM token for user ${userId}`);
      try {
        await User.update({ fcm_token: null }, { where: { user_id: userId } });
      } catch (dbErr) {
        console.error('[PushNotification] Failed to clear invalid token:', dbErr.message);
      }
    }
    return null;
  }
};

/**
 * Helper to send FCM push notification to multiple users
 */
const sendPushToMultiple = async ({
  userIds = [],
  title,
  body,
  data = {},
  category = 'general'
}) => {
  if (!userIds || userIds.length === 0) return;
  const uniqueUserIds = [...new Set(userIds)];

  const promises = uniqueUserIds.map((uId) =>
    sendPushToUser({
      userId: uId,
      title,
      body,
      data,
      category
    })
  );

  await Promise.allSettled(promises);
};

module.exports = {
  sendPushToUser,
  sendPushToMultiple
};
