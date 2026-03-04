const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all items for a specific month
router.get('/:year/:month', (req, res) => {
    const { year, month } = req.params;
    const db = req.app.get('db');
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const tasks = db.prepare('SELECT id, title, due_date, due_time, priority, status, folder_id FROM tasks WHERE user_id = ? AND due_date BETWEEN ? AND ?')
        .all(req.user.id, startDate, endDate);

    const notes = db.prepare('SELECT id, title, date, folder_id FROM notes WHERE user_id = ? AND date BETWEEN ? AND ?')
        .all(req.user.id, startDate, endDate);

    const meetings = db.prepare('SELECT id, title, date, start_time, end_time, folder_id FROM meetings WHERE user_id = ? AND date BETWEEN ? AND ?')
        .all(req.user.id, startDate, endDate);

    // Build day map
    const dayMap = {};
    tasks.forEach(t => {
        const day = t.due_date;
        if (!dayMap[day]) dayMap[day] = { tasks: [], notes: [], meetings: [] };
        dayMap[day].tasks.push(t);
    });
    notes.forEach(n => {
        const day = n.date;
        if (!dayMap[day]) dayMap[day] = { tasks: [], notes: [], meetings: [] };
        dayMap[day].notes.push(n);
    });
    meetings.forEach(m => {
        const day = m.date;
        if (!dayMap[day]) dayMap[day] = { tasks: [], notes: [], meetings: [] };
        dayMap[day].meetings.push(m);
    });

    res.json({ dayMap });
});

// Get everything for a specific date
router.get('/date/:date', (req, res) => {
    const { date } = req.params;
    const db = req.app.get('db');

    const tasks = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.user_id = ? AND t.due_date = ? ORDER BY CASE t.priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END')
        .all(req.user.id, date);

    const notes = db.prepare('SELECT n.*, f.name as folder_name, f.color as folder_color FROM notes n LEFT JOIN folders f ON n.folder_id = f.id WHERE n.user_id = ? AND n.date = ? ORDER BY n.pinned DESC, n.updated_at DESC')
        .all(req.user.id, date);

    const meetings = db.prepare('SELECT m.*, f.name as folder_name, f.color as folder_color FROM meetings m LEFT JOIN folders f ON m.folder_id = f.id WHERE m.user_id = ? AND m.date = ? ORDER BY m.start_time ASC')
        .all(req.user.id, date);

    res.json({ date, tasks, notes, meetings });
});

// Get upcoming deadlines
router.get('/deadlines/upcoming', (req, res) => {
    const db = req.app.get('db');
    const today = new Date().toISOString().split('T')[0];

    // Get next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const overdue = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.user_id = ? AND t.due_date < ? AND t.status != "completed" ORDER BY t.due_date ASC')
        .all(req.user.id, today);

    const dueToday = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.user_id = ? AND t.due_date = ? AND t.status != "completed" ORDER BY CASE t.priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END')
        .all(req.user.id, today);

    const upcoming = db.prepare('SELECT t.*, f.name as folder_name, f.color as folder_color FROM tasks t LEFT JOIN folders f ON t.folder_id = f.id WHERE t.user_id = ? AND t.due_date > ? AND t.due_date <= ? AND t.status != "completed" ORDER BY t.due_date ASC')
        .all(req.user.id, today, nextWeekStr);

    res.json({ overdue, dueToday, upcoming });
});

module.exports = router;
