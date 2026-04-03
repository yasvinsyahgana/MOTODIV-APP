const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const net = require('net'); // Modul bawaan Node.js untuk TCP Server
require('dotenv').config();

const sshConfig = {
    host: process.env.SSH_HOST,
    user: process.env.SSH_USERNAME,
    port: process.env.SSH_PORT || 64000,
    password: process.env.SSH_PASSWORD,
};

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1', // Host database ASLI di server remote
    user: process.env.DB_USER || process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

const getDBPool = async () => {
    if (pool) return pool;

    return new Promise((resolve, reject) => {
        const sshClient = new Client();

        sshClient.on('ready', () => {
            console.log('SSH Client Ready');

            // 1. Buat Server TCP Lokal (Proxy)
            const server = net.createServer((socket) => {
                // Setiap kali MySQL connect ke sini, kita buka stream SSH baru
                sshClient.forwardOut(
                    '127.0.0.1', 0, // Source palsu
                    dbConfig.host,  // Tujuan: DB Host
                    parseInt(process.env.DB_PORT) || 3306, // Tujuan: DB Port
                    (err, stream) => {
                        if (err) {
                            console.error('ForwardOut Error:', err);
                            socket.end();
                            return;
                        }
                        // Sambungkan Socket Lokal <-> Stream SSH
                        socket.pipe(stream);
                        stream.pipe(socket);
                    }
                );
            });

            // 2. Listen di Port acak pada localhost komputer Anda
            server.listen(0, '127.0.0.1', () => {
                const localPort = server.address().port;
                console.log(`SSH Tunneling via Local Port: ${localPort}`);

                // 3. Buat Pool yang connect ke Local Port tersebut
                pool = mysql.createPool({
                    ...dbConfig,
                    host: '127.0.0.1', // Paksa connect ke lokal
                    port: localPort,   // Port dinamis tadi
                    stream: undefined  // JANGAN gunakan opsi stream lagi
                });

                resolve(pool);
            });
        });

        sshClient.on('error', (err) => {
            console.error('SSH Connection Error:', err);
            reject(err);
        });

        sshClient.connect(sshConfig);
    });
};

module.exports = { getDBPool, getDbPool: getDBPool };