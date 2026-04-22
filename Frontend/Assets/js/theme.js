/**
 * theme.js — StudySync Dark Mode Manager
 * Include FIRST on every app page, before Bootstrap and Store scripts.
 *
 * What it does:
 *  1. Reads saved theme from localStorage ('ss_theme': 'light' | 'dark')
 *  2. Applies it instantly by adding 'dark-mode' class to <body>
 *  3. Injects a sun/moon toggle button into .sidebar-footer
 *  4. Persists the preference on every toggle click
 */

(function () {
    'use strict';

    const THEME_KEY = 'ss_theme';

    /* ── SVG icons (inline — no dependency on Lucide being loaded) ── */
    const SUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;

    const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;

    /* ── Helpers ─────────────────────────────────────────────────── */
    function getTheme() {
        return localStorage.getItem(THEME_KEY) || 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            document.body && document.body.classList.add('dark-mode');
        } else {
            document.body && document.body.classList.remove('dark-mode');
        }
        updateBtn(theme);
    }

    function updateBtn(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        btn.innerHTML      = theme === 'dark' ? SUN_SVG : MOON_SVG;
        btn.title          = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        btn.setAttribute('aria-label', btn.title);
    }

    function toggleTheme() {
        const next = getTheme() === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    }

    /* ── Inject toggle button into sidebar footer ─────────────────── */
    function injectToggleBtn() {
        const footer = document.querySelector('.sidebar-footer');
        if (!footer || document.getElementById('theme-toggle-btn')) return;

        footer.style.display        = 'flex';
        footer.style.alignItems     = 'center';
        footer.style.justifyContent = 'space-between';
        footer.style.gap            = '8px';

        const btn = document.createElement('button');
        btn.id        = 'theme-toggle-btn';
        btn.type      = 'button';
        btn.className = 'theme-toggle-btn';
        btn.addEventListener('click', toggleTheme);
        footer.appendChild(btn);
        updateBtn(getTheme());
    }

    /* ── Apply immediately (before DOMContentLoaded) to prevent FOUC ── */
    (function () {
        const t = localStorage.getItem(THEME_KEY) || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        // body may not exist yet, so also handle via DOMContentLoaded
    })();

    /* ── Init ────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(getTheme());
        injectToggleBtn();
    });

    // Expose for manual use elsewhere
    window.ThemeManager = { toggleTheme, applyTheme, getTheme };

})();
