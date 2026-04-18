/**
 * api.js — StudySync API helper
 * Wraps fetch with JWT Authorization header injection.
 * Load this BEFORE any page-specific JS that hits the backend.
 */

const API_BASE = 'http://localhost:8080';

const Api = {

    /** Retrieve stored token */
    getToken() {
        return localStorage.getItem('ss_jwt');
    },

    /** Persist token + user snapshot */
    setSession(token, userInfo) {
        localStorage.setItem('ss_jwt', token);
        if (userInfo) {
            const existing = Store.getUser();
            Store.saveUser({
                ...existing,
                name     : userInfo.name     || existing.name,
                email    : userInfo.email    || existing.email,
                semester : userInfo.semester || existing.semester,
                branch   : userInfo.branch   || existing.branch,
            });
        }
    },

    /** Clear session (logout) */
    clearSession() {
        localStorage.removeItem('ss_jwt');
    },

    /** Shared fetch wrapper — injects Bearer token */
    async request(path, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        let res;
        try {
            res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        } catch (networkErr) {
            throw new Error('Cannot reach server. Is the backend running on port 8080?');
        }

        // 401 → token expired or invalid → force re-login
        if (res.status === 401) {
            this.clearSession();
            // Compute relative path to index.html from any depth
            // Find how many directories deep we are under /Pages/
            const parts = window.location.pathname.split('/').filter(Boolean);
            const pagesIdx = parts.indexOf('Pages');
            if (pagesIdx !== -1) {
                // Under Pages/ — go up (parts.length - pagesIdx) levels then to index.html
                const levels = parts.length - pagesIdx;  // +1 for file itself
                window.location.href = '../'.repeat(levels) + 'index.html';
            } else {
                // Already at root level (index.html or similar) — just reload
                window.location.href = window.location.pathname;
            }
            throw new Error('Session expired. Redirecting to login…');
        }

        // Read body — always as text first to avoid "Unexpected token '<'" crashes
        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
            const msg = isJson
                ? (body.error || body.message || JSON.stringify(body))
                : `HTTP ${res.status}`;
            throw new Error(msg);
        }

        return body;
    },

    /* ── Auth ── */

    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method : 'POST',
            body   : JSON.stringify({ email, password }),
        });
        if (data.success && data.token) {
            this.setSession(data.token, { email });
        }
        return data;
    },

    async register(email, password) {
        const data = await this.request('/api/auth/register', {
            method : 'POST',
            body   : JSON.stringify({ email, password }),
        });
        if (data.success && data.token) {
            this.setSession(data.token, { email });
        }
        return data;
    },

    /* ── User Profile ── */

    async getMe() {
        return this.request('/api/user/me');
    },

    async updateProfile(name, email, phone, semester, branch) {
        return this.request('/api/user/profile', {
            method : 'PUT',
            body   : JSON.stringify({ name, email, phone, semester, branch }),
        });
    },

    /* ── Subjects ── */

    async getSubjects() {
        return this.request('/api/subjects');
    },

    async createSubject(name) {
        return this.request('/api/subjects', {
            method : 'POST',
            body   : JSON.stringify({ name }),
        });
    },

    /* ── Attendance ── */

    async getAttendance(subjectId = null) {
        const qs = subjectId ? `?subjectId=${subjectId}` : '';
        return this.request(`/api/attendance${qs}`);
    },

    async markAttendance(subjectId, date, status) {
        return this.request('/api/attendance', {
            method : 'POST',
            body   : JSON.stringify({ subjectId, date, status }),
        });
    },

    /* ── Page utilities (called automatically on DOMContentLoaded) ── */

    /**
     * Auth guard — call on every protected page.
     * Redirects to login if JWT is missing.
     * @param {string} loginUrl - relative path to index.html from current page
     */
    authGuard(loginUrl = '../../index.html') {
        if (!this.getToken()) {
            window.location.replace(loginUrl);
            return false;
        }
        return true;
    },

    /**
     * Fix every .sidebar-brand logo link to point to Dashboard.html
     * instead of index.html (which would log the user out).
     */
    fixLogoNav() {
        document.querySelectorAll('a.sidebar-brand').forEach(el => {
            // Resolve current depth to build correct relative path
            const path = window.location.pathname;
            const depth = (path.match(/\//g) || []).length - 1;
            // From Pages/*/  we need ../Dashboard/Dashboard.html  (depth ≥ 2)
            const prefix = depth >= 2 ? '../' : 'Pages/';
            el.setAttribute('href', `${prefix}Dashboard/Dashboard.html`);
        });
    },

    /**
     * Wire the hamburger toggle button.
     * Looks for [data-action="toggle-sidebar"] or .mobile-toggle-btn
     */
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const toggleBtns = document.querySelectorAll(
            '[data-action="toggle-sidebar"], .mobile-toggle-btn'
        );
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => sidebar.classList.toggle('show'));
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', e => {
            if (window.innerWidth > 768) return;
            if (sidebar.classList.contains('show') &&
                !sidebar.contains(e.target) &&
                !e.target.closest('[data-action="toggle-sidebar"]') &&
                !e.target.closest('.mobile-toggle-btn')) {
                sidebar.classList.remove('show');
            }
        });
    },
};

window.Api = Api;

/* ─────────────────────────────────────────────────────────────────────
   Auto-run on every page that loads api.js AFTER store.js.
   Pages that are public (index.html, profile-setup) don't load api.js,
   so they are unaffected.
───────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname;

    // Detect the login page by filename — works regardless of server root depth.
    // Only index.html is the public (login) page.
    const isLoginPage = pathname.endsWith('/index.html') ||
                        pathname.endsWith('/') ||
                        pathname === '';

    if (!isLoginPage) {
        // 1. Auth guard — redirects to login if no JWT
        const ok = Api.authGuard('../../index.html');
        if (!ok) return;   // redirecting — stop further execution

        // 2. Fix logo navigation: sidebar-brand → Dashboard.html
        Api.fixLogoNav();

        // 3. Wire sidebar hamburger toggle
        Api.initSidebar();

        // 4. Background-sync profile → updates sidebar semester/branch (non-blocking)
        if (Api.getToken()) {
            Api.getMe().then(user => {
                if (!user) return;
                const existing = Store.getUser();
                Store.saveUser({
                    ...existing,
                    name     : user.name     || existing.name,
                    email    : user.email    || existing.email,
                    semester : user.semester || existing.semester,
                    branch   : user.branch   || existing.branch,
                });
                if (typeof Store.hydrateSidebar === 'function') Store.hydrateSidebar();
            }).catch(() => { /* silent — sidebar keeps cached values */ });
        }
    }
});

/**
 * safeCreateIcons — wraps lucide.createIcons() in a try/catch.
 * Lucide uses .className on SVG elements in some environments which throws
 * "className is read only" — this silences that without losing icons.
 * Call this after every innerHTML injection that includes data-lucide attrs.
 * @param {Element} [root=document] - optional root element to scope icon creation
 */
window.renderIcons = function (root) {
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons(root ? { nodes: root.querySelectorAll('[data-lucide]') } : undefined);
        }
    } catch (e) {
        // Silently ignore SVG className errors from Lucide
    }
};
