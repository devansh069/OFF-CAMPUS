require('dotenv').config();
const { sequelize } = require('./src/config/db');

async function run() {
  try {
    console.log('Connecting to database and updating premium...');
    
    // Execute update statement
    const [results, metadata] = await sequelize.query(
      `UPDATE users SET is_premium = true, premium_until = '2035-12-31 23:59:59' WHERE phone_number LIKE '%1111111111'`
    );
    
    console.log('Update query finished!');
    console.log('Rows affected:', metadata.affectedRows || metadata);
  } catch (error) {
    console.error('Failed to run update script:', error);
  } finally {
    process.exit(0);
  }
}

run();
