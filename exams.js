import { executeMutation } from './tasks.js';

// --- EXAM OPERATIONS ---
document.getElementById('addExamBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('examNameInp').value.trim();
  const date = document.getElementById('examDateInp').value;
  const time = document.getElementById('examTimeInp').value;
  const subjId = document.getElementById('examSubjectInp').value;
  if (!name || !date) return;
  
  const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === subjId) : null;
  const color = subj ? subj.color : '#f2e1e8';
  const subjectName = subj ? subj.name : '';

  await executeMutation("exams", "add", { name, date, time, color, subjectId: subjId, subjectName, topics: [] });
  document.getElementById('examNameInp').value = "";
  document.getElementById('examDateInp').value = "";
  document.getElementById('examTimeInp').value = "";
});

document.getElementById('examNameInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addExamBtn').click();
});

window.currentExamFilter = 'upcoming';
window.applyExamFilter = () => {
  const sel = document.getElementById('examFilterSel');
  if (sel) window.currentExamFilter = sel.value;
  if (window.currentExams) renderExams(window.currentExams);
};

export function renderExams(exams) {
  window.currentExams = exams;
  
  if (window.currentExamId && document.getElementById('examModal').style.display !== 'none') {
    window.renderExamModal();
  }

  const list = document.getElementById('examList');
  if (!list) return;
  const today = new Date();
  today.setHours(0,0,0,0);

  let ongoingCount = 0;

  if (exams.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO EXAMS SCHEDULED ★</div>';
    const badge = document.getElementById('badge-exam');
    if (badge) badge.textContent = ongoingCount;
    return;
  }

  let htmlStr = '';
  let displayItems = [...exams];
  displayItems.sort((a,b) => {
      const da = new Date(a.time ? `${a.date}T${a.time}` : `${a.date}T23:59:59`).getTime();
      const db = new Date(b.time ? `${b.date}T${b.time}` : `${b.date}T23:59:59`).getTime();
      return da - db;
  });

  displayItems.forEach(e => {
    const examDate = new Date(e.date);
    examDate.setHours(0,0,0,0);
    const calendarDaysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    const exactTarget = new Date(e.time ? `${e.date}T${e.time}` : `${e.date}T23:59:59`);
    const diffMs = exactTarget - new Date();
    const isPassed = diffMs < 0;
    
    const prog = window.getTaskProgress(e, 'exam');

    const isCompleted = isPassed || prog.allDone;
    
    if (!isCompleted && diffMs >= 0) ongoingCount++;

    if (window.currentExamFilter === 'upcoming' && isCompleted) return;
    if (window.currentExamFilter === 'passed' && !isCompleted) return;
    if (window.currentExamFilter === 'sort_nearest' && isCompleted) return;

    let statusText = "";
    if (diffMs >= 0) {
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hr = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diffMs / 1000 / 60) % 60);
        if (d > 0) statusText = `${d}d ${hr}h LEFT`;
        else if (hr > 0) statusText = `${hr}h ${m}m LEFT`;
        else statusText = `${m}m LEFT`;
    } else {
        statusText = "PASSED";
    }

    let titleStyle = "color: var(--text);";
    let badgeBg = "var(--dark)";
    let badgeColor = "var(--pink)";
    let badgeBorder = "var(--pink)";
    let glowAnim = "";
    
    if (isCompleted) {
      titleStyle = "color: var(--muted); text-decoration: line-through;";
      statusText = isPassed ? "PASSED" : "STUDIED";
      badgeBg = "var(--bg)"; badgeColor = "var(--muted)"; badgeBorder = "var(--border)";
    } else if (calendarDaysLeft === 0) {
      titleStyle = "color: #c04080; font-weight: bold;";
      statusText = `🚨 TODAY! (${statusText})`;
      badgeBg = "#c04080"; badgeColor = "#fff"; badgeBorder = "#a03060";
      glowAnim = "animation: examTodayGlow 2s infinite;";
    } else if (calendarDaysLeft > 0 && calendarDaysLeft <= 3) {
      titleStyle = "color: #c04080;";
      statusText = `⚠️ ${statusText}`;
      badgeBg = "#d080b0"; badgeColor = "#fff"; badgeBorder = "#b06090";
    }

    const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === e.subjectId) : null;
    const color = subj ? subj.color : (e.color || '#f0a0c8');

    let progressHtml = '';
    if (prog.total > 0) {
      const pct = Math.round((prog.done / prog.total) * 100);
      progressHtml = `
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
          <div style="flex: 1; height: 8px; background: rgba(0,0,0,0.1); border: 1px solid var(--border); border-radius: 4px; overflow: hidden;" title="${prog.done}/${prog.total} Tasks Completed">
            <div style="height: 100%; width: ${pct}%; background: ${color}; box-shadow: inset -1px -1px 2px rgba(0,0,0,0.2); transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 13px; font-weight: bold; color: var(--mid); min-width: 32px; text-align: right; font-family: 'VT323', monospace;">${pct}%</span>
        </div>
      `;
    }

    let examProgressStatus = "";
    let exBadgeBg = ""; let exBadgeColor = ""; let exBadgeBorder = "";
    if (isCompleted) {
      examProgressStatus = "COMPLETE";
      exBadgeBg = "#a8e6cf"; exBadgeColor = "#1a533c"; exBadgeBorder = "#74d4a8";
    } else if (prog.total > 0 && prog.done > 0) {
      examProgressStatus = "ONGOING";
      exBadgeBg = "#baddf9"; exBadgeColor = "#2c5282"; exBadgeBorder = "#8cb8e6";
    } else {
      examProgressStatus = "NOT STARTED";
      exBadgeBg = "#e2e8f0"; exBadgeColor = "#4a5568"; exBadgeBorder = "#cbd5e1";
    }

    const hasNotes = e.notes && e.notes.trim().length > 0;
    const notesIcon = hasNotes ? `<span style="font-size: 15px; margin-left: 6px; opacity: 0.9;" title="Contains Notes">📝</span>` : '';
    const subjText = subj ? ` • 📚 ${subj.name}` : (e.subjectName ? ` • 📚 ${e.subjectName}` : '');
    const timeHtml = e.time ? ` ⏰ ${e.time}` : '';
    const statusBadgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${exBadgeBg}; color: ${exBadgeColor}; border: 1px solid ${exBadgeBorder}; margin-right: 6px;">${examProgressStatus}</span>`;

    htmlStr += `
      <li class="todo-item ${isCompleted ? 'done' : ''}" onclick="if(event.target.tagName !== 'BUTTON') openExamModal('${e.id}')" style="margin-bottom: 10px; flex-direction: column; align-items: stretch; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); cursor: pointer; transition: transform 0.2s; box-shadow: 2px 2px 0 rgba(0,0,0,0.05); ${glowAnim}" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'" title="Click to view Study Topics & Notes">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <strong style="font-size: 17px; word-break: break-word; line-height: 1.2; ${titleStyle}">${e.name.replace(/</g, '&lt;')}${notesIcon}</strong>
              <span style="font-size: 13px; color: var(--muted); letter-spacing: 0.5px; display: flex; align-items: center;">${statusBadgeHtml} 📅 ${e.date}${timeHtml}${subjText}</span>
          </div>
          <span style="font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; background: ${badgeBg}; color: ${badgeColor}; text-align: center; white-space: nowrap; box-shadow: 1px 1px 0 rgba(0,0,0,0.1); border: 1px solid ${badgeBorder};">
            ${statusText}
          </span>
        </div>
        ${progressHtml}
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 14px; margin-top: 12px; border-top: 1px dashed var(--border); padding-top: 10px;">
          <label style="font-family: 'VT323', monospace; font-size: 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; margin-right: auto; font-weight: bold; color: ${e.pastPapers ? 'var(--mint)' : 'var(--dark)'};" onclick="event.stopPropagation();">
            <input type="checkbox" onchange="toggleExamPastPapers('${e.id}', ${e.pastPapers || false})" ${e.pastPapers ? 'checked' : ''} style="accent-color: var(--mint); cursor: pointer; transform: scale(1.2);">
            EXAM ANSWERED
          </label>
          <button onclick="editExam('${e.id}', '${e.name.replace(/'/g, "\\'")}', '${e.date}', '${e.time || ''}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'" title="Edit">✏️</button>
          <button onclick="deleteItem('exams', '${e.id}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2) rotate(90deg)'; this.style.color='#c04080'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'; this.style.color='inherit'" title="Delete">✕</button>
        </div>
      </li>
    `;
  });

  if (htmlStr === '') htmlStr = '<div class="todo-empty" style="padding: 10px; opacity: 0.7;">NO EXAMS MATCH FILTER ★</div>';
  list.innerHTML = htmlStr;
  const badge = document.getElementById('badge-exam');
  if (badge) badge.textContent = ongoingCount;

  if (window.renderCalendarGrid) window.renderCalendarGrid();
  const atm = document.getElementById('allTasksModal');
  if (atm && atm.style.display !== 'none' && window.renderAllTasks) window.renderAllTasks();
}
window.renderExams = renderExams;

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
    const sortedTopics = topics.map((t, idx) => ({ t, idx })).sort((a, b) => {
        if (!a.t.date && !b.t.date) return a.idx - b.idx;
        if (!a.t.date) return 1;
        if (!b.t.date) return -1;
        return new Date(a.t.date) - new Date(b.t.date);
    });
    list.innerHTML = sortedTopics.map(({ t, idx }) => {
      const isDone = t.done && (!t.subtasks || t.subtasks.length === 0);
      let dateHtml = '';
      if (t.date) {
        const tDate = new Date(t.date);
        tDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diff = Math.ceil((tDate - today) / (1000 * 60 * 60 * 24));
        let diffStr = diff === 0 ? "TODAY" : (diff < 0 ? `${Math.abs(diff)}d OVERDUE` : `${diff}d LEFT`);
        dateHtml = `<span style="font-size: 12px; color: var(--muted); margin-left: 12px; white-space: nowrap;">📅 ${t.date} (${diffStr})</span>`;
      }
      return `
        <li class="todo-item" style="margin-bottom: 6px; flex-direction: column; align-items: stretch; border-color: ${exam.color || 'var(--border)'};">
          <div style="display: flex; align-items: center; width: 100%;">
            <span class="todo-txt ${isDone ? 'done' : ''}" style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; text-decoration: ${isDone ? 'line-through' : 'none'}; color: ${isDone ? 'var(--muted)' : 'inherit'};" onclick="toggleTopic('${exam.id}', ${idx}, ${t.done})">
              <div class="todo-check">${isDone ? '✓' : ''}</div>
              <strong style="font-size: 16px;">${t.text.replace(/</g, '&lt;')}</strong>${dateHtml}
            </span>
            <button class="del-btn" onclick="window.editTopic('${exam.id}', ${idx}, '${t.text.replace(/'/g, "\\'")}', '${t.date || ''}')" style="opacity: 1; margin-left: 4px;">✏️</button>
            <button class="del-btn" onclick="deleteTopic('${exam.id}', ${idx})" style="opacity: 1;">✕</button>
          </div>
          <ul style="list-style: none; padding-left: 28px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            ${(t.subtasks || []).map((st, sidx) => `
               <li style="display: flex; align-items: center; gap: 8px; font-size: 15px; color: ${st.done ? 'var(--muted)' : 'var(--text)'}; text-decoration: ${st.done ? 'line-through' : 'none'}; cursor: pointer;" onclick="toggleTopicSubtask('${exam.id}', ${idx}, ${sidx}, ${st.done})">
                  <div class="todo-check" style="width: 14px; height: 14px; min-width: 14px; font-size: 10px;">${st.done ? '✓' : ''}</div>
                  <span class="todo-txt" style="flex: 1; word-break: break-word;">${st.text.replace(/</g, '&lt;')}</span>
                  <button class="del-btn" onclick="window.editTopicSubtask('${exam.id}', ${idx}, ${sidx}, '${st.text.replace(/'/g, "\\'")}')" style="opacity: 0.5; font-size: 12px; padding: 2px; margin-left: 4px;">✏️</button>
                  <button class="del-btn" onclick="deleteTopicSubtask('${exam.id}', ${idx}, ${sidx}); event.stopPropagation();" style="opacity: 0.5; font-size: 12px; padding: 2px;">✕</button>
               </li>
            `).join('')}
            <li style="display: flex; gap: 4px; margin-top: 2px;" onclick="event.stopPropagation();">
               <input type="text" id="topicSubInp_${idx}" class="todo-inp" style="padding: 2px 4px; font-size: 13px; height: 24px; flex: 1;" placeholder="Add sub-task..." onkeydown="if(event.key==='Enter') window.addTopicSubtask('${exam.id}', ${idx})">
               <button class="add-btn" onclick="window.addTopicSubtask('${exam.id}', ${idx})" style="padding: 0 6px; font-size: 12px; height: 24px; box-shadow: none;">ADD</button>
            </li>
          </ul>
        </li>
      `;
    }).join('');
  }
};

