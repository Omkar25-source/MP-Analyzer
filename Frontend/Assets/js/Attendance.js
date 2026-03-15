/**
 * Attendance.js — StudySync Attendance Page
 * Uses Store for all state. No local arrays.
 */

document.addEventListener('DOMContentLoaded', function () {
    lucide.createIcons();
    Store.hydrateSidebar();
    initAttendanceApp();
});

let currentFilter = 'all';

function initAttendanceApp() {
    document.getElementById('attDate').valueAsDate = new Date();
    populateSubjectField();

    document.getElementById('attendanceForm').addEventListener('submit', handleNewAttendance);
    document.addEventListener('click', handleGlobalClicks);

    renderAttendance();
}

/* ─── Populate subject autocomplete from user profile ──────────── */
function populateSubjectField() {
    let list = document.getElementById('attSubjectDatalist');
    if (!list) {
        list = document.createElement('datalist');
        list.id = 'attSubjectDatalist';
        document.body.appendChild(list);
        const input = document.getElementById('attSubject');
        if (input) input.setAttribute('list', 'attSubjectDatalist');
    }
    const user     = Store.getUser();
    const subjects = user.subjects && user.subjects.length > 0
        ? user.subjects
        : ['Computer Science', 'Mathematics', 'Physics', 'General'];
    list.innerHTML = subjects.map(s => `<option value="${Store.escapeHtml(s)}">`).join('');
}

/* ─── Global delegation ────────────────────────────────────────── */
function handleGlobalClicks(e) {
    if (e.target.matches('.mobile-toggle-btn, .mobile-toggle-btn *')) {
        document.getElementById('sidebar').classList.toggle('show');
    }

    if (e.target.matches('.filter-link')) {
        e.preventDefault();
        currentFilter = e.target.dataset.filter;
        renderAttendance();
        const dropdown = e.target.closest('.dropdown');
        if (dropdown) {
            const inst = bootstrap.Dropdown.getInstance(dropdown.querySelector('[data-bs-toggle="dropdown"]'));
            if (inst) inst.hide();
        }
    }

    if (e.target.matches('.delete-record-btn, .delete-record-btn *')) {
        const row      = e.target.closest('tr');
        const recordId = parseInt(row ? row.dataset.recordId : 0);
        handleDeleteRecord(recordId);
    }

    if (e.target.matches('.status-option, .status-option *')) {
        const radio = e.target.closest('.status-option').querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

/* ─── CRUD ─────────────────────────────────────────────────────── */
function handleNewAttendance(e) {
    e.preventDefault();

    const subject = document.getElementById('attSubject').value.trim();
    const date    = document.getElementById('attDate').value;
    const status  = document.querySelector('input[name="attStatus"]:checked').value;

    Store.addAttendance({ id: Date.now(), subject, date, status });

    e.target.reset();
    document.getElementById('attDate').valueAsDate = new Date();
    document.getElementById('statusPresent').checked = true;
    populateSubjectField();
    bootstrap.Modal.getInstance(document.getElementById('logAttendanceModal')).hide();

    renderAttendance();
}

function handleDeleteRecord(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        Store.deleteAttendanceRecord(id);
        renderAttendance();
    }
}

/* ─── Render ───────────────────────────────────────────────────── */
function renderAttendance() {
    const tbody        = document.getElementById('attendanceTableBody');
    const emptyState   = document.getElementById('emptyStateContainer');
    const tableElement = document.querySelector('.table-custom');
    const records      = Store.getAttendance();

    // Stats (computed from ALL records, not just filtered)
    const total        = records.length;
    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentCount  = records.filter(r => r.status === 'absent').length;
    const percentage   = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    document.getElementById('statPercentage').textContent = `${percentage}%`;
    document.getElementById('statPresent').textContent    = presentCount;
    document.getElementById('statAbsent').textContent     = absentCount;

    // Alert badge across the app
    const unread      = Store.getAlerts().filter(a => !a.read).length;
    const alertBadge  = document.getElementById('alert-badge');
    if (alertBadge) {
        alertBadge.textContent   = unread;
        alertBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }

    // Filter
    let display = [...records];
    if (currentFilter === 'present') {
        display = display.filter(r => r.status === 'present' || r.status === 'late');
    } else if (currentFilter === 'absent') {
        display = display.filter(r => r.status === 'absent');
    }

    // Sort newest first
    display.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (display.length === 0) {
        emptyState.style.display   = 'block';
        tableElement.style.display = 'none';
        tbody.innerHTML            = '';
        return;
    }

    emptyState.style.display   = 'none';
    tableElement.style.display = 'table';

    let html = '';
    display.forEach(log => {
        const dateObj       = new Date(log.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        let badgeClass = '', statusText = '';
        if (log.status === 'present') { badgeClass = 'status-present'; statusText = 'Present'; }
        if (log.status === 'late')    { badgeClass = 'status-late';    statusText = 'Late';    }
        if (log.status === 'absent')  { badgeClass = 'status-absent';  statusText = 'Absent';  }

        html += `
        <tr data-record-id="${log.id}">
            <td class="fw-bold text-dark">
                <div class="d-flex align-items-center gap-2">
                    <i data-lucide="calendar" size="16" class="text-muted"></i>
                    ${formattedDate}
                </div>
            </td>
            <td class="fw-medium">${Store.escapeHtml(log.subject)}</td>
            <td><span class="status-badge ${badgeClass}">${statusText}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-light text-danger border-0 delete-record-btn" title="Delete Record">
                    <i data-lucide="trash-2" size="16"></i>
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    lucide.createIcons();
}
