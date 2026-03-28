// Kasička — správa kategorií

function initCategories(){
  if(!categories.length) categories=[...DEFAULT_CATS];
}

function getCatColor(name){
  const c=categories.find(c=>c.name===name);
  return c?c.color:cssVar('--text-secondary');
}
function getCatIcon(name){
  const c=categories.find(c=>c.name===name);
  return c?c.icon:'📦';
}

function getSortedCategories(){
  // Seřadit kategorie podle celkové utracené částky (sestupně)
  return [...categories].sort((a,b)=>{
    const sumA=transactions.filter(t=>t.type==='vydaj'&&t.cat===a.name).reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
    const sumB=transactions.filter(t=>t.type==='vydaj'&&t.cat===b.name).reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
    return sumB-sumA;
  });
}

function renderTagQuickPicks(){
  const el=document.getElementById('tag-quick-picks');
  if(!el) return;
  const allTags=getAllTags();
  if(!allTags.length){el.innerHTML='';return;}
  el.innerHTML=allTags.slice(0,20).map(tag=>{
    const active=currentTags.includes(tag);
    return`<span onclick="quickAddTag('${escAttr(tag)}')"
      style="padding:3px 9px;border-radius:20px;font-size:11.5px;cursor:pointer;user-select:none;
      background:${active?'var(--accent-dim)':'rgba(255,255,255,0.05)'};
      border:1px solid ${active?'var(--accent)':'var(--card-border)'};
      color:${active?'var(--accent)':'var(--text-secondary)'};">${escHtml(tag)}</span>`;
  }).join('');
}

function quickAddTag(tag){
  const tmp=document.createElement('span');
  tmp.innerHTML=tag;
  const decoded=tmp.textContent;
  if(currentTags.includes(decoded)){
    currentTags=currentTags.filter(t=>t!==decoded);
  } else {
    currentTags.push(decoded);
  }
  renderTagsPreview();
  renderTagQuickPicks();
}


function refreshCatSelect(selectedVal){
  const sel=document.getElementById('txn-cat');
  if(!sel) return;
  const prev=selectedVal!==undefined?selectedVal:sel.value;
  const sorted=getSortedCategories();
  sel.innerHTML=sorted.map(c=>`<option value="${escAttr(c.name)}">${escHtml(c.name)}</option>`).join('');
  if(prev&&categories.find(c=>c.name===prev)) sel.value=prev;
}

function openCatModal(idx){
  editingCat=idx;
  selectedCatColor=idx===-1?CAT_COLORS[0]:categories[idx].color;
  selectedCatIcon=idx===-1?CAT_ICONS[0]:categories[idx].icon;
  document.getElementById('cat-modal-title').textContent=idx===-1?'Nová kategorie':'Upravit kategorii';
  document.getElementById('cat-name').value=idx===-1?'':categories[idx].name;
  document.getElementById('cat-delete-btn').style.display=idx===-1?'none':'block';
  renderCatColorPicker();
  renderCatIconPicker();
  openModal('cat');
}

function renderCatColorPicker(){
  document.getElementById('cat-color-picker').innerHTML=CAT_COLORS.map(c=>
    `<div onclick="selectCatColor('${c}')" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c===selectedCatColor?'#fff':'transparent'};outline:${c===selectedCatColor?'2px solid '+c:'none'};transition:all 0.1s;"></div>`
  ).join('');
}

function renderCatIconPicker(){
  document.getElementById('cat-icon-picker').innerHTML=CAT_ICONS.map(ic=>
    `<div onclick="selectCatIcon('${ic}')" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;background:${ic===selectedCatIcon?'var(--accent-dim)':'var(--card-bg)'};border:1px solid ${ic===selectedCatIcon?'var(--accent)':'var(--card-border)'};transition:all 0.1s;">${ic}</div>`
  ).join('');
}

function selectCatColor(c){selectedCatColor=c;renderCatColorPicker();}
function selectCatIcon(ic){selectedCatIcon=ic;renderCatIconPicker();}

function saveCat(){
  const name=document.getElementById('cat-name').value.trim().toUpperCase();
  if(!name) return;
  if(editingCat===-1){
    if(categories.find(c=>c.name===name)){toast('Kategorie "'+name+'" již existuje.','warn');return;}
    categories.push({name,color:selectedCatColor,icon:selectedCatIcon});
  } else {
    const oldName=categories[editingCat].name;
    categories[editingCat]={name,color:selectedCatColor,icon:selectedCatIcon};
    transactions.forEach(t=>{if(t.cat===oldName) t.cat=name;});
    budgets.forEach(b=>{if(b.name===oldName) b.name=name;});
  }
  saveToStorage();
  closeModal('cat');
  refreshCatSelect();
  renderCategories();
}

function deleteCat(){
  if(editingCat===-1) return;
  const name=categories[editingCat].name;
  const used=transactions.filter(t=>t.cat===name).length;
  if(used>0&&!confirm(`Kategorie "${name}" je použita v ${used} transakcích. Opravdu smazat?`)) return;
  categories.splice(editingCat,1);
  saveToStorage();
  closeModal('cat');
  refreshCatSelect();
  renderCategories();
}

function renderCategories(){
  const grid=document.getElementById('categories-grid');
  if(!grid) return;
  // Seřadit podle utracené částky
  const withStats=categories.map((c,i)=>({
    c, i,
    usedCount:transactions.filter(t=>t.cat===c.name).length,
    totalSpent:transactions.filter(t=>t.cat===c.name&&t.type==='vydaj').reduce((s,t)=>s+toCZK(t.amount,t.cur),0)
  })).sort((a,b)=>b.totalSpent-a.totalSpent);
  grid.innerHTML=withStats.map(({c,i,usedCount,totalSpent})=>{
    return`<div class="card" style="display:flex;align-items:center;gap:14px;padding:14px 16px;">
      <div style="width:44px;height:44px;border-radius:10px;background:${c.color}22;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:1px solid ${c.color}44;">${c.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;letter-spacing:0.3px">${escHtml(c.name)}</div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px">${usedCount} transakcí · ${fmt(totalSpent)}</div>
      </div>
      <button class="btn-edit" onclick="openCatModal(${i})">Upravit</button>
    </div>`;
  }).join('');
}
