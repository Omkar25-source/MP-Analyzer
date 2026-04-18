/**
 * Dashboard.js — StudySync Dashboard
 * Uses Store for all state. No local arrays.
 */

// Icons are initialized after DOM loads
document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    Store.hydrateSidebar();
    initDashboard();
});

/* ─── Default date fields ──────────────────────────────────────── */
function initDashboard() {
    document.getElementById('logDate').valueAsDate = new Date();
    document.getElementById('attDate').valueAsDate = new Date();

    bindForms();
    updateGreeting();
    updateDashboardUI();

    // Refresh subject dropdown each time the Log Study modal opens
    const logModal = document.getElementById('logStudyModal');
    if (logModal) {
        logModal.addEventListener('show.bs.modal', populateSubjectDropdown);
    }
}

/* ─── Time-based greeting ──────────────────────────────────────── */
function updateGreeting() {
    const greetEl = document.getElementById('greeting-text');
    const nameEl  = document.getElementById('welcome-name');
    if (!nameEl) return;

    const hour = new Date().getHours();
    let greeting, emoji;
    if (hour < 12) {
        greeting = 'Good morning'; emoji = '☀️';
    } else if (hour < 17) {
        greeting = 'Good afternoon'; emoji = '🌤️';
    } else if (hour < 21) {
        greeting = 'Good evening'; emoji = '🌆';
    } else {
        greeting = 'Good night'; emoji = '🌙';
    }

    // If the greeting-text span exists (extended greeting), update it
    // Otherwise update the h2's surrounding text via the name span's parent
    if (greetEl) {
        greetEl.textContent = `${greeting}, `;
        const emojiEl = document.getElementById('greeting-emoji');
        if (emojiEl) emojiEl.textContent = ` ${emoji}`;
    } else {
        // Update the h2 text around the welcome-name span
        const h2 = nameEl.closest('h2');
        if (h2) {
            h2.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.textContent.includes('Welcome back,')) {
                        node.textContent = `${greeting}, `;
                    }
                    if (node.textContent.trim() === '👋') {
                        node.textContent = ` ${emoji}`;
                    }
                }
            });
        }
    }
}

/* ─── Form bindings ────────────────────────────────────────────── */
function bindForms() {
    // Log Study Session
    document.getElementById('logStudyForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const subject = document.getElementById('logSubject').value;
        const hours   = parseFloat(document.getElementById('logHours').value);
        const date    = document.getElementById('logDate').value;

        Store.addStudyLog({ id: Date.now(), subject, hours, date });

        const modal = bootstrap.Modal.getInstance(document.getElementById('logStudyModal'));
        modal.hide();
        this.reset();
        document.getElementById('logDate').valueAsDate = new Date();

        // Reload subjects dropdown from stored user prefs
        populateSubjectDropdown();
        updateDashboardUI();
        createToast('Success', `Logged ${hours}h for ${Store.escapeHtml(subject)}.`);
    });

    // Log Attendance
    document.getElementById('attendanceForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const date   = document.getElementById('attDate').value;
        const status = document.querySelector('input[name="attStatus"]:checked').value;

        // Update existing record for same date or add new one
        const existing = Store.getAttendance();
        const idx      = existing.findIndex(r => r.date === date);
        if (idx >= 0) {
            existing[idx].status = status;
            Store.saveAttendance(existing);
        } else {
            Store.addAttendance({ id: Date.now(), date, status, subject: 'General' });
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('logAttendanceModal'));
        modal.hide();

        updateDashboardUI();
        createToast('Attendance', `Marked as ${status} on ${date}.`);
    });
}

/* ─── Populate subject dropdown from user profile ──────────────── */
function populateSubjectDropdown() {
    const select   = document.getElementById('logSubject');
    if (!select) return;
    const user     = Store.getUser();
    const subjects = user.subjects && user.subjects.length > 0
        ? user.subjects
        : ['Computer Science', 'Mathematics', 'Physics', 'General'];

    const current  = select.value;
    select.innerHTML = subjects
        .map(s => `<option value="${Store.escapeHtml(s)}" ${s === current ? 'selected' : ''}>${Store.escapeHtml(s)}</option>`)
        .join('');
}

