/**
 * Dashboard.js — StudySync Dashboard
 * All study data now comes from the backend via Api.getDashboardStats().
 * store.js (localStorage) is only used for: profile sidebar hydration,
 * attendance %, performance score, streak (until backend covers those too),
 * and alerts badge — none of which need study logs.
 */

document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    Store.hydrateSidebar();
    initDashboard();
});

/* ─── Init ─────────────────────────────────────────────────────── */

function initDashboard() {
    document.getElementById('logDate').valueAsDate = new Date();
    document.getElementById('attDate').valueAsDate = new Date();

    updateGreeting();
    bindForms();
    loadDashboard();          // ← primary: fetch from backend

    const logModal = document.getElementById('logStudyModal');
    if (logModal) {
        logModal.addEventListener('show.bs.modal', populateSubjectDropdown);
    }
}

/* ─── Greeting ──────────────────────────────────────────────────── */

function updateGreeting() {
    const greetEl = document.getElementById('greeting-text');
    const nameEl  = document.getElementById('welcome-name');
    if (!nameEl) return;

    const hour = new Date().getHours();
    let greeting;
    if (hour < 12)      greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else if (hour < 21) greeting = 'Good evening';
    else                greeting = 'Good night';

    if (greetEl) {
        greetEl.textContent = `${greeting}, `;
        const iconEl = document.getElementById('greeting-emoji');
        if (iconEl) iconEl.textContent = '';
    } else {
        const h2 = nameEl.closest('h2');
        if (h2) {
            h2.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.textContent.includes('Welcome back,'))
                        node.textContent = `${greeting}, `;
                }
            });
        }
    }
}

/* ─── Primary load — backend stats ─────────────────────────────── */

async function loadDashboard() {
    setLoadingState(true);

    try {
        const stats = await Api.getDashboardStats();
        _lastStats = stats;
        renderStudyStats(stats);
        renderSubjectChart(stats.subjectBreakdown || []);
    } catch (err) {
        showDashboardError(err.message);
    } finally {
        setLoadingState(false);
    }

    // These are not study-log dependent — can run independently
    await renderAttendanceStats();
    renderAlertBadge();
    renderWeeklyChart();
}

/* ─── Render helpers ────────────────────────────────────────────── */

function renderStudyStats(stats) {
    // Today hours (convert minutes → hours, 1 decimal)
    const todayHours = +(stats.todayMinutes / 60).toFixed(1);
    const user = Store.getUser();

    document.getElementById('stat-hours').textContent = todayHours;

    const hoursMsg = document.getElementById('stat-hours-msg');
    if (hoursMsg) {
        if (stats.todayMinutes === 0) {
            hoursMsg.textContent = 'Log hours to start';
            hoursMsg.className   = 'text-muted small fw-bold mt-2';
        } else if (todayHours >= (user.targetHours || 8)) {
            hoursMsg.textContent = 'Target reached!';
            hoursMsg.className   = 'text-success small fw-bold mt-2';
        } else {
            hoursMsg.textContent = 'Keep going!';
            hoursMsg.className   = 'text-primary small fw-bold mt-2';
        }
    }

    // Streak (from backend)
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) {
        const s = stats.streak || 0;
        streakEl.textContent = `${s} day${s !== 1 ? 's' : ''}`;
    }
}

async function renderAttendanceStats() {
    let attendance = [];

    if (Api.getToken()) {
        try {
            attendance = await Api.getAttendance();
        } catch {
            attendance = [];
        }
    } else {
        attendance = Store.getAttendance();
    }

    const present = attendance.filter(r => {
        const st = String(r.status || '').toUpperCase();
        return st === 'PRESENT' || st === 'LATE' || st === 'present' || st === 'late';
    }).length;
    const attPercent = attendance.length > 0
        ? Math.round((present / attendance.length) * 100)
        : 0;

    document.getElementById('stat-attendance').textContent = `${attPercent}%`;

    const badge = document.getElementById('attendance-status');
    if (!badge) return;
    if (attendance.length === 0) {
        badge.className   = 'badge-custom badge-success';
        badge.textContent = 'No Data';
    } else if (attPercent >= 75) {
        badge.className   = 'badge-custom badge-success';
        badge.textContent = 'Safe';
    } else {
        badge.className   = 'badge-custom bg-danger text-white';
        badge.textContent = 'Low';
    }

    // Performance score — attendance-based (study data lives in backend)
    const perfScore = attPercent;
    document.getElementById('stat-performance').textContent = `${perfScore}%`;
    document.getElementById('bar-performance').style.width  = `${perfScore}%`;
}

