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
    deleteUlasan
};