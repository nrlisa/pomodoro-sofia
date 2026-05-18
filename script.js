import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, updateDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp, query, where, orderBy, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { firebaseConfig } from './firebase-config.js';

import { renderTodos } from './todos.js';
import { renderExams } from './exams.js';
import { renderHomework } from './homework.js';
import { renderSubjects } from './subjects.js';
import { renderSchedule } from './schedule.js';
import { executeMutation } from './tasks.js';
import './calendar.js';
import './dashboard.js';

export let app, auth, db;
export let currentUser = null;
export let useFirebase = false;
let historyDocs = [];
let unsubHistory = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  window.db = db; // Expose globally for module safety

  onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');

    if (user) {
      currentUser = user;
      window.currentUser = user;
      useFirebase = true;
      window.useFirebase = true;
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      
      const statusEl = document.getElementById('statusTxt');
      if (statusEl) statusEl.textContent = `LOGGED IN AS: ${user.email}`;
      const greetEl = document.getElementById('mainGreeting');
      if (greetEl) greetEl.textContent = `★ HELLO, STUDENT! ★`;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && userDocSnap.data().displayName) {
          const userName = userDocSnap.data().displayName.toUpperCase();
          if (statusEl) statusEl.textContent = `WELCOME BACK, ${userName}!`;
          if (greetEl) greetEl.textContent = `★ HELLO, ${userName}! ★`;
        }
        if (userDocSnap.exists() && userDocSnap.data().petIndex) {
          if (window.selectPet) window.selectPet(userDocSnap.data().petIndex, false);
        }

        const settingsRef = doc(db, "users", user.uid, "settings", "timetable");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().image) {
          window.currentScheduleImage = settingsSnap.data().image;
        } else {
          window.currentScheduleImage = null;
        }
        if (window.renderScheduleImage) window.renderScheduleImage();
      } catch (err) {
        console.error("Error loading individualized profile name:", err);
      }

      syncData('todos', collection(db, "users", user.uid, "todos"), renderTodos);
      syncData('exams', collection(db, "users", user.uid, "exams"), renderExams);
      syncData('homework', collection(db, "users", user.uid, "homework"), renderHomework);
      syncData('subjects', collection(db, "users", user.uid, "subjects"), renderSubjects);
      syncData('schedule', collection(db, "users", user.uid, "schedule"), renderSchedule);
      syncData('stickies', collection(db, "users", user.uid, "stickies"), window.renderStickies);
      setupRealtimeHistory();
    } else {
      currentUser = null;
      useFirebase = false;
      window.useFirebase = false;
      if (loginScreen) loginScreen.style.display = 'block';
      if (mainApp) mainApp.style.display = 'none';
      
      if (unsubHistory) { unsubHistory(); unsubHistory = null; }
      
      document.getElementById('todoList').innerHTML = "<li>Please sign in to view items.</li>";
      document.getElementById('examList').innerHTML = "";
      document.getElementById('hwList').innerHTML = "";
      if(document.getElementById('subjectList')) document.getElementById('subjectList').innerHTML = "";
      if(document.getElementById('scheduleList')) document.getElementById('scheduleList').innerHTML = "";
      window.currentScheduleImage = null;
      if (window.renderScheduleImage) window.renderScheduleImage();
      renderHistory();
    }
  });

} catch (e) {
  console.error("Firebase init failed. Falling back to localStorage.", e);
  useFirebase = false;
  window.useFirebase = false;
}

const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const forgotPassBtn = document.getElementById('forgotPassBtn');
const loginPasswordInp = document.getElementById('loginPassword');
const errorDiv = document.getElementById('authError');

const handleLogin = async () => {
  if (!auth) {
    errorDiv.textContent = "⚠️ FIREBASE CONNECTION ERROR. CHECK CONFIG.";
    return;
  }
  document.getElementById('loginName').style.display = 'none';
  const email = document.getElementById('loginEmail').value.trim();
  const password = loginPasswordInp.value;
  errorDiv.textContent = "";

  if (!email || !password) {
    errorDiv.textContent = "⚠️ INPUTS CANNOT BE EMPTY";
    return;
  }

  errorDiv.textContent = "LOADING... ★";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    errorDiv.textContent = `⚠️ ${error.message.replace("Firebase: ", "")}`;
  }
};

const handleSignUp = async () => {
  if (!auth) {
    errorDiv.textContent = "⚠️ FIREBASE CONNECTION ERROR. CHECK CONFIG.";
    return;
  }
  const email = document.getElementById('loginEmail').value.trim();
  const nameInput = document.getElementById('loginName').value.trim();
  const password = loginPasswordInp.value;
  errorDiv.textContent = "";

  const nameInpEl = document.getElementById('loginName');
  if (nameInpEl.style.display === 'none') {
    nameInpEl.style.display = 'block';
    errorDiv.textContent = "⚠️ PLEASE ENTER YOUR NAME TO REGISTER";
    return;
  }

  if (!nameInput || !email || !password) {
    errorDiv.textContent = "⚠️ ALL INPUTS (NAME, EMAIL, PASSWORD) REQUIRED";
    return;
  }

  errorDiv.textContent = "CREATING ACCOUNT... ★";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    await setDoc(doc(db, "users", newUser.uid), {
      displayName: nameInput,
      email: email,
      createdAt: Date.now()
    }, { merge: true });
  } catch (error) {
    errorDiv.textContent = `⚠️ ${error.message.replace("Firebase: ", "")}`;
  }
};

const handleForgotPass = async () => {
  if (!auth) {
    errorDiv.textContent = "⚠️ FIREBASE CONNECTION ERROR. CHECK CONFIG.";
    return;
  }
  const email = document.getElementById('loginEmail').value.trim();
  errorDiv.textContent = "";

  if (!email) {
    errorDiv.textContent = "⚠️ ENTER EMAIL FOR RESET LINK";
    return;
  }

  errorDiv.textContent = "SENDING EMAIL... ★";
  try {
    await sendPasswordResetEmail(auth, email);
    errorDiv.textContent = "✅ RESET EMAIL SENT!";
  } catch (error) {
    errorDiv.textContent = `⚠️ ${error.message.replace("Firebase: ", "")}`;
  }
};

