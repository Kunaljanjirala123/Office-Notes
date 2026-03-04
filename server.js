require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/init');
const { initNotificationService } = require('./services/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initDatabase();
app.set('db', db);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/calendar', require('./routes/calendar'));

// Serve audio files
app.use('/audio', express.static(path.join(__dirname, 'data', 'audio')));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Office Notes & Task Organizer`);
    console.log(`   Running at http://localhost:${PORT}`);
    console.log(`   Database: ${path.join(__dirname, 'data', 'office_notes.db')}\n`);

    // Start notification service
    initNotificationService(db);
});
