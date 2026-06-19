const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Story = sequelize.define('Story', {
  story_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_picture: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  college_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  image: {
    type: DataTypes.TEXT, // Store image path or base64
    allowNull: false
  },
  caption: {
    type: DataTypes.STRING,
    allowNull: true
  },
  audience: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'college'
  },
  views: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: () => []
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'stories',
  timestamps: true // created_at will be used to measure story age
});

module.exports = Story;