document.getElementById('addTopicBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('topicInp').value.trim();
  const date = document.getElementById('topicDateInp').value;
  if (!text || !window.currentExamId) return;
  const exam = window.currentExams.find(e => e.id === window.currentExamId);
  if (!exam) return;
  const newTopics = [...(exam.topics || []), { text, date, done: false }];
  await executeMutation("exams", "update", { topics: newTopics }, window.currentExamId);
  document.getElementById('topicInp').value = '';
  document.getElementById('topicDateInp').value = '';
});

document.getElementById('topicInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTopicBtn').click();
});

document.getElementById('topicDateInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTopicBtn').click();
});

document.getElementById('examNotesInp')?.addEventListener('change', async (e) => {
  if (!window.currentExamId) return;
  await executeMutation("exams", "update", { notes: e.target.value }, window.currentExamId);
});

window.toggleExamPastPapers = async (examId, currentStatus) => {
  if (!currentStatus && window.fireConfetti) window.fireConfetti();
  await executeMutation("exams", "update", { pastPapers: !currentStatus }, examId);
};

window.deleteTopic = async (examId, topicIdx) => {
  const exam = window.currentExams.find(e => e.id === examId);
  if(!exam || !(await window.customConfirm("Delete this study topic?"))) return;
  const newTopics = [...(exam.topics || [])];
  newTopics.splice(topicIdx, 1);
  await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.toggleTopic = async (examId, topicIdx, currentStatus) => {
  const exam = window.currentExams.find(e => e.id === examId);
  if(!exam) return;
  const newTopics = [...(exam.topics || [])];
  const newDone = !currentStatus;
  newTopics[topicIdx].done = newDone;
  if (newTopics[topicIdx].subtasks) {
     newTopics[topicIdx].subtasks.forEach(st => st.done = newDone);
  }
  await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.addTopicSubtask = async (examId, topicIdx) => {
    const inp = document.getElementById(`topicSubInp_${topicIdx}`);
    const text = inp ? inp.value.trim() : '';
    if (!text) return;
    const exam = window.currentExams.find(e => e.id === examId);
    const newTopics = [...(exam.topics || [])];
    newTopics[topicIdx].subtasks = [...(newTopics[topicIdx].subtasks || []), { text, done: false }];
    newTopics[topicIdx].done = false; 
    await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.toggleTopicSubtask = async (examId, topicIdx, subtaskIdx, currentStatus) => {
    const exam = window.currentExams.find(e => e.id === examId);
    const newTopics = [...(exam.topics || [])];
    newTopics[topicIdx].subtasks[subtaskIdx].done = !currentStatus;
    
    const allSubDone = newTopics[topicIdx].subtasks.every(st => st.done);
    newTopics[topicIdx].done = allSubDone;

    await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.deleteTopicSubtask = async (examId, topicIdx, subtaskIdx) => {
    if (!(await window.customConfirm("Delete this sub-task?"))) return;
    const exam = window.currentExams.find(e => e.id === examId);
    const newTopics = [...(exam.topics || [])];
    newTopics[topicIdx].subtasks.splice(subtaskIdx, 1);
    if (newTopics[topicIdx].subtasks.length > 0) newTopics[topicIdx].done = newTopics[topicIdx].subtasks.every(st => st.done);
    await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.editExam = async (id, oldName, oldDate, oldTime) => {
  const res = await window.customDialog({
    type: 'multi-prompt',
    title: 'Edit Exam:',
    inputs: [
      { type: 'text', default: oldName, placeholder: 'Exam Name...' },
      { type: 'date', default: oldDate, title: 'Exam Date' },
      { type: 'time', default: oldTime, title: 'Exam Time (Optional)' }
    ]
  });
  if (!res) return;
  const [newName, newDate, newTime] = res;
  if (!newName.trim()) return;
  await executeMutation("exams", "update", { name: newName.trim(), date: newDate, time: newTime.trim() }, id);
};

window.editTopic = async (examId, topicIdx, oldText, oldDate) => {
    const res = await window.customDialog({
        type: 'multi-prompt',
        title: 'Edit Topic:',
        inputs: [
            { type: 'text', default: oldText, placeholder: 'Topic Name...' },
            { type: 'date', default: oldDate || '', title: 'Target Date' }
        ]
    });
    if (!res) return;
    const [newText, newDate] = res;
    if (!newText.trim()) return;
    const exam = window.currentExams.find(e => e.id === examId);
    if (!exam) return;
    const newTopics = [...(exam.topics || [])];
    newTopics[topicIdx].text = newText.trim();
    newTopics[topicIdx].date = newDate;
    await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.editTopicSubtask = async (examId, topicIdx, subtaskIdx, oldText) => {
    const newText = await window.customPrompt("Edit Sub-task:", oldText);
    if (newText === null || newText.trim() === "") return;
    const exam = window.currentExams.find(e => e.id === examId);
    if (!exam) return;
    const newTopics = [...(exam.topics || [])];
    if (!newTopics[topicIdx].subtasks) return;
    newTopics[topicIdx].subtasks[subtaskIdx].text = newText.trim();
    await executeMutation("exams", "update", { topics: newTopics }, examId);
};