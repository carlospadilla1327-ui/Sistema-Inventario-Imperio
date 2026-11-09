const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'imperio_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mydb',
  port: Number(process.env.DB_PORT || 3306),
  timezone: 'Z',
  dateStrings: ['DATE'],
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
