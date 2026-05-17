import { doc, updateDoc, deleteDoc, addDoc, collection, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, currentUser } from './script.js';

export async function executeMutation(colName, op, data, id = null) {
  if (window.useFirebase && window.currentUser) {
    if (op === 'add') await addDoc(collection(db, "users", window.currentUser.uid, colName), data);
    else if (op === 'update') await updateDoc(doc(db, "users", window.currentUser.uid, colName, id), data);
    else if (op === 'delete') await deleteDoc(doc(db, "users", window.currentUser.uid, colName, id));
    else if (op === 'set') await setDoc(doc(db, "users", window.currentUser.uid, colName, id), data, { merge: true });
  } else {
    const storageKey = `pomo_${colName}`;
    let items = JSON.parse(localStorage.getItem(storageKey)) || [];
    if (op === 'add') items.push({ id: Math.random().toString(36).substring(2, 15), ...data });
    else if (op === 'update' || op === 'set') items = items.map(item => item.id === id ? { ...item, ...data } : item);
    else if (op === 'delete') items = items.filter(item => item.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(items));
    
    if (colName === 'todos' && window.renderTodos) window.renderTodos(items);
    if (colName === 'exams' && window.renderExams) window.renderExams(items);
    if (colName === 'homework' && window.renderHomework) window.renderHomework(items);
    if (colName === 'subjects' && window.renderSubjects) window.renderSubjects(items);
  }
}

window.currentSubjects = [];

// --- CONFETTI UTILITY ---
window.fireConfetti = () => {
  if (typeof confetti !== 'undefined') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f0a0c8', '#a0c0f8', '#c0a0f8', '#7090d0']
    });
  }
};

// --- SUBJECTS OPERATIONS ---
function renderSubjects(subjects) {
  window.currentSubjects = subjects;
  const list = document.getElementById('subjectList');
  if (list) {
    if (subjects.length === 0) {
      list.innerHTML = '<div class="todo-empty">NO SUBJECTS YET ★<br>ADD ONE ABOVE!</div>';
    } else {
      list.innerHTML = subjects.map(s => {
        const subjExams = (window.currentExams || []).filter(e => e.subjectId === s.id);
        const subjHw = (window.currentHomework || []).filter(h => h.subjectId === s.id);
        
        let totalItems = 0;
        let doneItems = 0;
        
        subjExams.forEach(e => {
          const topics = e.topics || [];
          totalItems += topics.length;
          doneItems += topics.filter(t => t.done).length;
        });
        
        subjHw.forEach(h => {
          const tasks = h.tasks || [];
          totalItems += tasks.length;
          doneItems += tasks.filter(t => t.done).length;
        });

        let progressHtml = '';
        if (totalItems > 0) {
          const pct = Math.round((doneItems / totalItems) * 100);
          progressHtml = `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; width: 100%;">
              <div style="flex: 1; height: 6px; background: rgba(0,0,0,0.1); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;" title="Overall Subject Mastery">
                <div style="height: 100%; width: ${pct}%; background: ${s.color}; box-shadow: inset -1px -1px 2px rgba(0,0,0,0.2); transition: width 0.3s;"></div>
              </div>
              <span style="font-size: 12px; font-weight: bold; color: var(--mid); font-family: 'VT323', monospace;">${pct}%</span>
            </div>
          `;
        }

        return `
        <li class="todo-item" onclick="if(event.target.tagName !== 'BUTTON' && event.target.tagName !== 'INPUT') openSubjectOverview('${s.id}')" style="margin-bottom: 10px; border-left: 6px solid ${s.color}; background: var(--surface); cursor: pointer; flex-direction: column; align-items: stretch;" title="Click to view all Homework and Exams">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="display: flex; flex-direction: column; flex: 1;">
              <strong style="font-size: 16px;">${s.name.replace(/</g, '&lt;')}</strong>
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                <span style="font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--lavender); color: var(--dark);">SEM ${s.semester ? s.semester.replace(/</g, '&lt;') : '?'}</span>
                <span style="font-size: 12px; color: var(--muted);">${subjExams.length} EXAMS • ${subjHw.length} HW</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="color" value="${s.color}" onchange="updateSubjectColor('${s.id}', this.value)" style="cursor: pointer; width: 22px; height: 22px; padding: 0; border: 1px solid var(--border); border-radius: 4px; background: transparent;" title="Change Color">
              <button class="del-btn" onclick="editSubject('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${(s.semester||'').replace(/'/g, "\\'")}')" style="opacity: 1;" title="Edit">✏️</button>
              <button class="del-btn" onclick="deleteItem('subjects', '${s.id}')" style="opacity: 1;" title="Delete">✕</button>
            </div>
          </div>
          ${progressHtml}
        </li>
        `;
      }).join('');
    }
  }

  // Auto-fill dropdowns
  const hwSel = document.getElementById('hwSubjectInp');
  const exSel = document.getElementById('examSubjectInp');
  const todoSel = document.getElementById('todoSubjectInp');
  const options = `<option value="">(No Subject)</option>` + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (hwSel) { const prev = hwSel.value; hwSel.innerHTML = options; hwSel.value = prev; }
  if (exSel) { const prev = exSel.value; exSel.innerHTML = options; exSel.value = prev; }
  if (todoSel) { const prev = todoSel.value; todoSel.innerHTML = options; todoSel.value = prev; }

  // Auto-refresh tasks and calendar so color changes cascade instantly!
  if (window.currentExams) renderExams(window.currentExams);
  if (window.currentHomework) renderHomework(window.currentHomework);
  if (window.renderCalendarGrid) window.renderCalendarGrid();
}

