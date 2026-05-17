// --- CALENDAR OPERATIONS ---
let calDate = new Date();
let selectedCalDate = null;

const getLocalYMD = (d) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

window.addEventListener('DOMContentLoaded', () => {
  calDate = new Date();
  selectedCalDate = getLocalYMD(new Date());
  window.renderCalendarGrid();
});

window.changeCalMonth = (dir) => {
  calDate.setMonth(calDate.getMonth() + dir);
  window.renderCalendarGrid();
};

window.renderCalendarGrid = () => {
  const month = calDate.getMonth();
  const year = calDate.getFullYear();
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const titleEl = document.getElementById('calMonthYear');
  if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let html = '';
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  dayNames.forEach(d => html += `<div class="cal-day-header">${d}</div>`);
  
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  
  const exams = window.currentExams || [];
  const homework = window.currentHomework || [];
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dateStr = getLocalYMD(dObj);
    const isSelected = dateStr === selectedCalDate;
    const isToday = dateStr === getLocalYMD(new Date());
    
    const dayExams = exams.filter(e => e.date === dateStr);
    const dayHw = homework.filter(h => h.date === dateStr);
    
    let dots = '';
    dayExams.forEach(e => {
      const s = (window.currentSubjects || []).find(sub => sub.id === e.subjectId);
      dots += `<div class="cal-dot" style="background: ${s ? s.color : (e.color || 'var(--pink)')};" title="Exam: ${e.name}"></div>`;
    });
    dayHw.forEach(h => {
      const s = (window.currentSubjects || []).find(sub => sub.id === h.subjectId);
      dots += `<div class="cal-dot" style="background: ${s ? s.color : (h.color || 'var(--blue)')}; border-radius: 2px;" title="HW: ${h.name}"></div>`;
    });
    
    html += `
      <div class="cal-day ${isSelected ? 'active' : ''}" onclick="selectCalDate('${dateStr}')" style="${isToday && !isSelected ? 'border-color: var(--mint);' : ''}">
        <span>${d}</span>
        <div class="cal-dots">${dots}</div>
      </div>
    `;
  }
  const gridEl = document.getElementById('calGrid');
  if (gridEl) {
    gridEl.innerHTML = html;
    window.renderCalAgenda();
  }
};

window.selectCalDate = (dateStr) => {
  selectedCalDate = dateStr;
  window.renderCalendarGrid();
};

window.renderCalAgenda = () => {
  if (!selectedCalDate) return;
  
  const dateObj = new Date(selectedCalDate + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const titleEl = document.getElementById('calAgendaTitle');
  if (titleEl) titleEl.textContent = `✦ AGENDA: ${formattedDate}`;
  
  const exams = (window.currentExams || []).filter(e => e.date === selectedCalDate);
  const homework = (window.currentHomework || []).filter(h => h.date === selectedCalDate);
  const todos = (window.currentTodos || []).filter(t => t.date === selectedCalDate && !t.done);
  const list = document.getElementById('calAgendaList');
  const container = document.getElementById('calAgendaContainer');
  
  if (exams.length === 0 && homework.length === 0 && todos.length === 0) {
    if (container) container.style.display = 'none';
    return;
  }
  if (container) container.style.display = 'block';
  
  let html = '';
  exams.forEach(e => {
    const s = (window.currentSubjects || []).find(sub => sub.id === e.subjectId);
    html += `
      <li class="todo-item" onclick="openExamModal('${e.id}')" style="margin-bottom: 6px; border-left: 6px solid ${s ? s.color : (e.color || 'var(--pink)')}; background: var(--surface);">
        <span class="todo-txt" style="display: flex; gap: 8px;">
          <span style="font-size: 13px; color: #fff; background: #c04080; padding: 2px 6px; border-radius: 4px; align-self: flex-start;">EXAM</span>
          <strong>${e.name}</strong>
        </span>
      </li>
    `;
  });
  homework.forEach(h => {
    const isSubmitted = h.submitted || false;
    const s = (window.currentSubjects || []).find(sub => sub.id === h.subjectId);
    html += `
      <li class="todo-item ${isSubmitted ? 'done' : ''}" onclick="openHwModal('${h.id}')" style="margin-bottom: 6px; border-left: 6px solid ${s ? s.color : (h.color || 'var(--blue)')}; background: var(--surface);">
        <span class="todo-txt" style="display: flex; gap: 8px;">
          <span style="font-size: 13px; color: #fff; background: ${isSubmitted ? 'var(--muted)' : '#5070b0'}; padding: 2px 6px; border-radius: 4px; align-self: flex-start;">HW</span>
          <strong style="${isSubmitted ? 'text-decoration: line-through; color: var(--muted);' : ''}">${h.name}</strong>
        </span>
      </li>
    `;
  });
  todos.forEach(t => {
    html += `
      <li class="todo-item" style="margin-bottom: 6px; border-left: 6px solid var(--blue); background: var(--surface);">
        <span class="todo-txt" style="display: flex; gap: 8px;">
          <span style="font-size: 13px; color: var(--dark); background: var(--mint); padding: 2px 6px; border-radius: 4px; align-self: flex-start;">TODO</span>
          <strong>${t.text}</strong>
        </span>
      </li>
    `;
  });
  if (list) list.innerHTML = html;
};