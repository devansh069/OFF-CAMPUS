const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Event = sequelize.define('Event', {
  event_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  college_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING, // Store date as string/ISO format like in Python
    allowNull: false
  },
  cover_image: {
    type: DataTypes.TEXT, // Store image URL or path
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'fest'
  },
  host_user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  host_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  attendees: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  attendee_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'events',
  timestamps: true
});

module.exports = Event;
