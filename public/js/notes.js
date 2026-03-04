// ═══════════════════════════════════════════════════════
// Notes — Rich text note editor with folder support
// ═══════════════════════════════════════════════════════

const Notes = {
    notes: [],

    async load(folderId = null) {
        try {
            let url = '/notes';
            const params = [];
            if (folderId) params.push(`folder_id=${folderId}`);
            if (params.length) url += '?' + params.join('&');
            const data = await API.get(url);
            this.notes = data.notes;
        } catch (err) {
            console.error('Failed to load notes:', err);
        }
    },

    renderList() {
        if (!this.notes.length) {
            return `<div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-title">No Notes Yet</div>
        <div class="empty-state-text">Create your first note to start organizing your thoughts</div>
        <button class="btn btn-primary" style="margin-top: 16px" onclick="Notes.showCreate()">+ New Note</button>
      </div>`;
        }

        return `
      <div class="section-header">
        <h2 class="section-title">Notes</h2>
        <button class="btn btn-primary btn-sm" onclick="Notes.showCreate()">+ New Note</button>
      </div>
      <div class="item-list">
        ${this.notes.map(n => `
          <div class="item-row" onclick="Notes.showEdit('${n.id}')">
            <div class="item-content">
              <div class="item-title">${n.pinned ? '📌 ' : ''}${Utils.escapeHTML(n.title)}</div>
              <div class="item-meta">
                <span>📅 ${Utils.formatDate(n.date)}</span>
                ${n.folder_name ? `<span style="color: ${n.folder_color}">📁 ${Utils.escapeHTML(n.folder_name)}</span>` : ''}
                <span>${Utils.truncate(n.content?.replace(/<[^>]*>/g, ''), 60)}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn btn-icon btn-ghost" onclick="event.stopPropagation(); Notes.togglePin('${n.id}', ${n.pinned})" title="${n.pinned ? 'Unpin' : 'Pin'}">📌</button>
              <button class="btn btn-icon btn-ghost" onclick="event.stopPropagation(); Notes.remove('${n.id}')" title="Delete">🗑</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    },

    showCreate() {
        const today = Utils.getTodayStr();
        const folderOpts = Folders.folders.map(f => `<option value="${f.id}"${Folders.currentFolder === f.id ? ' selected' : ''}>${f.name}</option>`).join('');

        const bodyHTML = `
      <div class="form-group">
        <label>Title</label>
        <input type="text" class="form-input" id="note-title" placeholder="Note title">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="form-group">
          <label>Date</label>
          <input type="date" class="form-input" id="note-date" value="${today}">
        </div>
        <div class="form-group">
          <label>Folder</label>
          <select class="form-select" id="note-folder">
            <option value="">No folder</option>
            ${folderOpts}
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Content</label>
        <div class="editor-toolbar">
          <button type="button" class="toolbar-btn" onclick="document.execCommand('bold')" title="Bold"><b>B</b></button>
          <button type="button" class="toolbar-btn" onclick="document.execCommand('italic')" title="Italic"><i>I</i></button>
          <button type="button" class="toolbar-btn" onclick="document.execCommand('underline')" title="Underline"><u>U</u></button>
          <span class="toolbar-divider"></span>
          <button type="button" class="toolbar-btn" onclick="document.execCommand('insertUnorderedList')" title="Bullet List">•</button>
          <button type="button" class="toolbar-btn" onclick="document.execCommand('insertOrderedList')" title="Numbered List">1.</button>
          <span class="toolbar-divider"></span>
          <button type="button" class="toolbar-btn" onclick="document.execCommand('formatBlock', false, 'h3')" title="Heading">H</button>
        </div>
        <div class="editor-area" id="note-content" contenteditable="true" placeholder="Start writing..."></div>
      </div>
    `;
        const footerHTML = `
      <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Notes.create()">Save Note</button>
    `;
        Utils.showModal('New Note', bodyHTML, footerHTML);
    },

    async create() {
        const title = document.getElementById('note-title').value.trim() || 'Untitled Note';
        const date = document.getElementById('note-date').value;
        const folder_id = document.getElementById('note-folder').value || null;
        const content = document.getElementById('note-content').innerHTML;

        try {
            await API.post('/notes', { title, content, date, folder_id });
            Utils.closeModal();
            Utils.showToast('Note created!', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async showEdit(id) {
        try {
            const data = await API.get(`/notes/${id}`);
            const note = data.note;
            const folderOpts = Folders.folders.map(f => `<option value="${f.id}"${note.folder_id === f.id ? ' selected' : ''}>${f.name}</option>`).join('');

            const bodyHTML = `
        <div class="form-group">
          <label>Title</label>
          <input type="text" class="form-input" id="edit-note-title" value="${Utils.escapeHTML(note.title)}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div class="form-group">
            <label>Date</label>
            <input type="date" class="form-input" id="edit-note-date" value="${note.date}">
          </div>
          <div class="form-group">
            <label>Folder</label>
            <select class="form-select" id="edit-note-folder">
              <option value="">No folder</option>
              ${folderOpts}
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Content</label>
          <div class="editor-toolbar">
            <button type="button" class="toolbar-btn" onclick="document.execCommand('bold')"><b>B</b></button>
            <button type="button" class="toolbar-btn" onclick="document.execCommand('italic')"><i>I</i></button>
            <button type="button" class="toolbar-btn" onclick="document.execCommand('underline')"><u>U</u></button>
            <span class="toolbar-divider"></span>
            <button type="button" class="toolbar-btn" onclick="document.execCommand('insertUnorderedList')">•</button>
            <button type="button" class="toolbar-btn" onclick="document.execCommand('insertOrderedList')">1.</button>
            <span class="toolbar-divider"></span>
            <button type="button" class="toolbar-btn" onclick="document.execCommand('formatBlock', false, 'h3')">H</button>
          </div>
          <div class="editor-area" id="edit-note-content" contenteditable="true">${note.content}</div>
        </div>
      `;
            const footerHTML = `
        <button class="btn btn-danger" onclick="Notes.remove('${id}')">Delete</button>
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Notes.update('${id}')">Save</button>
      `;
            Utils.showModal('Edit Note', bodyHTML, footerHTML);
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async update(id) {
        const title = document.getElementById('edit-note-title').value.trim() || 'Untitled Note';
        const date = document.getElementById('edit-note-date').value;
        const folder_id = document.getElementById('edit-note-folder').value || null;
        const content = document.getElementById('edit-note-content').innerHTML;

        try {
            await API.put(`/notes/${id}`, { title, content, date, folder_id });
            Utils.closeModal();
            Utils.showToast('Note updated!', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async togglePin(id, current) {
        try {
            await API.put(`/notes/${id}`, { pinned: !current });
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async remove(id) {
        const confirmed = await Utils.confirm('Delete Note', 'This note will be permanently deleted. Continue?');
        if (!confirmed) return;

        try {
            await API.delete(`/notes/${id}`);
            Utils.closeModal();
            Utils.showToast('Note deleted', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    }
};
