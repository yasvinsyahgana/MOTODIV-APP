const { getDbPool } = require('../database');

// GET /analytics/orders/counters?lastDays=7
const getOrderCounters = async (req, res) => {
    let connection;
    try {
        const lastDays = Math.max(1, Math.min(365, parseInt(req.query.lastDays || '7', 10) || 7));
        const pool = await getDbPool();
        connection = await pool.getConnection();

        // 1. Last N days orders
        const [[{ last7 }]] = await connection.query(
            `SELECT COUNT(*) AS last7 FROM Pesanan WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`,
            [lastDays]
        );

        // 2. Pending orders
        const [[{ pending }]] = await connection.query(
            `SELECT COUNT(*) AS pending FROM Pesanan WHERE status_pesanan = 'pending'`
        );

        // 3. Total Customers (New) - Asumsi tabel 'Users'
        const [[{ totalCustomers }]] = await connection.query(
            `SELECT COUNT(*) AS totalCustomers FROM User`
        );

        // 4. Order Status Distribution (New)
        const [statusDist] = await connection.query(
            `SELECT status_pesanan AS name, COUNT(*) AS value FROM Pesanan GROUP BY status_pesanan`
        );

        return res.json({
            last7DaysOrders: last7,
            pendingOrders: pending,
            windowDays: lastDays,
            totalCustomers,
            statusDistribution: statusDist
        });
    } catch (e) {
        console.error('Analytics counters error:', e);
        return res.status(500).json({ message: 'Server analytics error', error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

// GET /analytics/inventory/low-stock (New)
const getLowStock = async (req, res) => {
    let connection;
    try {
        const pool = await getDbPool();
        connection = await pool.getConnection();

        // Asumsi tabel 'Produk' dan kolom 'stok', 'nama_produk'
        const [rows] = await connection.query(
            `SELECT id_produk, nama, stok FROM Produk WHERE stok <= 10 ORDER BY stok ASC LIMIT 5`
        );

        return res.json(rows);
    } catch (e) {
        console.error('Analytics low-stock error:', e);
        return res.status(500).json({ message: 'Server analytics error', error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

// GET /analytics/sales/by-month
const getSalesByMonth = async (req, res) => {
    let connection;
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ message: 'Parameter from dan to wajib.' });

        const pool = await getDbPool();
        connection = await pool.getConnection();

        const [rows] = await connection.query(
            `SELECT DATE_FORMAT(CONVERT_TZ(created_at, @@session.time_zone, '+00:00'), '%Y-%m-%d') AS period,
                    SUM(total_harga) AS total
             FROM Pesanan
             WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
             GROUP BY period ORDER BY period ASC`,
            [from, to]
        );

        const buckets = rows.map(r => ({ period: r.period, total: Number(r.total) || 0 }));
        return res.json({ buckets, from, to });
    } catch (e) {
        console.error('Analytics by-month error:', e);
        return res.status(500).json({ message: 'Server analytics error', error: e.message });
    } finally {
        if (connection) connection.release();
    }
};
module.exports = { getOrderCounters, getSalesByMonth, getLowStock };
