const {getDbPool} = require("../database")

const addToCart = async (req, res) => {
    let connection = null;
    try {

        const { id_produk, qty } = req.body || {};
        const userId = parseInt(req.user.userId, 10);
        const produkId = parseInt(id_produk, 10);
        const jumlah = parseInt(qty, 10);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: 'user_id tidak valid.' });
        }
        if (!Number.isInteger(produkId) || produkId <= 0) {
            return res.status(400).json({ message: 'id_produk tidak valid.' });
        }
        if (!Number.isInteger(jumlah) || jumlah <= 0) {
            return res.status(400).json({ message: 'jumlah harus bilangan bulat > 0.' });
        }

        const pool = await getDbPool();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Pastikan user ada
        const [userRows] = await connection.query('SELECT user_id FROM User WHERE user_id = ?', [userId]);
        if (userRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        // Pastikan produk ada
        const [prodRows] = await connection.query('SELECT id_produk, harga, stok FROM Produk WHERE id_produk = ?', [produkId]);
        if (prodRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }

        // Cek apakah sudah ada item yang sama di keranjang
        const [existRows] = await connection.query(
            'SELECT id_keranjang, jumlah FROM Keranjang WHERE id_user = ? AND id_produk = ?',
            [userId, produkId]
        );

        if (existRows.length > 0) {
            // Update qty
            const newQty = existRows[0].jumlah + jumlah;
            await connection.query(
                'UPDATE Keranjang SET jumlah = ?, update_at = NOW() WHERE id_keranjang = ?',
                [newQty, existRows[0].id_keranjang]
            );
        } else {
            // Insert baru
            await connection.query(
                'INSERT INTO Keranjang (id_user, id_produk, jumlah, created_at, update_at) VALUES (?, ?, ?, NOW(), NOW())',
                [userId, produkId, jumlah]
            );
        }

        await connection.commit();
        connection.release();
        return res.status(201).json({ message: 'Item ditambahkan ke keranjang.' });

    } catch (error) {
        console.error('Gagal menambahkan ke keranjang:', error);
        return res.status(500).json({ message: 'Server error saat menambah ke keranjang.' });
    } finally {
        if (connection) connection.release();
    }
};

const updateCartItem = async (req, res) => {
    let connection = null;
    try{
        const { productId } = req.params;
        const { qty } = req.body;
        const userId = parseInt(req.user.userId, 10);
        const newQty = parseInt(qty, 10);
        const proId = parseInt(productId, 10);

        if (!Number.isInteger(newQty) || newQty <= 0) {
            return res.status(400).json({ message: 'Qty harus bilangan bulat > 0.' });
        }
        if (!Number.isInteger(proId) || proId <= 0) {
            return res.status(400).json({ message: 'productId tidak valid.' });
        }

        const pool = await getDbPool();
        connection = await pool.getConnection();

        const [result] = await connection.query(
            'UPDATE Keranjang SET jumlah = ?, update_at = NOW() WHERE id_user = ? AND id_produk = ?',
            [newQty, userId, proId]
        );

        if (result.affectedRows === 0) {
            connection.release();
            return res.status(404).json({ message: 'Item keranjang tidak ada/valid' });
        }

        connection.release();
        return res.status(200).json({ message: 'jumlah Item diperbarui' });
    }catch(error){
        console.log({message:'Error dalam mengupdate keranjang: ', error});
        return res.status(404).json({ message: 'Error updating Keranjang: ', error});
    } finally {
        if (connection) connection.release();
    }
};

const deleteCartItem = async (req, res) => {
    let connection = null;
    try{
        const { productId } = req.params;
        const userId = parseInt(req.user.userId, 10);
        const proId = parseInt(productId, 10);
        if (!Number.isInteger(proId) || proId <= 0) {
            return res.status(404).json({ message: 'Produk tidak valid.' });
        }

        const pool = await getDbPool();
        connection = await pool.getConnection();

        const [result] = await connection.query(
            'DELETE FROM Keranjang WHERE id_user = ? AND id_produk = ?',
            [userId, proId]
        );

        if (result.affectedRows === 0) {
            connection.release();
            return res.status(404).json({ message: 'Item Kerangjang tidak ada/valid.' });
        }

        connection.release();
        return res.status(200).json({ message: 'Item Kerangjang telah dihapus' });
    }catch(error){
        console.log({message:'Error dalam menghapus item keranjang: ', error});
        return res.status(404).json({ message: 'Error deleting keranjang', error});
    }finally {
        if (connection) connection.release();
    }
};

const getCart = async (req, res) => {
    let connection = null;
    try{
        const userId = parseInt(req.user.userId, 10);
        const pool = await getDbPool();
        connection = await pool.getConnection();

        const [items] = await connection.query(
            'SELECT k.id_produk, k.jumlah, p.nama, p.harga, p.stok, (k.jumlah * p.harga) as subtotal FROM Keranjang k JOIN Produk p ON k.id_produk = p.id_produk WHERE id_user = ? ORDER BY k.created_at DESC',
            [userId]
        );

        const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

        connection.release();
        return res.status(200).json({items: items, total_harga: total});
    }catch(error){
        console.log(error);
        return res.status(501).json({ message: 'Error getting Keranjang', error});
    }
    finally {
        if (connection) connection.release();
    }
};

module.exports = {
    addToCart,
    updateCartItem,
    deleteCartItem,
    getCart
};