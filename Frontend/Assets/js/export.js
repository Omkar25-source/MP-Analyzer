/**
 * export.js — StudySync Data Export Utilities
 * Provides CSV download and formatted PDF export.
 * No external dependencies for CSV; uses jsPDF (CDN) for PDF.
 *
 * Usage (add script tag after store.js):
 *   <script src="../../Assets/js/export.js"></script>
 */

(function () {
    'use strict';

    /* ── CSV ─────────────────────────────────────────────────────── */

    /**
     * Convert an array of objects to CSV string and trigger download.
     * @param {string[]} headers  Column headers
     * @param {string[][]} rows   Array of row arrays
     * @param {string} filename   Download filename (with .csv)
     */
    function downloadCSV(headers, rows, filename) {
        const escape = v => {
            const s = String(v == null ? '' : v);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const lines = [
            headers.map(escape).join(','),
            ...rows.map(row => row.map(escape).join(',')),
        ];
        const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ── Study Logs CSV ──────────────────────────────────────────── */
    async function exportStudyLogsCSV() {
        let sessions = [];
        try {
            sessions = await Api.getDailySessions();
        } catch (e) {
            alert('Could not fetch study sessions from server.');
            return;
        }
        if (sessions.length === 0) { alert('No study sessions to export yet.'); return; }

        const headers = ['Date', 'Subject', 'Duration (min)', 'Notes'];
        const rows    = sessions
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(s => [s.date, s.subjectName, s.durationMinutes, s.notes || '']);

        downloadCSV(headers, rows, `StudySync_StudyLogs_${today()}.csv`);
    }

    /* ── Attendance CSV ──────────────────────────────────────────── */
    function exportAttendanceCSV() {
        const records = Store.getAttendance();
        if (records.length === 0) { alert('No attendance records to export yet.'); return; }

        const headers = ['Date', 'Subject', 'Status'];
        const rows    = records
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(r => [r.date, r.subject, r.status]);

        downloadCSV(headers, rows, `StudySync_Attendance_${today()}.csv`);
    }

    /* ── Goals CSV ───────────────────────────────────────────────── */
    function exportGoalsCSV() {
        const goals = Store.getGoals();
        if (goals.length === 0) { alert('No goals to export yet.'); return; }

        const headers = ['Title', 'Category', 'Deadline', 'Current', 'Target', 'Progress %', 'Completed'];
        const rows    = goals.map(g => [
            g.title,
            g.category,
            g.deadline,
            g.current,
            g.target,
            Math.round((g.current / g.target) * 100),
            g.current >= g.target ? 'Yes' : 'No',
        ]);

        downloadCSV(headers, rows, `StudySync_Goals_${today()}.csv`);
    }

    /* ── Tasks CSV ───────────────────────────────────────────────── */
    function exportTasksCSV() {
        const tasks = Store.getTasks();
        if (tasks.length === 0) { alert('No tasks to export yet.'); return; }

        const headers = ['Task Name', 'Subject', 'Due Date', 'Priority', 'Completed'];
        const rows    = tasks.map(t => [t.name, t.subject, t.date, t.priority, t.completed ? 'Yes' : 'No']);

        downloadCSV(headers, rows, `StudySync_Tasks_${today()}.csv`);
    }

    /* ── Full Report PDF (via jsPDF) ─────────────────────────────── */
    function exportFullReportPDF() {
        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            // Dynamically load jsPDF if not available
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = () => _generatePDF();
            document.head.appendChild(s);
        } else {
            _generatePDF();
        }
    }

    async function _generatePDF() {
        const jsPDF  = window.jspdf?.jsPDF || window.jsPDF;
        const doc    = new jsPDF();
        const user   = Store.getUser();
        const att    = Store.getAttendance();
        const goals  = Store.getGoals();
        const attPct = Store.calculateAttendancePercent();

        // Fetch study stats from backend
        let streak = 0, todayMinutes = 0, weekMinutes = 0, breakdown = [];
        try {
            const stats = await Api.getDashboardStats();
            streak       = stats.streak || 0;
            todayMinutes = stats.todayMinutes || 0;
            weekMinutes  = stats.weekMinutes  || 0;
            breakdown    = stats.subjectBreakdown || [];
        } catch (e) { /* proceed with zeros */ }

        const todayH = (todayMinutes / 60).toFixed(1);
        const perf   = attPct;  // attendance-based performance

        let y = 20;
        const LINE = 8;
        const accent = [99, 102, 241]; // indigo

        // Header
        doc.setFillColor(...accent);
        doc.rect(0, 0, 210, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('StudySync — Performance Report', 14, 10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'long', day:'numeric' })}`, 210 - 14, 10, { align:'right' });

        y = 24;
        doc.setTextColor(30, 41, 59);

        // User info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student: ${user.name}`, 14, y); y += LINE;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Branch: ${user.branch}  |  Semester: ${user.semester}  |  Daily Target: ${user.targetHours}h`, 14, y); y += LINE * 1.5;

        // Section: Key Stats
        _sectionHeader(doc, 'Key Statistics', y, accent); y += LINE;
        const stats = [
            ['Performance Score', `${perf}%`],
            ['Overall Attendance', `${attPct}%`],
            ['Study Streak', `${streak} day${streak !== 1 ? 's' : ''}`],
            ["Today's Study Hours", `${todayH}h`],
            ['Total Study Sessions', logs.length],
            ['Total Goals Created', goals.length],
            ['Goals Completed', goals.filter(g => g.current >= g.target).length],
        ];
        stats.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(label, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 80, y);
            y += LINE;
        });

        y += 4;
        _sectionHeader(doc, 'Recent Study Logs (last 10)', y, accent); y += LINE;

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Date', 14, y); doc.text('Subject', 50, y); doc.text('Hours', 100, y); y += 6;
        doc.setTextColor(30, 41, 59);

        const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        recentLogs.forEach(l => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(l.date, 14, y);
            doc.text(l.subject.substring(0, 28), 50, y);
            doc.text(`${l.hours}h`, 100, y);
            y += LINE - 1;
        });

        y += 4;
        if (y > 240) { doc.addPage(); y = 20; }
        _sectionHeader(doc, 'Goals Summary', y, accent); y += LINE;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Title', 14, y); doc.text('Progress', 100, y); doc.text('Deadline', 150, y); y += 6;
        doc.setTextColor(30, 41, 59);

        goals.slice(0, 10).forEach(g => {
            if (y > 270) { doc.addPage(); y = 20; }
            const pct = Math.round((g.current / g.target) * 100);
            doc.text(g.title.substring(0, 42), 14, y);
            doc.text(`${pct}%`, 100, y);
            doc.text(g.deadline || '—', 150, y);
            y += LINE - 1;
        });

        // Footer on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`StudySync Report — Page ${p} of ${totalPages}`, 105, 292, { align: 'center' });
        }

        doc.save(`StudySync_Report_${today()}.pdf`);
    }

    function _sectionHeader(doc, text, y, color) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(text, 14, y);
        doc.setDrawColor(...color);
        doc.line(14, y + 1, 196, y + 1);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
    }

    function today() {
        return new Date().toISOString().split('T')[0];
    }

    /* ── Export global namespace ─────────────────────────────────── */
    window.Exporter = {
        studyLogsCSV  : exportStudyLogsCSV,
        attendanceCSV : exportAttendanceCSV,
        goalsCSV      : exportGoalsCSV,
        tasksCSV      : exportTasksCSV,
        fullReportPDF : exportFullReportPDF,
    };

})();
