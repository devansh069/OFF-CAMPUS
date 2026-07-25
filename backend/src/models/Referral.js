const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  referrer_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  referred_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'referrals',
  timestamps: false
});

module.exports = Referral;
