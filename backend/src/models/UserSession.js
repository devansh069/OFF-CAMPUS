const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserSession = sequelize.define('UserSession', {
  session_token: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  user_id: { type: DataTypes.STRING(255), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'user_sessions',
  timestamps: false
});

module.exports = UserSession;
