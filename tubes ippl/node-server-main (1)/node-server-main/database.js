/*
  database.js — Centralized database connector with SSH tunneling.

  What this file does:
  - Establishes an SSH tunnel to a remote host (bastion) using ssh2.
  - Forwards a local connection through the tunnel to reach the MySQL server.
  - Creates and caches a MySQL connection pool using mysql2/promise.
  - Exports an async function getDBPool/getDbPool that returns the pooled connection.

  Environment variables (see .env):
  - SSH_HOST, SSH_PORT, SSH_USERNAME, SSH_PASSWORD: SSH tunnel configuration.
  - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: MySQL configuration (as seen from SSH host).
*/

const mysql = require('mysql2/promise'); // Promise-based MySQL client
const { Client } = require('ssh2'); // SSH client for tunneling
require('dotenv').config();

// SSH connection options. We connect to this host and then forward to the DB host:port
const sshConfig = {
    host: process.env.SSH_HOST,
    user: process.env.SSH_USERNAME,
    port: process.env.SSH_PORT || 64000,
    password: process.env.SSH_PASSWORD,
};

// MySQL options (host is from the perspective of the SSH server, often 127.0.0.1)
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || process.env.DB_USERNAME, // Backward-compatible fallback
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const sshClient = new Client(); // Singleton SSH client instance
let pool; // Cached MySQL pool (initialized once and reused)

/**
 * Returns a MySQL connection pool that communicates through an SSH tunnel.
 * The pool is created once and reused on subsequent calls.
 *
 * Usage:
 *   const db = await getDbPool();
 *   const [rows] = await db.query('SELECT 1');
 */
const getDBPool = async () => {
    if (pool) {
        return pool; // Reuse existing pool if already created
    }

    // Create the pool after the SSH tunnel is ready
    return new Promise((resolve, reject) => {
        sshClient
            .on('ready', async () => {
                console.log('SSH Tunnel Established');
                // forwardOut opens a stream that behaves like a TCP socket to the DB
                sshClient.forwardOut(
                    '127.0.0.1', // Source address (arbitrary/local)
                    0,           // Source port (0 lets OS choose any)
                    dbConfig.host, // Destination DB host as seen from SSH server
                    process.env.DB_PORT || 3306, // Destination DB port
                    (err, stream) => {
                        if (err) {
                            console.log('Error in SSH forwardOut: ', err);
                            return reject(err);
                        }
                        console.log('Port forwarding active, connecting to MySQL DB');

                        // Create a MySQL pool that uses the SSH stream as its transport
                        pool = mysql.createPool({
                            ...dbConfig,
                            stream: stream, // Tell mysql2 to use this tunneled stream
                            waitForConnections: true,
                            connectionLimit: 10,
                            queueLimit: 10,
                        });

                        console.log('MySQL connection pool established');
                        resolve(pool);
                    }
                );
            })
            .on('error', err => {
                console.error('SSH Client Error: ', err);
                reject(err);
            })
            .connect(sshConfig);
    });
};

// Export with two names for backward compatibility with previous imports
module.exports = { getDBPool, getDbPool: getDBPool };

