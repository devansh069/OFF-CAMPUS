const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Message = sequelize.define('Message', {
  message_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  from_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  to_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image'),
    allowNull: false,
    defaultValue: 'text',
    field: 'message_type'
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true
});

module.exports = Message;
