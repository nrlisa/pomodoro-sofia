import { executeMutation } from './tasks.js';

// --- EXAM OPERATIONS ---
document.getElementById('addExamBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('examNameInp').value.trim();
  const date = document.getElementById('examDateInp').value;
  const subjId = document.getElementById('examSubjectInp').value;
  if (!name || !date) return;
  
  const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === subjId) : null;
  const color = subj ? subj.color : '#f2e1e8';
  const subjectName = subj ? subj.name : '';

  await executeMutation("exams", "add", { name, date, color, subjectId: subjId, subjectName, topics: [] });
  document.getElementById('examNameInp').value = "";
  document.getElementById('examDateInp').value = "";
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
  exams.forEach(e => {
    const examDate = new Date(e.date);
    examDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft >= 0) ongoingCount++;

    const isPassed = daysLeft < 0;
    if (window.currentExamFilter === 'upcoming' && isPassed) return;
    if (window.currentExamFilter === 'passed' && !isPassed) return;

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

    const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === e.subjectId) : null;
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

    const total = e.topics ? e.topics.length : 0;
    const done = e.topics ? e.topics.filter(tk => tk.done).length : 0;
    
    let examProgressStatus = "";
    let exBadgeBg = ""; let exBadgeColor = ""; let exBadgeBorder = "";
    if (daysLeft < 0) {
      examProgressStatus = "COMPLETE";
      exBadgeBg = "#a8e6cf"; exBadgeColor = "#1a533c"; exBadgeBorder = "#74d4a8";
    } else if (total > 0 && done > 0) {
      examProgressStatus = "ONGOING";
      exBadgeBg = "#baddf9"; exBadgeColor = "#2c5282"; exBadgeBorder = "#8cb8e6";
    } else {
      examProgressStatus = "NOT STARTED";
      exBadgeBg = "#e2e8f0"; exBadgeColor = "#4a5568"; exBadgeBorder = "#cbd5e1";
    }

    const hasNotes = e.notes && e.notes.trim().length > 0;
    const notesIcon = hasNotes ? `<span style="font-size: 15px; margin-left: 6px; opacity: 0.9;" title="Contains Notes">📝</span>` : '';
    const subjText = subj ? ` • 📚 ${subj.name}` : (e.subjectName ? ` • 📚 ${e.subjectName}` : '');
    const statusBadgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${exBadgeBg}; color: ${exBadgeColor}; border: 1px solid ${exBadgeBorder}; margin-right: 6px;">${examProgressStatus}</span>`;

    htmlStr += `
      <li class="todo-item" onclick="if(event.target.tagName !== 'BUTTON') openExamModal('${e.id}')" style="margin-bottom: 10px; flex-direction: column; align-items: stretch; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); cursor: pointer; transition: transform 0.2s; box-shadow: 2px 2px 0 rgba(0,0,0,0.05); ${glowAnim}" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'" title="Click to view Study Topics & Notes">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <strong style="font-size: 17px; word-break: break-word; line-height: 1.2; ${titleStyle}">${e.name.replace(/</g, '&lt;')}${notesIcon}</strong>
              <span style="font-size: 13px; color: var(--muted); letter-spacing: 0.5px; display: flex; align-items: center;">${statusBadgeHtml} 📅 ${e.date}${subjText}</span>
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
  newTopics[topicIdx].done = !currentStatus;
  await executeMutation("exams", "update", { topics: newTopics }, examId);
};

window.editExam = async (id, oldName, oldDate) => {
  const newName = await window.customPrompt("Edit Exam Name:", oldName);
  if (!newName) return;
  const newDate = await window.customPrompt("Edit Exam Date (YYYY-MM-DD):", oldDate);
  if (!newDate) return;
  await executeMutation("exams", "update", { name: newName.trim(), date: newDate }, id);
};