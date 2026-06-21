const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'off_campus_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL Database connected successfully via Sequelize.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB
};
