const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Comment = sequelize.define('Comment', {
  comment_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  confession_id: { type: DataTypes.STRING(255), allowNull: false },
  user_id: { type: DataTypes.STRING(255), allowNull: false },
  parent_id: { type: DataTypes.STRING(255), allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false }
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Comment;
