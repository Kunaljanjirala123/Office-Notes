const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    if (!/\d/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one number.' });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one special character.' });
    }

    const db = req.app.get('db');

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
        return res.status(409).json({ error: 'Username already taken.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 12);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)').run(id, username, hashedPassword, email || '');

    // Create a default "General" folder
    const folderId = uuidv4();
    db.prepare('INSERT INTO folders (id, user_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)').run(folderId, id, 'General', '#6366f1', 0);

    const token = jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id, username, email: email || '' } });
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT id, username, email, notification_email, notification_browser, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
});

// Update user settings
router.put('/settings', authMiddleware, (req, res) => {
    const { email, notification_email, notification_browser, current_password, new_password } = req.body;
    const db = req.app.get('db');

    if (new_password) {
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
        if (!bcrypt.compareSync(current_password, user.password)) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }
        if (new_password.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters.' });
        }
        const hashed = bcrypt.hashSync(new_password, 12);
        db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hashed, req.user.id);
    }

    if (email !== undefined) {
        db.prepare('UPDATE users SET email = ?, updated_at = datetime("now") WHERE id = ?').run(email, req.user.id);
    }
    if (notification_email !== undefined) {
        db.prepare('UPDATE users SET notification_email = ?, updated_at = datetime("now") WHERE id = ?').run(notification_email ? 1 : 0, req.user.id);
    }
    if (notification_browser !== undefined) {
        db.prepare('UPDATE users SET notification_browser = ?, updated_at = datetime("now") WHERE id = ?').run(notification_browser ? 1 : 0, req.user.id);
    }

    const updated = db.prepare('SELECT id, username, email, notification_email, notification_browser FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updated });
});

module.exports = router;
