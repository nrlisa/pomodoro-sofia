// --- MASTER TASKS DASHBOARD ---

window.openAllTasks = () => {
  window.closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('allTasksModal').style.display = 'flex';
  window.renderAllTasks();
};

window.renderAllTasks = () => {
  const container = document.getElementById('allTasksContent');
  if (!container) return;

  const exams = window.currentExams || [];
  const hw = window.currentHomework || [];
  const todos = window.currentTodos || [];

  let examUpcoming = 0;
  let hwNotStarted = 0; let hwOngoing = 0; let hwComplete = 0; let hwOverdue = 0;

  const today = new Date();
  today.setHours(0,0,0,0);

  hw.forEach(h => {
    const hwDate = new Date(h.date);
    hwDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((hwDate - today) / (1000 * 60 * 60 * 24));

    if (h.submitted) hwComplete++;
    else if (daysLeft < 0) hwOverdue++;
    else {
      const total = h.tasks ? h.tasks.length : 0;
      const done = h.tasks ? h.tasks.filter(tk => tk.done).length : 0;
      if (total > 0 && done > 0) hwOngoing++; else hwNotStarted++;
    }
  });

  exams.forEach(e => {
    const examDate = new Date(e.date);
    examDate.setHours(0,0,0,0);
    if (examDate >= today) examUpcoming++;
  });

  if (document.getElementById('mastExamUpcoming')) document.getElementById('mastExamUpcoming').textContent = examUpcoming;

  if (document.getElementById('mastHwNotStarted')) document.getElementById('mastHwNotStarted').textContent = hwNotStarted;
  if (document.getElementById('mastHwOngoing')) document.getElementById('mastHwOngoing').textContent = hwOngoing;
  if (document.getElementById('mastHwComplete')) document.getElementById('mastHwComplete').textContent = hwComplete;
  if (document.getElementById('mastHwOverdue')) document.getElementById('mastHwOverdue').textContent = hwOverdue;

  let html = '';
  if (exams.length === 0 && hw.length === 0 && todos.length === 0) {
    container.innerHTML = '<div class="todo-empty">NO TASKS FOUND ★</div>';
    return;
  }

  const renderSubList = (items, parentId, type) => {
    if (!items || items.length === 0) return '';
    return `<ul style="list-style: none; padding-left: 0; margin-top: 10px; border-top: 1px dashed var(--border); width: 100%;">` + 
      items.map((t, idx) => {
        const toggleFn = type === 'exam' ? `window.toggleTopic('${parentId}', ${idx}, ${t.done})` : `window.toggleHwTask('${parentId}', ${idx}, ${t.done})`;
        return `<li class="todo-txt" style="font-size: 16px; padding: 6px 0 6px 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; color: ${t.done ? 'var(--muted)' : 'var(--text)'}; text-decoration: ${t.done ? 'line-through' : 'none'}; border-bottom: 1px solid rgba(0,0,0,0.05);" onmouseover="this.style.background='rgba(0,0,0,0.02)'; this.style.transform='translateX(4px)'" onmouseout="this.style.background='transparent'; this.style.transform='none'" onclick="${toggleFn}">
          <div class="todo-check" style="width: 18px; height: 18px; font-size: 14px; min-width: 18px; border-radius: 4px; ${t.done ? 'background: var(--pink); border-color: var(--pink); color: var(--dark);' : 'background: transparent; color: transparent;'}">${t.done ? '✓' : ''}</div>
          <span style="word-break: break-word; flex: 1;">${t.text.replace(/</g, '&lt;')}</span>
        </li>`;
      }).join('') + 
    `</ul>`;
  };

  if (exams.length > 0) {
    html += `<div class="custom-title" style="margin-top: 8px; color: #c04080;">✦ EXAMS</div>`;
    html += exams.map(e => {
      const examDate = new Date(e.date);
      examDate.setHours(0,0,0,0);
      const isPassed = examDate < today;
      const total = e.topics ? e.topics.length : 0;
      const done = e.topics ? e.topics.filter(tk => tk.done).length : 0;
      let statusStr = "NOT STARTED"; let badgeBg = "#e2e8f0"; let badgeColor = "#4a5568"; let badgeBorder = "#cbd5e1";
      if (isPassed) { statusStr = "COMPLETE"; badgeBg = "#a8e6cf"; badgeColor = "#1a533c"; badgeBorder = "#74d4a8"; }
      else if (total > 0 && done > 0) { statusStr = "ONGOING"; badgeBg = "#baddf9"; badgeColor = "#2c5282"; badgeBorder = "#8cb8e6"; }
      const badgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; margin-right: 8px;">${statusStr}</span>`;

      return `<div class="todo-item ${isPassed ? 'done' : ''}" style="flex-direction: column; align-items: flex-start; cursor: default; border-left: 4px solid #c04080;">
        <strong class="todo-txt" style="font-size: 18px; font-weight: bold; width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; align-items: center;">${badgeHtml}${e.name.replace(/</g, '&lt;')}</span>
          <span style="font-size: 14px; color: var(--muted); font-weight: normal;">📅 ${e.date}</span>
        </strong>
        ${renderSubList(e.topics, e.id, 'exam')}</div>`;
    }).join('');
  }

  if (hw.length > 0) {
    html += `<div class="custom-title" style="margin-top: 16px; color: #5070b0;">✦ HOMEWORK</div>`;
    html += hw.map(h => {
      const hwDate = new Date(h.date);
      hwDate.setHours(0,0,0,0);
      const daysLeft = Math.ceil((hwDate - today) / (1000 * 60 * 60 * 24));

      const total = h.tasks ? h.tasks.length : 0;
      const done = h.tasks ? h.tasks.filter(tk => tk.done).length : 0;
      let statusStr = "NOT STARTED"; let badgeBg = "#e2e8f0"; let badgeColor = "#4a5568"; let badgeBorder = "#cbd5e1";
      if (h.submitted) { statusStr = "COMPLETE"; badgeBg = "#a8e6cf"; badgeColor = "#1a533c"; badgeBorder = "#74d4a8"; }
      else if (daysLeft < 0) { statusStr = "OVERDUE"; badgeBg = "#feb2b2"; badgeColor = "#742a2a"; badgeBorder = "#fc8181"; }
      else if (total > 0 && done > 0) { statusStr = "ONGOING"; badgeBg = "#baddf9"; badgeColor = "#2c5282"; badgeBorder = "#8cb8e6"; }
      const badgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; margin-right: 8px;">${statusStr}</span>`;

      return `<div class="todo-item ${h.submitted ? 'done' : ''}" style="flex-direction: column; align-items: flex-start; cursor: default; border-left: 4px solid #5070b0;">
        <strong class="todo-txt" style="font-size: 18px; font-weight: bold; width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; align-items: center;">${badgeHtml}${h.name.replace(/</g, '&lt;')}</span>
          <span style="font-size: 14px; color: var(--muted); font-weight: normal;">📅 ${h.date}</span>
        </strong>
        ${renderSubList(h.tasks, h.id, 'hw')}</div>`;
    }).join('');
  }

  if (todos.length > 0) {
    html += `<div class="custom-title" style="margin-top: 16px; color: var(--dark);">✦ TODO LIST</div>`;
    html += todos.map(t => {
      const todoDate = new Date(t.date);
      todoDate.setHours(0,0,0,0);
      const daysLeft = Math.ceil((todoDate - today) / (1000 * 60 * 60 * 24));

      let statusStr = "NOT STARTED"; let badgeBg = "#e2e8f0"; let badgeColor = "#4a5568"; let badgeBorder = "#cbd5e1";
      if (t.done) { statusStr = "COMPLETE"; badgeBg = "#a8e6cf"; badgeColor = "#1a533c"; badgeBorder = "#74d4a8"; }
      else if (daysLeft < 0) { statusStr = "OVERDUE"; badgeBg = "#feb2b2"; badgeColor = "#742a2a"; badgeBorder = "#fc8181"; }
      const badgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; margin-right: 8px;">${statusStr}</span>`;

      return `<div class="todo-item ${t.done ? 'done' : ''}" style="cursor: pointer; border-left: 4px solid var(--border);" onclick="window.toggleTodo('${t.id}', ${t.done})">
        <span class="todo-txt" style="display: flex; align-items: center; gap: 8px; width: 100%;">
          <div class="todo-check">${t.done ? '✓' : ''}</div>
          <strong style="font-size: 18px; font-weight: normal; flex: 1; display: flex; align-items: center;">${badgeHtml}${t.text.replace(/</g, '&lt;')}</strong>
          <span style="font-size: 14px; color: var(--muted); font-weight: normal;">📅 ${t.date}</span>
        </span>
      </div>`;
    }).join('');
  }
  container.innerHTML = html;
};