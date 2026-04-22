/**
 * store.js — StudySync Global Shared State
 * All data is persisted in localStorage under namespaced keys.
 * Every page should load this script BEFORE its own JS module.
 */

const KEYS = {
    user        : 'ss_user',
    studyLogs   : 'ss_study_logs',
    tasks       : 'ss_tasks',
    goals       : 'ss_goals',
    attendance  : 'ss_attendance',
    alerts      : 'ss_alerts',
};

/* ─── Utility ─────────────────────────────────────────────────── */

function _read(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
        console.warn('[Store] Failed to read', key, e);
        return fallback;
    }
}

function _write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('[Store] Failed to write', key, e);
    }
}

/**
 * Safely escape a string for injection into HTML.
 * Use this whenever displaying user-supplied text via innerHTML.
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ─── User / Profile ───────────────────────────────────────────── */

const DEFAULT_USER = {
    name        : 'Student',
    initials    : 'S',
    semester    : 1,
    branch      : 'CSE',
    targetHours : 8,
    subjects    : ['Computer Science', 'Mathematics', 'Physics', 'General'],
};

function getUser() {
    return _read(KEYS.user, DEFAULT_USER);
}

function saveUser(userData) {
    // Auto-compute initials from name
    const parts = (userData.name || 'S').trim().split(/\s+/);
    userData.initials = parts.map(p => p[0].toUpperCase()).slice(0, 2).join('');
    _write(KEYS.user, userData);
}

/* ─── Study Logs (compat layer) ─────────────────────────────────── */

/**
 * Kept for backward compatibility with pages that still read local logs
 * (Achievements, Analytics, Weekly Review).
 */
function getStudyLogs() {
    return _read(KEYS.studyLogs, []);
}

function saveStudyLogs(logs) {
    _write(KEYS.studyLogs, logs);
}

function addStudyLog(log) {
    const logs = getStudyLogs();
    logs.push(log);
    saveStudyLogs(logs);
    return logs;
}

function deleteStudyLog(id) {
    const logs = getStudyLogs().filter(l => l.id !== id);
    saveStudyLogs(logs);
    return logs;
}

/* ─── Tasks ────────────────────────────────────────────────────── */

function getTasks() {
    return _read(KEYS.tasks, []);
}

function saveTasks(tasks) {
    _write(KEYS.tasks, tasks);
}

function addTask(task) {
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);
    return tasks;
}

function updateTask(id, changes) {
    const tasks = getTasks().map(t => t.id === id ? { ...t, ...changes } : t);
    saveTasks(tasks);
    return tasks;
}

function deleteTask(id) {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    return tasks;
}

/* ─── Goals ────────────────────────────────────────────────────── */

function getGoals() {
    return _read(KEYS.goals, []);
}

function saveGoals(goals) {
    _write(KEYS.goals, goals);
}

function addGoal(goal) {
    const goals = getGoals();
    goals.push(goal);
    saveGoals(goals);
    return goals;
}

function updateGoal(id, changes) {
    const goals = getGoals().map(g => g.id === id ? { ...g, ...changes } : g);
    saveGoals(goals);
    return goals;
}

function deleteGoal(id) {
    const goals = getGoals().filter(g => g.id !== id);
    saveGoals(goals);
    return goals;
}

/* ─── Attendance ───────────────────────────────────────────────── */

function getAttendance() {
    return _read(KEYS.attendance, []);
}

function saveAttendance(records) {
    _write(KEYS.attendance, records);
}

function addAttendance(record) {
    const records = getAttendance();
    records.push(record);
    saveAttendance(records);
    return records;
}

function deleteAttendanceRecord(id) {
    const records = getAttendance().filter(r => r.id !== id);
    saveAttendance(records);
    return records;
}

/* ─── Alerts / Reminders ───────────────────────────────────────── */

function getAlerts() {
    return _read(KEYS.alerts, []);
}

function saveAlerts(alerts) {
    _write(KEYS.alerts, alerts);
}

function addAlert(alert) {
    const alerts = getAlerts();
    alerts.unshift(alert); // newest first
    saveAlerts(alerts);
    return alerts;
}

function updateAlert(id, changes) {
    const alerts = getAlerts().map(a => a.id === id ? { ...a, ...changes } : a);
    saveAlerts(alerts);
    return alerts;
}

function deleteAlertById(id) {
    const alerts = getAlerts().filter(a => a.id !== id);
    saveAlerts(alerts);
    return alerts;
}

/* ─── Analytics Helpers ─────────────────────────────────────────── */

/**
 * Calculate consecutive study-day streak using local logs.
 */
