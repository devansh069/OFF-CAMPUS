const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CouponUsage = sequelize.define('CouponUsage', {
  usage_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  coupon_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  order_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  original_amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  final_amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  plan_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  }
}, {
  tableName: 'coupon_usages',
  timestamps: true,
  underscored: true
});

module.exports = CouponUsage;
