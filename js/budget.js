// Kasička — rozpočty

let budPeriodOffsets={}; // {budgetIndex: offset}  0 = aktuální perioda

function shiftBudPeriod(i, dir){
  budPeriodOffsets[i]=(budPeriodOffsets[i]||0)+dir;
  renderBudget();
}

// Rozsah periody pro daný rozpočet a offset (0 = aktuální)
function getBudgetPeriodRange(b, offset){
  offset=offset||0;
  const now=new Date(); now.setHours(0,0,0,0);
  const period=b.period||'month';
  if(period==='week'){
    const f=new Date(now); f.setDate(f.getDate()-(f.getDay()||7)+1+offset*7);
    const t=new Date(f); t.setDate(t.getDate()+6); t.setHours(23,59,59,999);
    return{from:f,to:t};
  }
  if(period==='year'){
    const y=now.getFullYear()+offset;
    const t=new Date(y,11,31); t.setHours(23,59,59,999);
    return{from:new Date(y,0,1),to:t};
  }
  const f=new Date(now.getFullYear(),now.getMonth()+offset,1);
  const t=new Date(now.getFullYear(),now.getMonth()+offset+1,0); t.setHours(23,59,59,999);
  return{from:f,to:t};
}

function setBudFlowMode(mode){
  currentBudFlowMode=mode;
  document.getElementById('bud-flow-out-btn').classList.toggle('active', mode==='vydaj');
  document.getElementById('bud-flow-net-btn').classList.toggle('active', mode==='net');
}

function setBudTrackMode(mode){
  currentBudTrackMode=mode;
  document.getElementById('bud-track-cats-btn').classList.toggle('active', mode==='cats');
  document.getElementById('bud-track-tags-btn').classList.toggle('active', mode==='tags');
  document.getElementById('bud-track-cats-wrap').style.display=mode==='cats'?'block':'none';
  document.getElementById('bud-track-tags-wrap').style.display=mode==='tags'?'block':'none';
}

function renderBudTagsPicker(){
  const wrap=document.getElementById('bud-tags-picker');
  if(!wrap) return;
  const allTags=getAllTags();
  if(!allTags.length){wrap.innerHTML='<span style="font-size:12px;color:var(--text-secondary);font-style:italic">Zatím žádné štítky v transakcích</span>';return;}
  wrap.innerHTML=allTags.map(tag=>
    `<span onclick="toggleBudTag('${escAttr(tag)}')" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${selectedBudTags.includes(tag)?'var(--accent-dim)':'var(--card-bg)'};border:1px solid ${selectedBudTags.includes(tag)?'var(--accent)':'var(--card-border)'};color:${selectedBudTags.includes(tag)?'var(--accent)':'var(--text-secondary)'};">${escHtml(tag)}</span>`
  ).join('');
}

function toggleBudTag(tag){
  const tmp=document.createElement('span');tmp.innerHTML=tag;tag=tmp.textContent;
  const idx=selectedBudTags.indexOf(tag);
  if(idx===-1) selectedBudTags.push(tag);
  else selectedBudTags.splice(idx,1);
  renderBudTagsPicker();
}

function setBudType(type){
  currentBudType=type;
  document.getElementById('bud-type-periodic').style.borderColor=type==='periodic'?'var(--accent)':'var(--card-border)';
  document.getElementById('bud-type-periodic').style.background=type==='periodic'?'var(--accent-dim)':'transparent';
  document.getElementById('bud-type-periodic').querySelector('div').style.color=type==='periodic'?'var(--accent)':'var(--text-primary)';
  document.getElementById('bud-type-cumulative').style.borderColor=type==='cumulative'?'var(--green)':'var(--card-border)';
  document.getElementById('bud-type-cumulative').style.background=type==='cumulative'?'var(--green-dim)':'transparent';
  document.getElementById('bud-type-cumulative').querySelector('div').style.color=type==='cumulative'?'var(--green)':'var(--text-primary)';
  document.getElementById('bud-periodic-opts').style.display=type==='periodic'?'flex':'none';
  document.getElementById('bud-cumulative-opts').style.display=type==='cumulative'?'block':'none';
}

function renderBudColorPicker(){
  document.getElementById('bud-color-picker').innerHTML=BUD_COLORS.map(c=>
    `<div onclick="selectedBudColor='${c}';renderBudColorPicker()" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c===selectedBudColor?'#fff':'transparent'};outline:${c===selectedBudColor?'2px solid '+c:'none'};"></div>`
  ).join('');
}

