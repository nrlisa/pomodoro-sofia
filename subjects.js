import { executeMutation } from './tasks.js';

window.currentSubjects = [];

// --- SUBJECTS OPERATIONS ---
export function renderSubjects(subjects) {
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
          const p = window.getTaskProgress(e, 'exam');
          totalItems += p.total; doneItems += p.done;
        });
        
        subjHw.forEach(h => {
          const p = window.getTaskProgress(h, 'hw');
          totalItems += p.total; doneItems += p.done;
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
                <span style="font-size: 12px; color: var(--muted);">${subjExams.filter(e => {
                  const exactTarget = new Date(e.time ? `${e.date}T${e.time}` : `${e.date}T23:59:59`);
                  return exactTarget - new Date() >= 0 && !window.getTaskProgress(e, 'exam').allDone;
                }).length} UPCOMING EXAMS • ${subjHw.filter(h => !h.submitted && !window.getTaskProgress(h, 'hw').allDone).length} ACTIVE HW</span>
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

  const hwSel = document.getElementById('hwSubjectInp');
  const exSel = document.getElementById('examSubjectInp');
  const todoSel = document.getElementById('todoSubjectInp');
  const schedSel = document.getElementById('schedSubjectInp');
  const options = `<option value="">(No Subject)</option>` + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (hwSel) { const prev = hwSel.value; hwSel.innerHTML = options; hwSel.value = prev; }
  if (exSel) { const prev = exSel.value; exSel.innerHTML = options; exSel.value = prev; }
  if (todoSel) { const prev = todoSel.value; todoSel.innerHTML = options; todoSel.value = prev; }
  if (schedSel) { const prev = schedSel.value; schedSel.innerHTML = options; schedSel.value = prev; }

  if (window.currentExams) window.renderExams(window.currentExams);
  if (window.currentHomework) window.renderHomework(window.currentHomework);
  if (window.renderCalendarGrid) window.renderCalendarGrid();
}
window.renderSubjects = renderSubjects;

window.updateSubjectColor = async (id, newColor) => {
  if (newColor) await executeMutation("subjects", "update", { color: newColor }, id);
};

window.editSubject = async (id, oldName, oldSem) => {
  const res = await window.customDialog({
    type: 'multi-prompt',
    title: 'Edit Subject',
    inputs: [
      { type: 'text', default: oldName, placeholder: 'Subject Name...' },
      { type: 'text', default: oldSem, placeholder: 'Semester (e.g., 5-9)' }
    ]
  });
  if (!res) return;
  const [newName, newSem] = res;
  if (!newName.trim()) return window.customAlert("Subject Name cannot be empty.");
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
  // Functionality seamlessly relies on the dashboard and main global references
  if (!window.currentSubjectOverviewId || !window.currentSubjects) return;
  const subj = window.currentSubjects.find(s => s.id === window.currentSubjectOverviewId);
  if (!subj) return window.openSubjects();
  document.getElementById('subjOverviewTitle').textContent = `★ ${subj.name.toUpperCase()}_FOLDER.EXE`;
};