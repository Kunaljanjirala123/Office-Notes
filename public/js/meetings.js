// ═══════════════════════════════════════════════════════
// Meetings — Full meeting management with audio & transcript
// ═══════════════════════════════════════════════════════

const Meetings = {
    meetings: [],

    async load(folderId = null) {
        try {
            let url = '/meetings';
            if (folderId) url += `?folder_id=${folderId}`;
            const data = await API.get(url);
            this.meetings = data.meetings;
        } catch (err) {
            console.error('Failed to load meetings:', err);
        }
    },

    renderList() {
        if (!this.meetings.length) {
            return `<div class="empty-state">
        <div class="empty-state-icon">🎙️</div>
        <div class="empty-state-title">No Meetings Yet</div>
        <div class="empty-state-text">Record meetings, take notes, and get AI summaries</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="Meetings.showCreate()">+ New Meeting</button>
      </div>`;
        }

        return `
      <div class="section-header">
        <h2 class="section-title">Meetings</h2>
        <button class="btn btn-primary btn-sm" onclick="Meetings.showCreate()">+ New Meeting</button>
      </div>
      <div class="item-list">
        ${this.meetings.map(m => `
          <div class="item-row" onclick="Meetings.showDetail('${m.id}')">
            <div style="font-size:24px">🎙️</div>
            <div class="item-content">
              <div class="item-title">${Utils.escapeHTML(m.title)}</div>
              <div class="item-meta">
                <span>📅 ${Utils.formatDate(m.date)}</span>
                ${m.start_time ? `<span>🕐 ${Utils.formatTime(m.start_time)}${m.end_time ? ' - ' + Utils.formatTime(m.end_time) : ''}</span>` : ''}
                ${m.folder_name ? `<span style="color:${m.folder_color}">📁 ${m.folder_name}</span>` : ''}
                ${m.audio_path ? '<span>🔊 Audio</span>' : ''}
                ${m.transcript ? '<span>📄 Transcript</span>' : ''}
                ${m.summary ? '<span>🤖 Summary</span>' : ''}
              </div>
            </div>
            <div class="item-actions">
              <button class="btn btn-icon btn-ghost" onclick="event.stopPropagation(); Meetings.remove('${m.id}')" title="Delete">🗑</button>
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
        <label>Meeting Title</label>
        <input type="text" class="form-input" id="meeting-title" placeholder="e.g. Sprint Planning" required>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px">
        <div class="form-group">
          <label>Date</label>
          <input type="date" class="form-input" id="meeting-date" value="${today}">
        </div>
        <div class="form-group">
          <label>Start Time</label>
          <input type="time" class="form-input" id="meeting-start">
        </div>
        <div class="form-group">
          <label>End Time</label>
          <input type="time" class="form-input" id="meeting-end">
        </div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Folder</label>
        <select class="form-select" id="meeting-folder">
          <option value="">No folder</option>
          ${folderOpts}
        </select>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Attendees (comma-separated)</label>
        <input type="text" class="form-input" id="meeting-attendees" placeholder="John, Jane, Bob">
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Agenda</label>
        <textarea class="form-textarea" id="meeting-agenda" rows="2" placeholder="Meeting agenda points..."></textarea>
      </div>
    `;
        const footerHTML = `
      <button class="btn btn-secondary" onclick="Utils.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Meetings.create()">Create Meeting</button>
    `;
        Utils.showModal('New Meeting', bodyHTML, footerHTML);
        setTimeout(() => document.getElementById('meeting-title')?.focus(), 100);
    },

    async create() {
        const title = document.getElementById('meeting-title').value.trim();
        if (!title) return Utils.showToast('Meeting title is required', 'error');

        const data = {
            title,
            date: document.getElementById('meeting-date').value,
            start_time: document.getElementById('meeting-start').value,
            end_time: document.getElementById('meeting-end').value,
            folder_id: document.getElementById('meeting-folder').value || null,
            attendees: document.getElementById('meeting-attendees').value.split(',').map(s => s.trim()).filter(Boolean),
            agenda: document.getElementById('meeting-agenda').value
        };

        try {
            const result = await API.post('/meetings', data);
            Utils.closeModal();
            Utils.showToast('Meeting created!', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
            // Open the detail view immediately
            this.showDetail(result.meeting.id);
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async showDetail(id) {
        try {
            const data = await API.get(`/meetings/${id}`);
            const m = data.meeting;
            const attendees = JSON.parse(m.attendees || '[]');
            const folderOpts = Folders.folders.map(f => `<option value="${f.id}"${m.folder_id === f.id ? ' selected' : ''}>${f.name}</option>`).join('');

            const bodyHTML = `
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Header Info -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Date</label>
              <input type="date" class="form-input" id="detail-date" value="${m.date}">
            </div>
            <div class="form-group">
              <label>Start</label>
              <input type="time" class="form-input" id="detail-start" value="${m.start_time}">
            </div>
            <div class="form-group">
              <label>End</label>
              <input type="time" class="form-input" id="detail-end" value="${m.end_time}">
            </div>
          </div>

          ${attendees.length ? `<div><label style="font-size:var(--font-size-xs);color:var(--text-tertiary)">Attendees</label><p style="font-size:var(--font-size-sm);margin-top:4px">${attendees.map(a => `<span style="background:var(--bg-tertiary);padding:2px 8px;border-radius:12px;margin-right:4px;font-size:var(--font-size-xs)">${Utils.escapeHTML(a)}</span>`).join('')}</p></div>` : ''}

          ${m.agenda ? `<div><label style="font-size:var(--font-size-xs);color:var(--text-tertiary)">Agenda</label><p style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-top:4px">${Utils.escapeHTML(m.agenda)}</p></div>` : ''}

          <!-- Audio Recorder / Player -->
          <div>
            <label style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:8px;display:block">Audio Recording</label>
            ${m.audio_path ? `
              <div class="audio-player">
                <audio controls src="/audio/${m.audio_path}" style="width:100%"></audio>
              </div>
              <button class="btn btn-sm btn-secondary" style="margin-top:8px" onclick="Recorder.startNew('${id}')">Record New</button>
            ` : `
              <div id="recorder-area">
                <div class="recorder-container">
                  <div class="recorder-waveform"><canvas id="waveform-canvas"></canvas></div>
                  <div class="recorder-controls">
                    <span class="recorder-timer" id="rec-timer">00:00</span>
                    <button class="record-btn" id="rec-btn" onclick="Recorder.toggle('${id}')"></button>
                    <button class="btn btn-sm btn-secondary" id="rec-save" style="display:none" onclick="Recorder.save('${id}')">Save Recording</button>
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- Transcription -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="font-size:var(--font-size-xs);color:var(--text-tertiary)">Transcription</label>
              <button class="btn btn-sm btn-secondary" onclick="Transcriber.toggle('${id}')">
                <span id="transcribe-btn-text">${m.transcript ? 'Re-transcribe' : '🎤 Start Transcribing'}</span>
              </button>
            </div>
            <div class="transcript-box" id="transcript-box">${m.transcript || '<span style="color:var(--text-muted)">No transcript yet. Click "Start Transcribing" and speak.</span>'}</div>
          </div>

          <!-- Meeting Notes -->
          <div class="form-group">
            <label>Meeting Notes</label>
            <div class="editor-toolbar">
              <button type="button" class="toolbar-btn" onclick="document.execCommand('bold')"><b>B</b></button>
              <button type="button" class="toolbar-btn" onclick="document.execCommand('italic')"><i>I</i></button>
              <button type="button" class="toolbar-btn" onclick="document.execCommand('insertUnorderedList')">•</button>
              <button type="button" class="toolbar-btn" onclick="document.execCommand('insertOrderedList')">1.</button>
            </div>
            <div class="editor-area" id="detail-notes" contenteditable="true" style="min-height:120px">${m.notes || ''}</div>
          </div>

          <!-- AI Summary -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="font-size:var(--font-size-xs);color:var(--text-tertiary)">AI Summary</label>
              <button class="btn btn-sm btn-primary" onclick="Summarizer.generate('${id}')">🤖 Generate Summary</button>
            </div>
            <div class="summary-box" id="summary-box">
              ${m.summary ? m.summary : '<p style="color:var(--text-muted);font-size:var(--font-size-sm)">No summary yet. Add notes or transcript, then click "Generate Summary".</p>'}
            </div>
          </div>
        </div>
      `;

            const footerHTML = `
        <button class="btn btn-danger" onclick="Meetings.remove('${id}')">Delete</button>
        <button class="btn btn-secondary" onclick="Utils.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="Meetings.updateDetail('${id}')">Save Changes</button>
      `;
            Utils.showModal(m.title, bodyHTML, footerHTML);

            // Init waveform if recorder visible
            setTimeout(() => Recorder.initCanvas(), 200);
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async updateDetail(id) {
        const notes = document.getElementById('detail-notes')?.innerHTML || '';
        const date = document.getElementById('detail-date')?.value;
        const start_time = document.getElementById('detail-start')?.value;
        const end_time = document.getElementById('detail-end')?.value;

        try {
            await API.put(`/meetings/${id}`, { notes, date, start_time, end_time });
            Utils.showToast('Meeting saved!', 'success');
            await this.load(Folders.currentFolder);
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    },

    async remove(id) {
        const confirmed = await Utils.confirm('Delete Meeting', 'This will permanently delete the meeting and its audio recording. Continue?');
        if (!confirmed) return;

        try {
            await API.delete(`/meetings/${id}`);
            Utils.closeModal();
            Utils.showToast('Meeting deleted', 'success');
            await this.load(Folders.currentFolder);
            Dashboard.refreshContent();
        } catch (err) {
            Utils.showToast(err.message, 'error');
        }
    }
};
