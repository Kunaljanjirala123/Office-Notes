// ═══════════════════════════════════════════════════════
// Auth — Login & Register UI
// ═══════════════════════════════════════════════════════

const Auth = {
    currentTab: 'login',

    render() {
        return `
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-logo">
              <div class="auth-logo-icon">📋</div>
              <h1>Office Notes</h1>
              <p>Secure Task & Meeting Organizer</p>
            </div>

            <div class="auth-tabs">
              <button class="auth-tab ${this.currentTab === 'login' ? 'active' : ''}" onclick="Auth.switchTab('login')">Sign In</button>
              <button class="auth-tab ${this.currentTab === 'register' ? 'active' : ''}" onclick="Auth.switchTab('register')">Register</button>
            </div>

            <div class="auth-error" id="auth-error"></div>

            <div id="auth-form-container">
              ${this.currentTab === 'login' ? this.loginForm() : this.registerForm()}
            </div>
          </div>
        </div>
      </div>
    `;
    },

    loginForm() {
        return `
      <form class="auth-form" onsubmit="Auth.handleLogin(event)">
        <div class="form-group">
          <label>Username</label>
          <input type="text" class="form-input" id="login-username" placeholder="Enter your username" required autocomplete="username">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" class="form-input" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary w-full" id="login-btn">
          Sign In
        </button>
      </form>
    `;
    },

    registerForm() {
        return `
      <form class="auth-form" onsubmit="Auth.handleRegister(event)">
        <div class="form-group">
          <label>Username</label>
          <input type="text" class="form-input" id="reg-username" placeholder="Choose a username (min 3 chars)" required autocomplete="username">
        </div>
        <div class="form-group">
          <label>Email (optional, for reminders)</label>
          <input type="email" class="form-input" id="reg-email" placeholder="your@email.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" class="form-input" id="reg-password" placeholder="Create a strong password" required oninput="Auth.checkPasswordRules(this.value)" autocomplete="new-password">
          <div class="password-rules" id="password-rules">
            <span id="rule-length">At least 8 characters</span>
            <span id="rule-number">Contains a number</span>
            <span id="rule-special">Contains a special character</span>
          </div>
        </div>
        <button type="submit" class="btn btn-primary w-full" id="register-btn">
          Create Account
        </button>
      </form>
    `;
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.getElementById('auth-error').className = 'auth-error';
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.auth-tab:${tab === 'login' ? 'first-child' : 'last-child'}`).classList.add('active');
        document.getElementById('auth-form-container').innerHTML = tab === 'login' ? this.loginForm() : this.registerForm();
    },

    showError(msg) {
        const el = document.getElementById('auth-error');
        el.textContent = msg;
        el.className = 'auth-error visible';
    },

    checkPasswordRules(password) {
        const rules = {
            'rule-length': password.length >= 8,
            'rule-number': /\d/.test(password),
            'rule-special': /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        Object.entries(rules).forEach(([id, valid]) => {
            document.getElementById(id).className = valid ? 'valid' : '';
        });
    },

    async handleLogin(e) {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Signing in...';

        try {
            const data = await API.post('/auth/login', { username, password });
            API.setToken(data.token);
            localStorage.setItem('office_notes_user', JSON.stringify(data.user));
            App.showDashboard();
        } catch (err) {
            this.showError(err.message);
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const btn = document.getElementById('register-btn');
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Creating account...';

        try {
            const data = await API.post('/auth/register', { username, password, email });
            API.setToken(data.token);
            localStorage.setItem('office_notes_user', JSON.stringify(data.user));
            Utils.showToast('Account created successfully!', 'success');
            App.showDashboard();
        } catch (err) {
            this.showError(err.message);
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }
};
