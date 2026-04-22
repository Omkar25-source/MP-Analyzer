/**
 * Alerts.js — StudySync Alerts / Notifications Page
 * Uses Store for all state. No local arrays.
 */

document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    Store.hydrateSidebar();
    initAlertsApp();
});

let currentFilter = 'all';

const typeConfig = {
    'system'  : { icon: 'info',           class: 'icon-system'   },
    'reminder': { icon: 'clock',          class: 'icon-reminder' },
    'urgent'  : { icon: 'alert-triangle', class: 'icon-urgent'   },
};

function initAlertsApp() {
    document.getElementById('reminderForm').addEventListener('submit', handleNewReminder);
    document.addEventListener('click', handleGlobalClicks);
    renderAlerts();
    initNotifications();
}

/* ─── Global delegation ────────────────────────────────────────── */
function handleGlobalClicks(e) {
    if (e.target.matches('.mobile-toggle-btn, .mobile-toggle-btn *')) {
        document.getElementById('sidebar').classList.toggle('show');
    }

    if (e.target.matches('.mark-all-read-btn, .mark-all-read-btn *')) {
        markAllRead();
    }

    if (e.target.matches('.filter-tab-btn')) {
        e.preventDefault();
        currentFilter = e.target.dataset.filter;
        updateTabUI();
        renderAlerts();
    }

    const alertItem = e.target.closest('.alert-item');
    if (alertItem) {
        const alertId = parseInt(alertItem.dataset.alertId);

        if (e.target.matches('.alert-read-btn, .alert-read-btn *')) {
            Store.updateAlert(alertId, { read: true });
            renderAlerts();
        }

        if (e.target.matches('.alert-delete-btn, .alert-delete-btn *')) {
            handleDeleteAlert(alertId);
        }
    }
}

/* ─── CRUD ─────────────────────────────────────────────────────── */
function handleNewReminder(e) {
    e.preventDefault();

    const title = document.getElementById('remTitle').value.trim();
    const desc  = document.getElementById('remDesc').value.trim();
    const type  = document.getElementById('remType').value;

    Store.addAlert({
        id       : Date.now(),
        title,
        desc,
        type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date     : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        read     : false,
    });

    e.target.reset();
    bootstrap.Modal.getInstance(document.getElementById('newReminderModal')).hide();

    currentFilter = 'all';
    updateTabUI();
    renderAlerts();
}

function markAllRead() {
    const alerts = Store.getAlerts().map(a => ({ ...a, read: true }));
    Store.saveAlerts(alerts);
    renderAlerts();
}

function handleDeleteAlert(id) {
    if (confirm('Delete this notification?')) {
        Store.deleteAlertById(id);
        renderAlerts();
    }
}

/* ─── Tab UI ───────────────────────────────────────────────────── */
function updateTabUI() {
    const tabAll    = document.getElementById('tab-all');
    const tabUnread = document.getElementById('tab-unread');

    if (currentFilter === 'all') {
        tabAll.className    = 'nav-link active bg-light text-dark fw-medium border shadow-sm px-4 filter-tab-btn';
        tabUnread.className = 'nav-link text-muted fw-medium px-4 filter-tab-btn';
    } else {
        tabAll.className    = 'nav-link text-muted fw-medium px-4 filter-tab-btn';
        tabUnread.className = 'nav-link active bg-light text-dark fw-medium border shadow-sm px-4 filter-tab-btn';
    }
}

/* ─── Render ───────────────────────────────────────────────────── */
function renderAlerts() {
    const container  = document.getElementById('alertsListContainer');
    const emptyState = document.getElementById('emptyStateContainer');
    const badge      = document.getElementById('alert-badge');

    const alerts      = Store.getAlerts();
    const unreadCount = alerts.filter(a => !a.read).length;

    if (badge) {
        badge.textContent   = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    const display = currentFilter === 'unread'
        ? alerts.filter(a => !a.read)
        : alerts;

    if (display.length === 0) {
        emptyState.style.display = 'block';
        container.innerHTML      = '';
        return;
    }

    emptyState.style.display = 'none';

    let html = '';
    display.forEach(alert => {
        const config  = typeConfig[alert.type] || typeConfig['system'];
        const isUnread = !alert.read;

        html += `
        <div class="alert-item ${isUnread ? 'unread' : ''}" data-alert-id="${alert.id}">
            <div class="alert-icon-box ${config.class}">
                <i data-lucide="${config.icon}" size="20"></i>
            </div>

            <div class="alert-content">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h4 class="alert-title d-flex align-items-center gap-2">
                            ${Store.escapeHtml(alert.title)}
                            ${isUnread ? '<span class="badge bg-primary rounded-pill" style="font-size:0.6rem;">New</span>' : ''}
                        </h4>
                        ${alert.desc ? `<p class="alert-desc">${Store.escapeHtml(alert.desc)}</p>` : ''}
                        <div class="alert-meta">
                            <i data-lucide="calendar" size="12"></i> ${alert.date}
                            <span class="mx-1">•</span>
                            <i data-lucide="clock" size="12"></i> ${alert.timestamp}
                        </div>
                    </div>

                    <div class="alert-actions">
                        ${isUnread ? `
                        <button class="btn btn-sm btn-light text-success border alert-read-btn" title="Mark as read">
                            <i data-lucide="check" size="16"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-light text-danger border alert-delete-btn" title="Delete notification">
                            <i data-lucide="trash-2" size="16"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    renderIcons();
}

/* ─── Push Notifications ───────────────────────────────────────── */
function initNotifications() {
    if (!('Notification' in window)) return; // not supported

    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const btn = document.createElement('button');
    btn.id        = 'notif-toggle-btn';
    btn.className = 'btn btn-light border d-flex align-items-center gap-2 shadow-sm';
    btn.title     = 'Enable browser notifications for reminders';

    function updateBtn(permission) {
        if (permission === 'granted') {
            btn.innerHTML = `<i data-lucide="bell-ring" size="18"></i><span class="d-none d-sm-inline">Notifications On</span>`;
            btn.classList.remove('btn-light');
            btn.classList.add('btn-success');
            btn.disabled = true;
            renderIcons();
        } else {
            btn.innerHTML = `<i data-lucide="bell-off" size="18"></i><span class="d-none d-sm-inline">Enable Alerts</span>`;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-light');
            btn.disabled = false;
            renderIcons();
        }
    }

    // Insert before the existing first button
    headerActions.insertBefore(btn, headerActions.firstChild);
    updateBtn(Notification.permission);

    btn.addEventListener('click', async function () {
        const permission = await Notification.requestPermission();
        updateBtn(permission);
        if (permission === 'granted') {
            fireUnreadNotifications();
        }
    });

    // Auto-fire if permission already granted
    if (Notification.permission === 'granted') {
        fireUnreadNotifications();
    }
}

function fireUnreadNotifications() {
    const unread = Store.getAlerts()
        .filter(a => !a.read && (a.type === 'urgent' || a.type === 'reminder'))
        .slice(0, 5); // cap at 5 to avoid spam

    unread.forEach((alert, i) => {
        setTimeout(() => {
            const n = new Notification(`StudySync — ${alert.title}`, {
                body : alert.desc || 'You have an unread reminder.',
                tag  : `studysync-alert-${alert.id}`,
            });
            n.onclick = function () {
                window.focus();
                n.close();
            };
        }, i * 800); // stagger by 800ms
    });
}

