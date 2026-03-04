const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get notes (with optional filters)
router.get('/', (req, res) => {
    const { folder_id, date, search } = req.query;
    const db = req.app.get('db');
    let query = 'SELECT n.*, f.name as folder_name, f.color as folder_color FROM notes n LEFT JOIN folders f ON n.folder_id = f.id WHERE n.user_id = ?';
    const params = [req.user.id];

    if (folder_id) {
        query += ' AND n.folder_id = ?';
        params.push(folder_id);
    }
    if (date) {
        query += ' AND n.date = ?';
        params.push(date);
    }
    if (search) {
        query += ' AND (n.title LIKE ? OR n.content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY n.pinned DESC, n.updated_at DESC';
    const notes = db.prepare(query).all(...params);
    res.json({ notes });
});

// Get single note
router.get('/:id', (req, res) => {
    const db = req.app.get('db');
    const note = db.prepare('SELECT n.*, f.name as folder_name, f.color as folder_color FROM notes n LEFT JOIN folders f ON n.folder_id = f.id WHERE n.id = ? AND n.user_id = ?').get(req.params.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json({ note });
});

// Create note
router.post('/', (req, res) => {
    const { title, content, folder_id, date, pinned } = req.body;
    const db = req.app.get('db');
    const id = uuidv4();
    const noteDate = date || new Date().toISOString().split('T')[0];

    db.prepare('INSERT INTO notes (id, user_id, folder_id, title, content, date, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.user.id, folder_id || null, title || 'Untitled Note', content || '', noteDate, pinned ? 1 : 0);

    const note = db.prepare('SELECT n.*, f.name as folder_name, f.color as folder_color FROM notes n LEFT JOIN folders f ON n.folder_id = f.id WHERE n.id = ?').get(id);
    res.status(201).json({ note });
});

// Update note
router.put('/:id', (req, res) => {
    const { title, content, folder_id, date, pinned } = req.body;
    const db = req.app.get('db');

    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    db.prepare('UPDATE notes SET title = ?, content = ?, folder_id = ?, date = ?, pinned = ?, updated_at = datetime("now") WHERE id = ?')
        .run(
            title !== undefined ? title : note.title,
            content !== undefined ? content : note.content,
            folder_id !== undefined ? folder_id : note.folder_id,
            date || note.date,
            pinned !== undefined ? (pinned ? 1 : 0) : note.pinned,
            req.params.id
        );

    const updated = db.prepare('SELECT n.*, f.name as folder_name, f.color as folder_color FROM notes n LEFT JOIN folders f ON n.folder_id = f.id WHERE n.id = ?').get(req.params.id);
    res.json({ note: updated });
});

// Delete note
router.delete('/:id', (req, res) => {
    const db = req.app.get('db');
    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Note deleted successfully.' });
});

module.exports = router;
