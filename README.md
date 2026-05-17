### `README.md`

```markdown
# P0M0D0R0.EXE ★

A vibrant, vaporwave-infused retro Pomodoro application designed with a classic Y2K window aesthetic. It blends a hyper-stylized pixel interface with robust modern task management, academic tracking, and real-time cloud synchronization.

---

## ★ KEY FEATURES

### 💾 Core Engine & Auth
* **★ AUTHENTICATION.EXE:** Secure user entry powered by Firebase Auth. It features intelligent auto-account generation (seamlessly signs in existing users or registers a fresh profile).
* **★ P0M0D0R0.EXE:** A dynamic tri-mode timer shifting between **Focus** (25m), **Short Break** (5m), and **Long Break** (15m). Operates on an automated sequence routing that rings a sound alert and chains to the next logical block (e.g., auto-triggering a long break after 4 focus rounds).
* **★ MINI-PLAYER (PiP):** Supports an independent, always-on-top Picture-in-Picture window. Uses an HTML5 Canvas stream to mirror live countdowns directly on top of your screen while you browse other tabs.

### 🎧 Ambient Audio Matrix
* **Synth Wave Alarm:** Custom synthesized square-wave frequencies triggered natively via the Web Audio API to bypass restrictive browser autoplay rules.
* **Atmospheric Noise:** Immersive background options including **Heavy Rain**, **Ocean Waves**, and a dedicated **40Hz Gamma Focus Tone** with anti-pop audio fade curves.

### 📚 Unified Academic Hub
* **Homework Manager (`★ SUBMISSIONS.EXE`):** Comprehensive assignment logs complete with due dates, customizable sub-task checklists, markdown text spaces for notes/links, and a confetti particle payoff upon completion.
* **Exam Tracker (`★ EXAM_COUNTDOWN.EXE`):** Chronological test milestones with urgency status badges (`🚨 TODAY!!!`, `⚠️ DAYS LEFT`, or `PASSED`). Includes internal study-topic checkmarks to monitor overall mastery percentage.
* **Task Manager (`★ TODO_LIST.EXE`):** Standard interactive daily responsibilities checklist with a quick-clean script (`🧹 CLEAN COMPLETED`) to sweep away checked entries.

### 📊 System Operations & Stats
* **Subject Folders (`★ SUBJECTS.CFG`):** Organize your tracking dashboard by semester (Sem 5-9) with specialized custom color-picking nodes that cascade instantly across your entire UI.
* **Agenda Calendar (`★ CALENDAR.EXE`):** Interactive calendar matrix showing daily bullet nodes color-coded by subject alongside a chronological agenda sidebar for any selected date.
* **Productivity Feed (`★ HISTORY.EXE`):** A rolling 7-day performance auditor summarizing active session history and charting focus minutes across a clean bar graph.

---

## ★ THE TECH STACK

* **Frontend Architecture:** Vanilla JavaScript (ES6+ Modules), HTML5 Semantic Shell, CSS3 Flexbox/Grid Systems.
* **Cloud Layer:** Google Firebase Ecosystem (Firebase Auth & Cloud Firestore real-time `onSnapshot` streaming pipelines).
* **Local Redundancy:** Browser `localStorage` fallbacks to preserve configurations and state during network drops.
* **Visual FX & Typography:** Canvas Confetti engine for achievement rewards; Google Fonts CDN monospaced families (`VT323` & `Orbitron`).
* **Hosting Platform:** Vercel Cloud Platform for instant, serverless global distribution.

---

## ★ FILE ARCHITECTURE

```text
├── .github/workflows/static.yml   # Automated GitHub Pages static content deployment
├── .vscode/launch.json            # Automated local browser debugging profile
├── .gitignore                     # Secure protection masking local cloud credentials
├── index.html                     # Core application layout panels and window shells
├── script.js                      # Central app coordinator, state machine, and audio nodes
├── tasks.js                       # Operational modules for todos, exams, homework, and modals
├── calendar.js                    # Matrix engines generating the grid UI and daily agendas
└── styles.css                     # Vaporwave color variables, keyframes, and scrollbars

```

---

## ★ CONFIGURATION & LOCAL DEVELOPMENT

### 1. Clone the Workspace

```bash
git clone [https://github.com/your-username/pomodoro-sofia.git](https://github.com/your-username/pomodoro-sofia.git)
cd pomodoro-sofia

```

### 2. Configure Environment Credentials

Create a file named `firebase-config.js` right in the project root directory:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

```

*(Note: `firebase-config.js` is automatically blocked by `.gitignore` to prevent leaking private cloud tokens).*

### 3. Launch Locally

Run your favorite web daemon (like VS Code's **Live Server** extension) or use the pre-configured runtime profile inside `.vscode/launch.json`.

---

## ★ PRODUCTION DEPLOYMENT

### Option A: Automatic Git Sync (Recommended)

1. Commit and push your workspace changes to your personal GitHub repository.
2. Link your repository directly inside the **Vercel Dashboard**.
3. Head to your **Vercel Project Settings > Environment Variables** to map configuration keys if utilizing custom pipelines.

### Option B: Vercel CLI Upload

For immediate cloud deployment straight from your local shell terminal:

```bash
npm install -g vercel   # Install tool globally
vercel                  # Trigger interactive upload deployment

```

```

```