window.updateSubjectColor = async (id, newColor) => {
  if (newColor) {
    await executeMutation("subjects", "update", { color: newColor }, id);
  }
};

window.editSubject = async (id, oldName, oldSem) => {
  const newName = await window.customPrompt("Edit Subject Name:", oldName);
  if (newName === null || !newName) return;
  const newSem = await window.customPrompt("Edit Semester (5-9):", oldSem);
  if (newSem === null) return;
  await executeMutation("subjects", "update", { name: newName.trim(), semester: newSem.trim() }, id);
};

document.getElementById('addSubjectBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('subjNameInp').value.trim();
  const semester = document.getElementById('subjSemInp').value;
  const color = document.getElementById('subjColorInp').value;
  if (!name || !semester) return await window.customAlert("Please fill out the Subject Name and Semester!");
  
  await executeMutation("subjects", "add", { name, semester, color });
  document.getElementById('subjNameInp').value = "";
  document.getElementById('subjSemInp').value = "";
});

window.currentSubjectOverviewId = null;
window.openSubjectOverview = (id) => {
  window.currentSubjectOverviewId = id;
  window.closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('subjectOverviewModal').style.display = 'flex';
  window.renderSubjectOverview();
};

window.renderSubjectOverview = () => {
  if (!window.currentSubjectOverviewId || !window.currentSubjects) return;
  const subj = window.currentSubjects.find(s => s.id === window.currentSubjectOverviewId);
  if (!subj) return window.openSubjects();

  document.getElementById('subjOverviewTitle').textContent = `★ ${subj.name.toUpperCase()}_FOLDER.EXE`;

  const exams = (window.currentExams || []).filter(e => e.subjectId === subj.id);
  const homework = (window.currentHomework || []).filter(h => h.subjectId === subj.id);
  const exList = document.getElementById('subjOverviewExams');
  const hwList = document.getElementById('subjOverviewHw');

  const renderMiniCard = (item, typeStr, typeBg, onclickFn, isSubmitted) => `
    <li class="todo-item ${isSubmitted ? 'done' : ''}" onclick="${onclickFn}('${item.id}')" style="margin-bottom: 6px; border-left: 6px solid ${subj.color}; background: var(--surface); cursor: pointer;" title="Open Details">
      <span class="todo-txt" style="display: flex; gap: 8px;">
        <span style="font-size: 13px; color: #fff; background: ${isSubmitted ? 'var(--muted)' : typeBg}; padding: 2px 6px; border-radius: 4px;">${typeStr}</span>
        <strong style="${isSubmitted ? 'text-decoration: line-through; color: var(--muted);' : ''}">${item.name}</strong>
      </span>
      <span style="font-size: 13px; color: var(--muted); margin-left: auto;">📅 ${item.date}</span>
    </li>
  `;

  exList.innerHTML = exams.length === 0 ? '<div class="todo-empty" style="padding: 10px;">NO EXAMS ★</div>' : exams.map(e => renderMiniCard(e, 'EXAM', '#c04080', 'openExamModal', false)).join('');
  hwList.innerHTML = homework.length === 0 ? '<div class="todo-empty" style="padding: 10px;">NO HOMEWORK ★</div>' : homework.map(h => renderMiniCard(h, 'HW', '#5070b0', 'openHwModal', h.submitted)).join('');
};

