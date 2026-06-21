require('dotenv').config();
const app = require('./app');
const { connectDB, sequelize } = require('./config/db');
const { seedDatabase } = require('./utils/seeder');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MySQL Database
    await connectDB();

    // 2. Synchronize Sequelize database tables (create tables dynamically if they don't exist)
    // Using alter: true updates any column schema changes automatically in local MySQL
    await sequelize.sync({ alter: true });
    console.log('Database schemas synced successfully.');

    // 3. Seed colleges and dummy users if they are not already present
    await seedDatabase();

    // 4. Start listening for incoming connections
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`  Off Campus Dating App Server online!`);
      console.log(`  Running on: http://localhost:${PORT}`);
      console.log(`  Bound to: 0.0.0.0:${PORT} (all IPv4 interfaces)`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Critical Error during server initialization:', error);
    process.exit(1);
  }
};

startServer();
