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

  const sortByDate = (a, b) => {
      const da = new Date(a.time ? `${a.date}T${a.time}` : `${a.date}T23:59:59`).getTime();
      const db = new Date(b.time ? `${b.date}T${b.time}` : `${b.date}T23:59:59`).getTime();
      return da - db;
  };

  const exams = [...(window.currentExams || [])].sort(sortByDate);
  const hw = [...(window.currentHomework || [])].sort(sortByDate);
  const todos = [...(window.currentTodos || [])].sort(sortByDate);
  const resources = window.currentResources || [];

  let examUpcoming = 0;
  let hwNotStarted = 0; let hwOngoing = 0; let hwComplete = 0; let hwOverdue = 0;

  const today = new Date();
  today.setHours(0,0,0,0);

  hw.forEach(h => {
    const hwDate = new Date(h.date);
    hwDate.setHours(0,0,0,0);
    const exactTarget = new Date(h.time ? `${h.date}T${h.time}` : `${h.date}T23:59:59`);
    const isOverdue = exactTarget - new Date() < 0;

    const prog = window.getTaskProgress(h, 'hw');

    if (h.submitted || prog.allDone) hwComplete++;
    else if (isOverdue) hwOverdue++;
    else {
      if (prog.total > 0 && prog.done > 0) hwOngoing++; else hwNotStarted++;
    }
  });

  exams.forEach(e => {
    const exactTarget = new Date(e.time ? `${e.date}T${e.time}` : `${e.date}T23:59:59`);
    const isPassed = exactTarget - new Date() < 0;
    
    const prog = window.getTaskProgress(e, 'exam');
    const isCompleted = isPassed || prog.allDone;
    
    if (!isCompleted) examUpcoming++;
  });

  let resTodo = 0; let resProg = 0; let resDone = 0;
  resources.forEach(r => {
      if (r.status === 'Done') resDone++;
      else if (r.status === 'In Progress') resProg++;
      else resTodo++;
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
    const sortedItems = items.map((t, idx) => ({ t, idx })).sort((a, b) => {
        if (!a.t.date && !b.t.date) return a.idx - b.idx;
        if (!a.t.date) return 1;
        if (!b.t.date) return -1;
        return new Date(a.t.date) - new Date(b.t.date);
    });
    return `<ul style="list-style: none; padding-left: 0; margin-top: 10px; border-top: 1px dashed var(--border); width: 100%;">` + 
      sortedItems.map(({ t, idx }) => {
        const toggleFn = type === 'exam' ? `window.toggleTopic('${parentId}', ${idx}, ${t.done})` : `window.toggleHwTask('${parentId}', ${idx}, ${t.done})`;
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

        let subHtml = '';
        if (t.subtasks && t.subtasks.length > 0) {
            subHtml = `<ul style="list-style: none; padding-left: 24px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">` +
            t.subtasks.map((st, sidx) => {
               const stToggle = type === 'exam' ? `window.toggleTopicSubtask('${parentId}', ${idx}, ${sidx}, ${st.done})` : `window.toggleHwSubtask('${parentId}', ${idx}, ${sidx}, ${st.done})`;
               return `<li style="font-size: 15px; color: ${st.done ? 'var(--muted)' : 'var(--text)'}; text-decoration: ${st.done ? 'line-through' : 'none'}; display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="${stToggle}; event.stopPropagation();">
                  <div class="todo-check" style="width: 14px; height: 14px; min-width: 14px; font-size: 10px; ${st.done ? 'background: var(--pink); border-color: var(--pink); color: var(--dark);' : 'background: transparent; color: transparent;'}">${st.done ? '✓' : ''}</div>
                  <span class="todo-txt" style="flex: 1; word-break: break-word;">${st.text.replace(/</g, '&lt;')}</span>
               </li>`;
            }).join('') + `</ul>`;
        }
        
        return `<li class="todo-txt" style="font-size: 16px; padding: 6px 0 6px 8px; display: flex; flex-direction: column; transition: all 0.2s; border-bottom: 1px solid rgba(0,0,0,0.05);" onmouseover="this.style.background='rgba(0,0,0,0.02)'; this.style.transform='translateX(4px)'" onmouseout="this.style.background='transparent'; this.style.transform='none'">
          <div style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: ${isDone ? 'var(--muted)' : 'var(--text)'}; text-decoration: ${isDone ? 'line-through' : 'none'};" onclick="${toggleFn}">
              <div class="todo-check" style="width: 18px; height: 18px; font-size: 14px; min-width: 18px; border-radius: 4px; ${isDone ? 'background: var(--pink); border-color: var(--pink); color: var(--dark);' : 'background: transparent; color: transparent;'}">${isDone ? '✓' : ''}</div>
              <span style="word-break: break-word; flex: 1;">${t.text.replace(/</g, '&lt;')}${dateHtml}</span>
          </div>
          ${subHtml}
        </li>`;
      }).join('') + 
    `</ul>`;
  };

  if (exams.length > 0) {
    html += `<div class="custom-title" style="color: #c04080;">✦ EXAMS</div>`;
    html += exams.map(e => {
      const exactTarget = new Date(e.time ? `${e.date}T${e.time}` : `${e.date}T23:59:59`);
      const prog = window.getTaskProgress(e, 'exam');
      const isPassed = (exactTarget - new Date() < 0) || prog.allDone;
      let statusStr = "NOT STARTED"; let badgeBg = "#e2e8f0"; let badgeColor = "#4a5568"; let badgeBorder = "#cbd5e1";
      if (isPassed) { statusStr = "COMPLETE"; badgeBg = "#a8e6cf"; badgeColor = "#1a533c"; badgeBorder = "#74d4a8"; }
      else if (prog.total > 0 && prog.done > 0) { statusStr = "ONGOING"; badgeBg = "#baddf9"; badgeColor = "#2c5282"; badgeBorder = "#8cb8e6"; }
      const badgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; margin-right: 8px;">${statusStr}</span>`;
      const timeHtml = e.time ? ` ⏰ ${e.time}` : '';

      return `<div class="todo-item ${isPassed ? 'done' : ''}" style="flex-direction: column; align-items: flex-start; cursor: default; border-left: 4px solid #c04080;">
        <strong class="todo-txt" style="font-size: 18px; font-weight: bold; width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; align-items: center;">${badgeHtml}${e.name.replace(/</g, '&lt;')}</span>
          <span style="font-size: 14px; color: var(--muted); font-weight: normal;">📅 ${e.date}${timeHtml}</span>
        </strong>
        ${renderSubList(e.topics, e.id, 'exam')}</div>`;
    }).join('');
  }

  if (hw.length > 0) {
    html += `<div class="custom-title" style="margin-top: 16px; color: #5070b0;">✦ HOMEWORK</div>`;
    html += hw.map(h => {
      const exactTarget = new Date(h.time ? `${h.date}T${h.time}` : `${h.date}T23:59:59`);

      const prog = window.getTaskProgress(h, 'hw');
      const isCompleted = h.submitted || prog.allDone;
      let statusStr = "NOT STARTED"; let badgeBg = "#e2e8f0"; let badgeColor = "#4a5568"; let badgeBorder = "#cbd5e1";
      if (isCompleted) { statusStr = "COMPLETE"; badgeBg = "#a8e6cf"; badgeColor = "#1a533c"; badgeBorder = "#74d4a8"; }
      else if (exactTarget - new Date() < 0) { statusStr = "OVERDUE"; badgeBg = "#feb2b2"; badgeColor = "#742a2a"; badgeBorder = "#fc8181"; }
      else if (prog.total > 0 && prog.done > 0) { statusStr = "ONGOING"; badgeBg = "#baddf9"; badgeColor = "#2c5282"; badgeBorder = "#8cb8e6"; }
      const badgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; margin-right: 8px;">${statusStr}</span>`;
      const timeHtml = h.time ? ` ⏰ ${h.time}` : '';

      return `<div class="todo-item ${isCompleted ? 'done' : ''}" style="flex-direction: column; align-items: flex-start; cursor: default; border-left: 4px solid #5070b0;">
        <strong class="todo-txt" style="font-size: 18px; font-weight: bold; width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; align-items: center;">${badgeHtml}${h.name.replace(/</g, '&lt;')}</span>
          <span style="font-size: 14px; color: var(--muted); font-weight: normal;">📅 ${h.date}${timeHtml}</span>
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

  if (resources.length > 0) {
    html += `<div class="custom-title" style="margin-top: 16px; color: var(--pink);">✦ ACTIVE RESOURCES</div>`;
    const activeRes = resources.filter(r => r.status !== 'Done');
    if (activeRes.length === 0) {
        html += `<div class="todo-empty" style="padding: 10px;">ALL RESOURCES COMPLETED ★</div>`;
    } else {
        html += activeRes.map(r => {
          const typeIcons = { 'Video': '📹', 'Article': '📄', 'Course': '📚', 'Docs': '📖', 'Repo': '💻', 'Tool': '🔧' };
          const icon = typeIcons[r.type] || '🔗';
          const total = r.checklist ? r.checklist.length : 0;
          const done = r.checklist ? r.checklist.filter(c => c.done).length : 0;
          const badgeHtml = `<span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--pink); color: var(--dark); border: 1px solid var(--dark); margin-right: 8px;">${r.status.toUpperCase()}</span>`;
          
          return `<div class="todo-item" style="cursor: pointer; border-left: 4px solid var(--pink);" onclick="openResources()">
            <span class="todo-txt" style="display: flex; align-items: center; gap: 8px; width: 100%;">
              <strong style="font-size: 18px; font-weight: normal; flex: 1; display: flex; align-items: center;">${badgeHtml}${icon} ${r.title.replace(/</g, '&lt;')}</strong>
              <span style="font-size: 14px; color: var(--muted); font-weight: normal;">${done}/${total} Steps</span>
            </span>
          </div>`;
        }).join('');
    }
  }

  container.innerHTML = html;
};