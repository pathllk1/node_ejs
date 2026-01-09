const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'fallback_access_token_secret_for_dev';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_token_secret_for_dev';

// Generate both tokens
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, username: user.username, firm_id: user.firm_id, type: 'access' },
        ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' } // Short-lived access token
    );

    const refreshToken = jwt.sign(
        { id: user.id, username: user.username, firm_id: user.firm_id, type: 'refresh' },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' } // Long-lived refresh token
    );

    return { accessToken, refreshToken };
};

exports.signup = async (req, res) => {
    try {
        const { fullname, username, email, password, confirm_password } = req.body;

        // 1. Basic Validation
        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // 2. Check if user exists
        const checkUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?');
        const existing = checkUser.get(email, username);
        if (existing) {
            return res.status(409).json({ error: 'User with this email or username already exists' });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date().toISOString();

        // 4. Insert User
        const insertUser = db.prepare(`
            INSERT INTO users (fullname, username, email, password, created_at, updated_at, firm_id, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertUser.run(fullname, username, email, hashedPassword, now, now, null, null);

        res.status(201).json({ message: 'Account created successfully! Please login.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find User
        const findUser = db.prepare('SELECT *, firm_id FROM users WHERE email = ?');
        const user = findUser.get(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 2. Compare Password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 3. Generate Both Tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // 4. Send Response with both tokens
        res.json({
            message: 'Login successful',
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                username: user.username,
                fullname: user.fullname
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getUserProfile = (req, res) => {
    try {
        // req.user comes from the middleware
        const userId = req.user.id;

        const stmt = db.prepare('SELECT id, fullname, username, email, created_at, firm_id FROM users WHERE id = ?');
        const user = stmt.get(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Export token generation for middleware use
exports.generateTokens = generateTokens;
exports.ACCESS_TOKEN_SECRET = ACCESS_TOKEN_SECRET;
exports.REFRESH_TOKEN_SECRET = REFRESH_TOKEN_SECRET;