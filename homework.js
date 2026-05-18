import { executeMutation } from './tasks.js';

// --- HOMEWORK TRACKER OPERATIONS ---
document.getElementById('addHwBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('hwNameInp').value.trim();
  const date = document.getElementById('hwDateInp').value;
  const time = document.getElementById('hwTimeInp').value;
  const subjId = document.getElementById('hwSubjectInp').value;
  if (!name || !date) return;
  
  const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === subjId) : null;
  const color = subj ? subj.color : '#e1eaf2';
  const subjectName = subj ? subj.name : '';

  await executeMutation("homework", "add", { name, date, time, color, subjectId: subjId, subjectName, tasks: [], notes: '', submitted: false });
  document.getElementById('hwNameInp').value = "";
  document.getElementById('hwDateInp').value = "";
  document.getElementById('hwTimeInp').value = "";
});

document.getElementById('hwNameInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addHwBtn').click();
});

window.currentHwFilter = 'all';
window.applyHwFilter = () => {
  const sel = document.getElementById('hwFilterSel');
  if (sel) window.currentHwFilter = sel.value;
  if (window.currentHomework) renderHomework(window.currentHomework);
};

export function renderHomework(hwItems) {
  window.currentHomework = hwItems;
  if (window.currentHwId && document.getElementById('hwModal').style.display !== 'none') {
    window.renderHwModal();
  }

  const list = document.getElementById('hwList');
  if (!list) return;
  const today = new Date();
  today.setHours(0,0,0,0);

  let ongoingCount = 0;
  let statNotStarted = 0;
  let statOngoing = 0;
  let statComplete = 0;
  let statOverdue = 0;

  if (hwItems.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO HOMEWORK DUE ★</div>';
    if(document.getElementById('hwStatNotStarted')) document.getElementById('hwStatNotStarted').textContent = 0;
    if(document.getElementById('hwStatOngoing')) document.getElementById('hwStatOngoing').textContent = 0;
    if(document.getElementById('hwStatComplete')) document.getElementById('hwStatComplete').textContent = 0;
    if(document.getElementById('hwStatOverdue')) document.getElementById('hwStatOverdue').textContent = 0;
    return;
  }

  let htmlStr = '';
  let displayItems = [...hwItems];
  displayItems.sort((a,b) => {
      const da = new Date(a.time ? `${a.date}T${a.time}` : `${a.date}T23:59:59`).getTime();
      const db = new Date(b.time ? `${b.date}T${b.time}` : `${b.date}T23:59:59`).getTime();
      return da - db;
  });

  displayItems.forEach(h => {
    const hwDate = new Date(h.date);
    hwDate.setHours(0,0,0,0);
    const calendarDaysLeft = Math.ceil((hwDate - today) / (1000 * 60 * 60 * 24));
    const exactTarget = new Date(h.time ? `${h.date}T${h.time}` : `${h.date}T23:59:59`);
    const diffMs = exactTarget - new Date();
    const isOverdue = diffMs < 0;

    const prog = window.getTaskProgress(h, 'hw');
    const isCompleted = h.submitted || prog.allDone;
    
    if (!isCompleted && diffMs >= 0) ongoingCount++;

    let statusText = "";
    if (diffMs >= 0) {
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hr = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diffMs / 1000 / 60) % 60);
        if (d > 0) statusText = `${d}d ${hr}h LEFT`;
        else if (hr > 0) statusText = `${hr}h ${m}m LEFT`;
        else statusText = `${m}m LEFT`;
    } else {
        statusText = "OVERDUE";
    }

    let titleStyle = "color: var(--text);";
    let badgeBg = "var(--dark)";
    let badgeColor = "var(--blue)";
    let badgeBorder = "var(--blue)";
    let glowAnim = "";

    let hwProgressStatus = "";
    let filterKey = "";
    let hwBadgeBg = ""; let hwBadgeColor = ""; let hwBadgeBorder = "";
    if (isCompleted) {
      statComplete++;
      hwProgressStatus = "COMPLETE";
      filterKey = "complete";
      hwBadgeBg = "#a8e6cf"; hwBadgeColor = "#1a533c"; hwBadgeBorder = "#74d4a8";
    } else if (isOverdue) {
      statOverdue++;
      hwProgressStatus = "OVERDUE";
      filterKey = "overdue";
      hwBadgeBg = "#feb2b2"; hwBadgeColor = "#742a2a"; hwBadgeBorder = "#fc8181";
    } else if (prog.total > 0 && prog.done > 0) {
      statOngoing++;
      hwProgressStatus = "ONGOING";
      filterKey = "ongoing";
      hwBadgeBg = "#baddf9"; hwBadgeColor = "#2c5282"; hwBadgeBorder = "#8cb8e6";
    } else {
      statNotStarted++;
      hwProgressStatus = "NOT STARTED";
      filterKey = "not_started";
      hwBadgeBg = "#e2e8f0"; hwBadgeColor = "#4a5568"; hwBadgeBorder = "#cbd5e1";
    }

    if (window.currentHwFilter !== 'all' && window.currentHwFilter !== 'sort_nearest' && window.currentHwFilter !== filterKey) return;
    if (window.currentHwFilter === 'sort_nearest' && isCompleted) return;
    
    if (isCompleted) {
      titleStyle = "color: var(--muted); text-decoration: line-through;";
      statusText = h.submitted ? "✅ SUBMITTED" : "✅ DONE";
      badgeBg = "var(--mint)"; badgeColor = "var(--dark)"; badgeBorder = "#a0d8c0";
    } else {
      if (calendarDaysLeft === 0) {
        titleStyle = "color: #3060c0; font-weight: bold;";
        statusText = `🚨 TODAY! (${statusText})`;
        badgeBg = "#3060c0"; badgeColor = "#fff"; badgeBorder = "#204090";
        glowAnim = "animation: examTodayGlow 2s infinite;";
      } else if (calendarDaysLeft > 0 && calendarDaysLeft <= 2) {
        titleStyle = "color: #3060c0;";
        statusText = `⚠️ ${statusText}`;
        badgeBg = "#7090d0"; badgeColor = "#fff"; badgeBorder = "#5070b0";
      } else if (isOverdue) {
        titleStyle = "color: #c04080; font-weight: bold;";
        statusText = "❌ PAST DUE";
        badgeBg = "#f2e1e8"; badgeColor = "#c04080"; badgeBorder = "#c04080";
      }
    }

    const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === h.subjectId) : null;
    const color = subj ? subj.color : (h.color || '#a0c0f8');
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

    const hasNotes = h.notes && h.notes.trim().length > 0;
    const notesIcon = hasNotes ? `<span style="font-size: 15px; margin-left: 6px; opacity: 0.9;" title="Contains Notes">📝</span>` : '';
    const subjText = subj ? ` • 📚 ${subj.name}` : (h.subjectName ? ` • 📚 ${h.subjectName}` : '');
    const timeHtml = h.time ? ` ⏰ ${h.time}` : '';
    const statusBadgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${hwBadgeBg}; color: ${hwBadgeColor}; border: 1px solid ${hwBadgeBorder}; margin-right: 6px;">${hwProgressStatus}</span>`;

    htmlStr += `
      <li class="todo-item ${isCompleted ? 'done' : ''}" onclick="if(event.target.tagName !== 'BUTTON') openHwModal('${h.id}')" style="margin-bottom: 10px; flex-direction: column; align-items: stretch; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); cursor: pointer; transition: transform 0.2s; box-shadow: 2px 2px 0 rgba(0,0,0,0.05); ${glowAnim}" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <strong style="font-size: 17px; word-break: break-word; line-height: 1.2; ${titleStyle}">${h.name.replace(/</g, '&lt;')}${notesIcon}</strong>
              <span style="font-size: 13px; color: var(--muted); letter-spacing: 0.5px; display: flex; align-items: center;">${statusBadgeHtml} 📅 ${h.date}${timeHtml}${subjText}</span>
          </div>
          <span style="font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; background: ${badgeBg}; color: ${badgeColor}; text-align: center; white-space: nowrap; box-shadow: 1px 1px 0 rgba(0,0,0,0.1); border: 1px solid ${badgeBorder};">
            ${statusText}
          </span>
        </div>
        ${progressHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px dashed var(--border); padding-top: 10px;">
          <button onclick="toggleHwSubmit('${h.id}', ${h.submitted})" style="background: ${h.submitted ? 'var(--bg)' : 'var(--mint)'}; border: 1px solid ${h.submitted ? 'var(--border)' : '#a0d8c0'}; border-radius: 4px; padding: 2px 8px; font-family: 'VT323', monospace; font-size: 13px; color: ${h.submitted ? 'var(--muted)' : 'var(--dark)'}; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">${h.submitted ? '↩️ UNDO SUBMIT' : '✅ MARK SUBMITTED'}</button>
          <div style="display: flex; gap: 14px; align-items: center;">
            <button onclick="editHw('${h.id}', '${h.name.replace(/'/g, "\\'")}', '${h.date}', '${h.time || ''}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'" title="Edit">✏️</button>
            <button onclick="deleteItem('homework', '${h.id}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2) rotate(90deg)'; this.style.color='#c04080'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'; this.style.color='inherit'" title="Delete">✕</button>
          </div>
        </div>
      </li>
    `;
  });

  if (htmlStr === '') htmlStr = '<div class="todo-empty" style="padding: 10px; opacity: 0.7;">NO HOMEWORK MATCHES FILTER ★</div>';
  list.innerHTML = htmlStr;
  const badge = document.getElementById('badge-hw');
  if (badge) badge.textContent = ongoingCount;

  if(document.getElementById('hwStatNotStarted')) document.getElementById('hwStatNotStarted').textContent = statNotStarted;
  if(document.getElementById('hwStatOngoing')) document.getElementById('hwStatOngoing').textContent = statOngoing;
  if(document.getElementById('hwStatComplete')) document.getElementById('hwStatComplete').textContent = statComplete;
  if(document.getElementById('hwStatOverdue')) document.getElementById('hwStatOverdue').textContent = statOverdue;

  if (window.renderCalendarGrid) window.renderCalendarGrid();
  const atm = document.getElementById('allTasksModal');
  if (atm && atm.style.display !== 'none' && window.renderAllTasks) window.renderAllTasks();
}
window.renderHomework = renderHomework;

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
    const sortedTasks = tasks.map((t, idx) => ({ t, idx })).sort((a, b) => {
        if (!a.t.date && !b.t.date) return a.idx - b.idx;
        if (!a.t.date) return 1;
        if (!b.t.date) return -1;
        return new Date(a.t.date) - new Date(b.t.date);
    });
    list.innerHTML = sortedTasks.map(({ t, idx }) => {
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
        <li class="todo-item" style="margin-bottom: 6px; flex-direction: column; align-items: stretch; border-color: ${hw.color || 'var(--border)'};">
          <div style="display: flex; align-items: center; width: 100%;">
            <span class="todo-txt ${isDone ? 'done' : ''}" style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; text-decoration: ${isDone ? 'line-through' : 'none'}; color: ${isDone ? 'var(--muted)' : 'inherit'};" onclick="toggleHwTask('${hw.id}', ${idx}, ${t.done})">
              <div class="todo-check">${isDone ? '✓' : ''}</div>
              <strong style="font-size: 16px;">${t.text.replace(/</g, '&lt;')}</strong>${dateHtml}
            </span>
            <button class="del-btn" onclick="window.editHwTask('${hw.id}', ${idx}, '${t.text.replace(/'/g, "\\'")}', '${t.date || ''}')" style="opacity: 1; margin-left: 4px;">✏️</button>
            <button class="del-btn" onclick="deleteHwTask('${hw.id}', ${idx})" style="opacity: 1;">✕</button>
          </div>
          <ul style="list-style: none; padding-left: 28px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            ${(t.subtasks || []).map((st, sidx) => `
               <li style="display: flex; align-items: center; gap: 8px; font-size: 15px; color: ${st.done ? 'var(--muted)' : 'var(--text)'}; text-decoration: ${st.done ? 'line-through' : 'none'}; cursor: pointer;" onclick="window.toggleHwSubtask('${hw.id}', ${idx}, ${sidx}, ${st.done})">
                  <div class="todo-check" style="width: 14px; height: 14px; min-width: 14px; font-size: 10px;">${st.done ? '✓' : ''}</div>
                  <span class="todo-txt" style="flex: 1; word-break: break-word;">${st.text.replace(/</g, '&lt;')}</span>
                  <button class="del-btn" onclick="window.editHwSubtask('${hw.id}', ${idx}, ${sidx}, '${st.text.replace(/'/g, "\\'")}')" style="opacity: 0.5; font-size: 12px; padding: 2px; margin-left: 4px;">✏️</button>
                  <button class="del-btn" onclick="window.deleteHwSubtask('${hw.id}', ${idx}, ${sidx}); event.stopPropagation();" style="opacity: 0.5; font-size: 12px; padding: 2px;">✕</button>
               </li>
            `).join('')}
            <li style="display: flex; gap: 4px; margin-top: 2px;" onclick="event.stopPropagation();">
               <input type="text" id="hwSubInp_${idx}" class="todo-inp" style="padding: 2px 4px; font-size: 13px; height: 24px; flex: 1;" placeholder="Add sub-task..." onkeydown="if(event.key==='Enter') window.addHwSubtask('${hw.id}', ${idx})">
               <button class="add-btn" onclick="window.addHwSubtask('${hw.id}', ${idx})" style="padding: 0 6px; font-size: 12px; height: 24px; box-shadow: none;">ADD</button>
            </li>
          </ul>
        </li>
      `;
    }).join('');
  }
};

