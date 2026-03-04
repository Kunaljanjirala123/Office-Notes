// ═══════════════════════════════════════════════════════
// ThemeManager — Dark/Light theme toggle with persistence
// ═══════════════════════════════════════════════════════

const ThemeManager = {
    current: 'dark',

    init() {
        // Load saved preference
        const saved = localStorage.getItem('office_notes_theme');
        if (saved) {
            this.current = saved;
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                this.current = 'light';
            }
        }
        this.apply();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('office_notes_theme')) {
                this.current = e.matches ? 'dark' : 'light';
                this.apply();
            }
        });
    },

    apply() {
        document.documentElement.setAttribute('data-theme', this.current);
    },

    toggle() {
        this.current = this.current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('office_notes_theme', this.current);
        this.apply();

        // Update toggle button icon
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            icon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                icon.textContent = this.current === 'dark' ? '🌙' : '☀️';
                icon.style.transform = '';
            }, 200);
        }
    },

    getIcon() {
        return this.current === 'dark' ? '🌙' : '☀️';
    }
};

// Initialize theme ASAP (before DOM ready)
ThemeManager.init();
