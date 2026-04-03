const express = require('express');
const cors = require('cors');
require('dotenv').config();

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { getDbPool} = require('./database');
const path = require('path');



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'https://motodiv.store', 'https://admin.motodiv.store', 'null', 'https://api.motodiv.store','http://localhost:5173','http://localhost:4173' ], // 'null' untuk file lokal
    methods: ['GET','POST','PATCH','PUT','DELETE'],
    credentials: true, // PENTING: Izinkan cookies
    exposedHeaders: ['Content-Range']
}));
//whoops
app.use(express.json());

// --- Memuat Routes ---
(async () => {
    try {
        const dbPool = await getDbPool();
        const sessionStore = new MySQLStore({
            expiration: 86400000,
            createDatabaseTable : true,
            schema: {
                tableName: 'UserSession',
                columnNames: {
                    session_id: 'session_id',
                    expires: 'expires',
                    data: 'data'
                }
            }
        }, dbPool);

        app.use(session({
            key: 'sessionId',
            secret: process.env.SESSION_SECRET || 'my-fallback-session-secret',
            store: sessionStore,
            resave: true,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: false,
                maxAge: 1000 * 60 * 60 * 24
            }
        }));
        console.log(
            'Session store terhubung ke MySQL SERVER'
        );

        const ProductRoutes = require('./routes/productRoutes');
        const UserRoutes = require('./routes/usersRoutes');
        const AuthRoutes = require('./routes/authRoutes');
        const CartRoutes = require('./routes/cartRoutes');
        const OrderRoutes = require('./routes/orderRoutes');
        const AnalyticsRoutes = require('./routes/analyticsRoutes');
        const LayananRoutes = require('./routes/layananRoutes');
        const UlasanRoutes = require('./routes/ulasanRoutes');



        app.get('/', (req, res) => {
            res.json('E-Commerce API (Session-based) is up and running!');
        });

        app.use('/products', ProductRoutes);
        app.use('/users', UserRoutes);
        app.use('/auth', AuthRoutes);
        app.use('/cart', CartRoutes);
        app.use('/orders', OrderRoutes);
        app.use('/analytics', AnalyticsRoutes);
        app.use('/layanan', LayananRoutes);
        app.use('/ulasan', UlasanRoutes);
        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
        app.use((err, req, res, next) => {
            console.log(err);
            res.status(500).json({ message: 'Terjadi Error: ', err });
        });

        app.listen(PORT, () => {
            console.log(`Server started on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error({message: 'Gagal dalam starting server atau session store', err});
    }
})();