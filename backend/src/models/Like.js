const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Like = sequelize.define('Like', {
  like_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  from_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  to_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  is_match: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'likes',
  timestamps: true,
  underscored: true
});

module.exports = Like;