function renderAlertBadge() {
    const unread     = Store.getAlerts().filter(a => !a.read).length;
    const alertBadge = document.getElementById('alert-badge');
    if (alertBadge) {
        alertBadge.textContent   = unread;
        alertBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
}

/* ─── Subject dropdown ─────────────────────────────────────────── */

function populateSubjectDropdown() {
    const select = document.getElementById('logSubject');
    if (!select) return;
    const user     = Store.getUser();
    const subjects = user.subjects?.length ? user.subjects : ['General'];
    const current  = select.value;
    select.innerHTML = subjects
        .map(s => `<option value="${Store.escapeHtml(s)}" ${s === current ? 'selected' : ''}>${Store.escapeHtml(s)}</option>`)
        .join('');
}

/* ─── Forms ─────────────────────────────────────────────────────── */

function bindForms() {
    // ── Log Study Session ──
    document.getElementById('logStudyForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const subjectName = document.getElementById('logSubject').value;
        const hours       = parseFloat(document.getElementById('logHours').value);
        const date        = document.getElementById('logDate').value;

        if (!subjectName || isNaN(hours) || hours <= 0) {
            createToast('Error', 'Fill in all fields with valid values.', 'danger');
            return;
        }

        const durationMinutes = Math.round(hours * 60);

        // Resolve subjectId from backend subjects list
        let subjectId = null;
        try {
            const subjects = await Api.getSubjects();
            const match    = subjects.find(s => s.name === subjectName);

            if (match) {
                subjectId = match.id;
            } else {
                // Auto-create subject if not yet in backend
                const created = await Api.createSubject(subjectName);
                subjectId = created.id;
            }

            await Api.logStudySession(subjectId, durationMinutes, date);

            bootstrap.Modal.getInstance(document.getElementById('logStudyModal')).hide();
            this.reset();
            document.getElementById('logDate').valueAsDate = new Date();

            createToast('Success', `Logged ${hours}h for ${Store.escapeHtml(subjectName)}.`);
            loadDashboard();   // refresh all stats from backend

        } catch (err) {
            createToast('Error', err.message || 'Failed to log session.', 'danger');
        }
    });

    // ── Log Attendance ──
    document.getElementById('attendanceForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const date   = document.getElementById('attDate').value;
        const status = document.querySelector('input[name="attStatus"]:checked').value;

        if (Api.getToken()) {
            try {
                const subjects = await Api.getSubjects();
                let general = subjects.find(s => String(s.name || '').toLowerCase() === 'general');
                if (!general) {
                    general = await Api.createSubject('General');
                }

                await Api.markAttendance(general.id, date, status.toUpperCase());
            } catch (err) {
                createToast('Error', err.message || 'Failed to save attendance.', 'danger');
                return;
            }
        } else {
            const existing = Store.getAttendance();
            const idx      = existing.findIndex(r => r.date === date);
            if (idx >= 0) {
                existing[idx].status = status;
                Store.saveAttendance(existing);
            } else {
                Store.addAttendance({ id: Date.now(), date, status, subject: 'General' });
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('logAttendanceModal')).hide();
        await renderAttendanceStats();
        createToast('Attendance', `Marked as ${status} on ${date}.`);
    });
}

/* ─── Charts ─────────────────────────────────────────────────────── */

let weeklyChartInst = null;
let pieChartInst    = null;

// Cache of last successful getDashboardStats() payload for chart rendering
let _lastStats = null;

function renderWeeklyChart() {
    // Build labels for the last 7 days; use backend breakdown minutes by day
    // Until /api/study/daily-range is available, show subject total as proxy bars
    const breakdown = _lastStats?.subjectBreakdown || [];
    const labels    = [];
    const data      = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        // We don't have per-day data yet — show today's total on today only
        const isToday = i === 0;
        data.push(isToday ? +((_lastStats?.todayMinutes || 0) / 60).toFixed(1) : 0);
    }

    const ctxWeekly = document.getElementById('weeklyStudyChart')?.getContext('2d');
    if (!ctxWeekly) return;

    if (weeklyChartInst) {
        weeklyChartInst.data.labels           = labels;
        weeklyChartInst.data.datasets[0].data = data;
        weeklyChartInst.update();
    } else {
        weeklyChartInst = new Chart(ctxWeekly, {
            type : 'bar',
            data : { labels, datasets: [{ label: 'Study Hours', data,
                        backgroundColor: '#6366f1', borderRadius: 6, barPercentage: 0.6 }] },
            options: { responsive: true, plugins: { legend: { display: false } },
                       scales: { y: { beginAtZero: true } } },
        });
    }
}

function renderSubjectChart(breakdown) {
    const pieLabels  = breakdown.map(b => b.subject);
    const pieData    = breakdown.map(b => b.minutes);
    const pieCanvas  = document.getElementById('subjectPieChart');
    const emptyState = document.getElementById('no-chart-data');
    if (!pieCanvas) return;

    if (pieLabels.length === 0) {
        pieCanvas.style.display  = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }
        return;
    }

    pieCanvas.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    if (pieChartInst) {
        pieChartInst.data.labels           = pieLabels;
        pieChartInst.data.datasets[0].data = pieData;
        pieChartInst.update();
    } else {
        const ctxPie = pieCanvas.getContext('2d');
        pieChartInst = new Chart(ctxPie, {
            type : 'doughnut',
            data : { labels: pieLabels,
                     datasets: [{ data: pieData,
                         backgroundColor: ['#6366f1','#10b981','#f59e0b','#d946ef','#3b82f6'],
                         borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%' },
        });
    }
}

/* ─── Loading / Error states ─────────────────────────────────────── */

function setLoadingState(loading) {
    const hoursEl = document.getElementById('stat-hours');
    if (hoursEl && loading) hoursEl.textContent = '…';
}

function showDashboardError(message) {
    const hoursMsg = document.getElementById('stat-hours-msg');
    if (hoursMsg) {
        hoursMsg.textContent = 'Backend offline';
        hoursMsg.className   = 'text-warning small fw-bold mt-2';
    }
    console.warn('[Dashboard] Stats load failed:', message);
}

/* ─── Toast ─────────────────────────────────────────────────────── */

function createToast(title, message, type = 'success') {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    const div = document.createElement('div');
    const cls  = type === 'danger' ? 'alert-danger' : 'alert-success';
    div.className = `alert ${cls} alert-dismissible fade show d-flex align-items-center gap-3 mb-4`;
    div.innerHTML = `
        <i data-lucide="${type === 'danger' ? 'alert-circle' : 'check-circle'}" class="text-${type}"></i>
        <div><strong>${Store.escapeHtml(title)}:</strong> ${Store.escapeHtml(message)}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.insertBefore(div, container.firstChild);
    renderIcons();
    setTimeout(() => {
        bootstrap.Alert.getOrCreateInstance(div)?.close();
    }, 4000);
}
