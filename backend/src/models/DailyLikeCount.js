const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DailyLikeCount = sequelize.define('DailyLikeCount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_id'
  },
  reset_date: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'reset_date'
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'count'
  }
}, {
  tableName: 'daily_like_counts',
  timestamps: true,
  underscored: true
});

module.exports = DailyLikeCount;