// --- TODO OPERATIONS ---
document.getElementById('addTodoBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('todoInp').value.trim();
  const date = document.getElementById('todoDateInp').value;
  const subjId = document.getElementById('todoSubjectInp').value;
  if (!text) return;
  
  const subj = window.currentSubjects.find(s => s.id === subjId);
  const color = subj ? subj.color : 'var(--blue)';
  const subjectName = subj ? subj.name : '';

  await executeMutation("todos", "add", { text, date, color, subjectId: subjId, subjectName, done: false });
  document.getElementById('todoInp').value = "";
});
document.getElementById('todoInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTodoBtn').click();
  if (e.key === 'Escape') e.target.value = '';
});

function renderTodos(todos) {
  window.currentTodos = todos; // Store globally for the confetti check
  
  const badge = document.getElementById('badge-todo');
  if (badge) badge.textContent = todos.filter(t => !t.done).length;

  const list = document.getElementById('todoList');
  if (!list) return;
  
  if (todos.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO TASKS YET ★<br>ADD ONE ABOVE!</div>';
    return;
  }
  
  list.innerHTML = todos.map(t => {
    const dateStr = t.date ? `<span style="font-size: 13px; color: var(--muted); margin-left: auto;">📅 ${t.date}</span>` : '';
    const subj = window.currentSubjects.find(s => s.id === t.subjectId);
    const color = subj ? subj.color : (t.color || 'var(--blue)');
    const subjBadge = subj ? `<span style="font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--lavender); color: var(--dark); margin-right: 8px;">📚 ${subj.name}</span>` : (t.subjectName ? `<span style="font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--lavender); color: var(--dark); margin-right: 8px;">📚 ${t.subjectName}</span>` : '');
    
    return `
      <li class="todo-item ${t.done ? 'done' : ''}" style="margin-bottom: 10px; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); display: flex; align-items: center; justify-content: space-between; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="display: flex; flex-direction: column; flex: 1; gap: 4px;">
          <span class="todo-txt" style="cursor: pointer; display: flex; align-items: center; gap: 10px;" onclick="toggleTodo('${t.id}', ${t.done})">
            <div class="todo-check" style="width: 20px; height: 20px; border-radius: 4px;">${t.done ? '✓' : ''}</div>
            <strong style="font-size: 17px;">${t.text.replace(/</g, '&lt;')}</strong>
          </span>
          <div style="display: flex; align-items: center; padding-left: 30px;">
            ${subjBadge}
            ${dateStr}
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-left: 12px;">
          <button onclick="editItem('todos', '${t.id}', '${t.text.replace(/'/g, "\\'")}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'" title="Edit">✏️</button>
          <button onclick="deleteItem('todos', '${t.id}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2) rotate(90deg)'; this.style.color='#c04080'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'; this.style.color='inherit'" title="Delete">✕</button>
        </div>
      </li>
    `;
  }).join('');

  if (window.renderCalendarGrid) window.renderCalendarGrid();
}