function renderBudCatsPicker(){
  const wrap=document.getElementById('bud-cats-picker');
  if(!wrap) return;
  wrap.innerHTML=categories.map(c=>
    `<span onclick="toggleBudCat('${escAttr(c.name)}')" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${selectedBudCats.includes(c.name)?c.color+'33':'var(--card-bg)'};border:1px solid ${selectedBudCats.includes(c.name)?c.color:'var(--card-border)'};color:${selectedBudCats.includes(c.name)?c.color:'var(--text-secondary)'};">${c.icon} ${escHtml(c.name)}</span>`
  ).join('');
}

function toggleBudCat(name){
  const tmp=document.createElement('span');tmp.innerHTML=name;name=tmp.textContent;
  const idx=selectedBudCats.indexOf(name);
  if(idx===-1) selectedBudCats.push(name);
  else selectedBudCats.splice(idx,1);
  renderBudCatsPicker();
}

function openBudModal(idx){
  editingBud=idx;
  const del=document.getElementById('bud-delete-btn');
  selectedBudCats=[];
  selectedBudTags=[];
  selectedBudColor=cssVar('--accent');
  if(idx===-1){
    document.getElementById('bud-modal-title').textContent='Nový rozpočet';
    document.getElementById('bud-name').value='';
    document.getElementById('bud-limit').value='';
    document.getElementById('bud-limit-cum').value='';
    document.getElementById('bud-start-cum').value='';
    document.getElementById('bud-end-cum').value='';
    document.getElementById('bud-period').value='month';
    setBudType('periodic');
    setBudTrackMode('cats');
    setBudFlowMode('vydaj');
    del.style.display='none';
  } else {
    const b=budgets[idx];
    document.getElementById('bud-modal-title').textContent='Upravit rozpočet';
    document.getElementById('bud-name').value=b.name;
    document.getElementById('bud-limit').value=b.budType==='cumulative'?'':b.limit;
    document.getElementById('bud-limit-cum').value=b.budType==='cumulative'?b.limit:'';
    document.getElementById('bud-start-cum').value=b.startDate||'';
    document.getElementById('bud-end-cum').value=b.endDate||'';
    document.getElementById('bud-period').value=b.period||'month';
    selectedBudColor=b.color||cssVar('--accent');
    selectedBudCats=b.cats?[...b.cats]:[];
    selectedBudTags=b.trackTags?[...b.trackTags]:[];
    setBudType(b.budType||'periodic');
    setBudTrackMode(b.trackMode||'cats');
    setBudFlowMode(b.flowMode||'vydaj');
    del.style.display='block';
  }
  renderBudColorPicker();
  renderBudCatsPicker();
  renderBudTagsPicker();
  openModal('bud');
}

function saveBud(){
  const name=document.getElementById('bud-name').value.trim();
  if(!name){toast('Zadej název rozpočtu.','warn');return;}
  const budType=currentBudType;
  const limit=budType==='cumulative'
    ? (parseFloat(document.getElementById('bud-limit-cum').value)||0)
    : (parseFloat(document.getElementById('bud-limit').value)||0);
  if(limit<=0){toast('Zadej platný limit rozpočtu (> 0).','warn');return;}
  const period=document.getElementById('bud-period').value;
  const color=selectedBudColor;
  const trackMode=currentBudTrackMode;
  const cats=trackMode==='cats'?(selectedBudCats.length?[...selectedBudCats]:[]):[];
  const trackTags=trackMode==='tags'?(selectedBudTags.length?[...selectedBudTags]:[]):[];
  const flowMode=currentBudFlowMode;
  const startDate=budType==='cumulative'?(document.getElementById('bud-start-cum').value||undefined):undefined;
  const endDate  =budType==='cumulative'?(document.getElementById('bud-end-cum').value  ||undefined):undefined;
  if(startDate&&endDate&&startDate>endDate){toast('Datum zahájení musí být před ukončením.','warn');return;}
  const obj={name,limit,color,budType,period,cats,trackMode,trackTags,flowMode,spent:0,startDate,endDate};
  if(editingBud===-1){
    budgets.push(obj);
  } else {
    budgets[editingBud]={...budgets[editingBud],...obj};
  }
  saveToStorage();
  closeModal('bud');
  markDirty('budget','dashboard');
}