if (signInBtn) signInBtn.addEventListener('click', handleLogin);
if (signUpBtn) signUpBtn.addEventListener('click', handleSignUp);
if (forgotPassBtn) forgotPassBtn.addEventListener('click', handleForgotPass);
if (loginPasswordInp) loginPasswordInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

const CIRC = 452.4;
const loadCFG = () => JSON.parse(localStorage.getItem('pomo_cfg')) || { focus: 25, short: 5, long: 15 };
let CFG = loadCFG();
let mode = 'focus';
let totalSecs = CFG.focus * 60;
let secsLeft = totalSecs;
let running = false;
let iv = null;
let timerEnd = null;
let sessions = parseInt(localStorage.getItem('pomo_sessions')) || 0;
let alarmIv = null;
let alarmNodes = [];
let pendingNextMode = null;
let audioCtx = null;
let audioUnlocked = false;
let hasStartedCurrentSession = false;

// Ambient Audio Setup
const AMBIENT_SOUNDS = {
  rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
  noise: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg'
};
let currentAmbient = 'off';
let ambientAudio = new Audio();
ambientAudio.loop = true;
ambientAudio.volume = 0.5;

let gammaOsc = null;
let gammaGain = null;

function startGamma() {
  ensureAudio();
  if (gammaOsc) return;
  gammaOsc = audioCtx.createOscillator();
  gammaGain = audioCtx.createGain();
  gammaOsc.type = 'sine';
  gammaOsc.frequency.value = 40; // 40Hz Gamma Tone
  
  // Smooth fade-in to prevent clicking noises
  gammaGain.gain.setValueAtTime(0, audioCtx.currentTime);
  gammaGain.gain.linearRampToValueAtTime(document.getElementById('ambVol').value, audioCtx.currentTime + 0.1);
  
  gammaOsc.connect(gammaGain);
  gammaGain.connect(audioCtx.destination);
  gammaOsc.start();
}

function stopGamma() {
  if (gammaOsc && gammaGain) {
    // Smooth fade-out
    gammaGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    const oscToStop = gammaOsc;
    gammaOsc = null;
    setTimeout(() => {
      try { oscToStop.stop(); } catch(e){}
    }, 100);
  }
}

window.setAmbient = (type) => {
  currentAmbient = type;
  document.querySelectorAll('.amb-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('amb-' + type).classList.add('active');
  
  ambientAudio.pause();
  stopGamma();

  if (type === 'gamma') {
    if (running) startGamma();
  } else if (type !== 'off') {
    ambientAudio.src = AMBIENT_SOUNDS[type];
    if (running) ambientAudio.play().catch(e => console.error(e));
  }
};

window.updateAmbientVolume = () => {
  const vol = document.getElementById('ambVol').value;
  ambientAudio.volume = vol;
  if (gammaGain && audioCtx) {
    gammaGain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.1);
  }
};

// History logic
function setupRealtimeHistory() {
  if (!useFirebase || !currentUser) return;
  const historyRef = collection(db, `users/${currentUser.uid}/history`);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const q = query(historyRef, where("timestamp", ">=", sevenDaysAgo));
  
  unsubHistory = onSnapshot(q, (snapshot) => {
    historyDocs = [];
    snapshot.forEach((doc) => {
      historyDocs.push(doc.data());
    });
    historyDocs.sort((a, b) => b.timestamp - a.timestamp);
    renderHistory();
  }, (error) => {
    console.error("Firestore history error:", error);
  });
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.warn(e));
  }
  if (!audioUnlocked) {
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    audioUnlocked = true;
    const hint = document.getElementById('audioHint');
    hint.textContent = '★ SOUND UNLOCKED ★';
    setTimeout(() => { 
      hint.style.opacity = '0'; 
      setTimeout(() => hint.style.display = 'none', 500); 
    }, 1500);
  }
}

function playLoop() {
  ensureAudio();
  stopSound();
  function beep() {
    if (!audioCtx) return;
    
    const scheduleNotes = () => {
      const freqs = [523, 659, 784, 659];
      const now = audioCtx.currentTime;
      freqs.forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'square';
        o.frequency.value = f;
        const t = now + i * 0.18 + 0.05;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.16);
        o.start(t);
        o.stop(t + 0.2);
        alarmNodes.push(o);
      });
    };

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(scheduleNotes).catch(e => console.warn('Audio wake failed', e));
    } else {
      scheduleNotes();
    }
  }
  beep();
  alarmIv = setInterval(beep, 900);
}

function stopSound() {
  if (alarmIv) { clearInterval(alarmIv); alarmIv = null; }
  alarmNodes.forEach(n => { try { n.stop(); } catch(e){} });
  alarmNodes = [];
}

function getNextMode(m) {
  if (m === 'focus') return (sessions > 0 && sessions % 4 === 0) ? 'long' : 'short';
  return 'focus';
}

const modeColors = { focus: '', short: 'short', long: 'long' };
const modeLabels = { focus: 'FOCUS TIME', short: 'SHORT BREAK', long: 'LONG BREAK' };

