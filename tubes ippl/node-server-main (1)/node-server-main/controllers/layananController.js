const {getDbPool} = require('../database');

const getAllLayanan = async (req, res) => {
    try {
        const db = await getDbPool();
        const [rows] = await db.query('SELECT * FROM Layanan_modifikasi');
        res.json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).send({message: 'Server Error', error});
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
