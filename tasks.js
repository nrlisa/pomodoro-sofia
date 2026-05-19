import { doc, updateDoc, deleteDoc, addDoc, collection, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, currentUser } from './script.js';

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
    if (colName === 'schedule' && window.renderSchedule) window.renderSchedule(items);
    if (colName === 'stickies' && window.renderStickies) window.renderStickies(items);
    if (colName === 'resources' && window.renderResources) window.renderResources(items);
    if (colName === 'res_sections' && window.renderResSections) window.renderResSections(items);
  }
}

window.getTaskProgress = (item, type) => {
   const list = type === 'exam' ? (item.topics || []) : (item.tasks || []);
   if (list.length === 0) return { total: 0, done: 0, allDone: false };
   let total = 0; let done = 0;
   list.forEach(t => {
      if (t.subtasks && t.subtasks.length > 0) {
         total += t.subtasks.length;
         done += t.subtasks.filter(st => st.done).length;
      } else {
         total++;
         if (t.done) done++;
      }
   });
   return { total, done, allDone: total > 0 && total === done };
};

window.executeMutation = executeMutation;

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