document.getElementById('addHwTaskBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('hwTaskInp').value.trim();
  const date = document.getElementById('hwTaskDateInp').value;
  if (!text || !window.currentHwId) return;
  const hw = window.currentHomework.find(h => h.id === window.currentHwId);
  const newTasks = [...(hw.tasks || []), { text, date, done: false }];
  await executeMutation("homework", "update", { tasks: newTasks }, window.currentHwId);
  document.getElementById('hwTaskInp').value = '';
  document.getElementById('hwTaskDateInp').value = '';
});

document.getElementById('hwTaskInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addHwTaskBtn').click();
});

document.getElementById('hwTaskDateInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addHwTaskBtn').click();
});

document.getElementById('hwNotesInp')?.addEventListener('change', async (e) => {
  if (!window.currentHwId) return;
  await executeMutation("homework", "update", { notes: e.target.value }, window.currentHwId);
});

window.editHw = async (id, oldName, oldDate, oldTime) => {
  const res = await window.customDialog({
    type: 'multi-prompt',
    title: 'Edit Assignment:',
    inputs: [
      { type: 'text', default: oldName, placeholder: 'Assignment Name...' },
      { type: 'date', default: oldDate, title: 'Due Date' },
      { type: 'time', default: oldTime, title: 'Due Time (Optional)' }
    ]
  });
  if (!res) return;
  const [newName, newDate, newTime] = res;
  if (!newName.trim()) return;
  await executeMutation("homework", "update", { name: newName.trim(), date: newDate, time: newTime.trim() }, id);
};

