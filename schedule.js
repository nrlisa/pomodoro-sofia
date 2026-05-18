import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './script.js';
import { executeMutation } from './tasks.js';

// --- WEEKLY TIMETABLE & SCHEDULE OPERATIONS ---
window.currentSchedule = [];
window.schedViewDayOffset = 0;

window.schedSelectedIds = new Set();
window.currentSchedFilter = 'all';

window.applySchedFilter = (filter) => {
  window.currentSchedFilter = filter;
  document.querySelectorAll('#stab-all, #stab-class, #stab-event').forEach(el => {
    if (el) el.classList.remove('active');
  });
  const activeTab = document.getElementById('stab-' + filter);
  if (activeTab) activeTab.classList.add('active');
  if (window.currentSchedule) renderSchedule(window.currentSchedule);
};

window.changeSchedDayOffset = (dir) => {
  window.schedViewDayOffset += dir;
  if (window.currentSchedule) renderSchedule(window.currentSchedule);
};

window.editScheduleId = null;
window.loadEditSchedule = (id) => {
  const item = window.currentSchedule.find(x => x.id === id);
  if (!item) return;
  document.getElementById('schedTitleInp').value = item.title || '';
  
  const convertTo24Hour = (tStr) => {
      if (!tStr) return '';
      // Support colons or dots (e.g. 10:30, 10.30am)
      const match = tStr.trim().match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
      if (match) {
          let hrs = parseInt(match[1]);
          const mins = match[2];
          const ampm = match[3] ? match[3].toLowerCase() : '';
          if (ampm === 'pm' && hrs < 12) hrs += 12;
          if (ampm === 'am' && hrs === 12) hrs = 0;
          return `${String(hrs).padStart(2, '0')}:${mins}`;
      }
      // Support whole hours without minutes (e.g. 10am, 2pm)
      const hrMatch = tStr.trim().match(/(\d{1,2})\s*(am|pm)/i);
      if (hrMatch) {
          let hrs = parseInt(hrMatch[1]);
          const ampm = hrMatch[2].toLowerCase();
          if (ampm === 'pm' && hrs < 12) hrs += 12;
          if (ampm === 'am' && hrs === 12) hrs = 0;
          return `${String(hrs).padStart(2, '0')}:00`;
      }
      return tStr.trim();
  };

  // Split dynamically using ANY type of dash or minus symbol
  const tSplit = (item.time || '').split(/\s*[-–—]\s*/);
  document.getElementById('schedTimeInp').value = tSplit[0] ? convertTo24Hour(tSplit[0]) : '';
  document.getElementById('schedEndTimeInp').value = tSplit[1] ? convertTo24Hour(tSplit[1]) : '';
  document.getElementById('schedDayInp').value = item.day;
  document.getElementById('schedCategoryInp').value = item.category || 'class';
  document.getElementById('schedSubjectInp').value = item.subjectId || '';
  document.getElementById('schedModeInp').value = item.mode || 'Physical';
  document.getElementById('schedStartDateInp').value = item.startDate || '';
  document.getElementById('schedEndDateInp').value = item.endDate || '';
  document.getElementById('schedEndDayInp').value = '';
  document.getElementById('schedEndDayInp').disabled = true;
  window.editScheduleId = id;
  
  const btn = document.getElementById('addSchedBtn');
  btn.textContent = 'SAVE';
  btn.style.background = '#f6ad55';
};

