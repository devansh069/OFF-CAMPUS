// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Exclude unnecessary directories and native compilation build files from file watching
const exclusionPattern = /node_modules\/.*\/android|node_modules\/.*\/ios|node_modules\/.*\/windows|node_modules\/.*\/macos|\.cxx|\.cmake|android\/build|ios\/build/;
config.resolver.blockList = exclusionPattern;
config.resolver.blacklistRE = exclusionPattern;

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

// Support both lowercase and uppercase MP4 asset extensions
if (!config.resolver.assetExts.includes('MP4')) {
  config.resolver.assetExts.push('MP4');
}

module.exports = config;