function setMode(m, autoStart) {
  if (running && !autoStart) return;
  clearInterval(iv); iv = null; timerEnd = null; running = false;
  hasStartedCurrentSession = false;
  mode = m;
  totalSecs = CFG[m] * 60;
  secsLeft = totalSecs;
  document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + m).classList.add('active');
  document.getElementById('timeDisp').className = 'time-disp ' + modeColors[m];
  document.getElementById('ring').setAttribute('class', 'ring-fill ' + modeColors[m]);
  document.getElementById('modeLbl').textContent = modeLabels[m];
  const nxt = document.getElementById('nextLbl');
  if (nxt) nxt.textContent = 'NEXT: ' + modeLabels[getNextMode(m)];
  
  updateStartBtnUI();
  
  updateDisp(); updateRing();
  if (autoStart) {
    document.getElementById('statusTxt').textContent = 'AUTO-STARTING...';
    setTimeout(() => {
      hasStartedCurrentSession = true;
      startTimer();
    }, 400);
  } else {
    document.getElementById('statusTxt').textContent = 'READY';
  }
}

function updateStartBtnUI() {
  const container = document.getElementById('startActionContainer');
  if (!container) return;
  if (!hasStartedCurrentSession) {
    const modeAction = mode === 'focus' ? 'START FOCUS' : 'START BREAK';
    const color = mode === 'focus' ? '#f0a0c8' : (mode === 'short' ? '#a0c0f8' : '#c0a0f8');
    container.innerHTML = `
      <div style="font-size: 28px; color: ${color}; line-height: 1; margin-bottom: 2px; filter: drop-shadow(2px 2px 0 var(--lavender));">▶</div>
      <div class="idle-pulse" style="font-family: 'VT323', monospace; font-size: 15px; font-weight: bold; color: ${color}; letter-spacing: 1.5px;">${modeAction}</div>
    `;
  } else {
    const txt = running ? 'PAUSE' : 'START';
    const clz = running ? '' : 'idle-pulse';
    container.innerHTML = `
      <div class="${clz}" style="font-family: 'VT323', monospace; font-size: 14px; color: var(--muted); letter-spacing: 2px; margin-top: 14px;">${txt}</div>
    `;
  }
}

function applyCustom() {
  CFG.focus = Math.min(120, Math.max(1, parseInt(document.getElementById('inp-focus').value) || 25));
  CFG.short = Math.min(60,  Math.max(1, parseInt(document.getElementById('inp-short').value) || 5));
  CFG.long  = Math.min(90,  Math.max(1, parseInt(document.getElementById('inp-long').value)  || 15));
  
  document.getElementById('inp-focus').value = CFG.focus;
  document.getElementById('inp-short').value = CFG.short;
  document.getElementById('inp-long').value  = CFG.long;
  
  localStorage.setItem('pomo_cfg', JSON.stringify(CFG));
  
  if (!running) {
    totalSecs = CFG[mode] * 60;
    secsLeft = totalSecs;
    updateDisp(); updateRing();
  }
}

function updateDisp() {
  const m = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const s = String(secsLeft % 60).padStart(2, '0');
  document.getElementById('timeDisp').textContent = m + ':' + s;
}

function updateRing() {
  document.getElementById('ring').style.strokeDashoffset = CIRC * (1 - secsLeft / totalSecs);
}

function tickTimer() {
  const remainingMs = timerEnd - Date.now();
  if (remainingMs <= 0) {
    secsLeft = 0;
    updateDisp(); updateRing();
    clearInterval(iv);
    iv = null;
    running = false;
    onEnd();
    return;
  }

  const newSecsLeft = Math.ceil(remainingMs / 1000);
  if (newSecsLeft !== secsLeft) {
    secsLeft = newSecsLeft;
    updateDisp(); updateRing();
  }
}

function startTimer() {
  running = true;
  if (!timerEnd) {
    timerEnd = Date.now() + secsLeft * 1000;
  }
  updateStartBtnUI();
  document.getElementById('statusTxt').textContent = 'RUNNING...';
  tickTimer();
  
  if (currentAmbient === 'gamma') {
    startGamma();
  } else if (currentAmbient !== 'off' && ambientAudio.src) {
    ambientAudio.play().catch(e => console.log(e));
  }

  iv = setInterval(tickTimer, 250);
}

function handleStart() {
  ensureAudio();
  stopSound();
  if (!hasStartedCurrentSession) {
    hasStartedCurrentSession = true;
    startTimer();
  } else if (running) {
    clearInterval(iv);
    iv = null;
    timerEnd = null;
    running = false;
    ambientAudio.pause();
    stopGamma();
    updateStartBtnUI();
    document.getElementById('statusTxt').textContent = 'PAUSED';
  } else {
    startTimer();
  }

  // Ask for browser notification permissions if not already granted/denied
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

async function onEnd() {
  timerEnd = null;
  ambientAudio.pause();
  stopGamma();

  const historyItem = {
    timestamp: Date.now(),
    mode: mode,
    durationMinutes: CFG[mode]
  };

  // Auto-exit PiP window if it's active
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(e => console.error(e));
  }

  if (mode === 'focus') {
    sessions = Math.min(sessions + 1, 4);
    localStorage.setItem('pomo_sessions', sessions);
    updateDots();
  }
  pendingNextMode = getNextMode(mode);
  
  hasStartedCurrentSession = false;
  setMode(pendingNextMode, false);

  if (useFirebase && currentUser) {
    try {
      const historyRef = collection(db, `users/${currentUser.uid}/history`);
      await addDoc(historyRef, historyItem);
    } catch (e) {
      console.error("Failed to save history to Firestore", e);
      addHistoryLocal(historyItem);
    }
  } else {
    addHistoryLocal(historyItem);
  }
  
  playLoop();
  document.getElementById('statusTxt').textContent = '★ SESSION COMPLETE ★';

  // Fire native browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("★ P0M0D0R0.EXE", {
      body: `Your ${modeLabels[historyItem.mode]} session has finished!`,
    });
  }
}

function addHistoryLocal(item) {
  let localHist = JSON.parse(localStorage.getItem('pomo_history')) || [];
  localHist.push(item);
  localStorage.setItem('pomo_history', JSON.stringify(localHist));
  renderHistory();
}

