const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all folders
router.get('/', (req, res) => {
    const db = req.app.get('db');
    const folders = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM notes WHERE folder_id = f.id) as note_count,
      (SELECT COUNT(*) FROM tasks WHERE folder_id = f.id) as task_count,
      (SELECT COUNT(*) FROM meetings WHERE folder_id = f.id) as meeting_count
    FROM folders f 
    WHERE f.user_id = ? 
    ORDER BY f.sort_order, f.created_at
  `).all(req.user.id);
    res.json({ folders });
});

// Create folder
router.post('/', (req, res) => {
    const { name, color, icon } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Folder name is required.' });
    }

    const db = req.app.get('db');
    const id = uuidv4();
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM folders WHERE user_id = ?').get(req.user.id);

    db.prepare('INSERT INTO folders (id, user_id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, req.user.id, name.trim(), color || '#6366f1', icon || 'folder', (maxOrder.max_order || 0) + 1);

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    res.status(201).json({ folder });
});

// Update folder
router.put('/:id', (req, res) => {
    const { name, color, icon, sort_order } = req.body;
    const db = req.app.get('db');

    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!folder) {
        return res.status(404).json({ error: 'Folder not found.' });
    }

    db.prepare('UPDATE folders SET name = ?, color = ?, icon = ?, sort_order = ?, updated_at = datetime("now") WHERE id = ?')
        .run(name || folder.name, color || folder.color, icon || folder.icon, sort_order !== undefined ? sort_order : folder.sort_order, req.params.id);

    const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
    res.json({ folder: updated });
});

// Delete folder
router.delete('/:id', (req, res) => {
    const db = req.app.get('db');

    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!folder) {
        return res.status(404).json({ error: 'Folder not found.' });
    }

    // Move items to no folder instead of deleting
    db.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ?').run(req.params.id);
    db.prepare('UPDATE tasks SET folder_id = NULL WHERE folder_id = ?').run(req.params.id);
    db.prepare('UPDATE meetings SET folder_id = NULL WHERE folder_id = ?').run(req.params.id);
    db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);

    res.json({ message: 'Folder deleted successfully.' });
});

module.exports = router;