function deleteBud(){
  if(editingBud===-1) return;
  budgets.splice(editingBud,1);
  saveToStorage();
  closeModal('bud');
  markDirty('budget','dashboard');
}

function getBudgetTransactions(b, offset){
  let range=null;
  if(b.budType!=='cumulative'){
    range=getBudgetPeriodRange(b, offset||0);
  }
  const matchTxn=t=>{
    if(b.trackMode==='tags'){
      const tags=b.trackTags&&b.trackTags.length?b.trackTags:[];
      if(!tags.length) return false;
      const txnTags=Array.isArray(t.tags)?t.tags:(t.tag?[t.tag]:[]);
      return tags.some(tag=>txnTags.includes(tag));
    } else {
      const cats=b.cats&&b.cats.length?b.cats:[b.name];
      return cats.includes(t.cat);
    }
  };
  const net=b.flowMode==='net';
  return transactions.filter(t=>{
    if(!matchTxn(t)) return false;
    if(t.type==='prevod') return false;
    if(!net&&t.type!=='vydaj') return false;
    if(range){const d=new Date(t.date+'T12:00:00');return d>=range.from&&d<=range.to;}
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));
}

function renderBudgetTxnList(i){
  const b=budgets[i];
  if(!b) return '';
  const off=budPeriodOffsets[i]||0;
  const txns=getBudgetTransactions(b, off);
  if(!txns.length) return '<div style="font-size:12.5px;color:var(--text-secondary);padding:8px 0 2px;text-align:center">Žádné transakce</div>';
  return txns.map(t=>{
    const sign=t.type==='prijem'?'+':'-';
    const color=t.type==='prijem'?'var(--green)':'var(--red)';
    const catBadge=typeof getCatBadge==='function'?getCatBadge(t.cat):'';
    return `<div class="bud-txn-row">
      <span class="bud-txn-date">${escHtml(t.date)}</span>
      <span class="bud-txn-desc">${escHtml(t.desc||t.cat)}</span>
      <span class="badge ${catBadge}" style="flex-shrink:0">${escHtml(t.cat||'')}</span>
      <span class="bud-txn-amount" style="color:${color}">${sign}${fmt(demoNum(t.amount),t.cur)}</span>
    </div>`;
  }).join('');
}

function toggleBudgetDetail(i){
  const detail=document.getElementById('bud-detail-'+i);
  const chevron=document.getElementById('bud-chevron-'+i);
  if(!detail) return;
  const open=detail.style.display==='none';
  if(open){
    detail.innerHTML=renderBudgetTxnList(i);
    detail.dataset.loaded='1';
  }
  detail.style.display=open?'block':'none';
  if(chevron) chevron.style.transform=open?'rotate(90deg)':'';
}

function getBudgetSpent(b, offset){
  if(b.budType==='cumulative') return calcBudgetSpent(b, null);
  return calcBudgetSpent(b, getBudgetPeriodRange(b, offset||0));
}

function periodLabel(b, offset){
  if(b.budType==='cumulative'){
    const fmt_d=d=>d.toLocaleDateString('cs-CZ',{day:'numeric',month:'numeric',year:'numeric'});
    const s=b.startDate?fmt_d(new Date(b.startDate+'T00:00:00')):null;
    const e=b.endDate  ?fmt_d(new Date(b.endDate  +'T00:00:00')):null;
    if(s&&e) return s+' – '+e;
    if(s)    return 'od '+s;
    if(e)    return 'do '+e;
    return 'celkový součet';
  }
  const p=b.period||'month';
  offset=offset||0;
  if(offset===0) return p==='week'?'tento týden':p==='year'?'tento rok':'tento měsíc';
  const range=getBudgetPeriodRange(b, offset);
  if(p==='week'){
    return range.from.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short'})+' – '+range.to.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short',year:'numeric'});
  }
  if(p==='year') return String(range.from.getFullYear());
  return range.from.toLocaleDateString('cs-CZ',{month:'long',year:'numeric'});
}

