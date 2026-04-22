/**
 * pomodoro.js — StudySync Floating Pomodoro Timer (v2)
 *
 * Fixed:
 *  • Timer text now lives inside the SVG as a <text> element — no overlay/positioning glitch
 *  • Minimise works cleanly with a pill FAB (no circular hack)
 *  • Dragging is prevented when clicking controls
 *  • Dark mode aware
 */

(function () {
    'use strict';

    /* ── Config ─────────────────────────────────────────────────── */
    const WORK_MINS   = 25;
    const SHORT_BREAK = 5;
    const LONG_BREAK  = 15;
    const LONG_AFTER  = 4;

    // SVG ring geometry — r=54, cx=cy=64
    const CX   = 64;
    const CY   = 64;
    const R    = 54;
    const CIRC = +(2 * Math.PI * R).toFixed(2); // 339.29

    /* ── State ─────────────────────────────────────────────────── */
    let pomosCompleted = 0;
    let phase          = 'work';
    let totalSeconds   = WORK_MINS * 60;
    let remaining      = totalSeconds;
    let timerInterval  = null;
    let running        = false;
    let isOpen         = false;

    const STATE_KEY = 'ss_pomo_state';

    function saveState() {
        localStorage.setItem(STATE_KEY, JSON.stringify({
            phase, totalSeconds, remaining, pomosCompleted, running,
            savedAt: Date.now()
        }));
    }

    function restoreState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw);
            phase          = s.phase          || 'work';
            totalSeconds   = s.totalSeconds   || WORK_MINS * 60;
            pomosCompleted = s.pomosCompleted  || 0;
            // If it was running, subtract elapsed real seconds
            let adj = s.remaining || WORK_MINS * 60;
            if (s.running && s.savedAt) {
                const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
                adj = Math.max(0, adj - elapsed);
            }
            remaining = adj;
        } catch (_) { /* corrupt state — use defaults */ }
    }

    /* ── Inject CSS ─────────────────────────────────────────────── */
    function injectCSS() {
        const css = `
        /* ── Pomodoro Widget v2 ─────────────────────────────── */
        #pomo-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #6366f1, #818cf8);
            color: white;
            border: none;
            border-radius: 999px;
            padding: 10px 16px 10px 12px;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            font-size: 0.8rem;
            font-weight: 700;
            box-shadow: 0 4px 20px rgba(99,102,241,0.45);
            transition: transform 0.2s, box-shadow 0.2s;
            user-select: none;
            letter-spacing: 0.3px;
        }
        #pomo-fab:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 28px rgba(99,102,241,0.5);
        }
        #pomo-fab-timer {
            font-size: 1rem;
            font-weight: 800;
            letter-spacing: -0.5px;
            font-variant-numeric: tabular-nums;
        }
        #pomo-fab-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255,255,255,0.5);
            flex-shrink: 0;
            transition: background 0.3s;
        }
        #pomo-fab-dot.running { background: #4ade80; animation: pomo-pulse 1.2s ease-in-out infinite; }
        #pomo-fab-dot.break   { background: #34d399; }
        #pomo-fab i[data-lucide] { width: 16px; height: 16px; }
        @keyframes pomo-pulse {
            0%,100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.6; transform: scale(0.75); }
        }

        /* ── Widget panel ───────────────────────────────────── */
        #pomo-widget {
            position: fixed;
            bottom: 82px;
            right: 24px;
            z-index: 9998;
            width: 256px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 12px 40px -8px rgba(99,102,241,0.25),
                        0 4px 12px rgba(0,0,0,0.08);
            border: 1px solid #e0e7ff;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
            transform-origin: bottom right;
            transition: transform 0.25s cubic-bezier(0.16,1,0.3,1),
                        opacity  0.2s ease;
        }
        #pomo-widget.hidden {
            transform: scale(0.85) translateY(12px);
            opacity: 0;
            pointer-events: none;
        }

        /* Header */
        #pomo-header {
            background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
            padding: 12px 14px 10px;
            cursor: grab;
            user-select: none;
        }
        #pomo-header:active { cursor: grabbing; }
        #pomo-phase-label {
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.75);
            margin-bottom: 0;
        }
        .pomo-phase-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;
        }
        .pomo-phase-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
            opacity: 0.6;
            transition: all 0.3s;
        }
        .pomo-phase-dot.active { opacity: 1; transform: scale(1.4); }

        /* Body */
        #pomo-body { padding: 14px 14px 12px; }

        /* SVG ring — timer text is INSIDE the SVG, no overlay needed */
        #pomo-svg-wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 12px;
        }
        #pomo-timer-svg {
            overflow: visible;
        }
        #pomo-ring-track {
            fill: none;
            stroke: #e0e7ff;
            stroke-width: 7;
        }
        #pomo-ring-fill {
            fill: none;
            stroke: #6366f1;
            stroke-width: 7;
            stroke-linecap: round;
            stroke-dasharray: ${CIRC};
            stroke-dashoffset: 0;
            transition: stroke-dashoffset 1s linear, stroke 0.4s ease;
            transform: rotate(-90deg);
            transform-origin: ${CX}px ${CY}px;
        }
        #pomo-ring-fill.break { stroke: #10b981; }
        #pomo-timer-text {
            font-family: 'Inter', sans-serif;
            font-size: 28px;
            font-weight: 800;
            fill: #1e293b;
            text-anchor: middle;
            dominant-baseline: central;
            letter-spacing: -1px;
            font-variant-numeric: tabular-nums;
        }
        #pomo-phase-text {
            font-family: 'Inter', sans-serif;
            font-size: 9px;
            font-weight: 700;
            fill: #94a3b8;
            text-anchor: middle;
            dominant-baseline: central;
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }

        /* Subject input */
        #pomo-subject-wrap { margin-bottom: 10px; }
        #pomo-subject {
            width: 100%;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 0.78rem;
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            background: #f8fafc;
            box-sizing: border-box;
        }
        #pomo-subject:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
            background: #fff;
        }

        /* Controls */
        .pomo-controls {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 6px;
            margin-bottom: 8px;
        }
        #pomo-start-btn {
            background: linear-gradient(135deg, #6366f1, #818cf8);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 8px 14px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            transition: opacity 0.15s, transform 0.15s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        #pomo-start-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        #pomo-start-btn.paused {
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
        }
        #pomo-start-btn.break-mode {
            background: linear-gradient(135deg, #10b981, #34d399);
        }
        #pomo-reset-btn {
            background: #f1f5f9;
            color: #64748b;
            border: none;
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 1rem;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            transition: background 0.15s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        #pomo-reset-btn:hover { background: #e2e8f0; }
        #pomo-start-btn i[data-lucide],
        #pomo-reset-btn i[data-lucide] {
            width: 14px;
            height: 14px;
        }

        /* Footer row */
        #pomo-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        #pomo-count {
            font-size: 0.72rem;
            color: #94a3b8;
        }
        #pomo-count strong { color: #6366f1; }
        #pomo-toast {
            background: #d1fae5;
            color: #065f46;
            border-radius: 6px;
            padding: 3px 8px;
            font-size: 0.7rem;
            font-weight: 700;
            display: none;
            animation: pomo-fadein 0.2s ease;
        }
        @keyframes pomo-fadein { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform:none; } }

        /* ── Dark mode ─────────────────────────────────────── */
        body.dark-mode #pomo-widget {
            background: #1e293b;
            border-color: #334155;
            box-shadow: 0 12px 40px -8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
        }
        body.dark-mode #pomo-ring-track { stroke: #334155; }
        body.dark-mode #pomo-timer-text { fill: #f1f5f9; }
        body.dark-mode #pomo-phase-text { fill: #64748b; }
        body.dark-mode #pomo-subject {
            background: #0f172a;
            border-color: #475569;
            color: #e2e8f0;
        }
        body.dark-mode #pomo-subject:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
            background: #1e293b;
        }
        body.dark-mode #pomo-reset-btn { background: #334155; color: #94a3b8; }
        body.dark-mode #pomo-reset-btn:hover { background: #475569; }
        `;

        const el = document.createElement('style');
        el.id = 'pomo-styles';
        el.textContent = css;
        document.head.appendChild(el);
    }

    /* ── Build Widget DOM ───────────────────────────────────────── */
    function buildWidget() {
        restoreState();   // ← restore before building so display is correct
        injectCSS();

        // ── FAB (always-visible pill) ──────────────────────── //
        const fab = document.createElement('button');
        fab.id        = 'pomo-fab';
        fab.title     = 'Pomodoro Timer';
        fab.innerHTML = `
            <i data-lucide="timer-reset"></i>
            <span id="pomo-fab-timer">25:00</span>
            <span id="pomo-fab-dot"></span>
        `;
        document.body.appendChild(fab);

        // ── Widget panel ─────────────────────────────────── //
        const widget = document.createElement('div');
        widget.id = 'pomo-widget';
        widget.innerHTML = `
            <div id="pomo-header">
                <div id="pomo-phase-label">Focus Time</div>
                <div class="pomo-phase-indicator" id="pomo-dots">
                    <span class="pomo-phase-dot active" data-i="0"></span>
                    <span class="pomo-phase-dot" data-i="1"></span>
                    <span class="pomo-phase-dot" data-i="2"></span>
                    <span class="pomo-phase-dot" data-i="3"></span>
                </div>
            </div>
            <div id="pomo-body">
                <div id="pomo-svg-wrap">
                    <svg id="pomo-timer-svg" width="128" height="128" viewBox="0 0 128 128">
                        <circle id="pomo-ring-track" cx="${CX}" cy="${CY}" r="${R}"/>
                        <circle id="pomo-ring-fill"  cx="${CX}" cy="${CY}" r="${R}"/>
                        <text id="pomo-timer-text" x="${CX}" y="${CY - 6}">25:00</text>
                        <text id="pomo-phase-text" x="${CX}" y="${CY + 20}">FOCUS</text>
                    </svg>
                </div>

                <div id="pomo-subject-wrap">
                    <input id="pomo-subject" type="text" placeholder="Subject (auto-logged)">
                </div>

                <div class="pomo-controls">
                    <button id="pomo-start-btn"><i data-lucide="play"></i><span>Start</span></button>
                    <button id="pomo-reset-btn" title="Reset"><i data-lucide="rotate-ccw"></i></button>
                </div>

                <div id="pomo-footer">
                    <div id="pomo-count">Sessions: <strong id="pomo-num">0</strong></div>
                    <div id="pomo-toast">✅ Logged!</div>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Wire up FAB toggle
        fab.addEventListener('click', function (e) {
            if (fab._wasDragged) { fab._wasDragged = false; return; }
            togglePanel();
        });

        // Widget controls
        widget.querySelector('#pomo-start-btn').addEventListener('click', toggleTimer);
        widget.querySelector('#pomo-reset-btn').addEventListener('click', resetTimer);

        // Close panel when user clicks outside.
        document.addEventListener('click', function (e) {
            if (!isOpen) return;
            const inWidget = widget.contains(e.target);
            const inFab = fab.contains(e.target);
            if (!inWidget && !inFab) {
                togglePanel(false);
            }
        });

        // Escape key closes panel.
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen) {
                togglePanel(false);
            }
        });

        // Drag FAB
        makeDraggable(fab, fab);

        // Populate subject suggestions
        populateSubjectInput(widget.querySelector('#pomo-subject'));

        // Restore session count display
        document.getElementById('pomo-num').textContent = pomosCompleted;

        // Initial display
        updateDisplay();
        if (typeof window.renderIcons === 'function') window.renderIcons();

        // Auto-resume if timer was running when user navigated away
        const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
        if (saved && saved.running && remaining > 0) {
            startTimer();
        }

        // Start hidden (panel closed, FAB visible)
        widget.classList.add('hidden');
        isOpen = false;
    }

    /* ── Toggle panel open/closed ──────────────────────────────── */
    function togglePanel(forceState = null) {
        isOpen = forceState === null ? !isOpen : !!forceState;
        document.getElementById('pomo-widget').classList.toggle('hidden', !isOpen);
    }

    /* ── Subject datalist ──────────────────────────────────────── */
    function populateSubjectInput(input) {
        if (typeof Store === 'undefined') return;
        try {
            const user     = Store.getUser();
            const subjects = (user.subjects && user.subjects.length > 0)
                ? user.subjects
                : ['General'];

            const dl = document.createElement('datalist');
            dl.id    = 'pomo-subject-list';
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                dl.appendChild(opt);
            });
            document.body.appendChild(dl);
            input.setAttribute('list', 'pomo-subject-list');
            input.value = subjects[0] || '';
        } catch (_) {}
    }

    /* ── Timer ─────────────────────────────────────────────────── */
    function toggleTimer() {
        running ? pauseTimer() : startTimer();
    }

    function startTimer() {
        if (timerInterval) return;
        running = true;
        saveState();
        timerInterval = setInterval(tick, 1000);
        updateButtons();
    }

    function pauseTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        running = false;
        saveState();
        updateButtons();
    }

    function resetTimer() {
        pauseTimer();
        phase          = 'work';
        remaining      = WORK_MINS * 60;
        totalSeconds   = remaining;
        pomosCompleted = 0;
        localStorage.removeItem(STATE_KEY);
        document.getElementById('pomo-num').textContent = 0;
        updateDisplay();
        updateButtons();
    }

    function tick() {
        remaining--;
        saveState();
        if (remaining <= 0) {
            phaseComplete();
        } else {
            updateDisplay();
        }
    }

    function phaseComplete() {
        clearInterval(timerInterval);
        timerInterval = null;
        running = false;
        playBeep();

        if (phase === 'work') {
            pomosCompleted++;
            document.getElementById('pomo-num').textContent = pomosCompleted;
            autoLog();
            phase     = (pomosCompleted % LONG_AFTER === 0) ? 'long' : 'short';
            remaining = (phase === 'long') ? LONG_BREAK * 60 : SHORT_BREAK * 60;
        } else {
            phase     = 'work';
            remaining = WORK_MINS * 60;
        }

        totalSeconds = remaining;
        saveState();
        updateDisplay();
        startTimer(); // auto-advance
    }

    /* ── Auto-log ──────────────────────────────────────────────── */
    async function autoLog() {
        if (typeof Api === 'undefined') return;
        try {
            const subjectEl   = document.getElementById('pomo-subject');
            const subjectName = (subjectEl && subjectEl.value.trim()) || 'General';
            const date        = new Date().toISOString().split('T')[0];

            // Resolve or create the subject on the backend
            const subjects = await Api.getSubjects().catch(() => []);
            let match = subjects.find(s => s.name === subjectName);
            if (!match) {
                match = await Api.createSubject(subjectName).catch(() => null);
            }
            if (!match) return; // can't log without a valid subject

            await Api.logStudySession(match.id, WORK_MINS, date, 'pomodoro');
            showToast();
        } catch (_) { /* silent — timer should never break on log failure */ }
    }

    function showToast() {
        const t = document.getElementById('pomo-toast');
        if (!t) return;
        t.style.display = 'block';
        setTimeout(() => { t.style.display = 'none'; }, 2500);
    }

    /* ── Update display ────────────────────────────────────────── */
    function updateDisplay() {
        const m   = String(Math.floor(remaining / 60)).padStart(2, '0');
        const s   = String(remaining % 60).padStart(2, '0');
        const str = `${m}:${s}`;

        // SVG text elements (no positioning glitches)
        const timerText = document.getElementById('pomo-timer-text');
        const phaseText = document.getElementById('pomo-phase-text');
        const fill      = document.getElementById('pomo-ring-fill');
        const phaseLabel = document.getElementById('pomo-phase-label');
        const fabTimer  = document.getElementById('pomo-fab-timer');

        if (timerText) timerText.textContent = str;
        if (fabTimer)  fabTimer.textContent  = str;

        const isWork  = phase === 'work';
        const isBreak = !isWork;
        const label   = isWork ? 'FOCUS' : phase === 'long' ? 'LONG BREAK' : 'BREAK';
        const fullLabel = isWork ? 'Focus Time' : phase === 'long' ? 'Long Break' : 'Short Break';

        if (phaseText)  phaseText.textContent  = label;
        if (phaseLabel) phaseLabel.textContent  = fullLabel;
        if (fill)       fill.className          = isBreak ? 'break' : '';

        // Ring progress
        if (fill) {
            const frac = totalSeconds > 0 ? remaining / totalSeconds : 1;
            fill.style.strokeDashoffset = CIRC * (1 - frac);
        }

        // FAB dot
        const dot = document.getElementById('pomo-fab-dot');
        if (dot) {
            dot.className = running ? (isWork ? 'running' : 'break') : '';
        }

        // Dots in header (show which pomodoro in the cycle we're on)
        const pos     = pomosCompleted % LONG_AFTER;
        const dotEls  = document.querySelectorAll('.pomo-phase-dot');
        dotEls.forEach(d => {
            d.classList.toggle('active', parseInt(d.dataset.i) < (isWork ? pos : pos + 1));
        });
    }

    /* ── Update start/reset buttons ────────────────────────────── */
    function updateButtons() {
        const btn = document.getElementById('pomo-start-btn');
        if (!btn) return;
        const isBreak = phase !== 'work';
        if (running) {
            btn.innerHTML = '<i data-lucide="pause"></i><span>Pause</span>';
            btn.className   = isBreak ? 'break-mode' : '';
        } else {
            const resumed = remaining < totalSeconds;
            btn.innerHTML = resumed
                ? '<i data-lucide="play"></i><span>Resume</span>'
                : '<i data-lucide="play"></i><span>Start</span>';
            btn.className   = '';
        }

        if (typeof window.renderIcons === 'function') window.renderIcons();
    }

    /* ── Beep ──────────────────────────────────────────────────── */
    function playBeep() {
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.7);
        } catch (_) {}
    }

    /* ── Draggable FAB ─────────────────────────────────────────── */
    function makeDraggable(el, handle) {
        let sx, sy, il, it, dragging = false;

        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            dragging      = true;
            el._wasDragged = false;
            sx = e.clientX; sy = e.clientY;
            const r = el.getBoundingClientRect();
            il = r.left; it = r.top;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            const dx = e.clientX - sx;
            const dy = e.clientY - sy;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) el._wasDragged = true;
            el.style.right  = 'auto';
            el.style.bottom = 'auto';
            el.style.left   = `${Math.max(0, il + dx)}px`;
            el.style.top    = `${Math.max(0, it  + dy)}px`;
        });

        document.addEventListener('mouseup', function () {
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    /* ── Init ──────────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
        buildWidget();
    }

})();
