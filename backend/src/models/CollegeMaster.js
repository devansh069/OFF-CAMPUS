const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CollegeMaster = sequelize.define('CollegeMaster', {
  college_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  college_name: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  short_name: { type: DataTypes.STRING(255), allowNull: true, unique: true }
}, {
  tableName: 'college_master',
  timestamps: false
});

module.exports = CollegeMaster;