function renderChart(items) {
  const container = document.getElementById('weeklyChartContainer');
  if (!container) return;

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];

  const getDayIndex = (date) => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Maps Sun to 6, Mon to 0
  };

  items.forEach(item => {
    if (item.mode === 'focus') {
      const dayIdx = getDayIndex(new Date(item.timestamp));
      dayMinutes[dayIdx] += parseInt(item.durationMinutes, 10) || 0;
    }
  });

  const maxMinutes = Math.max(...dayMinutes, 1);

  let html = '';
  days.forEach((dayLabel, idx) => {
    const mins = dayMinutes[idx];
    // Max 75% height ensures labels at the top never get cut off
    const heightPct = (mins / maxMinutes) * 75; 
    
    let barHtml = mins > 0 
      ? `<span style="font-size: 12px; color: var(--pink); font-family: 'VT323', monospace; margin-bottom: 4px;">${mins}m</span>
         <div style="height: ${heightPct}%; width: 24px; background: var(--pink); border-radius: 4px;"></div>`
      : `<span style="font-size: 12px; color: var(--muted); font-family: 'VT323', monospace; margin-bottom: 4px;">-</span>
         <div style="height: 0px; width: 24px; border-bottom: 2px dashed var(--muted); margin-bottom: 2px;"></div>`;

    html += `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
        ${barHtml}
        <span style="font-size: 12px; color: var(--muted); font-weight: bold; margin-top: 4px;">${dayLabel}</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderHistory() {
  const listEl = document.getElementById('analyticsHistoryList');
  if (!listEl) return;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let items = useFirebase ? historyDocs : (JSON.parse(localStorage.getItem('pomo_history')) || []);
  
  items = items.filter(i => i.timestamp >= sevenDaysAgo);
  items.sort((a, b) => b.timestamp - a.timestamp);

  let totalMins = 0;
  let totalSess = 0;
  items.forEach(item => {
    if (item.mode === 'focus') {
      totalMins += parseInt(item.durationMinutes, 10) || 0;
      totalSess++;
    }
  });
  
  if(document.getElementById('statTotalFocus')) document.getElementById('statTotalFocus').textContent = totalMins;
  if(document.getElementById('statTotalSessions')) document.getElementById('statTotalSessions').textContent = totalSess;

  renderChart(items);

  if (items.length === 0) {
    listEl.innerHTML = '<div class="todo-empty">NO HISTORY YET ★</div>';
    return;
  }
  
  listEl.innerHTML = '';
  items.forEach(item => {
    const d = new Date(item.timestamp);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    
    const el = document.createElement('div');
    el.className = 'todo-item'; 
    el.style.cursor = 'default';
    el.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column;">
        <span class="todo-txt" style="font-weight: bold; font-size: 15px;">
          ${item.mode === 'focus' ? 'Focus Session Completed' : (item.mode === 'short' ? 'Short Break' : 'Long Break')}
        </span>
        <span style="font-size: 12px; color: var(--muted);">${dateStr}, ${timeStr}</span>
      </div>
      <div style="font-weight: bold; color: var(--pink); font-size: 16px; font-family: 'VT323', monospace;">
        ${item.durationMinutes} min
      </div>
    `;
    listEl.appendChild(el);
  });
}

function handleReset() {
  ensureAudio();
  clearInterval(iv); iv = null; timerEnd = null;
  ambientAudio.pause();
  stopGamma();
  stopSound(); running = false;
  hasStartedCurrentSession = false;
  pendingNextMode = null;
  secsLeft = totalSecs; updateDisp(); updateRing();
  updateStartBtnUI();
  document.getElementById('statusTxt').textContent = 'READY';
}

function handleSkip() {
  ensureAudio();
  clearInterval(iv); iv = null; timerEnd = null;
  ambientAudio.pause();
  stopGamma();
  stopSound(); running = false;
  if (mode === 'focus') {
    sessions = Math.min(sessions + 1, 4);
    localStorage.setItem('pomo_sessions', sessions);
    updateDots();
  }
  const next = getNextMode(mode);
  pendingNextMode = null;
  setMode(next, false);
}

function updateDots() {
  for (let i = 1; i <= 4; i++)
    document.getElementById('d' + i).classList.toggle('filled', i <= sessions);
  if (sessions >= 4) {
    sessions = 0;
    localStorage.setItem('pomo_sessions', sessions);
    setTimeout(() => {
      for (let i = 1; i <= 4; i++) document.getElementById('d' + i).classList.remove('filled');
    }, 3000);
  }
  document.getElementById('nextLbl').textContent = 'NEXT: ' + modeLabels[getNextMode(mode)];
}

// ---- GENERIC FIRESTORE SYNC ----
function syncData(type, colRef, renderFn) {
  onSnapshot(colRef, (snapshot) => {
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    // Quick sort to keep it stable
    if (type === 'exams') {
      items.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    renderFn(items);
  });
}

function drawTimerOnCanvas() {
  const canvas = document.getElementById('timerCanvas');
  const ctx = canvas.getContext('2d');
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 50;

  ctx.fillStyle = '#fdf0f8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#f0ddf0';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const progress = secsLeft / totalSecs;
  ctx.strokeStyle = mode === 'focus' ? '#f0a0c8' : (mode === 'short' ? '#a0c0f8' : '#c0a0f8');
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  ctx.fillStyle = '#d060a0';
  ctx.font = 'bold 30px Orbitron';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const m = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const s = String(secsLeft % 60).padStart(2, '0');
  ctx.fillText(m + ':' + s, cx, cy - 10);

  ctx.fillStyle = '#9a7ab8';
  ctx.font = '9px VT323';
  ctx.fillText(modeLabels[mode], cx, cy + 20);
}

async function togglePiP() {
  const video = document.getElementById('pipVideo');
  const canvas = document.getElementById('timerCanvas');
  try {
    if (video !== document.pictureInPictureElement) {
      drawTimerOnCanvas();
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      video.muted = true;

      const playPromise = video.play();
      if (video.readyState < 1) {
        await new Promise(resolve => {
          video.addEventListener('loadedmetadata', resolve, { once: true });
        });
      }
      await playPromise;
      await video.requestPictureInPicture();

      const updateInterval = setInterval(() => {
        if (video !== document.pictureInPictureElement) {
          clearInterval(updateInterval);
          stream.getTracks().forEach(t => t.stop());
        } else {
          drawTimerOnCanvas();
        }
      }, 100);
    } else {
      await document.exitPictureInPicture();
    }
  } catch (error) {
    console.error('PiP Error:', error);
    document.getElementById('statusTxt').textContent = 'PiP FAILED: ' + error.message;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
});

let activeSticky = null;
let resizingSticky = null;
let dragStartX, dragStartY, initialX, initialY, initialW, initialH;

window.addEventListener('mousemove', (e) => {
    if (activeSticky) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        activeSticky.style.left = (initialX + dx) + 'px';
        activeSticky.style.top = (initialY + dy) + 'px';
    } else if (resizingSticky) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        const newW = Math.max(150, initialW + dx);
        const newH = Math.max(100, initialH + dy);
        resizingSticky.style.width = newW + 'px';
        resizingSticky.style.height = newH + 'px';
    }
});

