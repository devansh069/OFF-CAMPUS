const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const VerificationRequest = sequelize.define('VerificationRequest', {
  request_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  user_id: { type: DataTypes.STRING(255), allowNull: false },
  college_id: { type: DataTypes.STRING(255), allowNull: false },
  id_card_image: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'verified', 'rejected'), allowNull: false, defaultValue: 'pending' },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  reviewed_by: { type: DataTypes.STRING(255), allowNull: true },
  submitted_at: { type: DataTypes.DATE, allowNull: false }
}, {
  tableName: 'verification_requests',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = VerificationRequest;
