const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Session = sequelize.define('Session', {
  session_token: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'user_sessions',
  timestamps: true,
  updatedAt: false // session records don't need update timestamps
});

module.exports = Session;