window.addEventListener('mouseup', (e) => {
    if (activeSticky) {
        const id = activeSticky.id;
        const newX = parseInt(activeSticky.style.left);
        const newY = parseInt(activeSticky.style.top);
        activeSticky.style.zIndex = '1000';
        activeSticky = null;
        executeMutation('stickies', 'update', { x: newX, y: newY }, id);
    } else if (resizingSticky) {
        const id = resizingSticky.id;
        const newW = parseInt(resizingSticky.style.width);
        const newH = parseInt(resizingSticky.style.height);
        resizingSticky = null;
        executeMutation('stickies', 'update', { width: newW, height: newH }, id);
    }
});

window.currentStickies = [];
window.renderStickies = (stickies) => {
    window.currentStickies = stickies;
    document.querySelectorAll('.sticky-note').forEach(el => el.remove());
    
    const container = document.getElementById('mainApp') || document.body;
    
    stickies.filter(s => s.pinned).forEach(sticky => {
        const noteEl = document.createElement('div');
        noteEl.className = 'sticky-note';
        noteEl.id = sticky.id;
        noteEl.style.position = 'absolute';
        noteEl.style.left = (sticky.x || 100) + 'px';
        noteEl.style.top = (sticky.y || 100) + 'px';
        noteEl.style.width = (sticky.width || 200) + 'px';
        if (sticky.height) {
            noteEl.style.height = sticky.height + 'px';
        } else {
            noteEl.style.height = 'auto';
            noteEl.style.minHeight = '100px';
        }
        noteEl.style.backgroundColor = sticky.color || '#fff7d1';
        noteEl.style.boxShadow = '2px 4px 6px rgba(0,0,0,0.1)';
        noteEl.style.padding = '20px 15px 15px 15px';
        noteEl.style.boxSizing = 'border-box';
        noteEl.style.display = 'flex';
        noteEl.style.flexDirection = 'column';
        noteEl.style.zIndex = '1000';
        noteEl.style.cursor = 'move';
        
        const pin = document.createElement('div');
        pin.style.position = 'absolute';
        pin.style.top = '-10px';
        pin.style.left = '50%';
        pin.style.transform = 'translateX(-50%)';
        pin.style.width = '20px';
        pin.style.height = '20px';
        pin.style.borderRadius = '50%';
        pin.style.backgroundColor = '#ff6b6b';
        pin.style.boxShadow = 'inset -2px -2px 4px rgba(0,0,0,0.3), 1px 2px 2px rgba(0,0,0,0.2)';
        noteEl.appendChild(pin);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '✕';
        delBtn.style.position = 'absolute';
        delBtn.style.top = '2px';
        delBtn.style.right = '2px';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '12px';
        delBtn.style.opacity = '0.5';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            window.executeMutation('stickies', 'update', { pinned: false }, sticky.id);
        };
        noteEl.appendChild(delBtn);

        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';
        contentDiv.style.width = '100%';
        contentDiv.style.overflowY = 'auto';
        contentDiv.style.fontFamily = "'VT323', monospace";
        contentDiv.style.fontSize = '16px';
        contentDiv.style.wordBreak = 'break-word';
        contentDiv.innerHTML = parseNoteMarkdown(sticky.text || '');
        noteEl.appendChild(contentDiv);

        const ta = document.createElement('textarea');
        ta.value = sticky.text || '';
        ta.style.flex = '1';
        ta.style.width = '100%';
        ta.style.border = 'none';
        ta.style.background = 'transparent';
        ta.style.resize = 'none';
        ta.style.fontFamily = "'VT323', monospace";
        ta.style.fontSize = '16px';
        ta.style.outline = 'none';
        ta.style.cursor = 'text';
        ta.style.display = 'none';
        ta.onmousedown = (e) => e.stopPropagation(); 
        ta.onchange = (e) => executeMutation('stickies', 'update', { text: e.target.value }, sticky.id);
        ta.onblur = () => {
            contentDiv.innerHTML = parseNoteMarkdown(ta.value);
            contentDiv.style.display = 'block';
            ta.style.display = 'none';
            // Restore auto-height if it was not manually resized
            const sticky = window.currentStickies.find(s => s.id === noteEl.id);
            if (sticky && !sticky.height) {
                noteEl.style.height = 'auto';
            }
        };
        noteEl.appendChild(ta);

        const resizeHandle = document.createElement('div');
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.bottom = '0px';
        resizeHandle.style.right = '0px';
        resizeHandle.style.width = '15px';
        resizeHandle.style.height = '15px';
        resizeHandle.style.cursor = 'se-resize';
        resizeHandle.style.borderBottom = '3px solid rgba(0,0,0,0.2)';
        resizeHandle.style.borderRight = '3px solid rgba(0,0,0,0.2)';
        resizeHandle.style.boxSizing = 'border-box';
        resizeHandle.onmousedown = (e) => {
            e.stopPropagation();
            resizingSticky = noteEl;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialW = parseInt(noteEl.style.width);
            initialH = parseInt(noteEl.style.height);
        };
        noteEl.appendChild(resizeHandle);

        noteEl.ondblclick = (e) => {
            if (e.target.tagName === 'TEXTAREA') return;
            // Fix the height to prevent resizing during edit
            noteEl.style.height = noteEl.offsetHeight + 'px';
            contentDiv.style.display = 'none';
            ta.style.display = 'block';
            ta.focus();
        };

        noteEl.onmousedown = (e) => {
            if (ta.style.display === 'block') return;
            activeSticky = noteEl;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialX = parseInt(noteEl.style.left) || 0;
            initialY = parseInt(noteEl.style.top) || 0;
            noteEl.style.zIndex = '1001';
        };

        container.appendChild(noteEl);
    });

    if (document.getElementById('notesModal') && document.getElementById('notesModal').style.display !== 'none') {
        renderNotesModal();
    }
};

