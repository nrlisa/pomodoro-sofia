import { executeMutation } from './tasks.js';

window.currentResources = [];
window.currentResSections = [];
window.currentResFilterType = 'All';
window.currentResFilterStatus = 'All';
window.currentResSearch = '';
window.selectedResSection = 'All';

export function renderResSections(sections) {
    window.currentResSections = sections.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (document.getElementById('resourcesModal')?.style.display !== 'none') {
        window.renderResourcesView();
    }
}

export function renderResources(resources) {
    window.currentResources = resources;
    
    if (document.getElementById('resourcesModal')?.style.display !== 'none') {
        window.renderResourcesView();
    }
}
window.renderResources = renderResources;
window.renderResSections = renderResSections;

window.openResources = () => {
  window.closeModals();
  document.getElementById('modalsContainer').style.display = 'flex';
  document.getElementById('resourcesModal').style.display = 'flex';
  window.renderResourcesView();
};

window.applyResourceFilter = () => {
    const typeSel = document.getElementById('resFilterTypeSel');
    const statusSel = document.getElementById('resFilterStatusSel');
    const searchInp = document.getElementById('resSearchInp');
    
    if (typeSel) window.currentResFilterType = typeSel.value;
    if (statusSel) window.currentResFilterStatus = statusSel.value;
    if (searchInp) window.currentResSearch = searchInp.value.toLowerCase().trim();
    
    window.renderResourcesView();
};

window.selectResSection = (secName) => {
    window.selectedResSection = secName;
    window.renderResourcesView();
};

