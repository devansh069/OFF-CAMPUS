const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PassedProfile = sequelize.define('PassedProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  from_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'from_user_id'
  },
  to_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'to_user_id'
  }
}, {
  tableName: 'passed_profiles',
  timestamps: true,
  underscored: true
});

module.exports = PassedProfile;
