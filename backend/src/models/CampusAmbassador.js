const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CampusAmbassador = sequelize.define('CampusAmbassador', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  college: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  year: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  course: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  instagram: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'campus_ambassadors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CampusAmbassador;