document.getElementById('addSchedBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('addSchedBtn');
  if (btn.disabled) return;

  const day = document.getElementById('schedDayInp').value;
  const start = document.getElementById('schedTimeInp').value;
  const end = document.getElementById('schedEndTimeInp').value;
  const title = document.getElementById('schedTitleInp').value.trim();
  const category = document.getElementById('schedCategoryInp').value;
  const subjectId = document.getElementById('schedSubjectInp').value;
  const mode = document.getElementById('schedModeInp').value;
  const startDate = document.getElementById('schedStartDateInp').value;
  const endDate = document.getElementById('schedEndDateInp').value;
  if (!start || !title) return await window.customAlert("Please provide a start time and class name!");

  btn.disabled = true; // Lock button to prevent double-click race condition duplicates
  const timeStr = end ? `${start} - ${end}` : start;
  
  let existingItem = {};
  let originalTitle = title;
  if (window.editScheduleId) {
    existingItem = window.currentSchedule.find(x => x.id === window.editScheduleId) || {};
    originalTitle = existingItem.title || title;
  }

  const cleanExistingItem = { ...existingItem };
  delete cleanExistingItem.id; // Strip internal ID to prevent DB collisions

  const dataPayload = { 
    room: "", group: "", type: "",
    ...cleanExistingItem, 
    day: parseInt(day), time: timeStr, title, category, subjectId, mode, startDate, endDate
  };
  
  if (window.editScheduleId) {
    const idToEdit = window.editScheduleId;
    window.editScheduleId = null; // Clear immediately to reset state

    await executeMutation("schedule", "update", dataPayload, idToEdit);

    // COURSE SYNC LOGIC: Safely sync metadata across same classes based on ORIGINAL title
    if (category === 'class') {
      const matchingCourses = window.currentSchedule.filter(x => 
        x.id !== idToEdit && 
        x.title && x.title.trim().toLowerCase() === originalTitle.trim().toLowerCase()
      );
      if (matchingCourses.length > 0) {
        const syncPayload = { title, category, subjectId, startDate, endDate };
        for (const targetCourse of matchingCourses) {
          await executeMutation("schedule", "update", syncPayload, targetCourse.id);
        }
      }
    }

    btn.textContent = 'ADD';
    btn.style.background = 'var(--mint)';
    document.getElementById('schedEndDayInp').disabled = false;
  } else {
    const endDayVal = document.getElementById('schedEndDayInp').value;
    const startDay = parseInt(day);
    let daysToProcess = [startDay];
    
    if (endDayVal !== "") {
        const endDay = parseInt(endDayVal);
        daysToProcess = [];
        let curr = startDay;
        daysToProcess.push(curr);
        while (curr !== endDay) {
            curr = (curr + 1) % 7;
            daysToProcess.push(curr);
            if (daysToProcess.length > 7) break; // Break infinite loops
        }
    }

    for (const d of daysToProcess) {
        const payloadCopy = { ...dataPayload, day: d };
        delete payloadCopy.id;
        await executeMutation("schedule", "add", payloadCopy);
    }
  }
  
  document.getElementById('schedTitleInp').value = "";
  document.getElementById('schedEndTimeInp').value = "";
  document.getElementById('schedEndDayInp').value = "";
  document.getElementById('schedStartDateInp').value = "";
  document.getElementById('schedEndDateInp').value = "";
  btn.disabled = false;
});

document.getElementById('schedTitleInp')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addSchedBtn').click();
});

window.clearAllSchedule = async () => {
  if (window.currentSchedule.length === 0) return;
  if (await window.customConfirm("Are you sure you want to delete ALL classes from your timetable? This cannot be undone.")) {
    for (const item of window.currentSchedule) {
      await executeMutation("schedule", "delete", null, item.id);
    }
    window.schedSelectedIds.clear();
  }
};

// --- JSON UPLOAD ENGINE ---
const jsonInputEl = document.getElementById('importScheduleJsonInp');
if (jsonInputEl) {
  // NOTIFY USER TO CONVERT TO AN ARRAY CONFIGURATION BEFORE CHOOSING FILES
  jsonInputEl.addEventListener('click', async (e) => {
    // Only intercept if we haven't already shown the reminder for this sequence loop
    if (!jsonInputEl.dataset.warned) {
      e.preventDefault(); 
      await window.customAlert(
        "💡 <b>IMPORTANT REMINDER</b> 💡<br><br>" +
        "Please ensure your timetable data has been converted into a <b>JSON Array Format</b> before uploading!<br><br>" +
        "<b>Expected Format Structure:</b><br>" +
        "<code>[<br>&nbsp;&nbsp;{ \"day\": \"Monday\", \"time\": \"08:30am - 10:30am\", \"course_code\": \"WBB20103\" }<br>]</code>"
      );
      jsonInputEl.dataset.warned = "true";
      jsonInputEl.click(); // Re-trigger file upload window cleanly
    }
  });
}

