const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const College = sequelize.define('College', {
  college_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  short_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
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
    type: DataTypes.JSON, // Stores array of email domains: ["ststephens.edu"]
    allowNull: false,
    defaultValue: []
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false // "university", "college", "institute"
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Delhi'
  }
}, {
  tableName: 'colleges',
  timestamps: true
});

module.exports = College;
