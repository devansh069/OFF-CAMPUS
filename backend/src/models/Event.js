const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const College = require('./College');

const Event = sequelize.define('Event', {
  event_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false,
    field: 'event_id'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'title'
  },
  host_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'host_name'
  },
  host_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'host_user_id',
    references: {
      model: User,
      key: 'user_id'
    }
  },
  category: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'fest',
    field: 'category'
  },
  date: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'date'
  },
  attendee_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'attendee_count'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'location'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'description'
  },
  cover_image: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cover_image'
  },
  gallery_photos: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'gallery_photos'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'status'
  },
  college_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'college_id',
    references: {
      model: College,
      key: 'college_id'
    }
  }
}, {
  tableName: 'events',
  timestamps: true,
  underscored: true
});

Event.belongsTo(User, { foreignKey: 'host_user_id', as: 'host' });
Event.belongsTo(College, { foreignKey: 'college_id', as: 'college' });

module.exports = Event;
