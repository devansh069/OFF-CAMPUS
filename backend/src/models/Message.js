const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Message = sequelize.define('Message', {
  message_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  from_user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  to_user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'messages',
  timestamps: true // This will automatically handle created_at / updated_at
});

module.exports = Message;
