const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Event = require('./Event');

const EventAttendee = sequelize.define('EventAttendee', {
  event_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    primaryKey: true,
    field: 'event_id',
    references: {
      model: Event,
      key: 'event_id'
    }
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    primaryKey: true,
    field: 'user_id',
    references: {
      model: User,
      key: 'user_id'
    }
  }
}, {
  tableName: 'event_attendees',
  timestamps: true,
  underscored: true
});

// Define associations for many-to-many lookup
Event.belongsToMany(User, { through: EventAttendee, foreignKey: 'event_id', as: 'attendees' });
User.belongsToMany(Event, { through: EventAttendee, foreignKey: 'user_id', as: 'attendingEvents' });

module.exports = EventAttendee;
