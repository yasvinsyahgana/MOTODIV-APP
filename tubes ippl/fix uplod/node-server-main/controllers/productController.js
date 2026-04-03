const { getDbPool } = require('../database');
const { uploadToAppwrite } = require('../services/appwriteServices.js');
const cache = require('../utils/cache');
const CACHE_KEY_PRODUCTS = 'all_products';

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
        const { nama, deskripsi, kategori, harga, stok} = req.body || {};
        const fields  = [];
        const values = [];

        if (nama) { fields.push('nama = ?'); values.push(nama); }
        if (kategori) { fields.push('kategori = ?'); values.push(kategori); } // TAMBAHKAN INI
        if (deskripsi) { fields.push('deskripsi = ?'); values.push(deskripsi); }
        if (harga) { fields.push('harga = ?'); values.push(harga); }
        if (stok) { fields.push('stok = ?'); values.push(stok); }

        if (req.files && req.files.length > 0) {
            // 1. Upload file baru ke Appwrite
            const uploadPromises = req.files.map(file => uploadToAppwrite(file));
            const imageUrls = await Promise.all(uploadPromises);

            // 2. Masukkan URL lengkap ke query database
            fields.push('gambar = ?');
            values.push(JSON.stringify(imageUrls));
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
        cache.del(CACHE_KEY_PRODUCTS);
        // Normalisasi response untuk react-admin (gunakan field id)
        const normalized = {
            id: updatedProd.id_produk,
            nama: updatedProd.nama,
            deskripsi: updatedProd.deskripsi,
            harga: updatedProd.harga,
            stok: updatedProd.stok,
            gambar: updatedProd.gambar
        };
        return res.json(normalized);
    }catch (error) {
        console.error(`Failed to update product ${req.params.id}:`, error);
        return res.status(500).json({message:'Error updating product '+req.params.id});
    }
}