// --- EXAM OPERATIONS ---
document.getElementById('addExamBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('examNameInp').value.trim();
  const date = document.getElementById('examDateInp').value;
  const subjId = document.getElementById('examSubjectInp').value;
  if (!name || !date) return;
  
  const subj = window.currentSubjects.find(s => s.id === subjId);
  const color = subj ? subj.color : '#f2e1e8';
  const subjectName = subj ? subj.name : '';

  await executeMutation("exams", "add", { name, date, color, subjectId: subjId, subjectName, topics: [] });
  document.getElementById('examNameInp').value = "";
  document.getElementById('examDateInp').value = "";
});
document.getElementById('examNameInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addExamBtn').click();
});

function renderExams(exams) {
  window.currentExams = exams; // Store globally for the modal
  
  // Live update the modal if it is currently open
  if (window.currentExamId && document.getElementById('examModal').style.display !== 'none') {
    window.renderExamModal();
  }

  const list = document.getElementById('examList');
  if (!list) return;
  const today = new Date();
  today.setHours(0,0,0,0);

  let ongoingCount = 0;

  if (exams.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO TESTS UPCOMING ★</div>';
    return;
  }

  list.innerHTML = exams.map(e => {
    const examDate = new Date(e.date);
    examDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft >= 0) ongoingCount++;

    let statusText = `${daysLeft} DAYS LEFT`;
    let titleStyle = "color: var(--text);";
    let badgeBg = "var(--dark)";
    let badgeColor = "var(--pink)";
    let badgeBorder = "var(--pink)";
    let glowAnim = "";
    
    if (daysLeft === 0) {
      titleStyle = "color: #c04080; font-weight: bold;";
      statusText = "🚨 TODAY!!!";
      badgeBg = "#c04080"; badgeColor = "#fff"; badgeBorder = "#a03060";
      glowAnim = "animation: examTodayGlow 2s infinite;";
    } else if (daysLeft > 0 && daysLeft <= 3) {
      titleStyle = "color: #c04080;";
      statusText = `⚠️ ${daysLeft} DAYS LEFT`;
      badgeBg = "#d080b0"; badgeColor = "#fff"; badgeBorder = "#b06090";
    } else if (daysLeft < 0) {
      titleStyle = "color: var(--muted); text-decoration: line-through;";
      statusText = "PASSED";
      badgeBg = "var(--bg)"; badgeColor = "var(--muted)"; badgeBorder = "var(--border)";
    }

    const subj = window.currentSubjects.find(s => s.id === e.subjectId);
    const color = subj ? subj.color : (e.color || '#f0a0c8');

    let progressHtml = '';
    if (e.topics && e.topics.length > 0) {
      const total = e.topics.length;
      const done = e.topics.filter(t => t.done).length;
      const pct = Math.round((done / total) * 100);
      progressHtml = `
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
          <div style="flex: 1; height: 8px; background: rgba(0,0,0,0.1); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;" title="${done}/${total} Topics Completed">
            <div style="height: 100%; width: ${pct}%; background: ${color}; box-shadow: inset -1px -1px 2px rgba(0,0,0,0.2); transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 13px; font-weight: bold; color: var(--mid); min-width: 32px; text-align: right; font-family: 'VT323', monospace;">${pct}%</span>
        </div>
      `;
    }

    const hasNotes = e.notes && e.notes.trim().length > 0;
    const notesIcon = hasNotes ? `<span style="font-size: 15px; margin-left: 6px; opacity: 0.9;" title="Contains Notes">📝</span>` : '';
    const subjText = subj ? ` • 📚 ${subj.name}` : (e.subjectName ? ` • 📚 ${e.subjectName}` : '');

    return `
      <li class="todo-item" onclick="if(event.target.tagName !== 'BUTTON') openExamModal('${e.id}')" style="margin-bottom: 10px; flex-direction: column; align-items: stretch; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); cursor: pointer; transition: transform 0.2s; box-shadow: 2px 2px 0 rgba(0,0,0,0.05); ${glowAnim}" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'" title="Click to view Study Topics & Notes">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <strong style="font-size: 17px; word-break: break-word; line-height: 1.2; ${titleStyle}">${e.name.replace(/</g, '&lt;')}${notesIcon}</strong>
              <span style="font-size: 13px; color: var(--muted); letter-spacing: 0.5px;">📅 ${e.date}${subjText}</span>
          </div>
          <span style="font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; background: ${badgeBg}; color: ${badgeColor}; text-align: center; white-space: nowrap; box-shadow: 1px 1px 0 rgba(0,0,0,0.1); border: 1px solid ${badgeBorder};">
            ${statusText}
          </span>
        </div>
        ${progressHtml}
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 14px; margin-top: 12px; border-top: 1px dashed var(--border); padding-top: 10px;">
          <button onclick="editExam('${e.id}', '${e.name.replace(/'/g, "\\'")}', '${e.date}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'" title="Edit">✏️</button>
          <button onclick="deleteItem('exams', '${e.id}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2) rotate(90deg)'; this.style.color='#c04080'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'; this.style.color='inherit'" title="Delete">✕</button>
        </div>
      </li>
    `;
  }).join('');
  const badge = document.getElementById('badge-exam');
  if (badge) badge.textContent = ongoingCount;

  if (window.renderCalendarGrid) window.renderCalendarGrid();
}

