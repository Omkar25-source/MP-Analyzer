/**
 * Attendance.js — StudySync Attendance Page
 * Talks to backend via Api helper (JWT injected automatically).
 * Falls back to Store (localStorage) if no JWT is present.
 */

document.addEventListener('DOMContentLoaded', async function () {
    renderIcons();
    Store.hydrateSidebar();
    // Slight delay so api.js DOMContentLoaded guard (auth check) runs first
    await new Promise(r => setTimeout(r, 0));
    await initAttendanceApp();
});

const useBackend = () => !!Api.getToken();

let subjects      = [];   // [{ id, name }]
let allRecords    = [];   // [{ id, date, status, subjectId, subjectName }]
let currentFilter = 'all';

async function initAttendanceApp() {
    document.getElementById('attDate').valueAsDate = new Date();

    if (useBackend()) {
        await loadSubjects();
        await loadAttendance();
    } else {
        loadSubjectsFromStore();
        loadAttendanceFromStore();
    }

    renderSubjectTabs();
    renderSubjectDropdown();   // ← was missing — populates the mark-attendance dropdown
    renderAttendance();

    document.getElementById('attendanceForm').addEventListener('submit', handleNewAttendance);
    document.getElementById('addSubjectForm').addEventListener('submit', handleAddSubject);
    document.addEventListener('click', handleGlobalClicks);
}

/* ─── Subject Management ────────────────────────────────────────── */

async function loadSubjects() {
    try {
        subjects = await Api.getSubjects();   // [{ id, name }]
    } catch (e) {
        subjects = [];
    }
}

function loadSubjectsFromStore() {
    const user = Store.getUser();
    const names = user.subjects && user.subjects.length > 0
        ? user.subjects
        : ['Computer Science', 'Mathematics', 'Physics', 'General'];
    subjects = names.map((n, i) => ({ id: i + 1, name: n }));
}

async function handleAddSubject(e) {
    e.preventDefault();
    const input = document.getElementById('newSubjectName');
    const name  = input.value.trim();
    if (!name) return;

    if (useBackend()) {
        try {
            const created = await Api.createSubject(name);
            subjects.push(created);
            input.value = '';
            renderSubjectTabs();
            renderSubjectDropdown();
            showToast(`Subject "${created.name}" added`);
        } catch (err) {
            showToast(err.message || 'Failed to add subject', true);
        }
    } else {
        if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
            showToast('Subject already exists', true); return;
        }
        const fake = { id: Date.now(), name };
        subjects.push(fake);
        const user = Store.getUser();
        Store.saveUser({ ...user, subjects: subjects.map(s => s.name) });
        input.value = '';
        renderSubjectTabs();
        renderSubjectDropdown();
    }
}

/** Render tabs — one pill per subject + All */
function renderSubjectTabs() {
    const container = document.getElementById('subjectTabs');
    if (!container) return;

    let html = `<button class="subject-tab ${currentFilter === 'all' ? 'active' : ''}"
                        data-filter="all">All</button>`;
    subjects.forEach(s => {
        html += `<button class="subject-tab ${currentFilter == s.id ? 'active' : ''}"
                         data-filter="${s.id}">${Store.escapeHtml(s.name)}</button>`;
    });
    container.innerHTML = html;
}

/** Populate the select dropdown inside the modal */
function renderSubjectDropdown() {
    const select = document.getElementById('attSubjectSelect');
    if (!select) return;
    if (subjects.length === 0) {
        select.innerHTML = '<option value="">— Add a subject first —</option>';
        return;
    }
    select.innerHTML = subjects
        .map(s => `<option value="${s.id}">${Store.escapeHtml(s.name)}</option>`)
        .join('');
}

/* ─── Attendance CRUD ───────────────────────────────────────────── */

async function loadAttendance(subjectId = null) {
    try {
        allRecords = await Api.getAttendance(subjectId);
    } catch (e) {
        allRecords = [];
    }
}

function loadAttendanceFromStore() {
    const raw = Store.getAttendance();
    allRecords = raw.map(r => ({
        id          : r.id,
        date        : r.date,
        status      : (r.status || 'present').toUpperCase(),
        subjectId   : r.subject ? subjects.findIndex(s => s.name === r.subject) + 1 : 1,
        subjectName : r.subject || 'General',
    }));
}

async function handleNewAttendance(e) {
    e.preventDefault();

    const subjectId = parseInt(document.getElementById('attSubjectSelect').value);
    const date      = document.getElementById('attDate').value;
    const status    = document.querySelector('input[name="attStatus"]:checked').value.toUpperCase();

    if (!subjectId || !date) return;

    if (useBackend()) {
        try {
            const record = await Api.markAttendance(subjectId, date, status);
            allRecords.push(record);
        } catch (err) {
            showToast(err.message || 'Failed to save attendance', true);
            return;
        }
    } else {
        const subj = subjects.find(s => s.id === subjectId);
        Store.addAttendance({ id: Date.now(), subject: subj?.name || '', date, status: status.toLowerCase() });
        loadAttendanceFromStore();
    }

    e.target.reset();
    document.getElementById('attDate').valueAsDate = new Date();
    document.getElementById('statusPresent').checked = true;
    bootstrap.Modal.getInstance(document.getElementById('logAttendanceModal')).hide();
    renderAttendance();
    showToast('Attendance saved!');
}