const addProduct = async (req, res) => {
    try {
        const { nama, kategori, deskripsi, harga, stok } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Minimal 1 gambar wajib diupload!' });
        }

        // --- PERUBAHAN UTAMA DISINI ---
        // Loop semua file, upload ke Appwrite, dan simpan URL-nya
        const uploadPromises = req.files.map(file => uploadToAppwrite(file));
        const imageUrls = await Promise.all(uploadPromises);

        const gambarString = JSON.stringify(imageUrls);
        // Hasil simpan di DB nanti: '["https://cloud.appwrite.io/...", "..."]'
        // -----------------------------

        if (!nama || !kategori || !deskripsi || !harga) {
            return res.status(400).json({ message: 'Data wajib diisi!' });
        }

        const db = await getDbPool();

        // Cek duplikat... (kode sama)
        const [existingProduct] = await db.query('SELECT id_produk FROM Produk WHERE nama = ?', [nama]);
        if (existingProduct.length > 0) {
            return res.status(409).json({ message: 'Produk dengan nama ini sudah ada.' });
        }
        // Insert produk... (kode sama)

        const [result] = await db.query(
            'INSERT INTO Produk (nama, kategori, deskripsi, harga, stok, gambar) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, kategori, deskripsi, harga, stok, gambarString]
        );
        cache.del(CACHE_KEY_PRODUCTS);

        // Kembalikan objek lengkap sesuai ekspektasi react-admin (punya field id)
        res.status(201).json({
            id: result.insertId,
            nama,
            kategori,
            deskripsi,
            harga,
            stok,
            gambar: imageUrls
        });

    } catch (error) {
        console.error('Gagal menambah produk:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

const getProductAll = async (req, res) => {
    try {
        const cachedData = cache.get(CACHE_KEY_PRODUCTS);
        if (cachedData) {
            console.log('Serving from cache');
            return res.json(cachedData);
        }

        const db = await getDbPool();
        const query = `
            SELECT id_produk, nama, deskripsi, harga, stok, gambar
            FROM Produk
            WHERE stok >= 0`; // Sesuaikan query jika perlu

        const [rows] = await db.query(query);

        // LOGIKA AMAN UNTUK MEMPROSES GAMBAR
        const products = rows.map(product => {
            if (!product.gambar) {
                product.gambar = [];
                return product;
            }
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
        cache.set(CACHE_KEY_PRODUCTS, products);

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
        cache.del(CACHE_KEY_PRODUCTS);
        // Kembalikan minimal { id } untuk kompatibilitas react-admin
        return res.status(200).json({ id: Number(id) })

    }catch(error) {
        console.error('Gagal mencari produk:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(404).json({message: 'Produk sudah terkait di pesanan'})
        }
        return res.status(500).json({message:'Server Error saat penghapusan'})
    }
}

// =========================
// React-Admin friendly handlers
// =========================
// GET /products?sort=["field","ASC"]&range=[0,24]&filter={...}
const getProductsRA = async (req, res) => {
    try {
        const db = await getDbPool();

        // Parse query dari react-admin

        const sort = req.query.sort ? JSON.parse(req.query.sort) : ["id_produk", "ASC"];
        if (sort[0] === 'id') {
            sort[0] = 'id_produk';
        }
        const range = req.query.range ? JSON.parse(req.query.range) : [0, 24];
        const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

        const [sortField, sortOrder] = sort;
        const [start, end] = range;
        const limit = Math.max(0, end - start + 1);
        const offset = Math.max(0, start);

        const whereClauses = [];
        const params = [];

        // Pencarian sederhana via q
        if (filter.q) {
            whereClauses.push('nama LIKE ?');
            params.push(`%${filter.q}%`);
        }
        // GET_MANY, GET_MANY_REFERENCE via filter.id (array)
        if (filter.id_pr) {
            const ids = Array.isArray(filter.id) ? filter.id : [filter.id];
            if (ids.length > 0) {
                whereClauses.push(`id_produk IN (${ids.map(() => '?').join(',')})`);
                params.push(...ids);
            }
        }
        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Total untuk Content-Range
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM Produk ${whereSql}`,
            params
        );

        // Data halaman
        const [rows] = await db.query(
            `SELECT id_produk, nama, kategori, deskripsi, harga, stok, gambar
             FROM Produk
                      ${whereSql}
             ORDER BY ${sortField} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const data = rows.map(r => ({
            id: r.id_produk,
            nama: r.nama,
            kategori: r.kategori, // PERBAIKAN 2: Masukkan ke object response
            deskripsi: r.deskripsi,
            harga: r.harga,
            stok: r.stok,
            gambar: !r.gambar ? [] : (String(r.gambar).trim().startsWith('[') ? JSON.parse(r.gambar) : [r.gambar])
        }));

        // Header untuk react-admin
        const safeStart = isNaN(offset) ? 0 : offset;
        const safeEnd = isNaN(end) ? safeStart + data.length - 1 : Math.min(end, Math.max(total - 1, 0));
        res.set('Content-Range', `products ${safeStart}-${safeEnd}/${total}`);
        res.set('Access-Control-Expose-Headers', 'Content-Range');
        return res.json(data);
    } catch (e) {
        console.error('Error fetching products (RA):', e);
        return res.status(500).json({ message: 'Error fetching products' });
    }
};

// GET /products/:id — kembalikan objek dengan field id
const getProductRA = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDbPool();
        const [rows] = await db.query('SELECT * FROM Produk WHERE id_produk = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        const p = rows[0];
        let gambar = [];
        try {
            if (p.gambar) {
                gambar = (typeof p.gambar === 'string' && p.gambar.trim().startsWith('['))
                    ? JSON.parse(p.gambar)
                    : [p.gambar];
            }
        } catch (e) {
            gambar = p.gambar ? [p.gambar] : [];
        }
        return res.json({
            id: p.id_produk,
            nama: p.nama,
            kategori: p.kategori,
            deskripsi: p.deskripsi,
            harga: p.harga,
            stok: p.stok,
            gambar
        });
    } catch (e) {
        console.error('Error fetching product (RA):', e);
        return res.status(500).json({ message: 'Error fetching product' });
    }
};

module.exports = {
    getProductById,
    addProduct,
    getProductAll,
    updateProduct,
    deleteProduct,
    getProductsRA,
    getProductRA,
};