window.toggleHwTask = async (hwId, taskIdx, currentStatus) => {
  const hw = window.currentHomework.find(h => h.id === hwId);
  if(!hw) return;
  const newTasks = [...(hw.tasks || [])];
  const newDone = !currentStatus;
  newTasks[taskIdx].done = newDone;
  if (newTasks[taskIdx].subtasks) {
     newTasks[taskIdx].subtasks.forEach(st => st.done = newDone);
  }
  if (newDone && newTasks.length > 0 && newTasks.every(t => t.done) && window.fireConfetti) window.fireConfetti();
  await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.addHwSubtask = async (hwId, taskIdx) => {
    const inp = document.getElementById(`hwSubInp_${taskIdx}`);
    const text = inp ? inp.value.trim() : '';
    if (!text) return;
    const hw = window.currentHomework.find(h => h.id === hwId);
    const newTasks = [...(hw.tasks || [])];
    newTasks[taskIdx].subtasks = [...(newTasks[taskIdx].subtasks || []), { text, done: false }];
    newTasks[taskIdx].done = false; 
    await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.toggleHwSubtask = async (hwId, taskIdx, subtaskIdx, currentStatus) => {
    const hw = window.currentHomework.find(h => h.id === hwId);
    const newTasks = [...(hw.tasks || [])];
    newTasks[taskIdx].subtasks[subtaskIdx].done = !currentStatus;
    
    const allSubDone = newTasks[taskIdx].subtasks.every(st => st.done);
    newTasks[taskIdx].done = allSubDone;
    
    if (allSubDone && newTasks.every(t => t.done) && window.fireConfetti) window.fireConfetti();
    await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.deleteHwSubtask = async (hwId, taskIdx, subtaskIdx) => {
    if (!(await window.customConfirm("Delete this sub-task?"))) return;
    const hw = window.currentHomework.find(h => h.id === hwId);
    const newTasks = [...(hw.tasks || [])];
    newTasks[taskIdx].subtasks.splice(subtaskIdx, 1);
    if (newTasks[taskIdx].subtasks.length > 0) newTasks[taskIdx].done = newTasks[taskIdx].subtasks.every(st => st.done);
    await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.toggleHwSubmit = async (hwId, currentStatus) => {
  if (!currentStatus && window.fireConfetti) window.fireConfetti();
  await executeMutation("homework", "update", { submitted: !currentStatus }, hwId);
};

window.deleteHwTask = async (hwId, taskIdx) => {
  const hw = window.currentHomework.find(h => h.id === hwId);
  if(!hw || !(await window.customConfirm("Delete this sub-task?"))) return;
  const newTasks = [...(hw.tasks || [])];
  newTasks.splice(taskIdx, 1);
  await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.editHwTask = async (hwId, taskIdx, oldText, oldDate) => {
    const res = await window.customDialog({
        type: 'multi-prompt',
        title: 'Edit Task:',
        inputs: [
            { type: 'text', default: oldText, placeholder: 'Task Name...' },
            { type: 'date', default: oldDate || '', title: 'Target Date' }
        ]
    });
    if (!res) return;
    const [newText, newDate] = res;
    if (!newText.trim()) return;
    const hw = window.currentHomework.find(h => h.id === hwId);
    if (!hw) return;
    const newTasks = [...(hw.tasks || [])];
    newTasks[taskIdx].text = newText.trim();
    newTasks[taskIdx].date = newDate;
    await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};

window.editHwSubtask = async (hwId, taskIdx, subtaskIdx, oldText) => {
    const newText = await window.customPrompt("Edit Sub-task:", oldText);
    if (newText === null || newText.trim() === "") return;
    const hw = window.currentHomework.find(h => h.id === hwId);
    if (!hw) return;
    const newTasks = [...(hw.tasks || [])];
    if (!newTasks[taskIdx].subtasks) return;
    newTasks[taskIdx].subtasks[subtaskIdx].text = newText.trim();
    await executeMutation("homework", "update", { tasks: newTasks }, hwId);
};