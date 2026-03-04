// ═══════════════════════════════════════════════════════
// Utilities — Toast, Modal, Helpers
// ═══════════════════════════════════════════════════════

const Utils = {
    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
    },

    // Modal
    showModal(title, bodyHTML, footerHTML = '') {
        const overlay = document.getElementById('modal-overlay');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
      <div class="modal animate-scale">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="Utils.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.className = 'modal-overlay hidden';
        overlay.innerHTML = '';
    },

    // Confirm dialog
    confirm(title, message) {
        return new Promise(resolve => {
            const bodyHTML = `<p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${message}</p>`;
            const footerHTML = `
        <button class="btn btn-secondary" onclick="Utils.closeModal(); window._confirmResolve(false)">Cancel</button>
        <button class="btn btn-danger" onclick="Utils.closeModal(); window._confirmResolve(true)">Delete</button>
      `;
            window._confirmResolve = resolve;
            this.showModal(title, bodyHTML, footerHTML);
        });
    },

    // Date formatting
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatDateRelative(dateStr) {
        if (!dateStr) return '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(dateStr + 'T00:00:00');
        const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));

        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        if (diff === -1) return 'Yesterday';
        if (diff > 1 && diff <= 7) return `In ${diff} days`;
        if (diff < -1) return `${Math.abs(diff)} days ago`;
        return this.formatDate(dateStr);
    },

    getTodayStr() {
        return new Date().toISOString().split('T')[0];
    },

    // Time formatting
    formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${hour % 12 || 12}:${m} ${ampm}`;
    },

    // Debounce
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    // Escape HTML
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Truncate text
    truncate(str, len = 100) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }
};
