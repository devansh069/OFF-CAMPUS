const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  college_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  year: {
    type: DataTypes.STRING,
    allowNull: true // "1st Year", "2nd Year", etc.
  },
  course: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  interests: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  looking_for: {
    type: DataTypes.ENUM('dating', 'friends', 'networking', 'all'),
    allowNull: true
  },
  photos: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [] // Array of image URLs or file paths
  },
  vibe_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 5.0
  },
  spotify_data: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: { top_tracks: [], top_artists: [] }
  },
  is_premium: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  picture: {
    type: DataTypes.TEXT,
    allowNull: true // Google avatar URL
  },
  is_on_campus: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  last_location_update: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_ratings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  rating_sum: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  referral_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referred_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referral_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  premium_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;
