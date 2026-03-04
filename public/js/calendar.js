// ═══════════════════════════════════════════════════════
// Calendar — Interactive monthly calendar with deadlines
// ═══════════════════════════════════════════════════════

const Calendar = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDate: null,
    dayMap: {},
    dateItems: null,

    async loadMonth() {
        try {
            const data = await API.get(`/calendar/${this.currentYear}/${this.currentMonth + 1}`);
            this.dayMap = data.dayMap || {};
        } catch (err) {
            console.error('Failed to load calendar data:', err);
        }
    },

    async loadDate(dateStr) {
        try {
            const data = await API.get(`/calendar/date/${dateStr}`);
            this.dateItems = data;
        } catch (err) {
            console.error('Failed to load date data:', err);
        }
    },

    renderPage() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = Utils.getTodayStr();

        // Build calendar grid
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

        let calendarDays = '';

        // Previous month padding
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            calendarDays += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
        }

        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isSelected = dateStr === this.selectedDate;
            const dayData = this.dayMap[dateStr];

            let indicators = '';
            if (dayData) {
                const todayDate = today;
                dayData.tasks?.forEach(t => {
                    if (t.status === 'completed') return;
                    const cls = t.due_date < todayDate ? 'overdue' : 'task';
                    indicators += `<span class="day-dot ${cls}"></span>`;
                });
                dayData.notes?.forEach(() => { indicators += `<span class="day-dot note"></span>`; });
                dayData.meetings?.forEach(() => { indicators += `<span class="day-dot meeting"></span>`; });
            }

            calendarDays += `
        <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="Calendar.selectDate('${dateStr}')">
          <span class="day-number">${d}</span>
          <div class="day-indicators">${indicators}</div>
        </div>
      `;
        }

        // Next month padding
        const totalCells = firstDay + daysInMonth;
        const remaining = 7 - (totalCells % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                calendarDays += `<div class="calendar-day other-month"><span class="day-number">${i}</span></div>`;
            }
        }

        let html = `
      <div class="calendar-container">
        <div class="calendar-header">
          <button class="calendar-nav" onclick="Calendar.prevMonth()">◀</button>
          <span class="calendar-month-year">${months[this.currentMonth]} ${this.currentYear}</span>
          <button class="calendar-nav" onclick="Calendar.nextMonth()">▶</button>
        </div>
        <div class="calendar-grid">
          ${days.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
          ${calendarDays}
        </div>
      </div>

      <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
        <span style="display:flex;align-items:center;gap:4px;font-size:var(--font-size-xs);color:var(--text-tertiary)"><span class="day-dot task" style="position:static"></span> Task</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:var(--font-size-xs);color:var(--text-tertiary)"><span class="day-dot note" style="position:static"></span> Note</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:var(--font-size-xs);color:var(--text-tertiary)"><span class="day-dot meeting" style="position:static"></span> Meeting</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:var(--font-size-xs);color:var(--text-tertiary)"><span class="day-dot overdue" style="position:static"></span> Overdue</span>
      </div>
    `;

        // Selected date detail
        if (this.selectedDate && this.dateItems) {
            html += this.renderDateDetail();
        }

        return html;
    },

    renderDateDetail() {
        const d = this.dateItems;
        const today = Utils.getTodayStr();

        let html = `
      <div class="card animate-slide-up" style="margin-top:16px">
        <div class="card-header">
          <h3 class="card-title">📅 ${Utils.formatDate(this.selectedDate)} ${this.selectedDate === today ? '(Today)' : ''}</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" onclick="Tasks.showCreate(); document.getElementById('task-due').value='${this.selectedDate}'">+ Task</button>
            <button class="btn btn-sm btn-secondary" onclick="Notes.showCreate(); document.getElementById('note-date').value='${this.selectedDate}'">+ Note</button>
            <button class="btn btn-sm btn-secondary" onclick="Meetings.showCreate(); document.getElementById('meeting-date').value='${this.selectedDate}'">+ Meeting</button>
          </div>
        </div>
    `;

        if (!d.tasks.length && !d.notes.length && !d.meetings.length) {
            html += `<div class="empty-state" style="padding:24px"><div class="empty-state-icon">📭</div><div class="empty-state-title">Nothing scheduled</div><div class="empty-state-text">Add tasks, notes, or meetings for this date</div></div>`;
        } else {
            // Tasks
            if (d.tasks.length) {
                html += `<div class="deadline-section"><div class="deadline-section-title">✅ Tasks (${d.tasks.length})</div><div class="item-list">`;
                d.tasks.forEach(t => { html += Tasks.renderTaskRow(t, today); });
                html += `</div></div>`;
            }

            // Notes
            if (d.notes.length) {
                html += `<div class="deadline-section" style="margin-top:16px"><div class="deadline-section-title">📝 Notes (${d.notes.length})</div><div class="item-list">`;
                d.notes.forEach(n => {
                    html += `<div class="item-row" onclick="Notes.showEdit('${n.id}')"><div class="item-content"><div class="item-title">${Utils.escapeHTML(n.title)}</div></div></div>`;
                });
                html += `</div></div>`;
            }

            // Meetings
            if (d.meetings.length) {
                html += `<div class="deadline-section" style="margin-top:16px"><div class="deadline-section-title">🎙️ Meetings (${d.meetings.length})</div><div class="item-list">`;
                d.meetings.forEach(m => {
                    html += `<div class="item-row" onclick="Meetings.showDetail('${m.id}')"><div style="font-size:20px">🎙️</div><div class="item-content"><div class="item-title">${Utils.escapeHTML(m.title)}</div><div class="item-meta">${m.start_time ? Utils.formatTime(m.start_time) : ''}</div></div></div>`;
                });
                html += `</div></div>`;
            }
        }

        html += `</div>`;
        return html;
    },

    async selectDate(dateStr) {
        this.selectedDate = dateStr;
        await this.loadDate(dateStr);
        Dashboard.refreshContent();
    },

    async prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
        this.selectedDate = null;
        this.dateItems = null;
        await this.loadMonth();
        Dashboard.refreshContent();
    },

    async nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        this.selectedDate = null;
        this.dateItems = null;
        await this.loadMonth();
        Dashboard.refreshContent();
    }
};
