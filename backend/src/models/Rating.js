const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Rating = sequelize.define('Rating', {
  rating_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  from_user_id: { type: DataTypes.STRING(255), allowNull: false },
  to_user_id: { type: DataTypes.STRING(255), allowNull: false },
  score: { type: DataTypes.FLOAT, allowNull: false }
}, {
  tableName: 'ratings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Rating;