// --- EXAM STUDY TOPICS OPERATIONS ---
window.currentExamId = null;

window.openExamModal = (id) => {
  window.currentExamId = id;
  window.closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('examModal').style.display = 'flex';
  window.renderExamModal();
};

window.renderExamModal = () => {
  if (!window.currentExamId || !window.currentExams) return;
  const exam = window.currentExams.find(e => e.id === window.currentExamId);
  if (!exam) return window.closeModals();
  
  document.getElementById('examModalTitle').textContent = `★ ${exam.name.toUpperCase()}_TOPICS.EXE`;
  document.getElementById('examNotesInp').value = exam.notes || '';

  const list = document.getElementById('topicList');
  const topics = exam.topics || [];
  
  if (topics.length === 0) {
    list.innerHTML = '<div class="todo-empty" style="text-align: left;">NO TOPICS YET ★<br>ADD WHAT YOU NEED TO STUDY ABOVE!</div>';
  } else {
    list.innerHTML = topics.map((t, idx) => `
      <li class="todo-item ${t.done ? 'done' : ''}" style="margin-bottom: 6px; border-color: ${exam.color || 'var(--border)'};">
        <span class="todo-txt" style="cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="toggleTopic('${exam.id}', ${idx}, ${t.done})">
          <div class="todo-check">${t.done ? '✓' : ''}</div>
          ${t.text.replace(/</g, '&lt;')}
        </span>
        <button class="del-btn" onclick="deleteTopic('${exam.id}', ${idx})" style="opacity: 1; margin-left: auto;">✕</button>
      </li>
    `).join('');
  }
};

document.getElementById('addTopicBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('topicInp').value.trim();
  if (!text || !window.currentExamId) return;
  const exam = window.currentExams.find(e => e.id === window.currentExamId);
  if (!exam) return;
  const newTopics = [...(exam.topics || []), { text, done: false }];
  await executeMutation("exams", "update", { topics: newTopics }, window.currentExamId);
  document.getElementById('topicInp').value = '';
});
document.getElementById('topicInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTopicBtn').click();
});

document.getElementById('examNotesInp')?.addEventListener('change', async (e) => {
  if (!window.currentExamId) return;
  await executeMutation("exams", "update", { notes: e.target.value }, window.currentExamId);
});

