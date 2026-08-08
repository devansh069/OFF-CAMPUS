const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withManifestColorFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure the tools namespace exists
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = androidManifest.application[0];
    
    if (application['meta-data']) {
      for (const metaData of application['meta-data']) {
        if (metaData.$['android:name'] === 'com.google.firebase.messaging.default_notification_color') {
          // Add tools:replace to allow our color to override the firebase-messaging default color
          metaData.$['tools:replace'] = 'android:resource';
        }
      }
    }

    return config;
  });
};
