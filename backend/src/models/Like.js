const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Like = sequelize.define('Like', {
  like_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  from_user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  to_user_id: {
    type: DataTypes.STRING,
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
  indexes: [
    {
      unique: true,
      fields: ['from_user_id', 'to_user_id']
    }
  ]
});

module.exports = Like;
