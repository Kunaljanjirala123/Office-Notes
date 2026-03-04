// ═══════════════════════════════════════════════════════
// App — Entry point, initialization, routing
// ═══════════════════════════════════════════════════════

const App = {
    init() {
        if (API.getToken()) {
            this.showDashboard();
        } else {
            this.showAuth();
        }
    },

    showAuth() {
        API.clearToken();
        localStorage.removeItem('office_notes_user');
        document.getElementById('app').innerHTML = Auth.render();
    },

    showDashboard() {
        document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px">
        <div class="auth-logo-icon" style="width:64px;height:64px;font-size:28px;animation:pulse 1.5s infinite">📋</div>
        <p style="color:var(--text-secondary);font-size:var(--font-size-sm)">Loading your workspace...</p>
      </div>
    `;
        Dashboard.init();
    },

    logout() {
        API.clearToken();
        localStorage.removeItem('office_notes_user');
        Utils.showToast('Signed out', 'info');
        this.showAuth();
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