window.addEventListener('load', () => {
  updateStartBtnUI();

  // Init Desktop Pet
  if (window.selectPet) window.selectPet(currentPetIndex, false);

  // Auto-fill dates
  const todayStr = new Date().toISOString().split('T')[0];
  const hwDateInp = document.getElementById('hwDateInp');
  const examDateInp = document.getElementById('examDateInp');
  const todoDateInp = document.getElementById('todoDateInp');
  if (hwDateInp) hwDateInp.value = todayStr;
  if (examDateInp) examDateInp.value = todayStr;
  if (todoDateInp) todoDateInp.value = todayStr;

  const inpFocus = document.getElementById('inp-focus');
  if (inpFocus) {
    inpFocus.value = CFG.focus;
    document.getElementById('inp-short').value = CFG.short;
    document.getElementById('inp-long').value = CFG.long;
  }
  updateDisp();
  updateRing();
  updateDots();
  renderHistory();
  if (!window.useFirebase) {
    window.currentScheduleImage = localStorage.getItem('pomo_timetable_image');
    if (window.renderScheduleImage) window.renderScheduleImage();
    const localStickies = JSON.parse(localStorage.getItem('pomo_stickies')) || [];
    window.renderStickies(localStickies);
  }
});

window.exportUserDataToFile = async () => {
  if (!(await window.customConfirm("Are you sure you want to download a backup of your data?"))) return;

  const data = {
    exportTimestamp: Date.now(),
    userAgent: navigator.userAgent,
    userEmail: currentUser ? currentUser.email : 'offline',
    todos: window.currentTodos || [],
    exams: window.currentExams || [],
    homework: window.currentHomework || [],
    subjects: window.currentSubjects || [],
    schedule: window.currentSchedule || [],
    history: historyDocs.length ? historyDocs : (JSON.parse(localStorage.getItem('pomo_history')) || [])
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
  a.download = `POMO_BACKUP_${dateStr}.DAT`;
  a.click();
  URL.revokeObjectURL(url);
};

window.importUserDataFromFile = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!(await window.customConfirm("Are you sure you want to import data? This will merge with your current records."))) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.exportTimestamp) throw new Error("Invalid format");
      
      if (useFirebase && currentUser) {
         const restoreCol = async (colName, items) => {
             const existingSnap = await getDocs(collection(db, "users", currentUser.uid, colName));
             const existingIds = new Set(existingSnap.docs.map(d => d.id));
             let added = 0;
             for (const item of items) {
                 const id = item.id || Math.random().toString(36).substring(2, 15);
                 if (!existingIds.has(id)) {
                     const copy = { ...item };
                     delete copy.id;
                     await setDoc(doc(db, "users", currentUser.uid, colName, id), copy, { merge: true });
                     added++;
                 }
             }
             return added;
         };
         const tAdd = await restoreCol('todos', data.todos || []);
         const eAdd = await restoreCol('exams', data.exams || []);
         const hAdd = await restoreCol('homework', data.homework || []);
         const sAdd = await restoreCol('subjects', data.subjects || []);
         const schAdd = await restoreCol('schedule', data.schedule || []);
         await window.customAlert(`★ CLOUD SYNC MERGE COMPLETE! ★<br>Added missing items: ${tAdd} Todos, ${eAdd} Exams, ${hAdd} HW, ${sAdd} Subjects, ${schAdd} Schedule.`);
      } else {
         const mergeLocal = (key, items) => {
             const local = JSON.parse(localStorage.getItem(key)) || [];
             const localIds = new Set(local.map(i => i.id));
             let added = 0;
             items.forEach(item => {
                 if (!localIds.has(item.id)) { local.push(item); added++; }
             });
             localStorage.setItem(key, JSON.stringify(local));
             return added;
         };
         const tAdd = mergeLocal('pomo_todos', data.todos || []);
         const eAdd = mergeLocal('pomo_exams', data.exams || []);
         const hAdd = mergeLocal('pomo_homework', data.homework || []);
         const sAdd = mergeLocal('pomo_subjects', data.subjects || []);
         const schAdd = mergeLocal('pomo_schedule', data.schedule || []);
         mergeLocal('pomo_history', data.history || []);
         await window.customAlert(`★ LOCAL DATA MERGED! ★<br>Added missing items: ${tAdd} Todos, ${eAdd} Exams, ${hAdd} HW, ${sAdd} Subjects, ${schAdd} Schedule.`);
         window.location.reload(); 
      }
    } catch (err) {
      await window.customAlert("Failed to read backup file: " + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
};

function openPresets() {
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('presetsModal').style.display = 'block';
  document.getElementById('analyticsModal').style.display = 'none';
}

function openAnalytics() {
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('analyticsModal').style.display = 'block';
  document.getElementById('presetsModal').style.display = 'none';
  renderHistory();
}

window.openSchedule = () => {
  closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('scheduleModal').style.display = 'flex';
};

function openSubjects() {
  closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('subjectModal').style.display = 'flex';
}

function closeModals() {
  document.getElementById('modalsContainer').style.display = 'none';
  document.getElementById('presetsModal').style.display = 'none';
  document.getElementById('analyticsModal').style.display = 'none';
  document.getElementById('examModal').style.display = 'none';
  document.getElementById('hwModal').style.display = 'none';
  const cm = document.getElementById('calendarModal');
  if (cm) cm.style.display = 'none';
  const sm = document.getElementById('scheduleModal');
  if (sm) sm.style.display = 'none';
  document.getElementById('subjectModal').style.display = 'none';
  document.getElementById('profileModal').style.display = 'none';
  document.getElementById('subjectOverviewModal').style.display = 'none';
  document.getElementById('notesModal').style.display = 'none';
  const atm = document.getElementById('allTasksModal');
  if (atm) atm.style.display = 'none';
}

window.togglePanel = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
  }
};