window.importScheduleJson = async (event) => {
  if (jsonInputEl) delete jsonInputEl.dataset.warned;
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  let count = 0;
  let addedIds = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
    });

    try {
       const data = JSON.parse(text);
       if (!Array.isArray(data)) continue;

       for(const rawItem of data) {
         // Normalize keys to lowercase to be super forgiving
         const item = {};
         for (const key in rawItem) {
             if (rawItem.hasOwnProperty(key)) {
                 item[key.toLowerCase().trim()] = rawItem[key];
             }
         }

         const dayVal = item.day !== undefined ? item.day : item.date;
         const timeVal = item.time || item.start || item.hour;
         const titleVal = item.course_code || item.title || item.name || item.class || item.subject || item.event;

         if (dayVal !== undefined && timeVal && titleVal) {
            let dayNum = parseInt(dayVal);
            // Smart parse strings like "Monday" to 1
            if (isNaN(dayNum) && typeof dayVal === 'string') {
               const d = dayVal.toLowerCase();
               if (d.startsWith('su')) dayNum = 0;
               else if (d.startsWith('m')) dayNum = 1;
               else if (d.startsWith('tu')) dayNum = 2;
               else if (d.startsWith('w')) dayNum = 3;
               else if (d.startsWith('th')) dayNum = 4;
               else if (d.startsWith('f')) dayNum = 5;
               else if (d.startsWith('sa')) dayNum = 6;
            }
            
            if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
               const roomVal = item.room || item.location || "";
               const typeVal = item.type || "";
               const groupVal = item.group || item.section || "";
               
               let classMode = "Physical";
               const rLower = roomVal.toLowerCase();
               if (rLower.includes("online") || rLower.includes("zoom") || rLower.includes("teams") || rLower.includes("webex") || rLower.includes("virtual")) {
                   classMode = "Online";
               } else if (!roomVal) {
                   classMode = "";
               }

               // Fix JSON re-upload duplicates
               const formattedTime = String(timeVal);
               const existingClass = window.currentSchedule.find(c => 
                   c.day === dayNum && c.time === formattedTime && 
                   c.title.toLowerCase() === String(titleVal).toLowerCase()
               );

               const payload = { 
                   day: dayNum, 
                   time: formattedTime, 
                   title: String(titleVal),
                   room: String(roomVal),
                   type: String(typeVal),
                   group: String(groupVal),
                   mode: classMode,
                   category: 'class',
                   subjectId: ''
               };

               if (existingClass) {
                   await executeMutation("schedule", "update", payload, existingClass.id);
               } else {
                   const newId = Math.random().toString(36).substring(2, 15);
                   await executeMutation("schedule", "set", payload, newId);
                   addedIds.push(newId);
               }
               count++;
            }
         }
       }
    } catch (err) {
      console.warn("Failed to parse file: ", file.name, err);
    }
  }

  if (count > 0) {
     const keep = await window.customConfirm(`★ TIMETABLE IMPORTED SUCCESSFULLY! ★<br>Added ${count} scheduled events.<br><br>Click OK to save them, or CANCEL to Undo.`);
     if (!keep) {
         for (let id of addedIds) {
             await executeMutation("schedule", "delete", null, id);
         }
         await window.customAlert("Import Undone. Timetable restored to previous state.");
     }
  } else {
     await window.customAlert("No valid events found. Please check your spelling/format.");
  }
  event.target.value = '';
};

