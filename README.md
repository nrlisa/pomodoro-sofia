# P0M0D0R0.EXE

> `SYSTEM STATUS: STABLE`
> A minimalist, high-fidelity productivity workspace styled with a classic late-90s user interface. This engine integrates a custom tri-mode execution timer with multi-dimensional academic course tracking, task scheduling, and real-time database synchronization.

---

## ✦ Key Architectural Modules

### 💾 Core Synchronization and Session Engines

* **Automated Account Management**
Secure endpoints powered by Firebase Authentication with automatic profile provisioning upon initial client handshake.
* **Tri-Mode Execution Loop**
Routes seamless state shifts between `Focus (25 min)`, `Short Break (5 min)`, and `Long Break (15 min)` intervals with automated sequence queuing.
* **Canvas Media Bridge**
Supports an isolated Picture-in-Picture display shell, leveraging a high-performance HTML5 Canvas streaming loop to frame dynamic time matrices transparently over separate browser tabs.

### 🎧 Ambient Signal Processing

* **Native Sound Synthesizer**
Generates low-latency square-wave alert frequencies built natively using the Web Audio API to bypass restrictive browser media autoplay rules safely.
* **Acoustic Signal Arrays**
Provides layered background options including continuous parameterized audio loops of `Heavy Rain`, `Ocean Waves`, or a steady `40Hz Gamma` focus tone configured with fade-out click filters.

### 📅 Academic Task Allocation

* **Assignment Logs (`SUBMISSIONS.EXE`)**
Features unified submission records mapping distinct deliverables, nested target sub-task checklists, markdown documentation areas, and a confetti particle payoff upon resolution.
* **Milestone Monitoring (`EXAM_COUNTDOWN.EXE`)**
Offers chronological exam tracking equipped with systemic status badges detailing deadline proximity such as `Today`, `Days Left`, or `Passed`.
* **Daily Task Scheduler (`TODO_LIST.EXE`)**
Integrates modular tracking checklists equipped with systematic garbage collection routines to purge finished sub-tasks instantly.

### 📊 System Metadata and Controls

* **Course Indexing (`SUBJECTS.CFG`)**
Implements automated subject folder tracking across academic semesters 5 through 9 with custom hex color configurations that cascade dynamically across standard viewport borders.
* **Matrix Calendar (`CALENDAR.EXE`)**
Utilizes a reactive grid layout engine to map calendar blocks color-coded by subject alongside a chronological daily agenda sidebar panel.
* **Productivity Ledger (`HISTORY.EXE`)**
Drives a sliding 7-day data pipeline that aggregates completed focus intervals into a clean weekly performance bar graph.

---

## ✦ Technical Architecture

* **Frontend Environment:** Vanilla `ECMAScript 6+` JavaScript Modules, clean HTML5 structure, and raw CSS3 Flexbox/Grid layout architectures.
* **Cloud Infrastructure:** Fully integrated with the Google Firebase platform using `Firebase Auth` and `Cloud Firestore` real-time onSnapshot data streaming pipelines.
* **Local Redundancy:** Programmed with browser `localStorage` mechanisms to manage configurations and app data during unexpected connection drops.
* **Assets & Typography:** Rendered using the `Canvas Confetti` engine along with Google Fonts CDN monospaced typography profiles (`VT323` and `Orbitron`).
* **Web Distribution:** Hosted on global cloud delivery architecture via the `Vercel` serverless platform.

---

## ✦ Production Deployment Configuration

```text
├── .vscode/launch.json            # Desktop browser debugging parameters
├── .gitignore                     # Security filter preventing credential leaks
├── index.html                     # Core interface layout and window panels
├── script.js                      # Central state coordinator and audio engine
├── tasks.js                       # Task operations, trackers, and dynamic modals
├── calendar.js                    # Matrix engines generating data grid views
└── styles.css                     # Custom variables, animations, and typography

```

---

## ✦ Development Integration

### 1. Initialize Local Environment

```bash
git clone https://github.com/your-username/pomodoro-sofia.git
cd pomodoro-sofia

```

### 2. Map Firebase Cloud Credentials

To register your cloud database infrastructure safely, create a configuration file in the project root directory labeled `firebase-config.js`:

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

> **Security Note:** This specific file is blocked by default within the project `.gitignore` to prevent leaking private cloud tokens to public version control networks.

### 3. Execution Protocols

Serve the core directory using a local web server daemon, or run the pre-configured local browser debugging instance mapped within `.vscode/launch.json`.