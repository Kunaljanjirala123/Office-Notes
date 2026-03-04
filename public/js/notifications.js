// ═══════════════════════════════════════════════════════
// Notifications — In-app deadline alerts and browser push
// ═══════════════════════════════════════════════════════

const Notifications = {
    deadlines: { overdue: [], dueToday: [], upcoming: [] },
    panelOpen: false,

    async load() {
        try {
            const data = await API.get('/calendar/deadlines/upcoming');
            this.deadlines = data;
        } catch (err) {
            console.error('Failed to load deadlines:', err);
        }
    },

    getCount() {
        return (this.deadlines.overdue?.length || 0) + (this.deadlines.dueToday?.length || 0);
    },

    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    },

    sendBrowserNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '📋' });
        }
    },

    checkAndNotify() {
        const count = this.getCount();
        if (count > 0) {
            this.sendBrowserNotification(
                '📋 Task Reminder',
                `You have ${this.deadlines.overdue?.length || 0} overdue and ${this.deadlines.dueToday?.length || 0} tasks due today`
            );
        }
    },

    togglePanel() {
        this.panelOpen = !this.panelOpen;
        const panel = document.getElementById('notification-panel');
        if (panel) panel.classList.toggle('open', this.panelOpen);
    },

    renderPanel() {
        const { overdue, dueToday, upcoming } = this.deadlines;

        let items = '';

        if (overdue?.length) {
            items += `<div style="padding:8px 20px;font-size:var(--font-size-xs);font-weight:600;color:var(--color-danger);text-transform:uppercase">🔴 Overdue (${overdue.length})</div>`;
            overdue.forEach(t => {
                items += `<div class="notification-item unread" style="border-left-color:var(--color-danger)" onclick="Tasks.showEdit('${t.id}'); Notifications.togglePanel()">
          <div><div style="font-size:var(--font-size-sm);font-weight:500">${Utils.escapeHTML(t.title)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">Due: ${Utils.formatDate(t.due_date)}</div></div>
        </div>`;
            });
        }

        if (dueToday?.length) {
            items += `<div style="padding:8px 20px;font-size:var(--font-size-xs);font-weight:600;color:var(--color-warning);text-transform:uppercase">🟠 Due Today (${dueToday.length})</div>`;
            dueToday.forEach(t => {
                items += `<div class="notification-item" onclick="Tasks.showEdit('${t.id}'); Notifications.togglePanel()">
          <div><div style="font-size:var(--font-size-sm);font-weight:500">${Utils.escapeHTML(t.title)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">${t.due_time ? Utils.formatTime(t.due_time) : 'No time set'} · <span class="priority-badge ${t.priority}" style="font-size:10px">${t.priority}</span></div></div>
        </div>`;
            });
        }

        if (upcoming?.length) {
            items += `<div style="padding:8px 20px;font-size:var(--font-size-xs);font-weight:600;color:var(--color-info);text-transform:uppercase">📅 This Week (${upcoming.length})</div>`;
            upcoming.forEach(t => {
                items += `<div class="notification-item" onclick="Tasks.showEdit('${t.id}'); Notifications.togglePanel()">
          <div><div style="font-size:var(--font-size-sm);font-weight:500">${Utils.escapeHTML(t.title)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">${Utils.formatDateRelative(t.due_date)}</div></div>
        </div>`;
            });
        }

        if (!items) {
            items = `<div class="empty-state" style="padding:32px"><div class="empty-state-icon">🎉</div><div class="empty-state-title">All Clear!</div><div class="empty-state-text">No pending deadlines</div></div>`;
        }

        return `
      <div id="notification-panel" class="notification-panel ${this.panelOpen ? 'open' : ''}">
        <div class="notification-panel-header">
          <h3 style="font-size:var(--font-size-md);font-weight:700">Deadlines</h3>
          <button class="modal-close" onclick="Notifications.togglePanel()">✕</button>
        </div>
        ${items}
      </div>
    `;
    },

    renderDeadlineOverview() {
        const { overdue, dueToday, upcoming } = this.deadlines;

        if (!overdue?.length && !dueToday?.length && !upcoming?.length) {
            return `<div class="card"><div class="empty-state" style="padding:24px"><div class="empty-state-icon">🎉</div><div class="empty-state-title">All Caught Up!</div><div class="empty-state-text">No pending deadlines. Great job!</div></div></div>`;
        }

        const today = Utils.getTodayStr();
        let html = '';

        if (overdue?.length) {
            html += `<div class="deadline-section"><div class="deadline-section-title"><span class="overdue-icon">🔴</span> Overdue (${overdue.length})</div><div class="item-list">${overdue.map(t => Tasks.renderTaskRow(t, today)).join('')}</div></div>`;
        }
        if (dueToday?.length) {
            html += `<div class="deadline-section"><div class="deadline-section-title"><span class="today-icon">🟠</span> Due Today (${dueToday.length})</div><div class="item-list">${dueToday.map(t => Tasks.renderTaskRow(t, today)).join('')}</div></div>`;
        }
        if (upcoming?.length) {
            html += `<div class="deadline-section"><div class="deadline-section-title"><span class="upcoming-icon">📅</span> This Week (${upcoming.length})</div><div class="item-list">${upcoming.map(t => Tasks.renderTaskRow(t, today)).join('')}</div></div>`;
        }

        return html;
    }
};