window.toggleTopic = async (examId, topicIdx, currentStatus) => {
  const exam = window.currentExams.find(e => e.id === examId);
  if(!exam) return;
  const newTopics = [...(exam.topics || [])];
  newTopics[topicIdx].done = !currentStatus;
  await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.deleteTopic = async (examId, topicIdx) => {
  const exam = window.currentExams.find(e => e.id === examId);
  if(!exam || !(await window.customConfirm("Delete this study topic?"))) return;
  const newTopics = [...(exam.topics || [])];
  newTopics.splice(topicIdx, 1);
  await executeMutation("exams", "update", { topics: newTopics }, examId);
};
window.toggleTodo = async (id, currentStatus) => {
  if (!currentStatus && window.currentTodos) {
    const tempTodos = window.currentTodos.map(t => t.id === id ? { ...t, done: true } : t);
    if (tempTodos.length > 0 && tempTodos.every(t => t.done)) window.fireConfetti();
  }
  await executeMutation("todos", "update", { done: !currentStatus }, id);
};

window.deleteItem = async (type, id) => {
  if (await window.customConfirm("Delete this item?")) {
    await executeMutation(type, "delete", null, id);
  }
};

window.editItem = async (type, id, oldText) => {
  const newText = await window.customPrompt(`Edit entry:`, oldText);
  if (newText && newText.trim() !== "") {
    await executeMutation(type, "update", { text: newText.trim() }, id);
  }
};

window.clearCompletedTodos = async () => {
  if (!window.currentTodos) return;
  const completed = window.currentTodos.filter(t => t.done);
  if (completed.length === 0) {
    await window.customAlert("No completed tasks to clear!");
    return;
  }
  if (await window.customConfirm(`Sweep away ${completed.length} completed task(s)?`)) {
    for (const task of completed) {
      await executeMutation("todos", "delete", null, task.id);
    }
  }
};

window.editExam = async (id, oldName, oldDate) => {
  const newName = await window.customPrompt("Edit Exam Name:", oldName);
  if (!newName) return;
  const newDate = await window.customPrompt("Edit Exam Date (YYYY-MM-DD):", oldDate);
  if (!newDate) return;
  await executeMutation("exams", "update", { name: newName.trim(), date: newDate }, id);
};

// --- HOMEWORK TRACKER OPERATIONS ---
document.getElementById('addHwBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('hwNameInp').value.trim();
  const date = document.getElementById('hwDateInp').value;
  const subjId = document.getElementById('hwSubjectInp').value;
  if (!name || !date) return;
  
  const subj = window.currentSubjects.find(s => s.id === subjId);
  const color = subj ? subj.color : '#e1eaf2';
  const subjectName = subj ? subj.name : '';

  await executeMutation("homework", "add", { name, date, color, subjectId: subjId, subjectName, tasks: [], notes: '', submitted: false });
  document.getElementById('hwNameInp').value = "";
  document.getElementById('hwDateInp').value = "";
});
document.getElementById('hwNameInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addHwBtn').click();
});