function applyPreset(name, focus, short, long) {
  CFG.focus = focus;
  CFG.short = short;
  CFG.long = long;
  localStorage.setItem('pomo_cfg', JSON.stringify(CFG));
  
  if (document.getElementById('inp-focus')) {
    document.getElementById('inp-focus').value = focus;
    document.getElementById('inp-short').value = short;
    document.getElementById('inp-long').value = long;
  }
  
  // Instantly close the presets modal window
  closeModals();

  // Reset the timer and automatically show the chosen preset
  hasStartedCurrentSession = false;
  setMode('focus', false);
  document.getElementById('statusTxt').textContent = name.toUpperCase() + ' PRESET APPLIED!';
}

window.switchTaskTab = (tab) => {
  document.querySelectorAll('#ttab-todo, #ttab-hw, #ttab-exam').forEach(t => t.classList.remove('active'));
  document.getElementById('ttab-' + tab).classList.add('active');
  
  const views = ['todo', 'hw', 'exam'];
  views.forEach(v => {
    const el = document.getElementById('tview-' + v);
    if (v === tab) {
      el.style.display = 'flex';
      el.classList.remove('fade-in');
      void el.offsetWidth; // Trigger DOM reflow to restart animation seamlessly
      el.classList.add('fade-in');
    } else {
      el.style.display = 'none';
    }
  });
};

window.customDialog = (opts) => {
  return new Promise((resolve) => {
    const modal = document.getElementById('customDialogModal');
    const overlay = document.getElementById('dialogOverlay');
    const msgEl = document.getElementById('dialogMessage');
    const inputEl = document.getElementById('dialogInput');
    const multiContainer = document.getElementById('dialogMultiContainer');
    const okBtn = document.getElementById('dialogOkBtn');
    const cancelBtn = document.getElementById('dialogCancelBtn');
    const titleEl = document.getElementById('dialogTitle');

    titleEl.textContent = opts.title || '★ SYSTEM_MESSAGE.EXE';
    msgEl.style.display = opts.message ? 'block' : 'none';
    msgEl.innerHTML = opts.message || '';
    
    if (opts.type === 'prompt') {
      inputEl.style.display = 'block';
      if (multiContainer) multiContainer.style.display = 'none';
      inputEl.value = opts.default || '';
      setTimeout(() => inputEl.focus(), 50);
    } else if (opts.type === 'multi-prompt') {
      inputEl.style.display = 'none';
      if (multiContainer) {
        multiContainer.style.display = 'flex';
        multiContainer.innerHTML = '';
        opts.inputs.forEach((inp, i) => {
          const el = document.createElement('input');
          el.type = inp.type || 'text';
          el.className = 'todo-inp';
          el.placeholder = inp.placeholder || '';
          el.value = inp.default || '';
          el.id = 'multiPromptInp_' + i;
          if (inp.title) el.title = inp.title;
          multiContainer.appendChild(el);
        });
        setTimeout(() => document.getElementById('multiPromptInp_0')?.focus(), 50);
      }
    } else {
      inputEl.style.display = 'none';
      if (multiContainer) multiContainer.style.display = 'none';
      inputEl.value = '';
    }

    if (opts.type === 'confirm' || opts.type === 'prompt' || opts.type === 'multi-prompt') {
      cancelBtn.style.display = 'block';
    } else {
      cancelBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
        overlay.style.display = 'flex';

    const cleanup = () => {
      modal.style.display = 'none';
      overlay.style.display = 'none';
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      inputEl.onkeydown = null;
    };

    okBtn.onclick = () => { 
      cleanup(); 
      if (opts.type === 'prompt') resolve(inputEl.value);
      else if (opts.type === 'multi-prompt') resolve(opts.inputs.map((_, i) => document.getElementById('multiPromptInp_' + i).value));
      else resolve(true); 
    };
    cancelBtn.onclick = () => { cleanup(); resolve(opts.type === 'prompt' || opts.type === 'multi-prompt' ? null : false); };
    
    const handleEnter = (e) => {
      if (e.key === 'Enter') okBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    };
    inputEl.onkeydown = handleEnter;
    if (multiContainer) {
      multiContainer.childNodes.forEach(el => el.onkeydown = handleEnter);
    }
  });
};

window.customAlert = (msg, title) => window.customDialog({ type: 'alert', message: msg, title: title });
window.customConfirm = (msg, title) => window.customDialog({ type: 'confirm', message: msg, title: title });
window.customPrompt = (msg, def, title) => window.customDialog({ type: 'prompt', message: msg, default: def, title: title });

window.openNotes = () => {
  closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('notesModal').style.display = 'flex';
  renderNotesModal();
};

window.addNewNote = async () => {
    const colors = ['#fff7d1', '#ffd1d1', '#d1ffd1', '#d1e8ff', '#e8d1ff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    await window.executeMutation('stickies', 'add', { text: '', x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100, color, pinned: false, width: 200, height: null });
};

window.renderNotesModal = () => {
    const container = document.getElementById('notesModalList');
    if (!container) return;
    const stickies = window.currentStickies || [];
    if (stickies.length === 0) {
        container.innerHTML = `<div class="todo-empty" style="padding: 10px; opacity: 0.8; grid-column: 1 / -1;">NO NOTES YET ★</div>`;
        return;
    }
    const colorPalette = ['#fff7d1', '#ffd1d1', '#d1ffd1', '#d1e8ff', '#e8d1ff', '#fddfff'];

    container.innerHTML = stickies.map(s => {
        const isPinned = s.pinned || false;
        return `
          <div style="background: ${s.color || '#fff7d1'}; padding: 12px; border-radius: 6px; box-shadow: 2px 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; position: relative;">
             <textarea id="note-text-${s.id}" oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';" onchange="window.executeMutation('stickies', 'update', { text: this.value }, '${s.id}')" style="width: 100%; min-height: 80px; height: auto; border: none; background: transparent; resize: none; font-family: 'VT323', monospace; font-size: 16px; outline: none; margin-bottom: 8px; overflow: hidden;" placeholder="Write a note...">${s.text || ''}</textarea>
             <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                ${colorPalette.map(c => `<div onclick="window.executeMutation('stickies', 'update', { color: '${c}' }, '${s.id}')" style="width: 18px; height: 18px; background: ${c}; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); box-shadow: ${s.color === c ? 'inset 0 0 0 2px rgba(0,0,0,0.5)' : 'none'};"></div>`).join('')}
             </div>
             <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px;">
               <label style="font-size: 12px; font-family: 'VT323', monospace; display: flex; align-items: center; gap: 4px; cursor: pointer; color: rgba(0,0,0,0.7); font-weight: bold;">
                  <input type="checkbox" ${isPinned ? 'checked' : ''} onchange="window.executeMutation('stickies', 'update', { pinned: this.checked }, '${s.id}')" style="accent-color: #ff6b6b; cursor: pointer;">
                  PIN TO DESKTOP
               </label>
               <button onclick="deleteItem('stickies', '${s.id}')" style="background: none; border: none; color: #c04080; cursor: pointer; font-size: 12px; opacity: 0.7;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">✕</button>
             </div>
          </div>
        `;
    }).join('');
    
    setTimeout(() => {
        container.querySelectorAll('textarea').forEach(ta => {
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
        });
    }, 10);
};

window.parseNoteMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/^- (.*$)/gm, '<li style="list-style-type: \'★ \'; padding-left: 5px; margin-left: 1em;">$1</li>');
};

