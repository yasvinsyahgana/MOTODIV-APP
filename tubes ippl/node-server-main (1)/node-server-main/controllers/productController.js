const { getDbPool } = require('../database');

// Use CommonJS exports so this file works with require()
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDbPool();
        const query = `SELECT * FROM Produk WHERE id_produk = ?`;
        const [rows] = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const product = rows[0];

        // LOGIKA AMAN SAMA SEPERTI DI ATAS
        if (!product.gambar) {
            product.gambar = [];
        } else {
            try {
                if (typeof product.gambar === 'string' && product.gambar.trim().startsWith('[')) {
                    const parsed = JSON.parse(product.gambar);
                    product.gambar = Array.isArray(parsed) ? parsed : [parsed];
                } else {
                    product.gambar = [product.gambar];
                }
            } catch (e) {
                product.gambar = [product.gambar];
            }
        }

        res.json(product);
    } catch (error) {
        console.error(`Failed to fetch product ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching product.' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, deskripsi, harga, stok} = req.body || {};
        const fields  = [];
        const values = [];

        if (nama) { fields.push('nama = ?'); values.push(nama); }
        if (deskripsi) { fields.push('deskripsi = ?'); values.push(deskripsi); }
        if (harga) { fields.push('harga = ?'); values.push(harga); }
        if (stok) { fields.push('stok = ?'); values.push(stok); }

        if (req.files && req.files.length > 0) {
            const filenames = req.files.map(file => file.filename);
            fields.push('gambar = ?');
            // Simpan sebagai JSON String: '["img1.jpg", "img2.jpg"]'
            values.push(JSON.stringify(filenames));
        }
        if (fields.length === 0) {
            return res.status(404).json({ message: 'No changes found, allowed are: nama, deskripsi, harga, stok, gambar' });
        }
        const db = await getDbPool();

        const [existing] = await db.query('SELECT id_produk FROM Produk WHERE id_produk = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        const sql = `UPDATE Produk SET ${fields.join(', ')} WHERE id_produk = ?`;
        await db.query(sql, [...values, id]);

        const [rows] = await db.query('SELECT * FROM Produk WHERE id_produk = ?', [id]);
        let updatedProd = rows[0];
        try {
            if (updatedProd.gambar && updatedProd.gambar.startsWith('[')) {
                updatedProd.gambar = JSON.parse(updatedProd.gambar);
            }
        } catch(e) {
            console.log(e)
        }
        return res.json({
            message: 'Produk berhasil diupdate!',
            user: updatedProd
        });
    }catch (error) {
        console.error(`Failed to update product ${req.params.id}:`, error);
        return res.status(500).json({message:'Error updating product '+req.params.id});
    }
}

const addProduct = async (req, res) => {
    try {
        const { nama, kategori, deskripsi, harga, stok } = req.body;
        // Validasi file tidak boleh kosong
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Minimal 1 gambar wajib diupload!' });
        }

        // Ambil semua nama file dan jadikan JSON String: '["img1.jpg", "img2.jpg"]'
        const filenames = req.files.map(file => file.filename);
        const gambarString = JSON.stringify(filenames);


        // PERBAIKAN 1: Validasi disesuaikan (hanya cek yang wajib)
        if (!nama || !kategori || !deskripsi || !harga) {
            return res.status(400).json({ message: 'Nama, kategori, deskripsi, dan harga wajib diisi!' });
        }

        const db = await getDbPool();

        // Cek duplikat
        const [existingProduct] = await db.query('SELECT id_produk FROM Produk WHERE nama = ?', [nama]);
        if (existingProduct.length > 0) {
            return res.status(409).json({ message: 'Produk dengan nama ini sudah ada.' });
        }

        // Insert produk baru
        const [result] = await db.query(
            'INSERT INTO Produk (nama, kategori, deskripsi, harga, stok, gambar) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, kategori, deskripsi, harga, stok, gambarString]
        );

        res.status(201).json({
            message: 'Produk telah dimasukkan',
            produkID: result.insertId,
            files: filenames
        });
    } catch (error) {
        console.error('Gagal menambah produk:', error);
        res.status(500).json({ message: 'Server Error saat penambahan.' });
    }
};

const getProductAll = async (req, res) => {
    try {
        const db = await getDbPool();
        const query = `
            SELECT id_produk, nama, deskripsi, harga, stok, gambar
            FROM Produk
            WHERE stok >= 0`; // Sesuaikan query jika perlu

        const [rows] = await db.query(query);

        // LOGIKA AMAN UNTUK MEMPROSES GAMBAR
        const products = rows.map(product => {
            // 1. Jika gambar kosong/null
            if (!product.gambar) {
                product.gambar = [];
                return product;
            }

            // 2. Coba Parse sebagai JSON (Format Baru: '["img1.jpg"]')
            try {
                // Cek sekilas apakah terlihat seperti array string
                if (typeof product.gambar === 'string' && product.gambar.trim().startsWith('[')) {
                    const parsed = JSON.parse(product.gambar);
                    product.gambar = Array.isArray(parsed) ? parsed : [parsed];
                } else {
                    // 3. Jika bukan JSON (Format Lama: 'img1.jpg'), masukkan ke array
                    product.gambar = [product.gambar];
                }
            } catch (e) {
                // Fallback jika error parsing, anggap string biasa
                console.log('Gagal parse gambar produk ID:', product.id_produk);
                product.gambar = [product.gambar];
            }
            return product;
        });

        res.json(products);
    } catch (error) {
        console.error('Gagal mencari produk:', error);
        res.status(500).json({ message: 'Server Error Fetching products.' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const {id} = req.params;
        if (!id || !/^\d+$/.test(String(id))) {
            return res.status(400).json({ message: 'ID Produk tidak valid.' });
        }
        const db = await getDbPool();
        const [existing] = await db.query('SELECT id_produk FROM Produk WHERE id_produk = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({message: 'Produk tidak ditemukan'})
        }
        await db.query('DELETE FROM Produk WHERE id_produk = ?', [id]);
        return res.status(200).json({message:'Produk telah di delete dari db'})

    }catch(error) {
        console.error('Gagal mencari produk:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(404).json({message: 'Produk sudah terkait di pesanan'})
        }
        return res.status(500).json({message:'Server Error saat penghapusan'})
    }
}

module.exports = {
    getProductById,
    addProduct,
    getProductAll,
    updateProduct,
    deleteProduct,
};