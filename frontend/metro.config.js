const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Support both lowercase and uppercase MP4 asset extensions
if (!config.resolver.assetExts.includes('MP4')) {
  config.resolver.assetExts.push('MP4');
}

module.exports = config;