export function renderSchedule(items) {
  window.currentSchedule = items;
  const fullList = document.getElementById('scheduleList');
  const todayList = document.getElementById('todaySchedList');
  if (!fullList || !todayList) return;

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + window.schedViewDayOffset);
  const targetDay = baseDate.getDay();
  const tzOffset = baseDate.getTimezoneOffset() * 60000;
  const targetDateStr = new Date(baseDate.getTime() - tzOffset).toISOString().split('T')[0];
  
  const dayNamesFull = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  let dispText = "TODAY'S CLASSES";
  if (window.schedViewDayOffset === -1) dispText = "YESTERDAY'S CLASSES";
  else if (window.schedViewDayOffset === 1) dispText = "TOMORROW'S CLASSES";
  else if (window.schedViewDayOffset !== 0) dispText = `${dayNamesFull[targetDay]}'S CLASSES`;
  
  const dispEl = document.getElementById('schedViewDayDisp');
  if (dispEl) dispEl.textContent = dispText;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  window.parseTimeMins = (tStr) => {
    if (!tStr) return 0;
    const match = tStr.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (match) {
        let hrs = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3] ? match[3].toLowerCase() : '';
        if (ampm === 'pm' && hrs < 12) hrs += 12;
        if (ampm === 'am' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
    }
    const hrMatch = tStr.match(/(\d{1,2})\s*(am|pm)/i);
    if (hrMatch) {
        let hrs = parseInt(hrMatch[1]);
        const ampm = hrMatch[2].toLowerCase();
        if (ampm === 'pm' && hrs < 12) hrs += 12;
        if (ampm === 'am' && hrs === 12) hrs = 0;
        return hrs * 60;
    }
    return 0;
  };

  window.parseTimeRangeMins = (tStr) => {
    const split = String(tStr).split(/\s*[-–—]\s*/);
    const startMins = window.parseTimeMins(split[0]);
    let endMins = split.length > 1 ? window.parseTimeMins(split[1]) : startMins + 60; 
    if (endMins < startMins) endMins += 24 * 60; // Cross-midnight safety
    return { startMins, endMins };
  };

  window.checkActiveClasses = () => {
    if (window.schedViewDayOffset !== 0) {
        document.querySelectorAll('.today-sched-item').forEach(el => el.classList.remove('active-event'));
        return;
    }
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    document.querySelectorAll('.today-sched-item').forEach(el => {
        const timeStr = el.getAttribute('data-time');
        if (!timeStr) return;
        const { startMins, endMins } = window.parseTimeRangeMins(timeStr);
        if (currentMins >= startMins && currentMins < endMins) {
            el.classList.add('active-event');
        } else {
            el.classList.remove('active-event');
        }
    });
  };

  window.formatTimeDisplay = (tStr) => {
    if (!tStr) return '';
    const split = String(tStr).split(/\s*[-–—]\s*/);
    const formatted = split.map(t => {
        const match = t.trim().match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
        let hrs, mins, ampm;
        if (match) {
            hrs = parseInt(match[1]);
            mins = match[2];
            ampm = match[3] ? match[3].toLowerCase() : '';
        } else {
            const hrMatch = t.trim().match(/(\d{1,2})\s*(am|pm)/i);
            if (hrMatch) {
                hrs = parseInt(hrMatch[1]);
                mins = '00';
                ampm = hrMatch[2].toLowerCase();
            } else {
                return t.trim();
            }
        }
        if (!ampm) {
            ampm = hrs >= 12 ? 'pm' : 'am';
            if (hrs > 12) hrs -= 12;
            if (hrs === 0) hrs = 12;
        } else {
            if (hrs > 12 && ampm === 'pm') hrs -= 12;
            if (hrs === 0) hrs = 12;
        }
        return `${hrs}:${mins} ${ampm.toUpperCase()}`;
    });
    return formatted.join(' - ');
  };

  items.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return window.parseTimeMins(a.time) - window.parseTimeMins(b.time);
  });

  const masterItems = items.filter(i => {
    if (window.currentSchedFilter === 'all') return true;
    const cat = i.category || 'class';
    return cat === window.currentSchedFilter;
  });

  fullList.innerHTML = masterItems.length === 0 ? '<div class="todo-empty">NO TIMETABLE CONFIGURATION ★</div>' : masterItems.map(i => {
    let extraHtml = '';
    const subj = (window.currentSubjects || []).find(s => s.id === i.subjectId);
    const isEvent = i.category === 'event';
    const subjBadge = subj ? `<span style="font-size: 11px; padding: 2px 4px; background: var(--lavender); color: var(--dark); border-radius: 4px; margin-right: 4px;">📚 ${subj.name}</span>` : '';
    const catBadge = isEvent ? `<span style="font-size: 11px; padding: 2px 4px; background: #feebc8; color: #c05621; border: 1px solid #f6ad55; border-radius: 4px; margin-right: 4px;">📅 EVENT</span>` : '';
    const borderColor = isEvent ? '#f6ad55' : (subj ? subj.color : 'var(--blue)');

    if (i.room || i.group || i.mode || i.startDate || i.endDate) {
      let dateRangeStr = '';
      if (i.startDate && i.endDate) dateRangeStr = `${i.startDate} to ${i.endDate}`;
      else if (i.startDate) dateRangeStr = `${i.startDate}`;
      else if (i.endDate) dateRangeStr = `Until ${i.endDate}`;

      extraHtml = `<div style="font-size: 13px; color: var(--muted); margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap; font-family: 'VT323', monospace;">
        ${i.room ? `<span>${i.mode === 'Online' ? '🌐' : '🏫'} ${i.room.replace(/</g, '&lt;')}</span>` : ''}
        ${i.group ? `<span>👥 ${i.group.replace(/</g, '&lt;')}</span>` : ''}
        ${i.mode ? `<span style="color: ${i.mode === 'Online' ? 'var(--blue)' : 'var(--pink)'}; font-weight: bold;">[${i.mode}]</span>` : ''}
        ${dateRangeStr ? `<span style="color: var(--muted); border-left: 1px solid var(--border); padding-left: 8px;">⏳ ${dateRangeStr}</span>` : ''}
      </div>`;
    }
    return `
    <li class="todo-item" style="cursor: default; padding: 10px; border-left: 4px solid ${borderColor}; margin-bottom: 6px; display: flex; align-items: center; background: var(--surface);">
      <input type="checkbox" class="sched-select-checkbox" data-id="${i.id}" data-title="${i.title.replace(/"/g, '&quot;')}" ${window.schedSelectedIds.has(i.id) ? 'checked' : ''} style="margin-right: 12px; transform: scale(1.2); cursor: pointer; accent-color: var(--pink);">
      <div style="width: 80px; font-family: 'VT323', monospace; font-size: 15px; color: var(--muted); flex-shrink: 0;">${dayNames[parseInt(i.day)]}</div>
      <div style="width: auto; min-width: 80px; max-width: 120px; font-family: 'VT323', monospace; font-size: 16px; font-weight: bold; color: var(--dark); line-height: 1.1; flex-shrink: 0;">${window.formatTimeDisplay(i.time).replace(/\s?-\s?/g, '<br>')}</div>
      <div class="todo-txt" style="flex: 1; margin-left: 12px; font-size: 16px; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-weight: bold;">${catBadge}${subjBadge}${i.title.replace(/</g, '&lt;')}${i.type ? ` <span style="color: var(--muted); font-weight: normal; font-size: 14px;">(${i.type.replace(/</g, '&lt;')})</span>` : ''}</div>
        ${extraHtml}
      </div>
      <button class="del-btn" onclick="loadEditSchedule('${i.id}')" style="opacity: 1; margin-left: auto;">✏️</button>
      <button class="del-btn" onclick="deleteItem('schedule', '${i.id}')" style="opacity: 1; margin-left: 8px;">✕</button>
    </li>`;
  }).join('');

  // ONE-CLICK SMART CHECK ALL CLASSES WITH SAME SUBJECT CODE LOGIC
  document.querySelectorAll('.sched-select-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const targetTitle = e.target.getAttribute('data-title').trim().toLowerCase();
      const isChecked = e.target.checked;

      // Scan all matching checkboxes rendered on current view block
      document.querySelectorAll('.sched-select-checkbox').forEach(otherCb => {
        const otherTitle = otherCb.getAttribute('data-title').trim().toLowerCase();
        if (otherTitle === targetTitle) {
          otherCb.checked = isChecked;
          const otherId = otherCb.getAttribute('data-id');
          if (isChecked) {
            window.schedSelectedIds.add(otherId);
          } else {
            window.schedSelectedIds.delete(otherId);
          }
        }
      });
      window.updateBulkDeleteUI();
    });
  });

  const todayItems = items.filter(i => {
    let matchesDay = parseInt(i.day) === targetDay;
    
    if (i.startDate && i.endDate) {
      if (targetDateStr < i.startDate || targetDateStr > i.endDate) return false;
    } else if (i.startDate) {
      if (targetDateStr !== i.startDate) return false;
      matchesDay = true; // One time events show up exactly on their date
    } else if (i.endDate) {
      if (targetDateStr > i.endDate) return false;
    }
    
    return matchesDay;
  });

  todayList.innerHTML = todayItems.length === 0 ? '<div class="todo-empty" style="padding: 10px; opacity: 0.8;">NO CLASSES ★</div>' : todayItems.map(i => {
    let extraHtml = '';
    const subj = (window.currentSubjects || []).find(s => s.id === i.subjectId);
    const isEvent = i.category === 'event';
    const borderColor = isEvent ? '#f6ad55' : (subj ? subj.color : 'var(--mint)');
    const catBadge = isEvent ? `<span style="font-size: 10px; padding: 1px 4px; background: #feebc8; color: #c05621; border-radius: 4px; margin-right: 4px;">EVENT</span>` : '';
    const subjBadge = subj ? `<span style="font-size: 11px; padding: 1px 4px; background: var(--lavender); color: var(--dark); border-radius: 4px; margin-right: 4px;">📚 ${subj.name}</span>` : '';
    if (i.room || i.mode || i.startDate || i.endDate) {
      let dateRangeStr = '';
      if (i.startDate && i.endDate) dateRangeStr = `${i.startDate} to ${i.endDate}`;
      else if (i.startDate) dateRangeStr = `${i.startDate}`;
      else if (i.endDate) dateRangeStr = `Until ${i.endDate}`;
      extraHtml = `<div style="font-size: 11px; color: var(--muted); margin-top: 2px; font-family: 'VT323', monospace;">${i.mode === 'Online' ? '🌐' : '🏫'} ${i.room ? i.room.replace(/</g, '&lt;') : i.mode} ${i.group ? `| 👥 ${i.group.replace(/</g, '&lt;')}` : ''} ${dateRangeStr ? `| ⏳ ${dateRangeStr}` : ''}</div>`;
    }
    return `
    <li class="todo-item today-sched-item" data-time="${i.time}" style="cursor: default; border-left: 4px solid ${borderColor}; padding: 8px 12px; margin-bottom: 6px; align-items: stretch; transition: all 0.3s;">
      <div style="font-family: 'Orbitron', monospace; font-size: 13px; color: var(--dark); font-weight: bold; width: auto; min-width: 75px; display: flex; align-items: center; padding-right: 8px;">${window.formatTimeDisplay(i.time).replace(/\s?-\s?/g, '<br>')}</div>
      <div class="todo-txt" style="flex: 1; border-left: 2px dashed var(--border); padding-left: 12px; margin-left: 4px; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-weight: bold;">${catBadge}${subjBadge}${i.title.replace(/</g, '&lt;')}${i.type ? ` <span style="font-weight: normal; font-size: 12px; color: var(--muted);">(${i.type.replace(/</g, '&lt;')})</span>` : ''}</div>
        ${extraHtml}
      </div>
    </li>`;
  }).join('');

  window.checkActiveClasses();
}

window.renderSchedule = renderSchedule;
setInterval(() => { if (window.checkActiveClasses) window.checkActiveClasses(); }, 60000);