/* ─── Dashboard UI update ──────────────────────────────────────── */
function updateDashboardUI() {
    const user        = Store.getUser();
    const todayHours  = Store.getTodayStudyHours();
    const attPercent  = Store.calculateAttendancePercent();
    const perfScore   = Store.calculatePerformanceScore();
    const streak      = Store.calculateStreak();
    const attendance  = Store.getAttendance();

    // Study Hours
    document.getElementById('stat-hours').textContent = todayHours;
    const hoursMsg = document.getElementById('stat-hours-msg');
    if (todayHours === 0) {
        hoursMsg.textContent  = 'Log hours to start';
        hoursMsg.className    = 'text-muted small fw-bold mt-2';
    } else if (todayHours >= user.targetHours) {
        hoursMsg.textContent  = 'Target reached! 🎉';
        hoursMsg.className    = 'text-success small fw-bold mt-2';
    } else {
        hoursMsg.textContent  = 'Keep going!';
        hoursMsg.className    = 'text-primary small fw-bold mt-2';
    }

    // Attendance
    document.getElementById('stat-attendance').textContent = `${attPercent}%`;
    const badge = document.getElementById('attendance-status');
    if (attendance.length === 0) {
        badge.className    = 'badge-custom badge-success';
        badge.textContent  = 'No Data';
    } else if (attPercent >= 75) {
        badge.className    = 'badge-custom badge-success';
        badge.textContent  = 'Safe';
    } else {
        badge.className    = 'badge-custom bg-danger text-white';
        badge.textContent  = 'Low';
    }

    // Performance score
    document.getElementById('stat-performance').textContent  = `${perfScore}%`;
    document.getElementById('bar-performance').style.width   = `${perfScore}%`;

    // Streak (consecutive days)
    document.getElementById('stat-streak').textContent = `${streak} day${streak !== 1 ? 's' : ''}`;

    // Alert badge
    const unread = Store.getAlerts().filter(a => !a.read).length;
    const alertBadge = document.getElementById('alert-badge');
    if (alertBadge) {
        alertBadge.textContent    = unread;
        alertBadge.style.display  = unread > 0 ? 'inline-block' : 'none';
    }

    // Populate subjects once
    populateSubjectDropdown();

    updateCharts();
}

/* ─── Toast (non-blocking alert) ───────────────────────────────── */
function createToast(title, message) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'alert alert-success alert-dismissible fade show d-flex align-items-center gap-3 mb-4';
    div.innerHTML = `
        <i data-lucide="check-circle" class="text-success"></i>
        <div><strong>${Store.escapeHtml(title)}:</strong> ${Store.escapeHtml(message)}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.insertBefore(div, container.firstChild);
    renderIcons();

    // Auto-dismiss after 4 s
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(div);
        if (bsAlert) bsAlert.close();
    }, 4000);
}

/* ─── Charts ───────────────────────────────────────────────────── */
let weeklyChartInst = null;
let pieChartInst    = null;

function updateCharts() {
    const labels = [];
    const data   = [];
    const logs   = Store.getStudyLogs();

    for (let i = 6; i >= 0; i--) {
        const d       = new Date();
        d.setDate(d.getDate() - i);
        const dateStr  = d.toISOString().split('T')[0];
        const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(shortDay);
        const dayHours = logs
            .filter(l => l.date === dateStr)
            .reduce((sum, l) => sum + l.hours, 0);
        data.push(dayHours);
    }

    // Weekly bar chart — update data in place to avoid flicker
    const ctxWeekly = document.getElementById('weeklyStudyChart').getContext('2d');
    if (weeklyChartInst) {
        weeklyChartInst.data.labels                  = labels;
        weeklyChartInst.data.datasets[0].data        = data;
        weeklyChartInst.update();
    } else {
        weeklyChartInst = new Chart(ctxWeekly, {
            type : 'bar',
            data : {
                labels,
                datasets: [{
                    label           : 'Study Hours',
                    data,
                    backgroundColor : '#6366f1',
                    borderRadius    : 6,
                    barPercentage   : 0.6,
                }],
            },
            options: {
                responsive : true,
                plugins    : { legend: { display: false } },
                scales     : { y: { beginAtZero: true } },
            },
        });
    }

    // Subject pie/doughnut chart
    const subjectTotals = {};
    logs.forEach(l => {
        subjectTotals[l.subject] = (subjectTotals[l.subject] || 0) + l.hours;
    });
    const pieLabels   = Object.keys(subjectTotals);
    const pieData     = Object.values(subjectTotals);
    const pieCanvas   = document.getElementById('subjectPieChart');
    const emptyState  = document.getElementById('no-chart-data');

    if (pieLabels.length === 0) {
        pieCanvas.style.display  = 'none';
        emptyState.style.display = 'block';
        if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }
    } else {
        pieCanvas.style.display  = 'block';
        emptyState.style.display = 'none';

        if (pieChartInst) {
            pieChartInst.data.labels           = pieLabels;
            pieChartInst.data.datasets[0].data = pieData;
            pieChartInst.update();
        } else {
            const ctxPie = pieCanvas.getContext('2d');
            pieChartInst = new Chart(ctxPie, {
                type : 'doughnut',
                data : {
                    labels   : pieLabels,
                    datasets : [{
                        data            : pieData,
                        backgroundColor : ['#6366f1', '#10b981', '#f59e0b', '#d946ef', '#3b82f6'],
                        borderWidth     : 0,
                    }],
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%' },
            });
        }
    }
}
