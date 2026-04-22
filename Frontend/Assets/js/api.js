/**
 * api.js — StudySync API helper
 * Wraps fetch with JWT Authorization header injection.
 * Load this BEFORE any page-specific JS that hits the backend.
 */

const API_BASE = 'http://localhost:8080';
const ONBOARDING_SEEN_KEY = 'ss_onboarding_seen_v1';
const SUBJECT_CACHE_KEY = 'ss_subjects_cache';

const Api = {

    /* ── Token helpers ────────────────────────────────────────── */

    getToken() {
        return localStorage.getItem('ss_jwt');
    },

    setSession(token, userInfo) {
        localStorage.setItem('ss_jwt', token);
        if (userInfo) {
            const existing = Store.getUser() || {};
            const incomingEmail = String(userInfo.email || '').trim().toLowerCase();
            const existingEmail = String(existing.email || '').trim().toLowerCase();
            const hasLegacyProfileData = !!(
                existing.semester ||
                existing.branch ||
                (Array.isArray(existing.subjects) && existing.subjects.length > 0)
            );
            const switchedAccount = !!(
                incomingEmail && (
                    (existingEmail && incomingEmail !== existingEmail) ||
                    (!existingEmail && hasLegacyProfileData)
                )
            );

            // Avoid leaking profile-complete fields between different accounts in same browser.
            const baseUser = switchedAccount
                ? {
                    name: 'Student',
                    email: '',
                    phone: '',
                    semester: '',
                    branch: '',
                    targetHours: 8,
                    subjects: [],
                }
                : existing;

            if (switchedAccount) {
                this.setCachedSubjects([]);
            }

            Store.saveUser({
                ...baseUser,
                name     : userInfo.name     || baseUser.name,
                email    : userInfo.email    || baseUser.email,
                semester : userInfo.semester || baseUser.semester,
                branch   : userInfo.branch   || baseUser.branch,
            });
        }
    },

    clearSession() {
        localStorage.removeItem('ss_jwt');
    },

    getFrontendPath(subPath) {
        const clean = String(subPath || '').replace(/^\/+/, '');
        const parts = window.location.pathname.split('/').filter(Boolean);
        const frontendIdx = parts.indexOf('Frontend');

        if (frontendIdx !== -1) {
            return '/' + parts.slice(0, frontendIdx + 1).join('/') + '/' + clean;
        }

        return '/' + clean;
    },

    getLoginPath() {
        return this.getFrontendPath('index.html');
    },

    getCurrentIdentity() {
        try {
            const user = (typeof Store !== 'undefined' && typeof Store.getUser === 'function')
                ? (Store.getUser() || {})
                : {};

            const userEmail = String(user.email || '').trim().toLowerCase();
            if (userEmail) return `email:${userEmail}`;

            const token = this.getToken();
            if (!token || token.split('.').length < 2) return '';

            const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = payload.padEnd(payload.length + ((4 - payload.length % 4) % 4), '=');
            const decoded = JSON.parse(atob(padded));

            const tokenEmail = String(decoded?.email || '').trim().toLowerCase();
            if (tokenEmail) return `email:${tokenEmail}`;

            const subject = String(decoded?.sub || '').trim().toLowerCase();
            if (subject) return `sub:${subject}`;
        } catch {
            // Ignore malformed token payload and gracefully fall back.
        }

        return '';
    },

    getOnboardingSeenKey() {
        const identity = this.getCurrentIdentity();
        return identity ? `${ONBOARDING_SEEN_KEY}:${identity}` : ONBOARDING_SEEN_KEY;
    },

    isOnboardingSeen() {
        const key = this.getOnboardingSeenKey();
        return localStorage.getItem(key) === '1';
    },

    markOnboardingSeen() {
        localStorage.setItem(this.getOnboardingSeenKey(), '1');
    },

    getCachedSubjects() {
        try {
            const raw = localStorage.getItem(SUBJECT_CACHE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    setCachedSubjects(subjectNames) {
        const clean = Array.isArray(subjectNames)
            ? subjectNames.map(s => String(s || '').trim()).filter(Boolean)
            : [];
        localStorage.setItem(SUBJECT_CACHE_KEY, JSON.stringify(clean));
    },

    getProfileSnapshot() {
        const base = (typeof Store !== 'undefined' ? Store.getUser() : null) || {};
        const cachedSubjects = this.getCachedSubjects();
        return {
            ...base,
            subjects: Array.isArray(base.subjects) && base.subjects.length > 0
                ? base.subjects
                : cachedSubjects,
        };
    },

    isProfileComplete(user = null) {
        const u = user || this.getProfileSnapshot();
        const hasName = !!(u.name && u.name.trim() && u.name !== 'Student');
        const hasSemester = !!u.semester;
        const hasBranch = !!(u.branch && String(u.branch).trim());
        const hasSubjects = Array.isArray(u.subjects) && u.subjects.length > 0;
        return hasName && hasSemester && hasBranch && hasSubjects;
    },

    async syncProfileCacheFromBackend() {
        if (!this.getToken()) return this.getProfileSnapshot();

        const [me, subjects] = await Promise.all([
            this.getMe(),
            this.getSubjects().catch(() => []),
        ]);

        const local = (typeof Store !== 'undefined' ? Store.getUser() : null) || {};
        const subjectNames = Array.isArray(subjects)
            ? subjects.map(s => s?.name).filter(Boolean)
            : [];

        this.setCachedSubjects(subjectNames);

        const merged = {
            ...local,
            name: me?.name || local.name,
            email: me?.email || local.email,
            semester: me?.semester || local.semester,
            branch: me?.branch || local.branch,
            subjects: subjectNames.length > 0 ? subjectNames : (local.subjects || []),
        };

        if (typeof Store !== 'undefined' && typeof Store.saveUser === 'function') {
            Store.saveUser(merged);
            if (typeof Store.hydrateSidebar === 'function') Store.hydrateSidebar();
        }

        return merged;
    },

    getPostLoginPath() {
        const seen = this.isOnboardingSeen();
        const complete = this.isProfileComplete();

        if (!seen) {
            return this.getFrontendPath('Pages/Onboarding/welcome.html');
        }

        if (!complete) {
            return this.getFrontendPath('Pages/Profile-setup/profile-setup.html');
        }

        return this.getFrontendPath('Pages/Dashboard/Dashboard.html');
    },

    enforcePostLoginRoute() {
        const currentPath = window.location.pathname.toLowerCase();
        const targetPath = new URL(this.getPostLoginPath(), window.location.origin).pathname.toLowerCase();

        const isOnboarding = currentPath.endsWith('/pages/onboarding/welcome.html');
        const isSetup = currentPath.endsWith('/pages/profile-setup/profile-setup.html');
        const needsOnboarding = targetPath.endsWith('/pages/onboarding/welcome.html');
        const needsSetup = targetPath.endsWith('/pages/profile-setup/profile-setup.html');
        const needsDashboard = targetPath.endsWith('/pages/dashboard/dashboard.html');

        if ((needsOnboarding && !isOnboarding) ||
            (needsSetup && !isSetup) ||
            (isOnboarding && needsDashboard)) {
            window.location.href = targetPath;
            return false;
        }

        return true;
    },

    logout() {
        this.clearSession();
        window.location.href = this.getLoginPath();
    },

    /* ── Core fetch wrapper ───────────────────────────────────── */

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
        } catch {
            throw new Error('Cannot reach server. Is the backend running on port 8080?');
        }

        if (res.status === 401) {
            this.logout();
            throw new Error('Session expired. Redirecting to login…');
        }

        const contentType = res.headers.get('content-type') || '';
        const isJson      = contentType.includes('application/json');
        const body        = isJson ? await res.json() : await res.text();

        if (!res.ok) {
            const msg = isJson
                ? (body.error || body.message || JSON.stringify(body))
                : `HTTP ${res.status}`;
            throw new Error(msg);
        }

        return body;
    },

    /* ── Convenience wrappers ─────────────────────────────────── */

    get(path)              { return this.request(path); },

    post(path, body)       { return this.request(path, { method: 'POST',   body: JSON.stringify(body) }); },

    put(path, body)        { return this.request(path, { method: 'PUT',    body: JSON.stringify(body) }); },

    delete(path)           { return this.request(path, { method: 'DELETE' }); },

    /* ── Auth ─────────────────────────────────────────────────── */

    async login(email, password) {
        const data = await this.post('/api/auth/login', { email, password });
        if (data.success && data.token) {
            this.setSession(data.token, { email });
        }
        return data;
    },

    async register(email, password) {
        const data = await this.post('/api/auth/register', { email, password });
        if (data.success && data.token) {
            this.setSession(data.token, { email });
        }
        return data;
    },

    /* ── User Profile ─────────────────────────────────────────── */

    getMe()                                           { return this.get('/api/user/me'); },

    updateProfile(name, email, phone, semester, branch) {
        return this.put('/api/user/profile', { name, email, phone, semester, branch });
    },

    /* ── Subjects ─────────────────────────────────────────────── */

    getSubjects()        { return this.get('/api/subjects'); },

    createSubject(name)  { return this.post('/api/subjects', { name }); },

    /* ── Attendance ───────────────────────────────────────────── */

    getAttendance(subjectId = null) {
        const qs = subjectId ? `?subjectId=${subjectId}` : '';
        return this.get(`/api/attendance${qs}`);
    },

    markAttendance(subjectId, date, status) {
        return this.post('/api/attendance', { subjectId, date, status });
    },

    deleteAttendance(recordId) {
        return this.delete(`/api/attendance/${recordId}`);
    },

    /* ── Study Sessions ───────────────────────────────────────── */

    /** POST /api/study/log — { subjectId, durationMinutes, date, notes } */
    logStudySession(subjectId, durationMinutes, date, notes = '') {
        return this.post('/api/study/log', { subjectId, durationMinutes, date, notes });
    },

    /** GET /api/study/daily?date=YYYY-MM-DD */
    getDailySessions(date = null) {
        const qs = date ? `?date=${date}` : '';
        return this.get(`/api/study/daily${qs}`);
    },

    /** GET /api/study/stats → { todayMinutes, weekMinutes, streak, subjectBreakdown } */
    getDashboardStats() {
        return this.get('/api/study/stats');
    },

    /* ── Page utilities ───────────────────────────────────────── */

    authGuard(loginUrl = '../../index.html') {
        if (!this.getToken()) {
            window.location.replace(loginUrl);
            return false;
        }
        return true;
    },

    fixLogoNav() {
        document.querySelectorAll('a.sidebar-brand').forEach(el => {
            const path  = window.location.pathname;
            const depth = (path.match(/\//g) || []).length - 1;
            const prefix = depth >= 2 ? '../' : 'Pages/';
            el.setAttribute('href', `${prefix}Dashboard/Dashboard.html`);
        });
    },

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const toggleBtns = document.querySelectorAll(
            '[data-action="toggle-sidebar"], .mobile-toggle-btn'
        );
        toggleBtns.forEach(btn =>
            btn.addEventListener('click', () => sidebar.classList.toggle('show'))
        );
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

    ensureAccountActions() {
        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('/pages/onboarding/welcome.html')) {
            return;
        }

        const footer = document.querySelector('.sidebar-footer');
        if (!footer) {
            if (!document.querySelector('[data-role="global-floating-logout"]')) {
                const floating = document.createElement('button');
                floating.type = 'button';
                floating.className = 'btn btn-sm btn-outline-danger position-fixed top-0 end-0 m-3';
                floating.style.zIndex = '1080';
                floating.setAttribute('data-role', 'global-floating-logout');
                floating.innerHTML = '<i data-lucide="log-out" size="14"></i> Logout';
                floating.addEventListener('click', () => this.logout());
                document.body.appendChild(floating);
            }
            return;
        }

        if (footer.querySelector('[data-role="account-actions"]')) {
            const existingLogout = footer.querySelector('[data-role="global-logout-btn"]');
            if (existingLogout && !existingLogout.dataset.bound) {
                existingLogout.dataset.bound = '1';
                existingLogout.addEventListener('click', () => this.logout());
            }
            return;
        }

        let setupHref = '../Profile-setup/profile-setup.html';

        if (path.includes('/pages/profile-setup/')) {
            setupHref = 'profile-setup.html';
        } else if (!path.includes('/pages/')) {
            setupHref = 'Pages/Profile-setup/profile-setup.html';
        }

        const actions = document.createElement('div');
        actions.setAttribute('data-role', 'account-actions');
        actions.className = 'mt-2 d-grid gap-2';
        actions.innerHTML = `
            <a href="${setupHref}" class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2" data-role="profile-setup-action">
                <i data-lucide="user-cog" size="14"></i>
                Profile Setup
            </a>
            <button type="button" class="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2" data-role="global-logout-btn">
                <i data-lucide="log-out" size="14"></i>
                Logout
            </button>
        `;

        footer.appendChild(actions);

        const logoutBtn = actions.querySelector('[data-role="global-logout-btn"]');
        if (logoutBtn) {
            logoutBtn.dataset.bound = '1';
            logoutBtn.addEventListener('click', () => this.logout());
        }
    },
};

window.Api = Api;

/* ── Auto-init on every protected page ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const pathname    = window.location.pathname;
    const isLoginPage = pathname.endsWith('/index.html') ||
                        pathname.endsWith('/') ||
                        pathname === '';

    if (!isLoginPage) {
        const ok = Api.authGuard('../../index.html');
        if (!ok) return;

        const initProtectedUI = () => {
            Api.fixLogoNav();
            Api.initSidebar();
            Api.ensureAccountActions();
            if (typeof window.renderIcons === 'function') window.renderIcons();
        };

        if (Api.getToken()) {
            Api.syncProfileCacheFromBackend()
                .catch(() => { /* keep local fallback */ })
                .finally(() => {
                    const routeOk = Api.enforcePostLoginRoute();
                    if (!routeOk) return;
                    initProtectedUI();
                });
        } else {
            const routeOk = Api.enforcePostLoginRoute();
            if (!routeOk) return;
            initProtectedUI();
        }
    }
});

/* ── Icon renderer ────────────────────────────────────────────── */
window.renderIcons = function () {
    try {
        if (typeof window.IconSystem !== 'undefined' && typeof window.IconSystem.render === 'function') {
            window.IconSystem.render();
        } else if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.warn('Lucide not loaded yet.');
        }
    } catch (e) {
        console.error('Lucide error:', e);
    }
};

window.addEventListener('load', function() {
    window.renderIcons();
});
