const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const VerificationRequest = sequelize.define('VerificationRequest', {
  request_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  college_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  id_card_image: {
    type: DataTypes.TEXT, // Store base64 or file upload path
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewed_by: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'verification_requests',
  timestamps: true,
  createdAt: 'submitted_at', // Map to python schema attribute name
  updatedAt: 'updated_at'
});

module.exports = VerificationRequest;
