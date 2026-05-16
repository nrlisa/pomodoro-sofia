import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, updateDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { firebaseConfig } from './firebase-config.js';

let app, auth, db;
let currentUser = null;
let useFirebase = false;
let historyDocs = [];
let unsubHistory = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');

    if (user) {
      currentUser = user;
      useFirebase = true;
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      
      const statusEl = document.getElementById('statusTxt');
      if (statusEl) statusEl.textContent = `LOGGED IN AS: ${user.email}`;

      syncData('todos', collection(db, "users", user.uid, "todos"), renderTodos);
      syncData('exams', collection(db, "users", user.uid, "exams"), renderExams);
      setupRealtimeHistory();
    } else {
      currentUser = null;
      useFirebase = false;
      if (loginScreen) loginScreen.style.display = 'block';
      if (mainApp) mainApp.style.display = 'none';
      
      if (unsubHistory) { unsubHistory(); unsubHistory = null; }
      
      document.getElementById('todoList').innerHTML = "<li>Please sign in to view items.</li>";
      document.getElementById('examList').innerHTML = "";
      renderHistory();
    }
  });

  const signInBtn = document.getElementById('signInBtn');
  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errorDiv = document.getElementById('authError');
      errorDiv.textContent = "";

      if (!email || !password) {
        errorDiv.textContent = "⚠️ INPUTS CANNOT BE EMPTY";
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (loginError) {
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (registerError) {
            errorDiv.textContent = `⚠️ ${registerError.message.replace("Firebase: ", "")}`;
          }
        } else {
          errorDiv.textContent = `⚠️ ${loginError.message.replace("Firebase: ", "")}`;
        }
      }
    });
  }

} catch (e) {
  console.error("Firebase init failed. Falling back to localStorage.", e);
  useFirebase = false;
}

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
    audioCtx.resume();
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
  stopSound();
  function beep() {
    if (!audioCtx) return;
    const freqs = [523, 659, 784, 659];
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'square';
      o.frequency.value = f;
      const t = audioCtx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.linearRampToValueAtTime(0, t + 0.16);
      o.start(t);
      o.stop(t + 0.2);
      alarmNodes.push(o);
    });
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
  document.getElementById('ring').className = 'ring-fill ' + modeColors[m];
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
    const txt = running ? 'PAUSE' : 'RESUME';
    const clz = running ? '' : 'idle-pulse';
    container.innerHTML = `
      <div class="${clz}" style="font-family: 'VT323', monospace; font-size: 14px; color: var(--muted); letter-spacing: 2px; margin-top: 14px;">${txt}</div>
    `;
  }
}

function applyCustom() {
  if (running) return;
  CFG.focus = Math.min(120, Math.max(1, parseInt(document.getElementById('inp-focus').value) || 25));
  CFG.short = Math.min(60,  Math.max(1, parseInt(document.getElementById('inp-short').value) || 5));
  CFG.long  = Math.min(90,  Math.max(1, parseInt(document.getElementById('inp-long').value)  || 15));
  document.getElementById('inp-focus').value = CFG.focus;
  document.getElementById('inp-short').value = CFG.short;
  document.getElementById('inp-long').value  = CFG.long;
  localStorage.setItem('pomo_cfg', JSON.stringify(CFG));
  totalSecs = CFG[mode] * 60;
  secsLeft = totalSecs;
  updateDisp(); updateRing();
  document.getElementById('statusTxt').textContent = 'TIMES UPDATED!';
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
    updateStartBtnUI();
    document.getElementById('statusTxt').textContent = 'PAUSED';
  } else {
    startTimer();
  }
}

async function onEnd() {
  timerEnd = null;

  const historyItem = {
    timestamp: Date.now(),
    mode: mode,
    durationMinutes: CFG[mode]
  };

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

  if (mode === 'focus') {
    sessions = Math.min(sessions + 1, 4);
    localStorage.setItem('pomo_sessions', sessions);
    updateDots();
  }
  pendingNextMode = getNextMode(mode);
  
  playLoop();
  document.getElementById('statusTxt').textContent = '★ SESSION COMPLETE ★';
  
  hasStartedCurrentSession = false;
  // Auto switch mode, wait for user to start it manually
  setMode(pendingNextMode, false);
}

function addHistoryLocal(item) {
  let localHist = JSON.parse(localStorage.getItem('pomo_history')) || [];
  localHist.push(item);
  localStorage.setItem('pomo_history', JSON.stringify(localHist));
  renderHistory();
}

function renderHistory() {
  const listEl = document.getElementById('analyticsHistoryList');
  if (!listEl) return;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let items = useFirebase ? historyDocs : (JSON.parse(localStorage.getItem('pomo_history')) || []);
  
  items = items.filter(i => i.timestamp >= sevenDaysAgo);
  items.sort((a, b) => b.timestamp - a.timestamp);

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

// --- TODO OPERATIONS ---
document.getElementById('addTodoBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('todoInp').value.trim();
  if (!text || !currentUser) return;
  await addDoc(collection(db, "users", currentUser.uid, "todos"), { text, done: false });
  document.getElementById('todoInp').value = "";
});
document.getElementById('todoInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTodoBtn').click();
  if (e.key === 'Escape') e.target.value = '';
});

