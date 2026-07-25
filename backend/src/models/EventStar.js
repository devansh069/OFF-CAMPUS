const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Event = require('./Event');

const EventStar = sequelize.define('EventStar', {
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
  tableName: 'event_stars',
  timestamps: true,
  underscored: true
});

// Define associations
Event.belongsToMany(User, { through: EventStar, foreignKey: 'event_id', as: 'starringUsers' });
User.belongsToMany(Event, { through: EventStar, foreignKey: 'user_id', as: 'starredEvents' });

module.exports = EventStar;
