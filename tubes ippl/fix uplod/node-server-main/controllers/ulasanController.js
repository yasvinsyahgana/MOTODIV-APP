// controllers/ulasanController.js
const { getDbPool } = require('../database');

// Get ulasan by produk (Publik)
const getUlasanByProduk = async (req, res) => {
    try {
        const { idProduk } = req.params;
        const db = await getDbPool();
        // Join dengan User untuk dapat nama
        const [rows] = await db.query(
            `SELECT u.id_ulasan, u.rating, u.komentar, usr.nama 
             FROM Ulasan u 
             JOIN User usr ON u.id_user = usr.user_id
             WHERE u.id_produk = ?`,
            [idProduk]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Add ulasan (Customer)
const addUlasan = async (req, res) => {
    try {
        const id_user = req.user.userId; // Dari middleware authReq
        const { id_produk, id_layanan, rating, komentar } = req.body;

        if (!rating || !komentar) {
            return res.status(400).json({ message: 'Rating dan komentar wajib diisi.' });
        }
        if (!id_produk && !id_layanan) {
            return res.status(400).json({ message: 'Produk atau Layanan harus dipilih.' });
        }

        const db = await getDbPool();
        await db.query(
            'INSERT INTO Ulasan (id_user, id_produk, id_layanan, rating, komentar) VALUES (?, ?, ?, ?, ?)',
            [id_user, id_produk || null, id_layanan || null, rating, komentar]
        );
        res.status(201).json({ message: 'Ulasan ditambahkan.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getAllUlasan = async (req, res) => {
    let connection = null;
    try {
        const pool = await getDbPool();
        connection = await pool.getConnection();

        // 1. Parsing
        const sort = req.query.sort ? JSON.parse(req.query.sort) : ["id_ulasan", "DESC"];
        const range = req.query.range ? JSON.parse(req.query.range) : [0, 9];
        const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

        if (sort[0] === 'id') sort[0] = 'u.id_ulasan';
        else sort[0] = 'u.' + sort[0]; // Asumsi sort field ada di tabel ulasan

        const [sortField, sortOrder] = sort;
        const [start, end] = range;
        const limit = Math.max(0, (Number(end) - Number(start) + 1) || 10);
        const offset = Math.max(0, Number(start) || 0);

        // 2. Filter
        const whereClauses = [];
        const params = [];

        if (filter.q) {
            // Search di komentar atau nama user
            whereClauses.push('(u.komentar LIKE ? OR usr.nama LIKE ?)');
            params.push(`%${filter.q}%`, `%${filter.q}%`);
        }

        if (filter.id_produk) {
            whereClauses.push('u.id_produk = ?');
            params.push(filter.id_produk);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 3. Count Total
        const [[{ total }]] = await connection.query(
            `SELECT COUNT(*) AS total 
             FROM Ulasan u 
             LEFT JOIN User usr ON u.id_user = usr.user_id 
             ${whereSql}`,
            params
        );

        // 4. Query Data
        const query = `
            SELECT 
                u.id_ulasan AS id, 
                u.rating, 
                u.komentar, 
                u.id_user,
                usr.nama AS nama_user,
                u.id_produk,
                p.nama AS nama_produk,
                u.id_layanan,
                l.nama_layanan AS nama_layanan
            FROM Ulasan u
            LEFT JOIN User usr ON u.id_user = usr.user_id
            LEFT JOIN Produk p ON u.id_produk = p.id_produk
            LEFT JOIN Layanan_modifikasi l ON u.id_layanan = l.id_layanan
            ${whereSql}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const [rows] = await connection.query(query, [...params, limit, offset]);

        // 5. Response
        const safeStart = isNaN(offset) ? 0 : offset;
        const safeEnd = rows.length ? safeStart + rows.length - 1 : safeStart;

        res.set('Content-Range', `ulasan ${safeStart}-${safeEnd}/${total}`);
        res.set('Access-Control-Expose-Headers', 'Content-Range');

        res.json(rows);
    } catch (error) {
        console.error('Failed to fetch all ulasan:', error);
        res.status(500).json({ message: 'Server Error fetching ulasan.' });
    } finally {
        if (connection) connection.release();
    }
};

// ... (jangan lupa tambahkan getAllUlasan ke module.exports di bawah)

// Delete ulasan (Admin)
const deleteUlasan = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDbPool();
        const [result] = await db.query('DELETE FROM Ulasan WHERE id_ulasan = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ulasan tidak ditemukan.' });
        }
        res.json({ message: 'Ulasan dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUlasanByProduk,
    addUlasan,
    deleteUlasan,
    getAllUlasan
};