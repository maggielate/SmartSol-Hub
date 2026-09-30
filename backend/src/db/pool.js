const { Pool } = require('pg');

// Graceful no-op pool for dev without PostgreSQL
const noopPool = {
  query: async () => ({ rows: [] }),
  connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
};

let pool;
try {
  pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 }
      : { host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: false, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 3000 }
  );
  // Test connection
  pool.on('error', (err) => {
    console.warn('DB connection lost, running in mock mode:', err.message);
    pool = noopPool;
  });
} catch (e) {
  console.warn('DB unavailable, running in mock mode');
  pool = noopPool;
}

module.exports = { query: (...args) => pool.query(...args) };
