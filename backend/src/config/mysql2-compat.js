const mysql2 = require('mysql2');

const patchedMysql2 = {
  ...mysql2,
  createConnection(config) {
    const connection = mysql2.createConnection(config);
    
    // Inject mock _protocol expected by Sequelize v3 ConnectionManager.disconnect
    if (!connection._protocol) {
      connection._protocol = {
        get _ended() {
          return connection._closing || false;
        }
      };
    }
    
    return connection;
  }
};

module.exports = patchedMysql2;