function renderHomework(hwItems) {
  window.currentHomework = hwItems;
  if (window.currentHwId && document.getElementById('hwModal').style.display !== 'none') {
    window.renderHwModal();
  }

  const list = document.getElementById('hwList');
  if (!list) return;
  const today = new Date();
  today.setHours(0,0,0,0);

  let ongoingCount = 0;

  if (hwItems.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO HOMEWORK DUE ★</div>';
    return;
  }

  list.innerHTML = hwItems.map(h => {
    const hwDate = new Date(h.date);
    hwDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((hwDate - today) / (1000 * 60 * 60 * 24));
    const isSubmitted = h.submitted || false;
    
    if (!isSubmitted && daysLeft >= 0) ongoingCount++;

    let statusText = `${daysLeft} DAYS LEFT`;
    let titleStyle = "color: var(--text);";
    let badgeBg = "var(--dark)";
    let badgeColor = "var(--blue)";
    let badgeBorder = "var(--blue)";
    let glowAnim = "";
    
    if (isSubmitted) {
      titleStyle = "color: var(--muted); text-decoration: line-through;";
      statusText = "✅ SUBMITTED";
      badgeBg = "var(--mint)"; badgeColor = "var(--dark)"; badgeBorder = "#a0d8c0";
    } else {
      if (daysLeft === 0) {
        titleStyle = "color: #3060c0; font-weight: bold;";
        statusText = "🚨 DUE TODAY!!!";
        badgeBg = "#3060c0"; badgeColor = "#fff"; badgeBorder = "#204090";
        glowAnim = "animation: examTodayGlow 2s infinite;";
      } else if (daysLeft > 0 && daysLeft <= 2) {
        titleStyle = "color: #3060c0;";
        statusText = `⚠️ ${daysLeft} DAYS LEFT`;
        badgeBg = "#7090d0"; badgeColor = "#fff"; badgeBorder = "#5070b0";
      } else if (daysLeft < 0) {
        titleStyle = "color: #c04080; font-weight: bold;";
        statusText = "❌ PAST DUE";
        badgeBg = "#f2e1e8"; badgeColor = "#c04080"; badgeBorder = "#c04080";
      }
    }

    const subj = window.currentSubjects.find(s => s.id === h.subjectId);
    const color = subj ? subj.color : (h.color || '#a0c0f8');
    let progressHtml = '';
    if (h.tasks && h.tasks.length > 0) {
      const total = h.tasks.length;
      const done = h.tasks.filter(t => t.done).length;
      const pct = Math.round((done / total) * 100);
      progressHtml = `
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
          <div style="flex: 1; height: 8px; background: rgba(0,0,0,0.1); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;" title="${done}/${total} Tasks Completed">
            <div style="height: 100%; width: ${pct}%; background: ${color}; box-shadow: inset -1px -1px 2px rgba(0,0,0,0.2); transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 13px; font-weight: bold; color: var(--mid); min-width: 32px; text-align: right; font-family: 'VT323', monospace;">${pct}%</span>
        </div>
      `;
    }

    const hasNotes = h.notes && h.notes.trim().length > 0;
    const notesIcon = hasNotes ? `<span style="font-size: 15px; margin-left: 6px; opacity: 0.9;" title="Contains Notes">📝</span>` : '';
    const subjText = subj ? ` • 📚 ${subj.name}` : (h.subjectName ? ` • 📚 ${h.subjectName}` : '');

    return `
      <li class="todo-item ${isSubmitted ? 'done' : ''}" onclick="if(event.target.tagName !== 'BUTTON') openHwModal('${h.id}')" style="margin-bottom: 10px; flex-direction: column; align-items: stretch; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); cursor: pointer; transition: transform 0.2s; box-shadow: 2px 2px 0 rgba(0,0,0,0.05); ${glowAnim}" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <strong style="font-size: 17px; word-break: break-word; line-height: 1.2; ${titleStyle}">${h.name.replace(/</g, '&lt;')}${notesIcon}</strong>
              <span style="font-size: 13px; color: var(--muted); letter-spacing: 0.5px;">📅 ${h.date}${subjText}</span>
          </div>
          <span style="font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; background: ${badgeBg}; color: ${badgeColor}; text-align: center; white-space: nowrap; box-shadow: 1px 1px 0 rgba(0,0,0,0.1); border: 1px solid ${badgeBorder};">
            ${statusText}
          </span>
        </div>
        ${progressHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px dashed var(--border); padding-top: 10px;">
          <button onclick="toggleHwSubmit('${h.id}', ${isSubmitted})" style="background: ${isSubmitted ? 'var(--bg)' : 'var(--mint)'}; border: 1px solid ${isSubmitted ? 'var(--border)' : '#a0d8c0'}; border-radius: 4px; padding: 2px 8px; font-family: 'VT323', monospace; font-size: 13px; color: ${isSubmitted ? 'var(--muted)' : 'var(--dark)'}; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">${isSubmitted ? '↩️ UNDO SUBMIT' : '✅ MARK SUBMITTED'}</button>
          <div style="display: flex; gap: 14px; align-items: center;">
            <button onclick="editHw('${h.id}', '${h.name.replace(/'/g, "\\'")}', '${h.date}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'" title="Edit">✏️</button>
            <button onclick="deleteItem('homework', '${h.id}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2) rotate(90deg)'; this.style.color='#c04080'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'; this.style.color='inherit'" title="Delete">✕</button>
          </div>
        </div>
      </li>
    `;
  }).join('');
  const badge = document.getElementById('badge-hw');
  if (badge) badge.textContent = ongoingCount;

  if (window.renderCalendarGrid) window.renderCalendarGrid();
}

