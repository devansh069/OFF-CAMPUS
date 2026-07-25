const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const VibeScoreLog = sequelize.define('VibeScoreLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  change_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  new_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  }
}, {
  tableName: 'vibe_score_logs',
  timestamps: true, // Automatically adds createdAt and updatedAt
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = VibeScoreLog;
