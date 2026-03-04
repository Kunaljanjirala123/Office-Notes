const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get tasks (with optional filters)
router.get('/', (req, res) => {
    const { folder_id, due_date, status, priority, from_date, to_date } = req.query;
    const db = req.app.get('db');
    let query = 'SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.user_id = ?';
    const params = [req.user.id];

    if (folder_id) {
        query += ' AND t.folder_id = ?';
        params.push(folder_id);
    }
    if (due_date) {
        query += ' AND t.due_date = ?';
        params.push(due_date);
    }
    if (status) {
        query += ' AND t.status = ?';
        params.push(status);
    }
    if (priority) {
        query += ' AND t.priority = ?';
        params.push(priority);
    }
    if (from_date && to_date) {
        query += ' AND t.due_date BETWEEN ? AND ?';
        params.push(from_date, to_date);
    }

    query += ' ORDER BY CASE t.priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END, t.due_date ASC';
    const tasks = db.prepare(query).all(...params);
    res.json({ tasks });
});

// Get single task
router.get('/:id', (req, res) => {
    const db = req.app.get('db');
    const task = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.id = ? AND t.user_id = ?').get(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ task });
});

// Create task
router.post('/', (req, res) => {
    const { title, description, folder_id, due_date, due_time, priority } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Task title is required.' });
    }
    if (!due_date) {
        return res.status(400).json({ error: 'Due date is required.' });
    }

    const db = req.app.get('db');
    const id = uuidv4();

    db.prepare('INSERT INTO tasks (id, user_id, folder_id, title, description, due_date, due_time, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.user.id, folder_id || null, title.trim(), description || '', due_date, due_time || '', priority || 'medium');

    const task = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.id = ?').get(id);
    res.status(201).json({ task });
});

// Update task
router.put('/:id', (req, res) => {
    const { title, description, folder_id, due_date, due_time, priority, status } = req.body;
    const db = req.app.get('db');

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const completed_at = status === 'completed' && task.status !== 'completed' ? new Date().toISOString() : task.completed_at;

    db.prepare('UPDATE tasks SET title = ?, description = ?, folder_id = ?, due_date = ?, due_time = ?, priority = ?, status = ?, completed_at = ?, updated_at = datetime("now") WHERE id = ?')
        .run(
            title !== undefined ? title : task.title,
            description !== undefined ? description : task.description,
            folder_id !== undefined ? folder_id : task.folder_id,
            due_date || task.due_date,
            due_time !== undefined ? due_time : task.due_time,
            priority || task.priority,
            status || task.status,
            completed_at,
            req.params.id
        );

    const updated = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.id = ?').get(req.params.id);
    res.json({ task: updated });
});

// Delete task
router.delete('/:id', (req, res) => {
    const db = req.app.get('db');
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted successfully.' });
});

module.exports = router;
