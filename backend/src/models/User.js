const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const College = require('./College');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false,
    field: 'user_id'
  },
  phone_number: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    field: 'phone_number'
  },
  firebase_uid: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    field: 'firebase_uid'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    field: 'email'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true
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
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'college_id',
    references: {
      model: College,
      key: 'college_id'
    }
  },
  year: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  course: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  interests: {
    type: DataTypes.JSON,
    allowNull: true
  },
  cover_photo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cover_photo'
  },
  gender_preference: {
    type: DataTypes.ENUM('male', 'female', 'both'),
    allowNull: true,
    defaultValue: 'both',
    field: 'gender_preference'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  current_latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    field: 'current_latitude'
  },
  current_longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    field: 'current_longitude'
  },
  handshakes_remaining: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'handshakes_remaining'
  },
  last_handshake_reset: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_handshake_reset'
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  prompts: {
    type: DataTypes.JSON,
    allowNull: true
  },
  religion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  drink: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'no'
  },
  smoke: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'no'
  },
  weed: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'no'
  },
  photos: {
    type: DataTypes.JSON,
    allowNull: true
  },
  vibe_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 10,
    field: 'vibe_score'
  },
  spotify_data: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'spotify_data'
  },
  is_premium: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_premium'
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'verification_status'
  },
  verification_method: {
    type: DataTypes.ENUM('email', 'manual'),
    allowNull: true,
    field: 'verification_method'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  picture: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_on_campus: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_on_campus'
  },
  last_location_update: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_location_update'
  },
  total_referrals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_referrals'
  },
  profile_visibility: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    field: 'profile_visibility'
  },
  has_event_pass: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'has_event_pass'
  },
  total_ratings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_ratings'
  },
  rating_sum: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'rating_sum'
  },
  referral_code: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'referral_code'
  },
  referred_by: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'referred_by'
  },
  referral_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'referral_count'
  },
  premium_until: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'premium_until'
  },
  chosen_tags: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'chosen_tags'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

User.belongsTo(College, { foreignKey: 'college_id', as: 'college' });
College.hasMany(User, { foreignKey: 'college_id', as: 'users' });

module.exports = User;