function renderTodos(todos) {
  const list = document.getElementById('todoList');
  if (!list) return;
  
  if (todos.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO TASKS YET ★<br>ADD ONE ABOVE!</div>';
    return;
  }
  
  list.innerHTML = todos.map(t => `
    <li class="todo-item ${t.done ? 'done' : ''}" style="margin-bottom: 6px;">
      <span class="todo-txt" style="cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="toggleTodo('${t.id}', ${t.done})">
        <div class="todo-check">${t.done ? '✓' : ''}</div>
        ${t.text.replace(/</g, '&lt;')}
      </span>
      <div style="display: flex; gap: 4px; margin-left: auto;">
        <button class="del-btn" onclick="editItem('todos', '${t.id}', '${t.text.replace(/'/g, "\\'")}')" style="opacity: 1; font-size: 14px;">✏️</button>
        <button class="del-btn" onclick="deleteItem('todos', '${t.id}')" style="opacity: 1;">✕</button>
      </div>
    </li>
  `).join('');
}

// --- EXAM OPERATIONS ---
document.getElementById('addExamBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('examNameInp').value.trim();
  const date = document.getElementById('examDateInp').value;
  if (!name || !date || !currentUser) return;
  await addDoc(collection(db, "users", currentUser.uid, "exams"), { name, date });
  document.getElementById('examNameInp').value = "";
  document.getElementById('examDateInp').value = "";
});
document.getElementById('examNameInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addExamBtn').click();
});

function renderExams(exams) {
  const list = document.getElementById('examList');
  if (!list) return;
  const today = new Date();
  today.setHours(0,0,0,0);

  if (exams.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO TESTS UPCOMING ★</div>';
    return;
  }

  list.innerHTML = exams.map(e => {
    const examDate = new Date(e.date);
    examDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    let style = "color: var(--text);";
    let statusText = `${daysLeft} days left`;
    
    if (daysLeft === 0) {
      style = "color: #c04080; font-weight: bold;";
      statusText = "🚨 TODAY!!!";
    } else if (daysLeft > 0 && daysLeft <= 3) {
      style = "color: #c04080;";
      statusText = `⚠️ ONLY ${daysLeft} DAYS LEFT!`;
    } else if (daysLeft < 0) {
      style = "color: var(--muted); text-decoration: line-through;";
      statusText = "PASSED";
    }

    return `
      <li class="todo-item" style="margin-bottom: 6px; ${style}">
        <span class="todo-txt" style="display: flex; flex-direction: column; gap: 4px;">
          <strong>${e.name.replace(/</g, '&lt;')}</strong>
          <span style="font-size: 13px; color: var(--pink); background: var(--dark); padding: 2px 6px; border-radius: 4px; align-self: flex-start; letter-spacing: 1px;">📅 ${e.date} (${statusText})</span>
        </span>
        <div style="display: flex; gap: 4px; margin-left: auto;">
          <button class="del-btn" onclick="editExam('${e.id}', '${e.name.replace(/'/g, "\\'")}', '${e.date}')" style="opacity: 1; font-size: 14px;">✏️</button>
          <button class="del-btn" onclick="deleteItem('exams', '${e.id}')" style="opacity: 1;">✕</button>
        </div>
      </li>
    `;
  }).join('');
}

// --- GLOBAL MUTATION UTILITIES ---
window.toggleTodo = async (id, currentStatus) => {
  if(!currentUser) return;
  await updateDoc(doc(db, "users", currentUser.uid, "todos", id), { done: !currentStatus });
};

window.deleteItem = async (type, id) => {
  if (currentUser && confirm("Delete this item?")) {
    await deleteDoc(doc(db, "users", currentUser.uid, type, id));
  }
};

window.editItem = async (type, id, oldText) => {
  const newText = prompt(`Edit entry:`, oldText);
  if (currentUser && newText && newText.trim() !== "") {
    await updateDoc(doc(db, "users", currentUser.uid, type, id), { text: newText.trim() });
  }
};

window.editExam = async (id, oldName, oldDate) => {
  const newName = prompt("Edit Exam Name:", oldName);
  if (!newName || !currentUser) return;
  const newDate = prompt("Edit Exam Date (YYYY-MM-DD):", oldDate);
  if (!newDate) return;
  await updateDoc(doc(db, "users", currentUser.uid, "exams", id), { name: newName.trim(), date: newDate });
};


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
  ctx.font = 'bold 30px VT323';
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

window.addEventListener('load', () => {
  updateStartBtnUI();
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
});

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

function closeModals() {
  document.getElementById('modalsContainer').style.display = 'none';
  document.getElementById('presetsModal').style.display = 'none';
  document.getElementById('analyticsModal').style.display = 'none';
}

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
  
  hasStartedCurrentSession = false;
  setMode('focus', false);
  closeModals();
  document.getElementById('statusTxt').textContent = name + ' PRESET APPLIED!';
}

// Expose globals for index.html inline event handlers
window.togglePiP = togglePiP;
window.setMode = setMode;
window.handleReset = handleReset;
window.handleStart = handleStart;
window.handleSkip = handleSkip;
window.applyCustom = applyCustom;
window.openPresets = openPresets;
window.openAnalytics = openAnalytics;
window.closeModals = closeModals;
window.applyPreset = applyPreset;
