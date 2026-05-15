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
let todoId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 0;
let pendingNextMode = null;
let audioCtx = null;
let audioUnlocked = false;

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
    setTimeout(() => { hint.style.display = 'none'; }, 1500);
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
    document.getElementById('statusTxt').textContent = 'PAUSED';
  } else {
    startTimer();
  }
}

function onEnd() {
  timerEnd = null;
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

function addTodo() {
  const inp = document.getElementById('todoInp');
  const txt = inp.value.trim();
  if (!txt) return;
  todos.push({ id: todoId++, txt, done: false });
  inp.value = '';
  renderTodos();
}

function toggleTodo(id) {
  const t = todos.find(x => x.id === id);
  if (t) { t.done = !t.done; renderTodos(); }
}

function deleteTodo(id) {
  todos = todos.filter(x => x.id !== id);
  renderTodos();
}

function renderTodos() {
  localStorage.setItem('pomo_todos', JSON.stringify(todos));
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
    item.innerHTML =
      '<div class="todo-check">' + (t.done ? '✓' : '') + '</div>' +
      '<div class="todo-txt">' + t.txt.replace(/</g, '&lt;') + '</div>' +
      '<button class="del-btn" onclick="event.stopPropagation();deleteTodo(' + t.id + ')">✕</button>';
    list.appendChild(item);
  });
  const done = todos.filter(x => x.done).length;
  stats.textContent = done + '/' + todos.length + ' DONE ★';
}

function drawTimerOnCanvas() {
  const canvas = document.getElementById('timerCanvas');
  const ctx = canvas.getContext('2d');
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;

  ctx.fillStyle = '#fdf0f8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#f0ddf0';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const progress = secsLeft / totalSecs;
  ctx.strokeStyle = mode === 'focus' ? '#f0a0c8' : (mode === 'short' ? '#a0c0f8' : '#c0a0f8');
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  ctx.fillStyle = '#d060a0';
  ctx.font = 'bold 52px VT323';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const m = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const s = String(secsLeft % 60).padStart(2, '0');
  ctx.fillText(m + ':' + s, cx, cy - 10);

  ctx.fillStyle = '#9a7ab8';
  ctx.font = '12px VT323';
  ctx.fillText(modeLabels[mode], cx, cy + 25);
}

async function togglePiP() {
  const video = document.getElementById('pipVideo');
  const canvas = document.getElementById('timerCanvas');
  try {
    if (video !== document.pictureInPictureElement) {
      drawTimerOnCanvas();
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      video.play();
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
  document.getElementById('inp-focus').value = CFG.focus;
  document.getElementById('inp-short').value = CFG.short;
  document.getElementById('inp-long').value = CFG.long;
  updateDisp();
  updateRing();
  updateDots();
  renderTodos();
});
