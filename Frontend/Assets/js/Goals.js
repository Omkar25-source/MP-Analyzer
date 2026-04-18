/**
 * Goals.js — StudySync Goals Page
 * Uses Store for all state. No local arrays.
 */

document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    Store.hydrateSidebar();
    initGoalsApp();
});

const categoryConfig = {
    'academics': { icon: 'book-open', class: 'icon-purple' },
    'skills'   : { icon: 'cpu',       class: 'icon-blue'   },
    'projects' : { icon: 'briefcase', class: 'icon-orange' },
};

function initGoalsApp() {
    // Default deadline: one month from today
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('goalDeadline').valueAsDate = nextMonth;

    document.getElementById('goalForm').addEventListener('submit', handleNewGoal);
    document.getElementById('updateProgressForm').addEventListener('submit', handleUpdateProgress);

    document.addEventListener('click', handleGlobalClicks);
    document.addEventListener('change', handleGlobalChanges);

    renderGoals();
}

/* ─── Global delegation ────────────────────────────────────────── */
function handleGlobalClicks(e) {
    // Mobile sidebar toggle
    if (e.target.matches('.mobile-toggle-btn, .mobile-toggle-btn *')) {
        document.getElementById('sidebar').classList.toggle('show');
    }

    // Progress adjust buttons in modal
    if (e.target.matches('.progress-adjust-btn')) {
        adjustProgress(parseInt(e.target.dataset.adjust));
    }

    // Goal update buttons (dynamically rendered)
    if (e.target.matches('.goal-update-btn, .goal-update-btn *')) {
        const goalCard  = e.target.closest('.goal-card');
        const goalId    = parseInt(goalCard.dataset.goalId);
        const goalTitle = goalCard.dataset.goalTitle;
        openUpdateModal(goalId, goalTitle);
    }

    // Goal delete buttons (dynamically rendered)
    if (e.target.matches('.goal-delete-btn, .goal-delete-btn *')) {
        const goalId = parseInt(e.target.closest('.dropdown-menu').dataset.goalId);
        handleDeleteGoal(goalId);
    }
}

function handleGlobalChanges(e) {
    // reserved for future use
}

/* ─── Create goal ──────────────────────────────────────────────── */
function handleNewGoal(e) {
    e.preventDefault();

    const title    = document.getElementById('goalTitle').value.trim();
    const category = document.getElementById('goalCategory').value;
    const deadline = document.getElementById('goalDeadline').value;
    const target   = parseFloat(document.getElementById('goalTarget').value);
    const config   = categoryConfig[category] || categoryConfig['academics'];

    Store.addGoal({
        id        : Date.now(),
        title,
        category,
        deadline,
        current   : 0,
        target,
        iconClass : config.class,
        iconName  : config.icon,
    });

    e.target.reset();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('goalDeadline').valueAsDate = nextMonth;
    bootstrap.Modal.getInstance(document.getElementById('newGoalModal')).hide();

    renderGoals();
}

/* ─── Update progress ──────────────────────────────────────────── */
function adjustProgress(amount) {
    const input = document.getElementById('updateAmount');
    let val = parseInt(input.value) || 0;
    val += amount;
    if (val < 1) val = 1;
    input.value = val;
}

function openUpdateModal(id, title) {
    document.getElementById('updateGoalId').value      = id;
    document.getElementById('updateGoalLabel').textContent = `Add units to: ${title}`;
    document.getElementById('updateAmount').value      = 1;
    new bootstrap.Modal(document.getElementById('updateProgressModal')).show();
}

function handleUpdateProgress(e) {
    e.preventDefault();
    const id     = parseInt(document.getElementById('updateGoalId').value);
    const amount = parseFloat(document.getElementById('updateAmount').value);

    const goals = Store.getGoals();
    const goal  = goals.find(g => g.id === id);
    if (goal) {
        const newCurrent = Math.min(goal.current + amount, goal.target);
        Store.updateGoal(id, { current: newCurrent });
        renderGoals();
    }

    bootstrap.Modal.getInstance(document.getElementById('updateProgressModal')).hide();
}

/* ─── Delete goal ──────────────────────────────────────────────── */
function handleDeleteGoal(id) {
    if (confirm('Delete this goal permanently?')) {
        Store.deleteGoal(id);
        renderGoals();
    }
}

