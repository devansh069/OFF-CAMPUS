const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Confession = sequelize.define('Confession', {
  confession_id: {
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
    allowNull: true // null means general
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  likes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  comments: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'confessions',
  timestamps: true
});

module.exports = Confession;
