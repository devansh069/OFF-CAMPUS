const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Patch Sequelize v3 ConnectionManager for mysql2 compatibility
try {
  const ConnectionManager = require('sequelize/lib/dialects/mysql/connection-manager');
  const originalDisconnect = ConnectionManager.prototype.disconnect;
  ConnectionManager.prototype.disconnect = function(connection) {
    if (connection && !connection._protocol) {
      connection._protocol = { _ended: false };
    }
    return originalDisconnect.call(this, connection);
  };
} catch (e) {
  console.warn('Could not patch Sequelize ConnectionManager:', e.message);
}

// Alias findByPk to findById for compatibility with Sequelize v5+ query style in Sequelize v3
if (Sequelize.Model && Sequelize.Model.prototype && !Sequelize.Model.prototype.findByPk) {
  Sequelize.Model.prototype.findByPk = Sequelize.Model.prototype.findById;
}

// Patch Sequelize v3 to support Op mapping for compatibility with v4+ codebase
Sequelize.Op = {
  or: '$or',
  and: '$and',
  ne: '$ne',
  eq: '$eq',
  not: '$not',
  notIn: '$notIn',
  in: '$in',
  like: '$like',
  substring: '$substring',
  gte: '$gte',
  gt: '$gt',
  lte: '$lte',
  lt: '$lt'
};

const dbName = process.env.DB_NAME || 'off_campus_db';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    dialectModulePath: 'mysql2',
    logging: false, // set to console.log to see SQL queries
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

const connectDB = async () => {
  try {
    // 1. Auto-create database if it does not exist yet
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    
    // 2. Authenticate the Sequelize instance
    await sequelize.authenticate();
    console.log(`MySQL Database "${dbName}" connected successfully via Sequelize.`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
