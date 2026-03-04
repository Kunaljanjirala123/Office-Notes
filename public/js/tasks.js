// ═══════════════════════════════════════════════════════
// Tasks — Date-wise task management with priorities
// ═══════════════════════════════════════════════════════

const Tasks = {
    tasks: [],

    async load(folderId = null) {
        try {
            let url = '/tasks';
            const params = [];
            if (folderId) params.push(`folder_id=${folderId}`);
            if (params.length) url += '?' + params.join('&');
            const data = await API.get(url);
            this.tasks = data.tasks;
        } catch (err) {
            console.error('Failed to load tasks:', err);
        }
    },

    renderList() {
        if (!this.tasks.length) {
            return `<div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-title">No Tasks Yet</div>
        <div class="empty-state-text">Create your first task to start tracking your work</div>
        <button class="btn btn-primary" style="margin-top: 16px" onclick="Tasks.showCreate()">+ New Task</button>
      </div>`;
        }

        const today = Utils.getTodayStr();
        const grouped = {};
        this.tasks.forEach(t => {
            const key = t.due_date;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        const sortedDates = Object.keys(grouped).sort();

        return `
      <div class="section-header">
        <h2 class="section-title">Tasks</h2>
        <button class="btn btn-primary btn-sm" onclick="Tasks.showCreate()">+ New Task</button>
      </div>
      ${sortedDates.map(date => {
            const isOverdue = date < today;
            const isToday = date === today;
            return `
          <div class="deadline-section">
            <div class="deadline-section-title">
              <span class="${isOverdue ? 'overdue-icon' : isToday ? 'today-icon' : 'upcoming-icon'}">${isOverdue ? '🔴' : isToday ? '🟠' : '📅'}</span>
              ${Utils.formatDate(date)} ${isToday ? '(Today)' : isOverdue ? '(Overdue)' : `(${Utils.formatDateRelative(date)})`}
            </div>
            <div class="item-list">
              ${grouped[date].map(t => this.renderTaskRow(t, today)).join('')}
            </div>
          </div>
        `;
        }).join('')}
    `;
    },

    renderTaskRow(t, today) {
        const isCompleted = t.status === 'completed';
        const isOverdue = t.due_date < today && !isCompleted;
        return `
      <div class="item-row">
        <div class="item-checkbox ${isCompleted ? 'checked' : ''}" onclick="Tasks.toggleComplete('${t.id}', '${t.status}')">
          ${isCompleted ? '✓' : ''}
        </div>
        <div class="item-content" onclick="Tasks.showEdit('${t.id}')">
          <div class="item-title ${isCompleted ? 'completed' : ''}">${Utils.escapeHTML(t.title)}</div>
          <div class="item-meta">
            ${t.due_time ? `<span>🕐 ${Utils.formatTime(t.due_time)}</span>` : ''}
            ${t.folder_name ? `<span style="color:${t.folder_color}">📁 ${Utils.escapeHTML(t.folder_name)}</span>` : ''}
            ${t.description ? `<span>${Utils.truncate(t.description, 40)}</span>` : ''}
          </div>
        </div>
        <span class="priority-badge ${t.priority}">${t.priority}</span>
        ${isOverdue ? '<span class="status-badge overdue">Overdue</span>' : ''}
        <div class="item-actions">
          <button class="btn btn-icon btn-ghost" onclick="Tasks.remove('${t.id}')" title="Delete">🗑</button>
        </div>
      </div>
    `;
    },

    showCreate() {
        const today = Utils.getTodayStr();
        const folderOpts = Folders.folders.map(f => `<option value="${f.id}"${Folders.currentFolder === f.id ? ' selected' : ''}>${f.name}</option>`).join('');

        const bodyHTML = `
      <div class="form-group">
        <label>Task Title</label>
        <input type="text" class="form-input" id="task-title" placeholder="What needs to be done?" required>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Description (optional)</label>
        <textarea class="form-textarea" id="task-desc" placeholder="Additional details..." rows="2"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" class="form-input" id="task-due" value="${today}" required>
        </div>
        <div class="form-group">
          <label>Due Time (optional)</label>
          <input type="time" class="form-input" id="task-time">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="form-group">
          <label>Priority</label>
          <select class="form-select" id="task-priority">
            <option value="high">🔴 High</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <div class="form-group">
          <label>Folder</label>
          <select class="form-select" id="task-folder">
            <option value="">No folder</option>
            ${folderOpts}
          </select>
        </div>
      </div>
    `;
        const footerHTML = `
      <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Tasks.create()">Add Task</button>
    `;
        Utils.showModal('New Task', bodyHTML, footerHTML);
        setTimeout(() => document.getElementById('task-title')?.focus(), 100);
    },

    async create() {
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-desc').value.trim();
        const due_date = document.getElementById('task-due').value;
        const due_time = document.getElementById('task-time').value;
        const priority = document.getElementById('task-priority').value;
        const folder_id = document.getElementById('task-folder').value || null;

        if (!title) return Utils.showToast('Task title is required', 'error');
        if (!due_date) return Utils.showToast('Due date is required', 'error');

        try {
            await API.post('/tasks', { title, description, due_date, due_time, priority, folder_id });
            Utils.closeModal();
            Utils.showToast('Task created!', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async showEdit(id) {
        try {
            const data = await API.get(`/tasks/${id}`);
            const t = data.task;
            const folderOpts = Folders.folders.map(f => `<option value="${f.id}"${t.folder_id === f.id ? ' selected' : ''}>${f.name}</option>`).join('');

            const bodyHTML = `
        <div class="form-group">
          <label>Task Title</label>
          <input type="text" class="form-input" id="edit-task-title" value="${Utils.escapeHTML(t.title)}">
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Description</label>
          <textarea class="form-textarea" id="edit-task-desc" rows="2">${Utils.escapeHTML(t.description)}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div class="form-group">
            <label>Due Date</label>
            <input type="date" class="form-input" id="edit-task-due" value="${t.due_date}">
          </div>
          <div class="form-group">
            <label>Due Time</label>
            <input type="time" class="form-input" id="edit-task-time" value="${t.due_time}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div class="form-group">
            <label>Priority</label>
            <select class="form-select" id="edit-task-priority">
              <option value="high" ${t.priority === 'high' ? 'selected' : ''}>🔴 High</option>
              <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
              <option value="low" ${t.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
            </select>
          </div>
          <div class="form-group">
            <label>Folder</label>
            <select class="form-select" id="edit-task-folder">
              <option value="">No folder</option>
              ${folderOpts}
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Status</label>
          <select class="form-select" id="edit-task-status">
            <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      `;
            const footerHTML = `
        <button class="btn btn-danger" onclick="Tasks.remove('${id}')">Delete</button>
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Tasks.update('${id}')">Save</button>
      `;
            Utils.showModal('Edit Task', bodyHTML, footerHTML);
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async update(id) {
        const title = document.getElementById('edit-task-title').value.trim();
        const description = document.getElementById('edit-task-desc').value.trim();
        const due_date = document.getElementById('edit-task-due').value;
        const due_time = document.getElementById('edit-task-time').value;
        const priority = document.getElementById('edit-task-priority').value;
        const folder_id = document.getElementById('edit-task-folder').value || null;
        const status = document.getElementById('edit-task-status').value;

        try {
            await API.put(`/tasks/${id}`, { title, description, due_date, due_time, priority, folder_id, status });
            Utils.closeModal();
            Utils.showToast('Task updated!', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async toggleComplete(id, currentStatus) {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        try {
            await API.put(`/tasks/${id}`, { status: newStatus });
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async remove(id) {
        const confirmed = await Utils.confirm('Delete Task', 'This task will be permanently deleted. Continue?');
        if (!confirmed) return;

        try {
            await API.delete(`/tasks/${id}`);
            Utils.closeModal();
            Utils.showToast('Task deleted', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    }
};
