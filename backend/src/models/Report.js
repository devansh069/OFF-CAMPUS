const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Report = sequelize.define('Report', {
  report_id: {
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
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reports',
  timestamps: false
});

module.exports = Report;
