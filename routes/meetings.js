const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Configure multer for audio uploads
const uploadsDir = path.join(__dirname, '..', 'data', 'audio');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.webm', '.ogg', '.mp3', '.wav', '.m4a', '.mp4'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed.'));
        }
    }
});

// Get meetings
router.get('/', (req, res) => {
    const { folder_id, date, search } = req.query;
    const db = req.app.get('db');
    let query = 'SELECT m.*, f.name as folder_name, f.color as folder_color FROM meetings m LEFT JOIN folders f ON m.folder_id = f.id WHERE m.user_id = ?';
    const params = [req.user.id];

    if (folder_id) { query += ' AND m.folder_id = ?'; params.push(folder_id); }
    if (date) { query += ' AND m.date = ?'; params.push(date); }
    if (search) { query += ' AND (m.title LIKE ? OR m.notes LIKE ? OR m.transcript LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    query += ' ORDER BY m.date DESC, m.start_time DESC';
    const meetings = db.prepare(query).all(...params);
    res.json({ meetings });
});

// Get single meeting
router.get('/:id', (req, res) => {
    const db = req.app.get('db');
    const meeting = db.prepare('SELECT m.*, f.name as folder_name, f.color as folder_color FROM meetings m LEFT JOIN folders f ON m.folder_id = f.id WHERE m.id = ? AND m.user_id = ?').get(req.params.id, req.user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
    res.json({ meeting });
});

// Create meeting
router.post('/', (req, res) => {
    const { title, folder_id, date, start_time, end_time, attendees, agenda, notes } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Meeting title is required.' });
    }

    const db = req.app.get('db');
    const id = uuidv4();
    const meetingDate = date || new Date().toISOString().split('T')[0];

    db.prepare('INSERT INTO meetings (id, user_id, folder_id, title, date, start_time, end_time, attendees, agenda, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.user.id, folder_id || null, title.trim(), meetingDate, start_time || '', end_time || '', JSON.stringify(attendees || []), agenda || '', notes || '');

    const meeting = db.prepare('SELECT m.*, f.name as folder_name, f.color as folder_color FROM meetings m LEFT JOIN folders f ON m.folder_id = f.id WHERE m.id = ?').get(id);
    res.status(201).json({ meeting });
});

// Update meeting
router.put('/:id', (req, res) => {
    const { title, folder_id, date, start_time, end_time, attendees, agenda, notes, transcript, summary } = req.body;
    const db = req.app.get('db');

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    db.prepare(`UPDATE meetings SET title = ?, folder_id = ?, date = ?, start_time = ?, end_time = ?, attendees = ?, agenda = ?, notes = ?, transcript = ?, summary = ?, updated_at = datetime("now") WHERE id = ?`)
        .run(
            title !== undefined ? title : meeting.title,
            folder_id !== undefined ? folder_id : meeting.folder_id,
            date || meeting.date,
            start_time !== undefined ? start_time : meeting.start_time,
            end_time !== undefined ? end_time : meeting.end_time,
            attendees ? JSON.stringify(attendees) : meeting.attendees,
            agenda !== undefined ? agenda : meeting.agenda,
            notes !== undefined ? notes : meeting.notes,
            transcript !== undefined ? transcript : meeting.transcript,
            summary !== undefined ? summary : meeting.summary,
            req.params.id
        );

    const updated = db.prepare('SELECT m.*, f.name as folder_name, f.color as folder_color FROM meetings m LEFT JOIN folders f ON m.folder_id = f.id WHERE m.id = ?').get(req.params.id);
    res.json({ meeting: updated });
});

// Upload audio
router.post('/:id/audio', upload.single('audio'), (req, res) => {
    const db = req.app.get('db');
    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });

    // Delete old audio if exists
    if (meeting.audio_path) {
        const oldPath = path.join(uploadsDir, meeting.audio_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare('UPDATE meetings SET audio_path = ?, updated_at = datetime("now") WHERE id = ?').run(req.file.filename, req.params.id);

    res.json({ audio_path: req.file.filename });
});

// Serve audio files
router.get('/:id/audio/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Audio file not found.' });
    res.sendFile(filePath);
});

// Delete meeting
router.delete('/:id', (req, res) => {
    const db = req.app.get('db');
    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    // Delete audio file if exists
    if (meeting.audio_path) {
        const filePath = path.join(uploadsDir, meeting.audio_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM meetings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Meeting deleted successfully.' });
});

module.exports = router;
