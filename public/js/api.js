// ═══════════════════════════════════════════════════════
// API Client — Centralized fetch wrapper with JWT auth
// ═══════════════════════════════════════════════════════

const API = {
    baseURL: '/api',

    getToken() {
        return localStorage.getItem('office_notes_token');
    },

    setToken(token) {
        localStorage.setItem('office_notes_token', token);
    },

    clearToken() {
        localStorage.removeItem('office_notes_token');
    },

    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(`${this.baseURL}${path}`, options);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401) {
                    this.clearToken();
                    if (window.App) window.App.showAuth();
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (err) {
            throw err;
        }
    },

    async upload(path, formData) {
        const headers = {};
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${this.baseURL}${path}`, {
            method: 'POST',
            headers,
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); }
};
