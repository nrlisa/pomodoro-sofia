import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, doc, updateDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { firebaseConfig } from './firebase-config.js';

let app, auth, db;
let uid = null;
let useFirebase = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');

    if (user) {
      uid = user.uid;
      useFirebase = true;
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      
      const statusEl = document.getElementById('statusTxt');
      if (statusEl) statusEl.textContent = `LOGGED IN AS: ${user.email}`;

      setupRealtimeTodos();
    } else {
      uid = null;
      useFirebase = false;
      if (loginScreen) loginScreen.style.display = 'block';
      if (mainApp) mainApp.style.display = 'none';
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
let todos = JSON.parse(localStorage.getItem('pomo_todos')) || [];
let todoId = todos.length > 0 ? Math.max(...todos.map(t => typeof t.id === 'number' ? t.id : 0)) + 1 : 0;
let pendingNextMode = null;
let audioCtx = null;
let audioUnlocked = false;
let unsubTodos = null;

function setupRealtimeTodos() {
  if (!useFirebase || !uid) return;
  const todosRef = collection(db, `users/${uid}/todos`);
  unsubTodos = onSnapshot(todosRef, (snapshot) => {
    todos = [];
    snapshot.forEach((doc) => {
      todos.push({ id: doc.id, txt: doc.data().txt, done: doc.data().done, createdAt: doc.data().createdAt });
    });
    // Sort by creation time
    todos.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeA - timeB;
    });
    renderTodos(true); 
  }, (error) => {
    console.error("Firestore onSnapshot error:", error);
    useFirebase = false;
    renderTodos();
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
  mode = m;
  totalSecs = CFG[m] * 60;
  secsLeft = totalSecs;
  document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + m).classList.add('active');
  document.getElementById('timeDisp').className = 'time-disp ' + modeColors[m];
  document.getElementById('ring').className = 'ring-fill ' + modeColors[m];
  document.getElementById('modeLbl').textContent = modeLabels[m];
  document.getElementById('nextLbl').textContent = 'NEXT: ' + modeLabels[getNextMode(m)];
  document.getElementById('startBtn').textContent = 'START';
  document.getElementById('startBtn').classList.add('idle-pulse');
  updateDisp(); updateRing();
  if (autoStart) {
    document.getElementById('statusTxt').textContent = 'AUTO-STARTING...';
    setTimeout(startTimer, 400);
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
    document.getElementById('startBtn').textContent = 'START';
    document.getElementById('startBtn').classList.add('idle-pulse');
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
  document.getElementById('startBtn').textContent = 'PAUSE';
  document.getElementById('startBtn').classList.remove('idle-pulse');
  document.getElementById('statusTxt').textContent = 'RUNNING...';
  tickTimer();
  iv = setInterval(tickTimer, 250);
}

function handleStart() {
  ensureAudio();
  if (running) {
    clearInterval(iv);
    iv = null;
    timerEnd = null;
    running = false;
    document.getElementById('startBtn').textContent = 'START';
    document.getElementById('startBtn').classList.add('idle-pulse');
    document.getElementById('statusTxt').textContent = 'PAUSED';
  } else {
    startTimer();
  }
}

async function onEnd() {
  timerEnd = null;

  if (useFirebase && uid) {
    try {
      const historyRef = collection(db, `users/${uid}/history`);
      await addDoc(historyRef, {
        timestamp: Date.now(),
        mode: mode,
        durationMinutes: CFG[mode]
      });
    } catch (e) {
      console.error("Failed to save history to Firestore", e);
    }
  }

  if (mode === 'focus') {
    sessions = Math.min(sessions + 1, 4);
    localStorage.setItem('pomo_sessions', sessions);
    updateDots();
  }
  pendingNextMode = getNextMode(mode);
  document.getElementById('alarmBar').textContent =
    '★ ' + modeLabels[mode] + ' DONE! CLICK → START ' + modeLabels[pendingNextMode] + ' ★';
  document.getElementById('alarmBar').classList.add('on');
  playLoop();
  document.getElementById('statusTxt').textContent = '★ CLICK BANNER TO CONTINUE ★';
}

function stopAlarmAndNext() {
  stopSound();
  document.getElementById('alarmBar').classList.remove('on');
  const next = pendingNextMode || 'focus';
  pendingNextMode = null;
  setMode(next, true);
}

function handleReset() {
  ensureAudio();
  clearInterval(iv); iv = null; timerEnd = null;
  stopSound(); running = false;
  document.getElementById('startBtn').textContent = 'START';
  document.getElementById('startBtn').classList.add('idle-pulse');
  document.getElementById('alarmBar').classList.remove('on');
  pendingNextMode = null;
  secsLeft = totalSecs; updateDisp(); updateRing();
  document.getElementById('statusTxt').textContent = 'READY';
}

function handleSkip() {
  ensureAudio();
  clearInterval(iv); iv = null; timerEnd = null;
  stopSound(); running = false;
  document.getElementById('startBtn').textContent = 'START';
  document.getElementById('startBtn').classList.add('idle-pulse');
  document.getElementById('alarmBar').classList.remove('on');
  if (mode === 'focus') {
    sessions = Math.min(sessions + 1, 4);
    localStorage.setItem('pomo_sessions', sessions);
    updateDots();
  }
  const next = getNextMode(mode);
  pendingNextMode = null;
  setMode(next, true);
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

async function addTodo() {
  const inp = document.getElementById('todoInp');
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = '';

  if (useFirebase && uid) {
    try {
      const todosRef = collection(db, `users/${uid}/todos`);
      await addDoc(todosRef, {
        txt: txt,
        done: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to add to Firestore", e);
      addTodoLocal(txt);
    }
  } else {
    addTodoLocal(txt);
  }
  inp.focus();
}

function addTodoLocal(txt) {
  todos.push({ id: todoId++, txt, done: false });
  renderTodos();
}

async function toggleTodo(id) {
  const t = todos.find(x => x.id === id);
  if (!t) return;

  if (useFirebase && uid && typeof id === 'string') {
    try {
      const todoRef = doc(db, `users/${uid}/todos/${id}`);
      await updateDoc(todoRef, { done: !t.done });
    } catch (e) {
      console.error("Failed to toggle in Firestore", e);
      t.done = !t.done;
      renderTodos();
    }
  } else {
    t.done = !t.done;
    renderTodos();
  }
}

async function deleteTodo(id) {
  if (useFirebase && uid && typeof id === 'string') {
    try {
      const todoRef = doc(db, `users/${uid}/todos/${id}`);
      await deleteDoc(todoRef);
    } catch (e) {
      console.error("Failed to delete from Firestore", e);
      deleteTodoLocal(id);
    }
  } else {
    deleteTodoLocal(id);
  }
}

function deleteTodoLocal(id) {
  todos = todos.filter(x => x.id !== id);
  renderTodos();
}

function renderTodos(fromSnapshot = false) {
  if (!fromSnapshot || !useFirebase) {
    localStorage.setItem('pomo_todos', JSON.stringify(todos));
  }
  const list = document.getElementById('todoList');
  const stats = document.getElementById('todoStats');
  if (todos.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO TASKS YET ★<br>ADD ONE ABOVE!</div>';
    stats.textContent = ''; return;
  }
  list.innerHTML = '';
  todos.forEach(t => {
    const item = document.createElement('div');
    item.className = 'todo-item' + (t.done ? ' done' : '');
    item.onclick = () => toggleTodo(t.id);
    const safeId = typeof t.id === 'string' ? `'${t.id}'` : t.id;
    item.innerHTML =
      '<div class="todo-check">' + (t.done ? '✓' : '') + '</div>' +
      '<div class="todo-txt">' + t.txt.replace(/</g, '&lt;') + '</div>' +
      '<button class="del-btn" onclick="event.stopPropagation();deleteTodo(' + safeId + ')">✕</button>';
    list.appendChild(item);
  });
  const done = todos.filter(x => x.done).length;
  stats.textContent = done + '/' + todos.length + ' DONE ★';
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
  document.getElementById('startBtn').classList.add('idle-pulse');
  document.getElementById('inp-focus').value = CFG.focus;
  document.getElementById('inp-short').value = CFG.short;
  document.getElementById('inp-long').value = CFG.long;
  updateDisp();
  updateRing();
  updateDots();
  renderTodos();
});

// Expose globals for index.html inline event handlers
window.togglePiP = togglePiP;
window.setMode = setMode;
window.handleReset = handleReset;
window.handleStart = handleStart;
window.handleSkip = handleSkip;
window.applyCustom = applyCustom;
window.stopAlarmAndNext = stopAlarmAndNext;
window.addTodo = addTodo;
window.deleteTodo = deleteTodo;
