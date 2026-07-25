require('dotenv').config();
const app = require('./app');
const { connectDB, sequelize } = require('./config/db');
const { seedDatabase } = require('./utils/seeder');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping Express app
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }
});

// Attach Socket.io instance to Express app so controllers can access it
app.set('io', io);

// Handle WebSockets connection events
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join a room specifically for this user to deliver messages privately
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`[Socket] User ${userId} joined room on socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    // 1. Connect to MySQL Database
    await connectDB();

    // Register all models explicitly before syncing so Sequelize knows about them
    require('./models/CollegeMaster');
    require('./models/Confession');
    require('./models/Story');
    require('./models/Comment');
    require('./models/Rating');
    require('./models/UserSession');
    require('./models/VerificationRequest');

    // 2. Synchronize Sequelize database tables (create tables dynamically if they don't exist)
    // Using alter: true updates any column schema changes automatically in local MySQL
    await sequelize.sync({ alter: true });
    console.log('Database schemas synced successfully.');

    // Production Patch: Force add verification_method column if sync failed
    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN verification_method ENUM('email', 'manual') DEFAULT NULL;");
      console.log('[Patch] Manually added verification_method column to users table');
    } catch (e) {
      // Ignore if column already exists
      console.log('[Patch] verification_method column already exists or alter skipped:', e.message);
    }

    // 3. Seed colleges and dummy users if they are not already present
    await seedDatabase();

    // 4. Start listening for incoming connections on the HTTP server
    server.listen(PORT, '0.0.0.0', () => {
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

// Start the application server
startServer();
