const cron = require('node-cron');
const nodemailer = require('nodemailer');

let db = null;

function initNotificationService(database) {
    db = database;

    // Check deadlines every hour
    cron.schedule('0 * * * *', () => {
        checkDeadlines();
    });

    // Check deadlines on startup (delayed to allow server to fully start)
    setTimeout(() => checkDeadlines(), 10000);

    console.log('📬 Notification service started — checking deadlines every hour');
}

async function checkDeadlines() {
    if (!db) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Get all users with email notifications enabled
        const users = db.prepare("SELECT * FROM users WHERE notification_email = 1 AND email != ''").all();

        for (const user of users) {
            const overdue = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND due_date < ? AND status != 'completed'").all(user.id, today);
            const dueToday = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND due_date = ? AND status != 'completed'").all(user.id, today);
            const dueTomorrow = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND due_date = ? AND status != 'completed'").all(user.id, tomorrowStr);

            if (overdue.length > 0 || dueToday.length > 0 || dueTomorrow.length > 0) {
                await sendEmailNotification(user, overdue, dueToday, dueTomorrow);
            }
        }
    } catch (err) {
        console.error('Deadline check error:', err.message);
    }
}

async function sendEmailNotification(user, overdue, dueToday, dueTomorrow) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let html = `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 24px; border-radius: 12px;">`;
        html += `<h1 style="color: #818cf8; margin-bottom: 24px;">📋 Task Deadline Reminder</h1>`;
        html += `<p>Hi ${user.username},</p>`;

        if (overdue.length > 0) {
            html += `<h2 style="color: #ef4444; margin-top: 20px;">🔴 Overdue Tasks (${overdue.length})</h2><ul>`;
            overdue.forEach(t => {
                html += `<li style="margin: 8px 0;"><strong>${t.title}</strong> — Due: ${t.due_date} <span style="color: #ef4444;">(OVERDUE)</span></li>`;
            });
            html += `</ul>`;
        }

        if (dueToday.length > 0) {
            html += `<h2 style="color: #f59e0b; margin-top: 20px;">🟠 Due Today (${dueToday.length})</h2><ul>`;
            dueToday.forEach(t => {
                html += `<li style="margin: 8px 0;"><strong>${t.title}</strong>${t.due_time ? ` at ${t.due_time}` : ''} <span style="background: #f59e0b20; color: #f59e0b; padding: 2px 8px; border-radius: 4px;">${t.priority}</span></li>`;
            });
            html += `</ul>`;
        }

        if (dueTomorrow.length > 0) {
            html += `<h2 style="color: #eab308; margin-top: 20px;">🟡 Due Tomorrow (${dueTomorrow.length})</h2><ul>`;
            dueTomorrow.forEach(t => {
                html += `<li style="margin: 8px 0;"><strong>${t.title}</strong>${t.due_time ? ` at ${t.due_time}` : ''}</li>`;
            });
            html += `</ul>`;
        }

        html += `<hr style="border-color: #333; margin: 24px 0;">`;
        html += `<p style="color: #888; font-size: 12px;">Sent from Office Notes & Task Organizer</p></div>`;

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
                from: `"Office Notes" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: `📋 Task Reminder: ${overdue.length} overdue, ${dueToday.length} due today`,
                html
            });
            console.log(`📧 Email sent to ${user.email}`);
        }
    } catch (err) {
        console.error('Email notification error:', err.message);
    }
}

module.exports = { initNotificationService };