function renderBudget(){
  const el=document.getElementById('budget-list');
  const empty=document.getElementById('budget-empty');
  if(!budgets.length){el.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const periodic=budgets.filter(b=>b.budType!=='cumulative');
  const cumulative=budgets.filter(b=>b.budType==='cumulative');
  let html='';
  if(periodic.length){
    html+=`<div style="font-size:12px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Periodické rozpočty</div>`;
    html+=periodic.map((b,_)=>{
      const i=budgets.indexOf(b);
      const off=budPeriodOffsets[i]||0;
      const spent=getBudgetSpent(b, off);
      const pct=b.limit?Math.min(spent/b.limit*100,100):0;
      const over=b.limit>0&&spent>b.limit;
      const trackInfo=(b.flowMode==='net'?'čistý tok · ':'')+( b.trackMode==='tags'?(b.trackTags&&b.trackTags.length?'štítky: '+b.trackTags.map(t=>escHtml(t)).join(', '):'—'):(b.cats&&b.cats.length?'kategorie: '+b.cats.map(c=>escHtml(c)).join(', '):'kategorie: '+escHtml(b.name)));
      return`<div class="card" style="display:flex;flex-direction:column;gap:8px">
        <div onclick="toggleBudgetDetail(${i})" style="cursor:pointer;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              <span id="bud-chevron-${i}" class="bud-chevron">▶</span>
              <span style="font-weight:500;font-size:14px">${escHtml(b.name)}</span>
              <button class="btn-edit" onclick="event.stopPropagation();shiftBudPeriod(${i},-1)" style="padding:1px 7px;font-size:13px;line-height:1.4">‹</button>
              <span style="font-size:11px;color:var(--text-secondary);min-width:80px;text-align:center">${periodLabel(b,off)}</span>
              <button class="btn-edit" onclick="event.stopPropagation();shiftBudPeriod(${i},1)" style="padding:1px 7px;font-size:13px;line-height:1.4">›</button>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:12.5px;color:${over?'var(--red)':'var(--text-secondary)'}">${fmt(demoNum(spent))} / ${fmt(demoNum(b.limit))}</span>
              <button class="btn-edit" onclick="event.stopPropagation();openBudModal(${i})">Upravit</button>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${over?'var(--red)':b.color}"></div></div>
          <div style="font-size:11.5px;color:var(--text-secondary)">${pct.toFixed(0)} % vyčerpáno${over?' — překročeno!':''} · ${trackInfo}</div>
        </div>
        <div id="bud-detail-${i}" class="bud-detail" style="display:none"></div>
      </div>`;
    }).join('');
  }
  if(cumulative.length){
    html+=`<div style="font-size:12px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin:${periodic.length?'16px':0} 0 4px">Kumulativní sledování</div>`;
    html+=cumulative.map((b,_)=>{
      const i=budgets.indexOf(b);
      const spent=getBudgetSpent(b);
      const pct=b.limit?Math.min(spent/b.limit*100,100):null;
      const over=b.limit>0&&spent>b.limit;
      const trackInfo=(b.flowMode==='net'?'čistý tok · ':'')+( b.trackMode==='tags'?(b.trackTags&&b.trackTags.length?'štítky: '+b.trackTags.map(t=>escHtml(t)).join(', '):'—'):(b.cats&&b.cats.length?'kategorie: '+b.cats.map(c=>escHtml(c)).join(', '):'kategorie: '+escHtml(b.name)));
      return`<div class="card" style="display:flex;flex-direction:column;gap:8px">
        <div onclick="toggleBudgetDetail(${i})" style="cursor:pointer;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <div>
              <span id="bud-chevron-${i}" class="bud-chevron">▶</span>
              <span style="font-weight:500;font-size:14px">${escHtml(b.name)}</span>
              <span style="font-size:11px;color:var(--text-secondary);margin-left:8px">${periodLabel(b)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:15px;font-weight:600;color:${b.color}">${fmt(spent)}</span>
              ${b.limit?`<span style="font-size:12px;color:${over?'var(--red)':'var(--text-secondary)'}">z ${fmt(demoNum(b.limit))}</span>`:''}
              <button class="btn-edit" onclick="event.stopPropagation();openBudModal(${i})">Upravit</button>
            </div>
          </div>
          ${pct!==null?`<div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${over?'var(--red)':b.color}"></div></div><div style="font-size:11.5px;color:var(--text-secondary)">${pct.toFixed(0)} % z limitu${over?' — překročeno!':''}</div>`:''}
          <div style="font-size:11.5px;color:var(--text-secondary)">${trackInfo}</div>
        </div>
        <div id="bud-detail-${i}" class="bud-detail" style="display:none"></div>
      </div>`;
    }).join('');
  }
  el.innerHTML=html;
}
