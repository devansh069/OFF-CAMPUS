const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const College = sequelize.define('College', {
  college_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false,
    field: 'college_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'college_name'
  },
  short_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'short_name'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  email_domains: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'email_domains'
  },
  type: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Delhi'
  }
}, {
  tableName: 'colleges',
  timestamps: true,
  underscored: true
});

module.exports = College;
