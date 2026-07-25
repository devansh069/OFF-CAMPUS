const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Story = sequelize.define('Story', {
  story_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  user_id: { type: DataTypes.STRING(255), allowNull: false },
  user_name: { type: DataTypes.STRING(255), allowNull: false },
  user_picture: { type: DataTypes.TEXT, allowNull: true },
  college_id: { type: DataTypes.STRING(255), allowNull: true },
  image: { type: DataTypes.TEXT, allowNull: false },
  caption: { type: DataTypes.STRING(255), allowNull: true },
  audience: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'college' },
  views: { type: DataTypes.JSON, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false }
}, {
  tableName: 'stories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Story;
