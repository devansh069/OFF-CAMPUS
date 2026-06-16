const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Rating = sequelize.define('Rating', {
  rating_id: {
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
  score: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'ratings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['from_user_id', 'to_user_id']
    }
  ]
});

module.exports = Rating;
