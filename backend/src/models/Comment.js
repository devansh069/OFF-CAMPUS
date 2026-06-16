const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Comment = sequelize.define('Comment', {
  comment_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  confession_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'comments',
  timestamps: true
});

module.exports = Comment;
