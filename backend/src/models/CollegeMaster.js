const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CollegeMaster = sequelize.define('CollegeMaster', {
  college_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  college_name: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  short_name: { type: DataTypes.STRING(255), allowNull: true },
  affiliation_university: { type: DataTypes.STRING(255), allowNull: true },
  primary_stream: { type: DataTypes.STRING(255), allowNull: true },
  city: { type: DataTypes.STRING(255), allowNull: true },
  ncr_region: { type: DataTypes.STRING(255), allowNull: true },
  type: { type: DataTypes.STRING(255), allowNull: true }
}, {
  tableName: 'college_master',
  timestamps: false
});

module.exports = CollegeMaster;