// Expose globals for index.html inline event handlers
window.togglePiP = togglePiP;
window.setMode = setMode;
window.handleReset = handleReset;
window.handleStart = handleStart;
window.handleSkip = handleSkip;
window.applyCustom = applyCustom;
window.openPresets = openPresets;
window.openAnalytics = openAnalytics;
window.openSubjects = openSubjects;
window.closeModals = closeModals;
window.applyPreset = applyPreset;
window.openNotes = openNotes;
window.addNewNote = addNewNote;

let currentPetIndex = parseInt(localStorage.getItem('pomo_pet_idx')) || 1;
window.selectPet = async (idx, sync = true) => {
  currentPetIndex = idx;
  localStorage.setItem('pomo_pet_idx', currentPetIndex);
  
  const petImg = document.getElementById('desktopPet');
  if (petImg) petImg.src = `pet/pet ${currentPetIndex}.gif`;
  
  // Highlight selection in Profile Modal
  for(let i=1; i<=4; i++) {
    const el = document.getElementById('petSel'+i);
    if(el) {
      el.style.borderColor = (i === idx) ? 'var(--pink)' : 'var(--border)';
      el.style.background = (i === idx) ? 'var(--lavender)' : 'var(--surface)';
      el.style.boxShadow = (i === idx) ? 'inset 2px 2px 0 rgba(255,255,255,0.5)' : 'none';
    }
  }

  if (sync && window.useFirebase && window.currentUser) {
    try {
      await setDoc(doc(db, "users", currentUser.uid), { petIndex: currentPetIndex }, { merge: true });
    } catch(e) { console.warn("Failed to sync pet:", e); }
  }
};

window.handleSignOut = async () => {
  if (auth && (await window.customConfirm("Are you sure you want to sign out?"))) {
    await signOut(auth);
  }
};

window.openProfile = async () => {
  if (!currentUser) return window.customAlert("You must be signed in to view your profile.");
  closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('profileModal').style.display = 'flex';
  
  document.getElementById('profileEmailDisp').textContent = currentUser.email.toUpperCase();
  
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      document.getElementById('profileNameInp').value = data.displayName || '';
    }
  } catch (err) {
    console.log("Error fetching profile", err);
  }
};

window.saveProfileName = async () => {
  if (!currentUser) return;
  const newName = document.getElementById('profileNameInp').value.trim();
  if (!newName) return window.customAlert("Name cannot be empty.");
  
  try {
    await setDoc(doc(db, "users", currentUser.uid), { displayName: newName }, { merge: true });
    const statusEl = document.getElementById('statusTxt');
    if (statusEl) statusEl.textContent = `WELCOME BACK, ${newName.toUpperCase()}!`;
    const greetEl = document.getElementById('mainGreeting');
    if (greetEl) greetEl.textContent = `★ HELLO, ${newName.toUpperCase()}! ★`;
    await window.customAlert("Profile updated successfully!");
  } catch (err) {
    await window.customAlert("Failed to update name: " + err.message);
  }
};
