// ═══════════════════════════════════════════════════════
// Dashboard — Main layout, sidebar, page routing
// ═══════════════════════════════════════════════════════

const Dashboard = {
  currentPage: 'overview',
  sidebarOpen: false,

  async init() {
    await Promise.all([
      Folders.load(),
      Tasks.load(),
      Notes.load(),
      Meetings.load(),
      Notifications.load(),
      Calendar.loadMonth()
    ]);
    Notifications.requestPermission();
    Notifications.checkAndNotify();
    this.render();
  },

  render() {
    const user = JSON.parse(localStorage.getItem('office_notes_user') || '{}');
    const notifCount = Notifications.getCount();

    document.getElementById('app').innerHTML = `
      <div class="dashboard">
        <div class="sidebar-overlay ${this.sidebarOpen ? 'visible' : ''}" onclick="Dashboard.toggleSidebar()"></div>
        <aside class="sidebar ${this.sidebarOpen ? 'open' : ''}" id="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="sidebar-brand-icon">📋</div>
              <h2>Office Notes</h2>
            </div>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section">
              <div class="nav-section-title">Menu</div>
              <button class="nav-item ${this.currentPage === 'overview' ? 'active' : ''}" onclick="Dashboard.navigate('overview')">
                <span class="nav-item-icon">🏠</span> Overview
                ${notifCount > 0 ? `<span class="nav-item-badge">${notifCount}</span>` : ''}
              </button>
              <button class="nav-item ${this.currentPage === 'calendar' ? 'active' : ''}" onclick="Dashboard.navigate('calendar')">
                <span class="nav-item-icon">📅</span> Calendar
              </button>
              <button class="nav-item ${this.currentPage === 'tasks' ? 'active' : ''}" onclick="Dashboard.navigate('tasks')">
                <span class="nav-item-icon">✅</span> Tasks
              </button>
              <button class="nav-item ${this.currentPage === 'notes' ? 'active' : ''}" onclick="Dashboard.navigate('notes')">
                <span class="nav-item-icon">📝</span> Notes
              </button>
              <button class="nav-item ${this.currentPage === 'meetings' ? 'active' : ''}" onclick="Dashboard.navigate('meetings')">
                <span class="nav-item-icon">🎙️</span> Meetings
              </button>
              <button class="nav-item ${this.currentPage === 'deadlines' ? 'active' : ''}" onclick="Dashboard.navigate('deadlines')">
                <span class="nav-item-icon">⏰</span> Deadlines
                ${notifCount > 0 ? `<span class="nav-item-badge">${notifCount}</span>` : ''}
              </button>
            </div>

            ${Folders.renderSidebar()}
          </nav>

          <div class="sidebar-footer">
            <div class="sidebar-user" onclick="Dashboard.navigate('settings')">
              <div class="user-avatar">${(user.username || 'U')[0].toUpperCase()}</div>
              <div class="user-info">
                <div class="user-name">${Utils.escapeHTML(user.username || 'User')}</div>
                <div class="user-role">Settings</div>
              </div>
              <span style="color:var(--text-tertiary)">⚙️</span>
            </div>
          </div>
        </aside>

        <main class="main-content">
          <header class="main-header">
            <div class="header-left">
              <button class="menu-toggle" onclick="Dashboard.toggleSidebar()">☰</button>
              <div>
                <div class="header-title">${this.getPageTitle()}</div>
                <div class="header-subtitle">${this.getPageSubtitle()}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="search-bar">
                <span class="search-icon">🔍</span>
                <input type="text" placeholder="Search notes, tasks..." oninput="Dashboard.handleSearch(this.value)">
              </div>
              <button class="theme-toggle" onclick="ThemeManager.toggle()" title="Toggle theme">
                <span class="theme-icon">${ThemeManager.getIcon()}</span>
              </button>
              <button class="notification-bell" onclick="Notifications.togglePanel()">
                🔔
                ${notifCount > 0 ? `<span class="notification-badge">${notifCount}</span>` : ''}
              </button>
            </div>
          </header>

          ${Notifications.renderPanel()}

          <div class="page-content" id="page-content">
            ${this.renderPageContent()}
          </div>
        </main>
      </div>
    `;
  },

  refreshContent() {
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = this.renderPageContent();
  },

  getPageTitle() {
    const titles = {
      overview: '📊 Overview',
      calendar: '📅 Calendar',
      tasks: '✅ Tasks',
      notes: '📝 Notes',
      meetings: '🎙️ Meetings',
      deadlines: '⏰ Deadline Tracker',
      settings: '⚙️ Settings'
    };
    return titles[this.currentPage] || 'Overview';
  },

  getPageSubtitle() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return today;
  },

  renderPageContent() {
    switch (this.currentPage) {
      case 'overview': return this.renderOverview();
      case 'calendar': return Calendar.renderPage();
      case 'tasks': return Tasks.renderList();
      case 'notes': return Notes.renderList();
      case 'meetings': return Meetings.renderList();
      case 'deadlines': return this.renderDeadlines();
      case 'settings': return this.renderSettings();
      default: return this.renderOverview();
    }
  },

  renderOverview() {
    const taskCount = Tasks.tasks.length;
    const noteCount = Notes.notes.length;
    const meetingCount = Meetings.meetings.length;
    const overdueCount = Notifications.deadlines.overdue?.length || 0;
    const todayTasks = Notifications.deadlines.dueToday?.length || 0;

    // Recent items
    const recentTasks = Tasks.tasks.filter(t => t.status !== 'completed').slice(0, 5);
    const recentNotes = Notes.notes.slice(0, 5);
    const recentMeetings = Meetings.meetings.slice(0, 3);
    const today = Utils.getTodayStr();

    return `
      <div class="stats-grid animate-slide-up">
        <div class="stat-card">
          <div class="stat-icon tasks">✅</div>
          <div><div class="stat-value">${taskCount}</div><div class="stat-label">Total Tasks</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon notes">📝</div>
          <div><div class="stat-value">${noteCount}</div><div class="stat-label">Notes</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon meetings">🎙️</div>
          <div><div class="stat-value">${meetingCount}</div><div class="stat-label">Meetings</div></div>
        </div>
        <div class="stat-card" style="${overdueCount > 0 ? 'border-color:var(--color-danger)' : ''}">
          <div class="stat-icon overdue">${overdueCount > 0 ? '🔴' : '🎉'}</div>
          <div><div class="stat-value">${overdueCount}</div><div class="stat-label">Overdue</div></div>
        </div>
      </div>

      ${todayTasks > 0 || overdueCount > 0 ? `
        <div class="card animate-slide-up" style="margin-bottom:16px;border-color:${overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)'}20">
          <div class="card-header"><h3 class="card-title">⏰ Attention Needed</h3></div>
          ${Notifications.renderDeadlineOverview()}
        </div>
      ` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card animate-slide-up">
          <div class="card-header">
            <h3 class="card-title">✅ Active Tasks</h3>
            <button class="btn btn-sm btn-primary" onclick="Tasks.showCreate()">+ Add</button>
          </div>
          ${recentTasks.length ? `<div class="item-list">${recentTasks.map(t => Tasks.renderTaskRow(t, today)).join('')}</div>` : '<div style="color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;padding:20px">No active tasks</div>'}
        </div>

        <div class="card animate-slide-up">
          <div class="card-header">
            <h3 class="card-title">📝 Recent Notes</h3>
            <button class="btn btn-sm btn-primary" onclick="Notes.showCreate()">+ Add</button>
          </div>
          ${recentNotes.length ? `<div class="item-list">${recentNotes.map(n => `
            <div class="item-row" onclick="Notes.showEdit('${n.id}')">
              <div class="item-content">
                <div class="item-title">${Utils.escapeHTML(n.title)}</div>
                <div class="item-meta"><span>${Utils.formatDate(n.date)}</span></div>
              </div>
            </div>
          `).join('')}</div>` : '<div style="color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;padding:20px">No notes yet</div>'}
        </div>
      </div>

      ${recentMeetings.length ? `
        <div class="card animate-slide-up" style="margin-top:16px">
          <div class="card-header">
            <h3 class="card-title">🎙️ Recent Meetings</h3>
            <button class="btn btn-sm btn-primary" onclick="Meetings.showCreate()">+ New</button>
          </div>
          <div class="item-list">${recentMeetings.map(m => `
            <div class="item-row" onclick="Meetings.showDetail('${m.id}')">
              <div style="font-size:22px">🎙️</div>
              <div class="item-content">
                <div class="item-title">${Utils.escapeHTML(m.title)}</div>
                <div class="item-meta">
                  <span>📅 ${Utils.formatDate(m.date)}</span>
                  ${m.audio_path ? '<span>🔊</span>' : ''}
                  ${m.summary ? '<span>🤖</span>' : ''}
                </div>
              </div>
            </div>
          `).join('')}</div>
        </div>
      ` : ''}
    `;
  },

  renderDeadlines() {
    return `
      <div class="section-header">
        <h2 class="section-title">Deadline Tracker</h2>
        <button class="btn btn-primary btn-sm" onclick="Tasks.showCreate()">+ New Task</button>
      </div>
      ${Notifications.renderDeadlineOverview()}
    `;
  },

  renderSettings() {
    const user = JSON.parse(localStorage.getItem('office_notes_user') || '{}');

    return `
      <div class="settings-section animate-slide-up">
        <h3>👤 Account</h3>
        <div class="form-group">
          <label>Username</label>
          <input type="text" class="form-input" value="${Utils.escapeHTML(user.username || '')}" disabled style="opacity:0.6">
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Email (for deadline reminders)</label>
          <input type="email" class="form-input" id="settings-email" value="${Utils.escapeHTML(user.email || '')}" placeholder="your@email.com">
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="Dashboard.saveSettings()">Save Email</button>
      </div>

      <div class="settings-section animate-slide-up">
        <h3>🔔 Notifications</h3>
        <div class="setting-row">
          <label>Browser push notifications</label>
          <button class="toggle-switch active" id="toggle-browser" onclick="this.classList.toggle('active')"></button>
        </div>
        <div class="setting-row">
          <label>Email deadline reminders</label>
          <button class="toggle-switch" id="toggle-email" onclick="this.classList.toggle('active')"></button>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="Dashboard.saveNotificationSettings()">Save Preferences</button>
      </div>

      <div class="settings-section animate-slide-up">
        <h3>🔒 Change Password</h3>
        <div class="form-group">
          <label>Current Password</label>
          <input type="password" class="form-input" id="settings-current-pw" placeholder="Current password">
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>New Password</label>
          <input type="password" class="form-input" id="settings-new-pw" placeholder="New password (min 8 chars)">
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="Dashboard.changePassword()">Update Password</button>
      </div>

      <div class="settings-section animate-slide-up">
        <h3>🚪 Session</h3>
        <button class="btn btn-danger" onclick="App.logout()">Sign Out</button>
      </div>
    `;
  },

  async saveSettings() {
    const email = document.getElementById('settings-email').value.trim();
    try {
      const data = await API.put('/auth/settings', { email });
      localStorage.setItem('office_notes_user', JSON.stringify(data.user));
      Utils.showToast('Email saved!', 'success');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async saveNotificationSettings() {
    const browser = document.getElementById('toggle-browser')?.classList.contains('active');
    const email = document.getElementById('toggle-email')?.classList.contains('active');
    try {
      await API.put('/auth/settings', { notification_browser: browser, notification_email: email });
      Utils.showToast('Notification settings saved!', 'success');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async changePassword() {
    const current_password = document.getElementById('settings-current-pw').value;
    const new_password = document.getElementById('settings-new-pw').value;
    if (!current_password || !new_password) return Utils.showToast('Both fields required', 'error');

    try {
      await API.put('/auth/settings', { current_password, new_password });
      Utils.showToast('Password updated!', 'success');
      document.getElementById('settings-current-pw').value = '';
      document.getElementById('settings-new-pw').value = '';
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async navigate(page) {
    this.currentPage = page;
    this.sidebarOpen = false;

    // Reload data based on page
    if (page === 'tasks') await Tasks.load(Folders.currentFolder);
    else if (page === 'notes') await Notes.load(Folders.currentFolder);
    else if (page === 'meetings') await Meetings.load(Folders.currentFolder);
    else if (page === 'calendar') await Calendar.loadMonth();
    else if (page === 'deadlines' || page === 'overview') await Notifications.load();

    this.render();
  },

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    document.getElementById('sidebar')?.classList.toggle('open', this.sidebarOpen);
    document.querySelector('.sidebar-overlay')?.classList.toggle('visible', this.sidebarOpen);
  },

  handleSearch: Utils.debounce(async (query) => {
    if (!query.trim()) return;
    // Search across notes
    try {
      const data = await API.get(`/notes?search=${encodeURIComponent(query)}`);
      Notes.notes = data.notes;
      Dashboard.currentPage = 'notes';
      Dashboard.refreshContent();
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, 400)
};