window.currentHwId = null;
window.openHwModal = (id) => {
  window.currentHwId = id;
  window.closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('hwModal').style.display = 'flex';
  window.renderHwModal();
};

window.renderHwModal = () => {
  if (!window.currentHwId || !window.currentHomework) return;
  const hw = window.currentHomework.find(h => h.id === window.currentHwId);
  if (!hw) return window.closeModals();
  
  document.getElementById('hwModalTitle').textContent = `★ ${hw.name.toUpperCase()}_TASKS.EXE`;
  document.getElementById('hwNotesInp').value = hw.notes || '';

  const list = document.getElementById('hwTaskList');
  const tasks = hw.tasks || [];
  
  if (tasks.length === 0) {
    list.innerHTML = '<div class="todo-empty" style="text-align: left;">NO TASKS YET ★<br>ADD WHAT YOU NEED TO DO ABOVE!</div>';
  } else {
    list.innerHTML = tasks.map((t, idx) => `
      <li class="todo-item ${t.done ? 'done' : ''}" style="margin-bottom: 6px; border-color: ${hw.color || 'var(--border)'};">
        <span class="todo-txt" style="cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="toggleHwTask('${hw.id}', ${idx}, ${t.done})">
          <div class="todo-check">${t.done ? '✓' : ''}</div>
          ${t.text.replace(/</g, '&lt;')}
        </span>
        <button class="del-btn" onclick="deleteHwTask('${hw.id}', ${idx})" style="opacity: 1; margin-left: auto;">✕</button>
      </li>
    `).join('');
  }
};

document.getElementById('addHwTaskBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('hwTaskInp').value.trim();
  if (!text || !window.currentHwId) return;
  const hw = window.currentHomework.find(h => h.id === window.currentHwId);
  const newTasks = [...(hw.tasks || []), { text, done: false }];
  await executeMutation("homework", "update", { tasks: newTasks }, window.currentHwId);
  document.getElementById('hwTaskInp').value = '';
});
document.getElementById('hwTaskInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addHwTaskBtn').click();
});

document.getElementById('hwNotesInp')?.addEventListener('change', async (e) => {
  if (!window.currentHwId) return;
  await executeMutation("homework", "update", { notes: e.target.value }, window.currentHwId);
});

window.toggleHwTask = async (hwId, taskIdx, currentStatus) => {
  const hw = window.currentHomework.find(h => h.id === hwId);
  if(!hw) return;
  const newTasks = [...(hw.tasks || [])];
  newTasks[taskIdx].done = !currentStatus;
  if (!currentStatus && newTasks.length > 0 && newTasks.every(t => t.done)) window.fireConfetti();
  await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.toggleHwSubmit = async (hwId, currentStatus) => {
  if (!currentStatus) window.fireConfetti();
  await executeMutation("homework", "update", { submitted: !currentStatus }, hwId);
};

window.deleteHwTask = async (hwId, taskIdx) => {
  const hw = window.currentHomework.find(h => h.id === hwId);
  if(!hw || !(await window.customConfirm("Delete this sub-task?"))) return;
  const newTasks = [...(hw.tasks || [])];
  newTasks.splice(taskIdx, 1);
  await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.editHw = async (id, oldName, oldDate) => {
  const newName = await window.customPrompt("Edit Assignment Name:", oldName);
  if (!newName) return;
  const newDate = await window.customPrompt("Edit Due Date (YYYY-MM-DD):", oldDate);
  if (!newDate) return;
  await executeMutation("homework", "update", { name: newName.trim(), date: newDate }, id);
};

export { renderTodos, renderExams, renderHomework, renderSubjects };