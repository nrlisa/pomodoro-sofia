import { executeMutation } from './tasks.js';

// --- TODO OPERATIONS ---
window.clearCompletedTodos = async () => {
  if (!window.currentTodos) return;
  const completed = window.currentTodos.filter(t => t.done);
  if (completed.length === 0) return await window.customAlert("No completed tasks found!");
  if (await window.customConfirm(`Clean up ${completed.length} completed task(s)?`)) {
    for (const t of completed) {
      await executeMutation("todos", "delete", null, t.id);
    }
  }
};

document.getElementById('addTodoBtn')?.addEventListener('click', async () => {
  const text = document.getElementById('todoInp').value.trim();
  const date = document.getElementById('todoDateInp').value;
  const subjId = document.getElementById('todoSubjectInp').value;
  if (!text) return;
  
  const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === subjId) : null;
  const color = subj ? subj.color : 'var(--blue)';
  const subjectName = subj ? subj.name : '';

  await executeMutation("todos", "add", { text, date, color, subjectId: subjId, subjectName, done: false });
  document.getElementById('todoInp').value = "";
});

document.getElementById('todoInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTodoBtn').click();
  if (e.key === 'Escape') e.target.value = '';
});

export function renderTodos(todos) {
  window.currentTodos = todos;
  
  const badge = document.getElementById('badge-todo');
  if (badge) badge.textContent = todos.filter(t => !t.done).length;

  const list = document.getElementById('todoList');
  if (!list) return;
  
  if (todos.length === 0) {
    list.innerHTML = '<div class="todo-empty">NO TASKS YET ★<br>ADD ONE ABOVE!</div>';
    return;
  }
  
  const sortedTodos = [...todos].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Infinity;
    const db = b.date ? new Date(b.date).getTime() : Infinity;
    return da - db;
  });

  list.innerHTML = sortedTodos.map(t => {
    const dateStr = t.date ? `<span style="font-size: 13px; color: var(--muted); margin-left: auto;">📅 ${t.date}</span>` : '';
    const subj = window.currentSubjects ? window.currentSubjects.find(s => s.id === t.subjectId) : null;
    const color = subj ? subj.color : (t.color || 'var(--blue)');
    const subjBadge = subj ? `<span style="font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--lavender); color: var(--dark); margin-right: 8px;">📚 ${subj.name}</span>` : (t.subjectName ? `<span style="font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: var(--lavender); color: var(--dark); margin-right: 8px;">📚 ${t.subjectName}</span>` : '');
    
    return `
      <li class="todo-item ${t.done ? 'done' : ''}" style="margin-bottom: 10px; padding: 12px; border-left: 6px solid ${color}; border-radius: 6px; background: var(--surface); display: flex; align-items: center; justify-content: space-between; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="display: flex; flex-direction: column; flex: 1; gap: 4px;">
          <span class="todo-txt" style="cursor: pointer; display: flex; align-items: center; gap: 10px;" onclick="toggleTodo('${t.id}', ${t.done})">
            <div class="todo-check" style="width: 20px; height: 20px; border-radius: 4px;">${t.done ? '✓' : ''}</div>
            <strong style="font-size: 17px;">${t.text.replace(/</g, '&lt;')}</strong>
          </span>
          <div style="display: flex; align-items: center; padding-left: 30px;">${subjBadge}${dateStr}</div>
        </div>
        <div style="display: flex; gap: 10px; margin-left: 12px;">
          <button onclick="window.editTodo('${t.id}', '${t.text.replace(/'/g, "\\'")}', '${t.date || ''}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'" title="Edit">✏️</button>
          <button onclick="deleteItem('todos', '${t.id}')" style="background: none; border: none; cursor: pointer; font-size: 15px; opacity: 0.6; transition: all 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2) rotate(90deg)'; this.style.color='#c04080'" onmouseout="this.style.opacity='0.6'; this.style.transform='none'; this.style.color='inherit'" title="Delete">✕</button>
        </div>
      </li>
    `;
  }).join('');

  if (window.renderCalendarGrid) window.renderCalendarGrid();
  const atm = document.getElementById('allTasksModal');
  if (atm && atm.style.display !== 'none' && window.renderAllTasks) window.renderAllTasks();
}
window.renderTodos = renderTodos;

window.editTodo = async (id, oldText, oldDate) => {
    const res = await window.customDialog({
        type: 'multi-prompt',
        title: 'Edit Task:',
        inputs: [
            { type: 'text', default: oldText, placeholder: 'Task Name...' },
            { type: 'date', default: oldDate || '', title: 'Due Date' }
        ]
    });
    if (!res) return;
    const [newText, newDate] = res;
    if (!newText.trim()) return;
    await executeMutation("todos", "update", { text: newText.trim(), date: newDate }, id);
};

window.toggleTodo = async (id, currentStatus) => {
  if (!currentStatus && window.currentTodos) {
    const tempTodos = window.currentTodos.map(t => t.id === id ? { ...t, done: true } : t);
    if (tempTodos.length > 0 && tempTodos.every(t => t.done)) window.fireConfetti();
  }
  await executeMutation("todos", "update", { done: !currentStatus }, id);
};