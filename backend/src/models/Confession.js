const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Confession = sequelize.define('Confession', {
  confession_id: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  user_id: { type: DataTypes.STRING(255), allowNull: false },
  college_id: { type: DataTypes.STRING(255), allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  image: { type: DataTypes.TEXT, allowNull: true },
  likes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  comments: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'confessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Confession;
