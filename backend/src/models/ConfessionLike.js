const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ConfessionLike = sequelize.define('ConfessionLike', {
  confession_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'confession_likes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ConfessionLike;
