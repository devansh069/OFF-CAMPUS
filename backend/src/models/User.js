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
  looking_for: {
    type: DataTypes.ENUM('dating', 'friends', 'networking', 'all'),
    allowNull: true,
    field: 'looking_for'
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
    defaultValue: 5,
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
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

User.belongsTo(College, { foreignKey: 'college_id', as: 'college' });
College.hasMany(User, { foreignKey: 'college_id', as: 'users' });

module.exports = User;
