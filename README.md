
### `README.md`

```markdown
# P0M0D0R0.EXE ★ Y2K Edition

A vibrant, vaporwave-infused retro Pomodoro desktop application designed with a classic Y2K window aesthetic. This application merges hyper-stylized pixel interfaces with robust modern task management, localized tracking, and real-time cloud data synchronization.

![Aesthetic Shield](https://img.shields.io/badge/Aesthetic-Y2K%20%2F%20Vaporwave-ff69b4) ![Deployment Status](https://img.shields.io/badge/Deployment-Vercel-black)

---

## ★ KEY FEATURES

* **Retro Authentication Layer (`★ AUTHENTICATION.EXE`)**
    * Secure user gating powered by Firebase Auth.
    * Intelligent auto-account generation: signs users in if credentials match or registers a brand new account seamlessly if the credential handles are fresh.

* **Dynamic Tri-Mode Pomodoro Engine (`★ P0M0D0R0.EXE`)**
    * Pre-configured operational cycles: **Focus Time** (25 mins), **Short Break** (5 mins), and **Long Break** (15 mins).
    * Automated sequence routing that ticks down, rings an alert, and stages the next logical block (e.g., automatically pivoting to a Long Break after completing 4 continuous Focus cycles).
    * Highly customizable parameters allowing on-the-fly threshold adjustments saved instantly across sessions.

* **Picture-in-Picture Mini-Player Mode (PiP)**
    * Pop open an independent, always-on-top micro visual canvas.
    * Utilizes HTML5 Canvas capture tracking to render live countdown updates directly inside a system-level floating PiP window while you browse other screens.

* **Real-time Task Manager (`★ TODO_LIST.EXE`)**
    * Interactive checklist infrastructure allowing CRUD capabilities (Create, Read, Update, Delete) for daily responsibilities.
    * Instant toggle markings with visual strikethrough updates.

* **Urgency Metric Tracker (`★ EXAM_COUNTDOWN.EXE`)**
    * Custom exam and target-date logger designed for students and professionals.
    * Chronological milestone sorting featuring contextual warning banners (e.g., highlights imminent targets when less than 3 days remain or alerts you with a blinking `🚨 TODAY!!!` indicator).

* **Historical Productivity Logger (`★ HISTORY.EXE`)**
    * A rolling 7-day productivity analytical audit board.
    * Automatically tallies completed sessions and raw accumulated operational minutes over a week-long time horizon.

* **Synth Sound System Engine**
    * Custom synthesized synth square-wave multi-frequency loops triggered natively through the browser Web Audio API.
    * Bypasses aggressive web-browser audio autoplay restrictions via intuitive initial tap gestures.

---

## ★ THE TECH STACK

* **Frontend Architecture:** Vanilla ECMAScript Modules (JavaScript ES6+), HTML5 Semantic Shell, CSS3 Flexbox/Grid Layout Systems.
* **Database & Security Cloud Layer:** Google Firebase Ecosystem
    * **Firebase Authentication:** Handles secure, isolated user authentication profiles.
    * **Cloud Firestore:** Real-time NoSQL data synchronization pipelines utilizing live `onSnapshot` streaming collections organized cleanly under individual user data endpoints (`users/{uid}/*`).
* **State Redundancy Storage:** Browser Web Storage API (`localStorage`) fallback structures to secure state durability during connection drops or isolated offline runtime modes.
* **Typography Rendering:** Google Fonts CDN integration serving pixel-art monospaced typography variants (`VT323` & `Orbitron`).
* **Hosting Framework:** Vercel Cloud Platform for instant serverless deployments and fast loading speeds.

---

## ★ FILE ARCHITECTURE

```text
├── .vscode/
│   └── launch.json         # Local browser debugging environment profile
├── .gitignore              # Local build artifacts and sensitive credentials mask
├── index.html              # Main GUI structure & layout panels
├── script.js               # Application coordinator, logic engine & cloud synchronization
└── styles.css              # Custom Y2K layout animations, tokens & thematic palettes

```

---

## ★ CONFIGURATION & LOCAL DEVELOPMENT

### Prerequisites

To hook into real-time persistence, ensure you have a Firebase project provisioned.

### Local Initialization

1. Clone this repository locally into your working workspace:
```bash
git clone [https://github.com/your-username/pomodoro-sofia.git](https://github.com/your-username/pomodoro-sofia.git)
cd pomodoro-sofia

```


2. Create your local config file. Create a file named `firebase-config.js` right in the root directory:
```javascript
// firebase-config.js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

```


*(Note: `firebase-config.js` and `.vercel` directories are automatically untracked by Git to protect your cloud keys and deployment environments).*
3. Open up your preferred development server environment (like VS Code's Live Server extension) or open `index.html` through the automated runtime profile configurations structured inside `.vscode/launch.json`.

---

## ★ VERCEL PRODUCTION DEPLOYMENT

This project is built to deploy seamlessly to Vercel via Git Integration or the Vercel CLI.

### Option 1: Automatic Git Deploy (Recommended)

1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Link your repository inside the **Vercel Dashboard**.
3. Since `firebase-config.js` is ignored by Git to keep it secure, go to your **Vercel Project Settings > Environment Variables** and add your configuration details there if using a build system, or use Option 2 below for clean static file handling via CLI.

### Option 2: Deploying via Vercel CLI

If you prefer straight-to-cloud deployments while maintaining local config files:

```bash
# Install Vercel CLI globally if you haven't already
npm install -g vercel

# Authenticate and deploy directly from your project directory
vercel

```

Follow the interactive setup prompts to link and deploy your static build target directly into production.

```

```
