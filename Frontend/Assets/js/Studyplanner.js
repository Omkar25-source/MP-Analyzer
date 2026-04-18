/**
 * Studyplanner.js — StudySync Study Planner Page
 * Uses Store for all state. No local arrays.
 * Note: HTML loads this file as "study-planner.js" — fix applied in HTML.
 */

document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    Store.hydrateSidebar();
    initPlannerApp();
});

function initPlannerApp() {
    document.getElementById('taskDate').valueAsDate = new Date();
    document.getElementById('taskPriority').value = 'medium';

    document.getElementById('plannerForm').addEventListener('submit', handleAddTask);
    document.addEventListener('change', handleGlobalChanges);
    document.addEventListener('click', handleGlobalClicks);

    // Populate subject field suggestions from user profile
    populateSubjectDatalist();
    renderTasks();
}

function populateSubjectDatalist() {
    // Build a datalist for subject autocomplete
    let list = document.getElementById('subjectDatalist');
    if (!list) {
        list = document.createElement('datalist');
        list.id = 'subjectDatalist';
        document.body.appendChild(list);
        const input = document.getElementById('taskSubject');
        if (input) input.setAttribute('list', 'subjectDatalist');
    }
    const user = Store.getUser();
    const subjects = user.subjects && user.subjects.length > 0
        ? user.subjects
        : ['Computer Science', 'Mathematics', 'Physics', 'General'];
    list.innerHTML = subjects.map(s => `<option value="${Store.escapeHtml(s)}">`).join('');
}

/* ─── Global delegation ────────────────────────────────────────── */
function handleGlobalClicks(e) {
    // Mobile sidebar
    if (e.target.matches('.mobile-toggle-btn, .mobile-toggle-btn *') ||
        e.target.matches('[onclick*="sidebar"], [onclick*="sidebar"] *')) {
        document.getElementById('sidebar').classList.toggle('show');
    }

    // Task delete
    if (e.target.matches('.task-delete') || e.target.closest('.task-delete')) {
        e.stopPropagation();
        const btn    = e.target.matches('.task-delete') ? e.target : e.target.closest('.task-delete');
        const taskId = parseInt(btn.dataset.taskDelete);
        handleDeleteTask(taskId);
    }
}

function handleGlobalChanges(e) {
    if (e.target.matches('.task-toggle')) {
        const taskId = parseInt(e.target.dataset.taskToggle);
        handleToggleTask(taskId);
    }
}

/* ─── CRUD ─────────────────────────────────────────────────────── */
function handleAddTask(e) {
    e.preventDefault();

    const name     = document.getElementById('taskName').value.trim();
    const subject  = document.getElementById('taskSubject').value.trim();
    const date     = document.getElementById('taskDate').value;
    const priority = document.getElementById('taskPriority').value;

    Store.addTask({ id: Date.now(), name, subject, date, priority, completed: false });

    this.reset();
    document.getElementById('taskDate').valueAsDate = new Date();
    document.getElementById('taskPriority').value   = 'medium';
    populateSubjectDatalist();
    renderTasks();
}

function handleToggleTask(id) {
    const tasks = Store.getTasks();
    const task  = tasks.find(t => t.id === id);
    if (task) {
        Store.updateTask(id, { completed: !task.completed });
        renderTasks();
    }
}

function handleDeleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        Store.deleteTask(id);
        renderTasks();
    }
}

/* ─── Render ───────────────────────────────────────────────────── */
function renderTasks() {
    const container = document.getElementById('tasksList');
    const counter   = document.getElementById('taskCount');
    const tasks     = Store.getTasks();

    const activeCount = tasks.filter(t => !t.completed).length;
    counter.textContent = `${activeCount} Active`;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="clipboard-list" size="48" class="mb-3 text-muted"></i>
                <h5>Your planner is empty!</h5>
                <p>Use the form on the left to add your first study task.</p>
            </div>`;
        renderIcons();
        return;
    }

    const sorted = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.date) - new Date(b.date);
    });

    const today = new Date().toISOString().split('T')[0];

    let html = '';
    sorted.forEach(task => {
        const badgeClass = task.priority === 'high'
            ? 'priority-high'
            : task.priority === 'low'
                ? 'priority-low'
                : 'priority-medium';

        // Overdue highlight (not completed and past due)
        const isOverdue  = !task.completed && task.date < today;
        const dateClass  = isOverdue ? 'text-danger fw-bold' : '';
        const overdueTag = isOverdue
            ? `<span class="priority-badge priority-high ms-1" style="font-size:0.65rem;">Overdue</span>`
            : '';

        html += `
        <div class="task-item p-3 d-flex justify-content-between align-items-sm-center flex-column flex-sm-row gap-3 ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="d-flex gap-3 align-items-start align-items-sm-center w-100">
                <input class="form-check-input mt-1 fs-5 task-toggle" type="checkbox" data-task-toggle="${task.id}" ${task.completed ? 'checked' : ''} style="cursor:pointer;">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <h6 class="mb-0 fw-bold task-title">${Store.escapeHtml(task.name)}</h6>
                        <span class="priority-badge ${badgeClass}">${task.priority.toUpperCase()}</span>
                        ${overdueTag}
                    </div>
                    <div class="d-flex align-items-center gap-3 text-muted small">
                        <span class="d-flex align-items-center gap-1"><i data-lucide="book" size="14"></i> ${Store.escapeHtml(task.subject)}</span>
                        <span class="d-flex align-items-center gap-1 ${dateClass}"><i data-lucide="calendar" size="14"></i> ${task.date}</span>
                    </div>
                </div>
            </div>
            <button class="btn btn-light text-danger border btn-sm task-delete" data-task-delete="${task.id}" title="Delete Task">
                <i data-lucide="trash-2" size="16"></i>
            </button>
        </div>`;
    });

    container.innerHTML = html;
    renderIcons();
}
