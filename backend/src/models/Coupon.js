const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Coupon = sequelize.define('Coupon', {
  coupon_id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discount_type: {
    type: DataTypes.ENUM('percentage', 'flat'),
    allowNull: false,
    defaultValue: 'percentage'
  },
  discount_value: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  min_order_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  max_discount_amount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  applicable_plans: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON array of plan months e.g. [1,3,6,12]. null = all plans'
  },
  valid_from: {
    type: DataTypes.DATE,
    allowNull: false
  },
  valid_until: {
    type: DataTypes.DATE,
    allowNull: false
  },
  max_usages: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  current_usages: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'coupons',
  timestamps: true,
  underscored: true
});

module.exports = Coupon;
