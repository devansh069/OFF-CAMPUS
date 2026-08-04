const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CollegeRequest = sequelize.define('CollegeRequest', {
  request_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  college_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  affiliation_university: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'college_requests',
  timestamps: true,
  underscored: true
});

module.exports = CollegeRequest;
