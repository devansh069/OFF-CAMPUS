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

    // Patch: Manually add parent_id column to comments table if missing
    try {
      await sequelize.query("ALTER TABLE comments ADD parent_id VARCHAR(255) NULL;");
      console.log('[Patch] Manually check/added parent_id column to comments');
    } catch (e) {
      console.log('[Patch] parent_id check error:', e.message);
    }

    require('./models/CollegeMaster');
    require('./models/CollegeRequest');
    require('./models/Confession');
    require('./models/ConfessionLike');
    require('./models/Story');
    require('./models/Comment');
    require('./models/Rating');
    require('./models/UserSession');
    require('./models/VerificationRequest');
    require('./models/Referral');
    require('./models/CampusAmbassador');
    require('./models/Report');
    require('./models/VibeScoreLog');
    require('./models/DailyLikeCount');
    require('./models/PassedProfile');
    require('./models/Notification');

    // 2. Synchronize Sequelize database tables (create tables dynamically if they don't exist)
    // Using alter: true updates any column schema changes automatically in local MySQL
    await sequelize.sync({ alter: true });
    console.log('Database schemas synced successfully.');

    // Production Patch: Force add verification_method and new referral columns if sync failed
    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN verification_method ENUM('email', 'manual') DEFAULT NULL;");
      console.log('[Patch] Manually added verification_method column');
    } catch (e) {}
    
    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN total_referrals INT NOT NULL DEFAULT 0;");
      console.log('[Patch] Manually added total_referrals column');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN profile_visibility FLOAT NOT NULL DEFAULT 1.0;");
      console.log('[Patch] Manually added profile_visibility column');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN has_event_pass TINYINT(1) NOT NULL DEFAULT 0;");
      console.log('[Patch] Manually added has_event_pass column');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE confessions ADD COLUMN image TEXT NULL;");
      console.log('[Patch] Manually added image column to confessions');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users DROP COLUMN looking_for;");
      console.log('[Patch] Dropped looking_for column from users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN cover_photo TEXT NULL;");
      console.log('[Patch] Added cover_photo column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN rejection_reason TEXT NULL;");
      console.log('[Patch] Added rejection_reason column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN current_latitude DOUBLE NULL;");
      console.log('[Patch] Added current_latitude column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN current_longitude DOUBLE NULL;");
      console.log('[Patch] Added current_longitude column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN handshakes_remaining INT NOT NULL DEFAULT 1;");
      console.log('[Patch] Added handshakes_remaining column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN last_handshake_reset DATETIME NULL;");
      console.log('[Patch] Added last_handshake_reset column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE likes ADD COLUMN is_handshake TINYINT(1) NOT NULL DEFAULT 0;");
      console.log('[Patch] Added is_handshake column to likes table');
    } catch (e) {}

    try {
      // Reset ALL users to non-premium (undo previous auto-premium patch damage)
      // Only real Razorpay payments will re-activate premium going forward
      await sequelize.query("UPDATE users SET is_premium = FALSE, premium_until = NULL, profile_visibility = 1.0;");
      console.log('[Patch] Reset ALL users to non-premium status');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN google_email VARCHAR(255) NULL UNIQUE;");
      console.log('[Patch] Manually added google_email column to users table');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN chosen_tags JSON NULL;");
      console.log('[Patch] Manually added chosen_tags column to users');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE likes ADD COLUMN tag VARCHAR(255) NULL;");
      console.log('[Patch] Manually added tag column to likes');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE college_master ADD COLUMN affiliation_university VARCHAR(255) NULL;");
      await sequelize.query("ALTER TABLE college_master ADD COLUMN primary_stream VARCHAR(255) NULL;");
      await sequelize.query("ALTER TABLE college_master ADD COLUMN city VARCHAR(255) NULL;");
      await sequelize.query("ALTER TABLE college_master ADD COLUMN ncr_region VARCHAR(255) NULL;");
      await sequelize.query("ALTER TABLE college_master ADD COLUMN type VARCHAR(255) NULL;");
      console.log('[Patch] Extended college_master schema with NCR college fields');
    } catch (e) {}

    try {
      await sequelize.query("ALTER TABLE users ADD COLUMN college_request_status ENUM('none', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'none';");
      console.log('[Patch] Manually added college_request_status column to users');
    } catch (e) {}

    // 3. Seed colleges and dummy users if they are not already present
    await seedDatabase();
    const seedColleges = require('./scripts/seedColleges');
    await seedColleges();

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
