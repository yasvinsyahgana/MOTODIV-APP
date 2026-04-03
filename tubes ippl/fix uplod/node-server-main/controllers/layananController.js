const {getDbPool} = require('../database');
const cache = require('../utils/cache');
const KEY_LAYANAN = 'all_layanan';


const getAllLayanan = async (req, res) => {
    let connection = null;
    try {
        const pool = await getDbPool();
        connection = await pool.getConnection();

        // 1. Parsing Parameter
        const sort = req.query.sort ? JSON.parse(req.query.sort) : ["id_layanan", "ASC"];
        const range = req.query.range ? JSON.parse(req.query.range) : [0, 9];
        const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

        // Mapping ID
        if (sort[0] === 'id') sort[0] = 'id_layanan';
        if (sort[0] === 'nama') sort[0] = 'nama_layanan'; // Mapping jika frontend kirim 'nama'

        const [sortField, sortOrder] = sort;
        const [start, end] = range;
        const limit = Math.max(0, (Number(end) - Number(start) + 1) || 10);
        const offset = Math.max(0, Number(start) || 0);

        // 2. Filter
        const whereClauses = [];
        const params = [];

        if (filter.q) {
            whereClauses.push('(nama_layanan LIKE ? OR jenis_modifikasi LIKE ? OR deskripsi LIKE ?)');
            params.push(`%${filter.q}%`, `%${filter.q}%`, `%${filter.q}%`);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 3. Count Total
        const [[{ total }]] = await connection.query(
            `SELECT COUNT(*) AS total FROM Layanan_modifikasi ${whereSql}`,
            params
        );

        // 4. Get Data
        const sql = `
            SELECT * FROM Layanan_modifikasi
            ${whereSql}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const [rows] = await connection.query(sql, [...params, limit, offset]);

        // 5. Response
        const safeStart = isNaN(offset) ? 0 : offset;
        const safeEnd = rows.length ? safeStart + rows.length - 1 : safeStart;

        res.set('Content-Range', `layanan ${safeStart}-${safeEnd}/${total}`);
        res.set('Access-Control-Expose-Headers', 'Content-Range');

        // Mapping id
        const data = rows.map(r => ({ ...r, id: r.id_layanan }));
        res.json(data);

    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Server Error', error});
    } finally {
        if (connection) connection.release();
    }
};

const getLayananId = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDbPool();
        const [rows] = await db.query('SELECT * FROM Layanan_modifikasi WHERE id_layanan = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).send({message: 'Layanan tidak ditemukan'});
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).send({message: 'Server Error', error});
    }
};

const addLayanan = async (req, res) => {
    try {
        const { nama_layanan, jenis_modifikasi, deskripsi, estimasi_waktu, estimasi_harga } = req.body;
        if (!nama_layanan || !estimasi_harga) {
            return res.status(400).json({ message: 'Nama dan harga wajib diisi.' });
        }
        const db = await getDbPool();
        const [result] = await db.query(
            'INSERT INTO Layanan_modifikasi (nama_layanan, jenis_modifikasi, deskripsi, estimasi_waktu, estimasi_harga) VALUES (?, ?, ?, ?, ?)',
            [nama_layanan, jenis_modifikasi, deskripsi, estimasi_waktu, estimasi_harga]
        );
        cache.del(KEY_LAYANAN);
        res.status(201).json({ message: 'Layanan ditambahkan', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateLayanan = async (req, res) => {
    try {
        const { id } = req.params;
        // Ambil field yang diizinkan
        const { nama_layanan, jenis_modifikasi, deskripsi, estimasi_waktu, estimasi_harga } = req.body;

        const db = await getDbPool();
        // Cek data parsial (PATCH)
        const fields = [];
        const values = [];
        if (nama_layanan) { fields.push('nama_layanan = ?'); values.push(nama_layanan); }
        if (jenis_modifikasi) { fields.push('jenis_modifikasi = ?'); values.push(jenis_modifikasi); }
        if (deskripsi) { fields.push('deskripsi = ?'); values.push(deskripsi); }
        if (estimasi_waktu) { fields.push('estimasi_waktu = ?'); values.push(estimasi_waktu); }
        if (estimasi_harga) { fields.push('estimasi_harga = ?'); values.push(estimasi_harga); }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'Tidak ada data untuk diupdate.' });
        }

        values.push(id); // Tambahkan ID di akhir
        const sql = `UPDATE Layanan_modifikasi SET ${fields.join(', ')} WHERE id_layanan = ?`;

        const [result] = await db.query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Layanan tidak ditemukan.' });
        }
        cache.del(KEY_LAYANAN);
        res.json({ message: 'Layanan diperbarui.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteLayanan = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDbPool();
        const [result] = await db.query('DELETE FROM Layanan_modifikasi WHERE id_layanan = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Layanan tidak ditemukan.' });
        }
        cache.del(KEY_LAYANAN);
        res.json({ message: 'Layanan dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = {
    getAllLayanan,
    getLayananId,
    addLayanan,
    updateLayanan,
    deleteLayanan,
}