/* ─── Render ───────────────────────────────────────────────────── */
function renderGoals() {
    const goals      = Store.getGoals();
    const grid       = document.getElementById('goalsGrid');
    const emptyState = document.getElementById('emptyStateContainer');

    // Stats
    const { active, completed, avgProgress } = Store.getGoalStats();
    document.getElementById('totalGoalsStat').textContent    = active;
    document.getElementById('completedGoalsStat').textContent = completed;
    document.getElementById('avgProgressStat').textContent    = `${avgProgress}%`;

    if (goals.length === 0) {
        emptyState.style.display = 'block';
        // Clear dynamically added cards, keep empty state
        const cards = grid.querySelectorAll('.col-lg-4');
        cards.forEach(c => c.remove());
        return;
    }

    emptyState.style.display = 'none';

    let html = '';
    goals.forEach(goal => {
        const percentage   = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const isCompleted  = percentage >= 100;
        const progressColor = isCompleted ? 'bg-success' : 'bg-primary';
        const dateObj      = new Date(goal.deadline);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Days remaining
        const today       = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDay = new Date(goal.deadline);
        deadlineDay.setHours(0, 0, 0, 0);
        const daysLeft    = Math.ceil((deadlineDay - today) / 86400000);
        const daysLabel   = isCompleted
            ? ''
            : daysLeft < 0
                ? `<span class="badge bg-danger ms-1" style="font-size:0.65rem;">Overdue</span>`
                : daysLeft === 0
                    ? `<span class="badge bg-warning text-dark ms-1" style="font-size:0.65rem;">Due Today</span>`
                    : `<span class="badge bg-light text-muted border ms-1" style="font-size:0.65rem;">${daysLeft}d left</span>`;

        html += `
        <div class="col-lg-4 col-md-6">
            <div class="custom-card d-flex flex-column goal-card" data-goal-id="${goal.id}" data-goal-title="${Store.escapeHtml(goal.title)}">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="goal-icon-box ${Store.escapeHtml(goal.iconClass)}">
                        <i data-lucide="${Store.escapeHtml(goal.iconName)}"></i>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light border-0" type="button" data-bs-toggle="dropdown">
                            <i data-lucide="more-horizontal" size="18"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" data-goal-id="${goal.id}">
                            <li><a class="dropdown-item goal-delete-btn text-danger" href="#"><i data-lucide="trash-2" size="14" class="me-2"></i>Delete</a></li>
                        </ul>
                    </div>
                </div>

                <h5 class="fw-bold mb-1">${Store.escapeHtml(goal.title)}</h5>
                <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                    <span class="badge bg-light text-dark border">${Store.escapeHtml(goal.category.toUpperCase())}</span>
                    <span class="text-muted small d-flex align-items-center gap-1">
                        <i data-lucide="calendar" size="12"></i> ${formattedDate}
                    </span>
                    ${daysLabel}
                </div>

                <div class="mt-auto">
                    <div class="d-flex justify-content-between align-items-end mb-1">
                        <span class="fs-3 fw-bold ${isCompleted ? 'text-success' : 'text-primary'}">${percentage}%</span>
                        <span class="goal-stat">${goal.current} / ${goal.target} units</span>
                    </div>
                    <div class="progress-thick">
                        <div class="progress-bar ${progressColor}" style="width: ${percentage}%"></div>
                    </div>

                    ${!isCompleted ? `
                    <button class="btn btn-light border w-100 update-btn mt-2 text-primary d-flex align-items-center justify-content-center gap-2 goal-update-btn">
                        <i data-lucide="trending-up" size="16"></i> Add Progress
                    </button>
                    ` : `
                    <button class="btn btn-success w-100 update-btn mt-2 d-flex align-items-center justify-content-center gap-2" disabled>
                        <i data-lucide="check-circle" size="16"></i> Completed!
                    </button>
                    `}
                </div>
            </div>
        </div>`;
    });

    // Replace only the dynamic cards (keep empty state element)
    grid.innerHTML = emptyState.outerHTML + html;
    // Restore emptyState display (outerHTML clone might differ)
    document.getElementById('emptyStateContainer').style.display = 'none';

    renderIcons();
}