window.renderResourcesView = () => {
    // 1. Render Sections Sidebar
    const secList = document.getElementById('resSectionList');
    if (secList) {
        let secHtml = `
            <li class="todo-item ${window.selectedResSection === 'All' ? 'active-event' : ''}" style="cursor: pointer; padding: 6px 8px;" onclick="window.selectResSection('All')">
                <span class="todo-txt" style="font-size: 15px; font-weight: bold;">📁 All Resources</span>
                <span style="font-size: 12px; color: var(--muted);">${window.currentResources.length}</span>
            </li>
        `;
        
        window.currentResSections.forEach(s => {
            const count = window.currentResources.filter(r => r.section === s.name).length;
            const isActive = window.selectedResSection === s.name;
            secHtml += `
                <li class="todo-item ${isActive ? 'active-event' : ''}" style="cursor: pointer; padding: 6px 8px;" onclick="window.selectResSection('${s.name.replace(/'/g, "\\'")}')">
                    <span class="todo-txt" style="font-size: 15px;">📁 ${s.name.replace(/</g, '&lt;')}</span>
                    <span style="font-size: 12px; color: var(--muted);">${count}</span>
                </li>
            `;
        });
        secList.innerHTML = secHtml;
    }

    // 2. Render Resources List
    const listContainer = document.getElementById('resListContainer');
    if (!listContainer) return;
    
    let filtered = window.currentResources.filter(r => {
        if (window.selectedResSection !== 'All' && r.section !== window.selectedResSection) return false;
        if (window.currentResFilterType !== 'All' && r.type !== window.currentResFilterType) return false;
        if (window.currentResFilterStatus !== 'All' && r.status !== window.currentResFilterStatus) return false;
        if (window.currentResSearch) {
            const titleMatch = r.title && r.title.toLowerCase().includes(window.currentResSearch);
            const tagMatch = r.tags && r.tags.some(t => t.toLowerCase().includes(window.currentResSearch));
            if (!titleMatch && !tagMatch) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="todo-empty">NO RESOURCES FOUND ★</div>';
        return;
    }

    let html = '';
    const renderResItem = (r) => {
        const total = r.checklist ? r.checklist.length : 0;
        const done = r.checklist ? r.checklist.filter(c => c.done).length : 0;
        const pct = total > 0 ? Math.round((done/total)*100) : 0;
        
        const typeIcons = { 'Video': '📹', 'Article': '📄', 'Course': '📚', 'Docs': '📖', 'Repo': '💻', 'Tool': '🔧' };
        const icon = typeIcons[r.type] || '🔗';
        
        let statusColor = "var(--muted)";
        let statusText = "○ Todo";
        if (r.status === 'Done') { statusColor = "var(--mint)"; statusText = "✓ Done"; }
        else if (r.status === 'In Progress') { statusColor = "var(--blue)"; statusText = "● In Progress"; }

        const tagHtml = (r.tags || []).map(t => `<span style="font-family: 'VT323', monospace; font-size: 14px; padding: 2px 6px; background: var(--lavender); color: var(--dark); border-radius: 4px; margin-right: 4px;">#${t.replace(/</g, '&lt;')}</span>`).join('');

        let chkHtml = '';
        if (r.checklist && r.checklist.length > 0) {
            chkHtml = `<ul style="list-style: none; padding-left: 0; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">` + 
                r.checklist.map((c, i) => `
                    <li style="display: flex; align-items: center; gap: 8px; font-family: 'VT323', monospace; font-size: 17px; cursor: pointer; color: ${c.done ? 'var(--muted)' : 'var(--text)'}; text-decoration: ${c.done ? 'line-through' : 'none'};" onclick="window.toggleResChecklist('${r.id}', ${i}, ${c.done})">
                        <div class="todo-check" style="width: 14px; height: 14px; font-size: 10px; min-width: 14px; ${c.done ? 'background: var(--pink); border-color: var(--pink); color: var(--dark);' : ''}">${c.done ? '✓' : ''}</div>
                        <span class="todo-txt" style="flex: 1; word-break: break-word;">${c.text.replace(/</g, '&lt;')}</span>
                        <button class="del-btn" onclick="window.deleteResChecklist('${r.id}', ${i}); event.stopPropagation();" style="opacity: 0.5; font-size: 12px; padding: 2px;">✕</button>
                    </li>
                `).join('') + 
            `</ul>`;
        }

        return `
            <div class="todo-item ${r.status === 'Done' ? 'done' : ''}" style="flex-direction: column; align-items: stretch; padding: 12px; border-left: 4px solid var(--pink); background: var(--surface); margin-bottom: 8px; cursor: default;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                        <strong class="todo-txt" style="font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                            ${icon} [${r.type}] ${r.title.replace(/</g, '&lt;')}
                            <a href="${r.url}" target="_blank" style="text-decoration: none; font-size: 16px; margin-left: 8px;" title="Open Link">↗️</a>
                        </strong>
                        <span style="font-size: 14px; color: var(--muted); font-family: 'VT323', monospace;">${r.url}</span>
                        <div style="margin-top: 2px;">${tagHtml}</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="window.editResource('${r.id}')" style="background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.6;" title="Edit">✏️</button>
                        <button onclick="deleteItem('resources', '${r.id}')" style="background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; color: #c04080;" title="Delete">✕</button>
                    </div>
                </div>
                ${chkHtml}
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                    <input type="text" id="resAddChk_${r.id}" class="todo-inp" style="padding: 2px 4px; font-size: 15px; height: 26px; flex: 1;" placeholder="Add step..." onkeydown="if(event.key==='Enter') window.addResChecklist('${r.id}')">
                    <button class="add-btn" onclick="window.addResChecklist('${r.id}')" style="padding: 0 6px; font-size: 14px; height: 26px; box-shadow: none;">ADD</button>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; border-top: 1px dashed var(--border); padding-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        <span style="font-family: 'VT323', monospace; font-size: 15px; color: var(--muted);">Progress:</span>
                        <div style="width: 100px; height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--mint);"></div>
                        </div>
                        <span style="font-family: 'VT323', monospace; font-size: 15px; font-weight: bold; color: var(--mid);">${pct}%</span>
                    </div>
                    <span style="font-family: 'VT323', monospace; font-size: 16px; font-weight: bold; color: ${statusColor};">${statusText}</span>
                </div>
            </div>
        `;
    };

    if (window.selectedResSection === 'All') {
        const sectionsInUse = [...new Set(filtered.map(r => r.section))].sort();
        sectionsInUse.forEach(secName => {
            const secItems = filtered.filter(r => r.section === secName);
            html += `<div class="custom-title" style="margin-top: 10px; color: var(--dark);">✦ ${secName.toUpperCase()}</div>`;
            secItems.forEach(r => html += renderResItem(r));
        });
    } else {
        filtered.forEach(r => html += renderResItem(r));
    }
    
    listContainer.innerHTML = html;
};

// --- MUTATIONS ---
window.addResourceSection = async () => {
    const name = await window.customPrompt("New Section Name:", "");
    if (!name || !name.trim()) return;
    const secName = name.trim();
    if (window.currentResSections.some(s => s.name.toLowerCase() === secName.toLowerCase())) {
        return window.customAlert("Section already exists!");
    }
    await executeMutation('res_sections', 'add', { name: secName, order: window.currentResSections.length });
};

window.openAddResourceModal = () => {
    window.currentEditingResId = null;
    document.getElementById('editResourceTitle').textContent = '★ ADD_RESOURCE.EXE';
    document.getElementById('resEditTitle').value = '';
    document.getElementById('resEditUrl').value = '';
    document.getElementById('resEditType').value = 'Article';
    document.getElementById('resEditTags').value = '';
    
    const sel = document.getElementById('resEditSection');
    sel.innerHTML = window.currentResSections.map(s => `<option value="${s.name.replace(/"/g, '&quot;')}">${s.name}</option>`).join('');
    if (window.currentResSections.length === 0) sel.innerHTML = `<option value="General">General</option>`;
    
    document.getElementById('editResourceModal').style.display = 'flex';
};

window.editResource = (id) => {
    const r = window.currentResources.find(x => x.id === id);
    if (!r) return;
    window.currentEditingResId = id;
    document.getElementById('editResourceTitle').textContent = '★ EDIT_RESOURCE.EXE';
    document.getElementById('resEditTitle').value = r.title || '';
    document.getElementById('resEditUrl').value = r.url || '';
    document.getElementById('resEditType').value = r.type || 'Article';
    document.getElementById('resEditTags').value = (r.tags || []).join(', ');
    
    const sel = document.getElementById('resEditSection');
    sel.innerHTML = window.currentResSections.map(s => `<option value="${s.name.replace(/"/g, '&quot;')}">${s.name}</option>`).join('');
    if (!window.currentResSections.some(s => s.name === r.section)) sel.innerHTML += `<option value="${r.section}">${r.section}</option>`;
    sel.value = r.section;
    
    document.getElementById('editResourceModal').style.display = 'flex';
};

document.getElementById('saveResourceBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('resEditTitle').value.trim();
    const url = document.getElementById('resEditUrl').value.trim();
    const type = document.getElementById('resEditType').value;
    const section = document.getElementById('resEditSection').value || 'General';
    const tagsRaw = document.getElementById('resEditTags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];
    
    if (!title) return window.customAlert("Title is required!");
    const data = { title, url, type, section, tags };
    
    if (window.currentEditingResId) {
        await executeMutation('resources', 'update', data, window.currentEditingResId);
    } else {
        data.checklist = [];
        data.status = 'Todo';
        data.createdAt = Date.now();
        await executeMutation('resources', 'add', data);
    }
    document.getElementById('editResourceModal').style.display = 'none';
});

window.autoDetectResType = () => {
    const url = document.getElementById('resEditUrl').value.toLowerCase();
    const sel = document.getElementById('resEditType');
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) sel.value = 'Video';
    else if (url.includes('github.com') || url.includes('gitlab.com')) sel.value = 'Repo';
    else if (url.includes('docs.') || url.includes('/docs')) sel.value = 'Docs';
    else if (url.includes('udemy.com') || url.includes('coursera.org')) sel.value = 'Course';
};

window.addResChecklist = async (id) => {
    const inp = document.getElementById(`resAddChk_${id}`);
    const text = inp ? inp.value.trim() : '';
    if (!text) return;
    const r = window.currentResources.find(x => x.id === id);
    if (!r) return;
    
    const newChecklist = [...(r.checklist || []), { text, done: false }];
    const doneCount = newChecklist.filter(c => c.done).length;
    const newStatus = doneCount > 0 ? 'In Progress' : 'Todo';
    
    await executeMutation('resources', 'update', { checklist: newChecklist, status: newStatus }, id);
};

window.toggleResChecklist = async (id, idx, currentDone) => {
    const r = window.currentResources.find(x => x.id === id);
    if (!r) return;
    
    const newChecklist = [...(r.checklist || [])];
    newChecklist[idx].done = !currentDone;
    
    const doneCount = newChecklist.filter(c => c.done).length;
    const totalCount = newChecklist.length;
    
    let newStatus = 'In Progress';
    if (doneCount === 0) newStatus = 'Todo';
    else if (doneCount === totalCount) newStatus = 'Done';
    
    if (newStatus === 'Done' && r.status !== 'Done' && window.fireConfetti) window.fireConfetti();
    await executeMutation('resources', 'update', { checklist: newChecklist, status: newStatus }, id);
};

window.deleteResChecklist = async (id, idx) => {
    if (!(await window.customConfirm("Delete this step?"))) return;
    const r = window.currentResources.find(x => x.id === id);
    if (!r) return;
    
    const newChecklist = [...(r.checklist || [])];
    newChecklist.splice(idx, 1);
    
    const doneCount = newChecklist.filter(c => c.done).length;
    const totalCount = newChecklist.length;
    let newStatus = r.status;
    if (totalCount === 0 || doneCount === 0) newStatus = 'Todo';
    else if (doneCount === totalCount) newStatus = 'Done';
    else newStatus = 'In Progress';

    await executeMutation('resources', 'update', { checklist: newChecklist, status: newStatus }, id);
};