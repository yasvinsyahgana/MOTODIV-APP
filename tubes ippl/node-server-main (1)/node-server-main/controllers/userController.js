const { getDbPool } = require('../database');
const bcrypt = require("bcryptjs");

// Logic starts here
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDbPool();
        const query= 'SELECT user_id, nama, email, no_hp, role FROM User WHERE user_id = ?';
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(rows[0]);
    } catch (error){
        console.error(`Failed to get user_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching user.' });
    }
};

const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const db = await getDbPool();
        const query = 'SELECT user_id, nama, email, no_hp, role FROM User WHERE email = ?';
        const [rows] = await db.query(query, [email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User with that email not found.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(`Failed to get email ${req.params.email}:`, error);
        res.status(500).json({ message: 'Error fetching user email.' });
    }
};

const getUser = async (req, res) => {
    try {
        const db = await getDbPool();
        const query = `
        SELECT user_id, nama, email, no_hp, role
        FROM User`;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error(`Failed to fetch users`, error);
        res.status(500).json({ message: 'Error fetching users.' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const LoggedInUserId = req.user.userId;
        const LoggedInUserRole = req.user.role;

        if (LoggedInUserRole !== 'admin' && LoggedInUserId !== parseInt(id, 10)) {
            return res.status(403).json({ message: 'Akses ditolak. Anda hanya bisa mengubah data Anda sendiri.' });
        }
        // Basic validation for numeric ID
        if (!/^\d+$/.test(String(id))) {
            return res.status(400).json({ message: 'Invalid user id.' });
        }

        const { nama, email, no_hp, password } = req.body || {};

        // Build dynamic update set based on provided fields
        const fields = [];
        const values = [];

        if (nama !== undefined) {
            fields.push('nama = ?');
            values.push(nama);
        }
        if (email !== undefined) {
            fields.push('email = ?');
            values.push(email);
        }
        if (no_hp !== undefined) {
            fields.push('no_hp = ?');
            values.push(no_hp);
        }
        if (password !== undefined) {
            // Hash the new password if provided
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            fields.push('password = ?');
            values.push(hash);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update. Allowed: nama, email, no_hp, password.' });
        }

        const db = await getDbPool();

        // Ensure user exists
        const [existing] = await db.query('SELECT user_id FROM User WHERE user_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // If email is being updated, ensure it is not taken by another user
        if (email !== undefined) {
            const [emailTaken] = await db.query('SELECT user_id FROM User WHERE email = ? AND user_id <> ?', [email, id]);
            if (emailTaken.length > 0) {
                return res.status(409).json({ message: 'Email is already in use by another account.' });
            }
        }

        const sql = `UPDATE User SET ${fields.join(', ')} WHERE user_id = ?`;
        await db.query(sql, [...values, id]);

        // Return the updated user (omit password)
        const [rows] = await db.query('SELECT user_id, nama, email, no_hp, role FROM User WHERE user_id = ?', [id]);
        return res.json({ message: 'User updated successfully!', user: rows[0] });
    } catch (error){
        console.error('Failed to update user:', error);
        return res.status(500).json({ message: 'Server error while updating user.' });
    }
};

const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const db = await getDbPool();
        const [users] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }



        // 1. Buat data user untuk disimpan di session
        const sessionUser = {
            userId: user.user_id,
            email: user.email,
            role: user.role
        };

        // 2. Simpan di session
        req.session.user = sessionUser;

        // 3. Kirim data user (tanpa token)
        res.json({ message: 'Logged in successfully!', user: sessionUser });

    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({message: 'Server error during login.'});
    }
}

const userRegister = async (req, res) => {
    try {
        // Now expecting 'nama' and 'no_hp' from the request body
        const { nama, email, password, no_hp, role = 'customer' } = req.body;
        if (!email || !password || !nama || !no_hp) {
            return res.status(400).json({ message: 'Nama, email, password, dan no_hp wajib diisi.' });
        }

        const validRoles = ['customer', 'admin'];
        if (!validRoles.includes(role)) {}

        const db = await getDbPool();
        // Check if user already exists
        const [existingUsers] = await db.query('SELECT user_id FROM User WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Akun dengan email ini sudah ada.' });
        }

        // Hash the password with a per-user salt before storing in the database
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert the new user record
        const [result] = await db.query(
            'INSERT INTO User (nama, email, password, no_hp, role) VALUES (?, ?, ?, ?, ?)',
            [nama, email, passwordHash, no_hp, role] // Default role to 'customer'
        );

        res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });

    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

const userLogout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error during logout.' });
        }
        res.clearCookie('sessionId');
        res.status(200).json({ message: 'Logged out berhasil!' });
    });
}

const checkSession = async (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json({
            loggedIn: true,
            user: req.session.user
        });
    }
    else{
        return res.status(401).json({ loggedIn: false, message: "Belum login" });
    }
}
// Logic ends here
module.exports = {
    getUserById,
    getUser,
    updateUser,
    getUserByEmail,
    userLogin,
    userRegister,
    userLogout,
    checkSession,
}