function calculateStreak() {
    const logs = getStudyLogs();
    if (logs.length === 0) return 0;

    const studiedDates = new Set(logs.map(l => l.date));
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        if (studiedDates.has(dateStr)) {
            streak++;
        } else {
            if (i === 0) continue;
            break;
        }
    }

    return streak;
}

/**
 * Weighted score: study progress (40%) + attendance (60%).
 */
function calculatePerformanceScore() {
    const todayStr = new Date().toISOString().split('T')[0];
    const user = getUser();
    const logs = getStudyLogs();
    const attendance = getAttendance();

    const todayHours = logs
        .filter(l => l.date === todayStr)
        .reduce((sum, l) => sum + l.hours, 0);

    const totalDays = attendance.length;
    const presentDays = attendance.filter(l => l.status === 'present' || l.status === 'late').length;

    const studyProgress = user.targetHours > 0
        ? Math.min(100, (todayHours / user.targetHours) * 100)
        : 0;
    const attPerc = totalDays > 0
        ? (presentDays / totalDays) * 100
        : 0;

    if (logs.length === 0 && attendance.length === 0) return 0;

    return Math.min(100, Math.round((studyProgress * 0.4) + (attPerc * 0.6)));
}

/**
 * Get today's total study hours from local logs.
 */
function getTodayStudyHours() {
    const todayStr = new Date().toISOString().split('T')[0];
    return getStudyLogs()
        .filter(l => l.date === todayStr)
        .reduce((sum, l) => sum + l.hours, 0);
}

/**
 * Compute attendance overall percentage.
 */
function calculateAttendancePercent() {
    const records = getAttendance();
    if (records.length === 0) return 0;
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((present / records.length) * 100);
}

/**
 * Get goals summary stats.
 */
function getGoalStats() {
    const goals = getGoals();
    const total = goals.length;
    const completed = goals.filter(g => g.current >= g.target).length;
    const active = total - completed;
    const avgProgress = total > 0
        ? Math.round(goals.reduce((sum, g) => sum + Math.min(100, (g.current / g.target) * 100), 0) / total)
        : 0;
    return { total, completed, active, avgProgress };
}

/* ─── Sidebar Hydration ────────────────────────────────────────── */

/**
 * Call this on DOMContentLoaded on every page to fill in the sidebar
 * user profile from localStorage without changing the HTML structure.
 */
function hydrateSidebar() {
    const user = getUser();

    const nameEl     = document.getElementById('user-name-display');
    const initialsEl = document.getElementById('user-initials');
    const metaEl     = document.getElementById('user-meta');
    const welcomeEl  = document.getElementById('welcome-name');

    function _fill(u) {
        if (nameEl)     nameEl.textContent    = u.name;
        if (initialsEl) initialsEl.textContent = u.initials || (u.name || 'S')[0].toUpperCase();
        if (metaEl) {
            const sem    = u.semester && u.semester !== 'undefined' ? `Sem ${u.semester}` : null;
            const branch = u.branch   && u.branch   !== 'undefined' ? u.branch : null;
            metaEl.textContent = (sem && branch) ? `${sem}, ${branch}`
                               : (sem || branch || 'Set up your profile');
        }
        if (welcomeEl) welcomeEl.textContent = (u.name || 'Student').split(' ')[0];
    }

    // 1. Render immediately from localStorage (no flicker)
    _fill(user);

    // 2. Refresh from backend if JWT available
    if (typeof Api !== 'undefined' && Api.getToken()) {
        Api.getMe().then(function (serverUser) {
            const merged = { ...user, name: serverUser.name || user.name,
                semester: serverUser.semester || user.semester,
                branch: serverUser.branch || user.branch };
            const parts = (merged.name || 'S').trim().split(/\s+/);
            merged.initials = parts.map(p => p[0].toUpperCase()).slice(0, 2).join('');
            saveUser(merged);
            _fill(merged);
        }).catch(function () { /* backend offline, local values stay */ });
    }
}

/* ─── Export (global namespace, no bundler needed) ─────────────── */

window.Store = {
    // Raw access
    getUser, saveUser,
    getStudyLogs, saveStudyLogs, addStudyLog, deleteStudyLog,
    getTasks, saveTasks, addTask, updateTask, deleteTask,
    getGoals, saveGoals, addGoal, updateGoal, deleteGoal,
    getAttendance, saveAttendance, addAttendance, deleteAttendanceRecord,
    getAlerts, saveAlerts, addAlert, updateAlert, deleteAlertById,

    // Analytics
    calculateStreak,
    calculatePerformanceScore,
    calculateAttendancePercent,
    getTodayStudyHours,
    getGoalStats,

    // UI helpers
    hydrateSidebar,
    escapeHtml,
};
