# StudySync 📚
### Student Productivity & Performance Analytics System

> A feature-complete, **frontend-only** student productivity dashboard built with **Vanilla HTML, CSS, and JavaScript**.  
> No framework, no build tools — just open `index.html` and go.

---

## ✨ Features at a Glance

| Feature | Description |
|---|---|
| 🧭 **Dashboard** | At-a-glance view of study hours, streak, attendance & performance score |
| 📝 **Study Planner** | Task management with priorities, due dates, and overdue detection |
| 🎯 **Goals Tracker** | Set measurable goals with progress tracking and deadlines |
| 📅 **Attendance Hub** | Log class attendance per subject with live statistics |
| 🔔 **Alerts & Reminders** | Custom reminders with browser push notification support |
| 📋 **Weekly Review** | Reflect on each week — mood, notes, auto-generated insights |
| 📊 **Analytics** | 30-day study trends, subject balance, attendance breakdowns, weekly comparison |
| 🏆 **Achievements** | 21 badges earned automatically from your study activity |
| 🍅 **Pomodoro Timer** | Floating 25/5/15-min timer that auto-logs sessions to the dashboard |
| 🌙 **Dark Mode** | Full dark theme, toggled from the sidebar, persisted across sessions |
| 📥 **Data Export** | Download study logs, attendance, goals, and tasks as CSV; full PDF report |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Page structure & semantic markup |
| **CSS3** (Vanilla) | Styling, animations, dark mode |
| **JavaScript** (ES6+, Vanilla) | All logic, state management, interactivity |
| **Bootstrap 5** | Responsive grid, modals, dropdowns |
| **Chart.js** | Line, bar, doughnut, and radar charts |
| **Lucide Icons** | SVG icon set |
| **localStorage API** | 100% client-side data persistence |
| **Web Notifications API** | Browser push notifications for reminders |
| **Web Audio API** | Pomodoro phase-change beep |
| **jsPDF** (CDN, lazy-loaded) | PDF report generation |

---

## 📁 Project Structure

```
StudySync/
├── index.html                          # Login page (entry point)
├── README.md
│
├── Frontend/
│   ├── Assets/
│   │   ├── css/
│   │   │   └── style.css               # Global styles + dark mode
│   │   └── js/
│   │       ├── store.js                # 🔑 Central localStorage data layer
│   │       ├── Dashboard.js            # Dashboard logic & charts
│   │       ├── Goals.js                # Goals CRUD & progress
│   │       ├── Studyplanner.js         # Task management
│   │       ├── Alerts.js               # Reminders & push notifications
│   │       ├── Attendance.js           # Attendance tracking
│   │       ├── theme.js                # Dark mode manager (injected globally)
│   │       ├── pomodoro.js             # Floating Pomodoro timer widget
│   │       └── export.js               # CSV & PDF export utilities
│   │
│   └── Pages/
│       ├── Profile-setup/
│       │   └── profile-setup.html      # First-run onboarding
│       ├── Dashboard/
│       │   └── Dashboard.html
│       ├── Study-Planner/
│       │   └── Study-Planner.html
│       ├── Goals/
│       │   └── Goals.html
│       ├── attendance/
│       │   └── attendance.html
│       ├── Alerts/
│       │   └── Alerts.html
│       ├── Weekly reviews/
│       │   └── weekly-review.html
│       ├── Analytics/
│       │   └── analytics.html
│       └── Achievements/
│           └── achievements.html
│
└── Backend/                            # (empty — planned for Phase 2)
```

---

## 🚀 Getting Started

### Option 1 — Open directly (simplest)
1. Clone or download the repository
2. Open `index.html` in any modern browser
3. No server, no `npm install`, no build step required

```bash
# Clone
git clone https://github.com/your-username/StudySync.git

# Open
cd StudySync
# Then double-click index.html, or:
start index.html          # Windows
open index.html           # macOS
xdg-open index.html       # Linux
```

### Option 2 — Live Server (recommended for development)
If you use VS Code, install the **Live Server** extension and click **"Go Live"** on `index.html`.  
This avoids any browser caching quirks and gives you hot-reload.

### First Run Flow
```
index.html (Login)
    ↓  (no profile saved yet)
profile-setup.html  →  fill in Name, Branch, Semester, Subjects
    ↓  (on submit)
Dashboard.html  →  start using the app
```

> On subsequent logins the app detects your saved profile and goes straight to the Dashboard.

---

## 🏗️ Architecture

### Data Layer — `store.js`
All data lives in **`localStorage`** under namespaced keys:

| Key | Contents |
|---|---|
| `ss_user` | Profile (name, branch, semester, subjects, study target) |
| `ss_study_logs` | Array of study session logs |
| `ss_tasks` | Study Planner tasks |
| `ss_goals` | Goal objects with progress |
| `ss_attendance` | Attendance records |
| `ss_alerts` | Alerts & reminders |
| `ss_theme` | `'light'` \| `'dark'` |
| `ss_weekly_reviews` | Saved weekly reflections |

`store.js` exposes a global `window.Store` object with typed getters/setters for every model, plus analytics helpers:

```js
Store.getUser()                    // current user profile
Store.saveUser(user)
Store.addStudyLog(log)             // adds and persists
Store.getTasks()                   // returns array
Store.calculateStreak()            // consecutive days algorithm
Store.calculateAttendancePercent() // present / total
Store.calculatePerformanceScore()  // weighted composite score
Store.hydrateSidebar()             // syncs sidebar user info on every page
Store.escapeHtml(str)              // XSS-safe rendering helper
```

### Theme — `theme.js`
Injected on every page. Reads `ss_theme`, applies `body.dark-mode`, and programmatically appends a 🌙/☀️ toggle button to `.sidebar-footer` on whichever page it runs.

### Pomodoro — `pomodoro.js`
Self-contained IIFE. Injects its own CSS and DOM. A persistent **pill FAB** shows the live countdown at all times; clicking it opens/closes the timer panel. On work-session complete, it calls `Store.addStudyLog()` — the session appears on the Dashboard immediately.

---

## 📊 Analytics

The Analytics page computes everything from your **existing Store data** — no extra logging required:

- **Study trend chart** — daily hours over 7 / 30 / 90 days toggle
- **Subject focus** — doughnut breakdown of time per subject
- **Attendance by subject** — horizontal bar % per subject (color-coded: ≥90% green, ≥75% indigo, ≥60% amber, <60% red)
- **Weekly comparison** — last 8 weeks total hours bar chart
- **Goals progress** — per-goal color-coded progress bars
- **Top subjects** — all-time hours leaderboard

---

## 🏆 Achievement Badges (21 total)

Badges are computed live from Store data — nothing to configure.

| Category | Badges |
|---|---|
| 📚 Study | First Step, Early Bird, Dedicated (50h), Century Club (100h), Subject Explorer, Pomodoro Starter, Pomodoro Pro |
| 🔥 Consistency | On Fire (3d), Week Warrior (7d), Fortnight Force (14d), Consistency King (21d) |
| 🎯 Goals | Goal Setter, Goal Getter, Overachiever (5 completed) |
| 📅 Attendance | Present!, Reliable (≥75%), Attendance Champion (≥90%) |
| ✅ Tasks | Planner, Getting Things Done (5 done), Task Master (10 done) |

---

## 📥 Export Options

Available from the **Analytics page**:

| Export | Format | Content |
|---|---|---|
| Study Logs | `.csv` | Date, Subject, Hours, Source |
| Attendance | `.csv` | Date, Subject, Status |
| Goals | `.csv` | Title, Category, Progress %, Deadline |
| Tasks | `.csv` | Name, Subject, Due Date, Priority, Completed |
| Full Report | `.pdf` | User profile · Key stats · Recent logs · Goals summary |

---

## 🔔 Push Notifications

On the **Alerts** page, click **"Enable Alerts"** to request browser notification permission.  
Once granted, the app fires OS-level notifications for all unread `urgent` and `reminder` alerts on page load.

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary (Indigo) | `#6366f1` |
| Success (Emerald) | `#10b981` |
| Warning (Amber) | `#f59e0b` |
| Danger (Red) | `#ef4444` |
| Background (Light) | `#f8fafc` |
| Background (Dark) | `#0f172a` |
| Font | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| Cards | `border-radius: 16px`, subtle shadow, white fill |
| Animations | CSS `transition` + SVG `stroke-dashoffset` for ring progress |

---

## 🗺️ Roadmap

### Phase 2 — Backend (planned)
- [ ] Node.js + Express REST API
- [ ] MongoDB / PostgreSQL database
- [ ] JWT authentication (real login system)
- [ ] Multi-device sync
- [ ] Cloud data backup
- [ ] Email reminders via NodeMailer

### Phase 3 — Polish
- [ ] PWA (installable, offline support via Service Worker)
- [ ] Mobile-native app via React Native / Capacitor
- [ ] AI study suggestions based on performance trends
- [ ] Collaborative study groups

---

## 🐛 Known Limitations

- **No real authentication** — the login form is a frontend-only simulation. Anyone with access to the browser can see `localStorage` data.
- **Single-device only** — data is stored in the browser's localStorage; clearing browser data or switching devices loses all data. Use the CSV/PDF export to back up.
- **No automated reminders** — the app must be open in a tab to receive push notifications (no background Service Worker).

---

## 📸 Pages Preview

| Page | Path |
|---|---|
| Login | `index.html` |
| Profile Setup | `Frontend/Pages/Profile-setup/profile-setup.html` |
| Dashboard | `Frontend/Pages/Dashboard/Dashboard.html` |
| Study Planner | `Frontend/Pages/Study-Planner/Study-Planner.html` |
| Goals | `Frontend/Pages/Goals/Goals.html` |
| Attendance | `Frontend/Pages/attendance/attendance.html` |
| Alerts | `Frontend/Pages/Alerts/Alerts.html` |
| Weekly Review | `Frontend/Pages/Weekly reviews/weekly-review.html` |
| Analytics | `Frontend/Pages/Analytics/analytics.html` |
| Achievements | `Frontend/Pages/Achievements/achievements.html` |

---

## 👤 Author

**Soham** — College Project, March 2026  
Built as a Frontend Web Development college project submission.

---

## 📄 License

This project is for educational purposes. Feel free to fork and build on it.

---

> *"Consistency is the key to mastering any subject — and StudySync helps you prove it."*
