// ═══════════════════════════════════════════════════════
// Folders — Sidebar folder management
// ═══════════════════════════════════════════════════════

const Folders = {
    folders: [],
    currentFolder: null,

    async load() {
        try {
            const data = await API.get('/folders');
            this.folders = data.folders;
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    },

    renderSidebar() {
        const folderColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];
        return `
      <div class="nav-section">
        <div class="nav-section-title">Folders</div>
        ${this.folders.map(f => `
          <div class="folder-item ${this.currentFolder === f.id ? 'active' : ''}" onclick="Folders.select('${f.id}')">
            <span class="folder-color-dot" style="background: ${f.color}"></span>
            <span class="folder-item-name">${Utils.escapeHTML(f.name)}</span>
            <span class="folder-item-count">${(f.note_count || 0) + (f.task_count || 0) + (f.meeting_count || 0)}</span>
            <div class="folder-item-actions">
              <button class="folder-action-btn" onclick="event.stopPropagation(); Folders.edit('${f.id}')" title="Rename">✎</button>
              <button class="folder-action-btn delete" onclick="event.stopPropagation(); Folders.remove('${f.id}')" title="Delete">🗑</button>
            </div>
          </div>
        `).join('')}
        <button class="add-folder-btn" onclick="Folders.showCreate()">+ New Folder</button>
      </div>
    `;
    },

    select(id) {
        this.currentFolder = this.currentFolder === id ? null : id;
        Dashboard.render();
    },

    showCreate() {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];
        const bodyHTML = `
      <div class="form-group">
        <label>Folder Name</label>
        <input type="text" class="form-input" id="folder-name" placeholder="e.g. Project Alpha" required>
      </div>
      <div class="form-group" style="margin-top: 12px">
        <label>Color</label>
        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap">
          ${colors.map((c, i) => `
            <button type="button" class="folder-color-pick ${i === 0 ? 'active' : ''}" style="width:32px;height:32px;border-radius:8px;border:2px solid transparent;background:${c};cursor:pointer" onclick="document.querySelectorAll('.folder-color-pick').forEach(b=>b.style.borderColor='transparent');this.style.borderColor='white';document.getElementById('folder-color-val').value='${c}'"></button>
          `).join('')}
          <input type="hidden" id="folder-color-val" value="${colors[0]}">
        </div>
      </div>
    `;
        const footerHTML = `
      <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Folders.create()">Create Folder</button>
    `;
        Utils.showModal('New Folder', bodyHTML, footerHTML);
        setTimeout(() => document.getElementById('folder-name')?.focus(), 100);
    },

    async create() {
        const name = document.getElementById('folder-name').value.trim();
        const color = document.getElementById('folder-color-val').value;
        if (!name) return Utils.showToast('Folder name is required', 'error');

        try {
            await API.post('/folders', { name, color });
            Utils.closeModal();
            Utils.showToast('Folder created!', 'success');
            await this.load();
            Dashboard.render();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    edit(id) {
        const folder = this.folders.find(f => f.id === id);
        if (!folder) return;

        const bodyHTML = `
      <div class="form-group">
        <label>Folder Name</label>
        <input type="text" class="form-input" id="edit-folder-name" value="${Utils.escapeHTML(folder.name)}">
      </div>
    `;
        const footerHTML = `
      <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Folders.update('${id}')">Save</button>
    `;
        Utils.showModal('Rename Folder', bodyHTML, footerHTML);
        setTimeout(() => { const inp = document.getElementById('edit-folder-name'); inp?.focus(); inp?.select(); }, 100);
    },

    async update(id) {
        const name = document.getElementById('edit-folder-name').value.trim();
        if (!name) return Utils.showToast('Name is required', 'error');

        try {
            await API.put(`/folders/${id}`, { name });
            Utils.closeModal();
            Utils.showToast('Folder renamed!', 'success');
            await this.load();
            Dashboard.render();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async remove(id) {
        const folder = this.folders.find(f => f.id === id);
        const confirmed = await Utils.confirm('Delete Folder', `Are you sure you want to delete "${folder?.name}"? Items inside will be moved to unfiled.`);
        if (!confirmed) return;

        try {
            await API.delete(`/folders/${id}`);
            if (this.currentFolder === id) this.currentFolder = null;
            Utils.showToast('Folder deleted', 'success');
            await this.load();
            Dashboard.render();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    }
};