/* ─── Render table ──────────────────────────────────────────────── */

function renderAttendance() {
    renderSubjectDropdown();

    let display = [...allRecords];

    // Subject filter
    if (currentFilter !== 'all') {
        display = display.filter(r => r.subjectId == currentFilter);
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilterVal')?.value || 'all';
    if (statusFilter === 'present') display = display.filter(r => r.status !== 'ABSENT');
    if (statusFilter === 'absent')  display = display.filter(r => r.status === 'ABSENT');

    display.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total   = allRecords.length;
    const present = allRecords.filter(r => r.status !== 'ABSENT').length;
    const absent  = allRecords.filter(r => r.status === 'ABSENT').length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

    document.getElementById('statPercentage').textContent = `${pct}%`;
    document.getElementById('statPresent').textContent    = present;
    document.getElementById('statAbsent').textContent     = absent;

    const unread     = Store.getAlerts().filter(a => !a.read).length;
    const alertBadge = document.getElementById('alert-badge');
    if (alertBadge) {
        alertBadge.textContent   = unread;
        alertBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }

    const tbody      = document.getElementById('attendanceTableBody');
    const emptyState = document.getElementById('emptyStateContainer');
    const table      = document.querySelector('.table-custom');

    if (display.length === 0) {
        emptyState.style.display = 'block';
        table.style.display      = 'none';
        tbody.innerHTML          = '';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display      = 'table';

    tbody.innerHTML = display.map(r => {
        const fmtDate = new Date(r.date).toLocaleDateString('en-US',
            { weekday: 'short', month: 'short', day: 'numeric' });
        const badge = r.status === 'PRESENT' ? 'status-present'
                    : r.status === 'LATE'    ? 'status-late'
                    :                          'status-absent';
        const label = r.status.charAt(0) + r.status.slice(1).toLowerCase();

        return `
        <tr data-record-id="${r.id}">
            <td class="fw-bold text-dark">
                <div class="d-flex align-items-center gap-2">
                    <i data-lucide="calendar" size="16" class="text-muted"></i>
                    ${fmtDate}
                </div>
            </td>
            <td class="fw-medium">${Store.escapeHtml(r.subjectName)}</td>
            <td><span class="status-badge ${badge}">${label}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-light text-danger border-0 delete-record-btn" title="Delete">
                    <i data-lucide="trash-2" size="16"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    renderIcons();
}

/* ─── Global click delegation ───────────────────────────────────── */

function handleGlobalClicks(e) {
    // Sidebar toggle
    if (e.target.matches('.mobile-toggle-btn, .mobile-toggle-btn *')) {
        document.getElementById('sidebar').classList.toggle('show');
    }

    // Subject tab switch
    if (e.target.matches('.subject-tab')) {
        currentFilter = e.target.dataset.filter;
        document.querySelectorAll('.subject-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderAttendance();
    }

    // Status filter dropdown
    if (e.target.matches('.filter-link')) {
        e.preventDefault();
        const hiddenInput = document.getElementById('statusFilterVal');
        if (hiddenInput) hiddenInput.value = e.target.dataset.filter;
        renderAttendance();
    }

    // Delete
    if (e.target.matches('.delete-record-btn, .delete-record-btn *')) {
        const row = e.target.closest('tr');
        const id  = parseInt(row?.dataset.recordId);
        if (!isNaN(id) && confirm('Delete this record?')) {
            if (useBackend()) {
                Api.deleteAttendance(id)
                    .then(() => {
                        allRecords = allRecords.filter(r => r.id !== id);
                        renderAttendance();
                        showToast('Attendance deleted');
                    })
                    .catch(err => {
                        showToast(err.message || 'Failed to delete attendance', true);
                    });
                return;
            } else {
                Store.deleteAttendanceRecord(id);
                loadAttendanceFromStore();
            }
            renderAttendance();
        }
    }

    // Status option pill click
    if (e.target.matches('.status-option, .status-option *')) {
        const radio = e.target.closest('.status-option').querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

/* ─── Toast ─────────────────────────────────────────────────────── */

function showToast(msg, isError = false) {
    let t = document.getElementById('att-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'att-toast';
        t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;
            padding:.7rem 1.4rem;border-radius:12px;font-weight:600;
            font-size:.88rem;z-index:9999;transition:opacity .3s;opacity:0;color:#fff`;
        document.body.appendChild(t);
    }
    t.textContent      = msg;
    t.style.background = isError ? '#ef4444' : '#10b981';
    t.style.opacity    = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2800);
}
