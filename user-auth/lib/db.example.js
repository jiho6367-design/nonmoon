const mysql = require("mysql2/promise");

// Copy this file to db.js and update the credentials below to match
// your local MySQL instance. Keeping secrets out of version control
// avoids committing personal passwords.
//
// If you prefer environment variables, set DB_HOST, DB_PORT, DB_USER,
// DB_PASSWORD, and DB_NAME before running `node server.js`.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "world", // change to your schema
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
