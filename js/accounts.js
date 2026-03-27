// Kasička — účty, drag & drop, graf účtů

function openAccModal(idx){
  editingAcc=idx;
  const del=document.getElementById('acc-delete-btn');
  const setToggle=(val)=>{
    const cb=document.getElementById('acc-include');
    cb.checked=val;
    updateToggle('acc-include');
  };
  if(idx===-1){
    document.getElementById('acc-modal-title').textContent='Nový účet';
    document.getElementById('acc-name').value='';
    document.getElementById('acc-balance').value='';
    document.getElementById('acc-currency').value='CZK';
    document.getElementById('acc-type').value='bank';
    document.getElementById('acc-start-date').value='';
    setToggle(true);
    del.style.display='none';
  } else {
    const a=accounts[idx];
    document.getElementById('acc-modal-title').textContent='Upravit účet';
    document.getElementById('acc-name').value=a.name;
    document.getElementById('acc-balance').value=getBalance(idx);
    document.getElementById('acc-currency').value=a.currency;
    document.getElementById('acc-type').value=a.type;
    document.getElementById('acc-start-date').value=a.startDate||'';
    setToggle(a.includeInTotal!==false);
    del.style.display='block';
  }
  openModal('acc');
}

function saveAcc(){
  const name=document.getElementById('acc-name').value.trim();
  const rawBalance=document.getElementById('acc-balance').value;
  const desiredBalance=parseFloat(rawBalance);
  const currency=document.getElementById('acc-currency').value;
  const type=document.getElementById('acc-type').value;
  const includeInTotal=document.getElementById('acc-include').checked;
  const startDate=document.getElementById('acc-start-date').value||'';
  if(!name){toast('Zadej název účtu.','warn');return;}
  if(rawBalance!==''&&isNaN(desiredBalance)){toast('Zadej platný zůstatek.','warn');return;}
  const balance=isNaN(desiredBalance)?0:desiredBalance;
  if(editingAcc===-1){
    const acc={name,initialBalance:balance,currency,type,includeInTotal,startDate};
    accounts.push(acc);
  } else {
    const txnSum=transactions.reduce((s,t)=>s+txnImpact(t,editingAcc),0);
    accounts[editingAcc]={...accounts[editingAcc],name,initialBalance:balance-txnSum,currency,type,includeInTotal,startDate};
  }
  recordSnapshot();
  saveToStorage();
  closeModal('acc');
  markDirty('accounts','dashboard');
}

function deleteAcc(){
  if(editingAcc===-1) return;
  const delIdx=editingAcc;
  accounts.splice(delIdx,1);
  transactions.forEach(t=>{
    if(t.accIdx!==undefined&&t.accIdx!==''){
      const ai=parseInt(t.accIdx);
      if(ai===delIdx) t.accIdx='';
      else if(ai>delIdx) t.accIdx=String(ai-1);
    }
    if(t.toAccIdx!=null&&t.toAccIdx!==''){
      const ti=parseInt(t.toAccIdx);
      if(ti===delIdx) t.toAccIdx=null;
      else if(ti>delIdx) t.toAccIdx=String(ti-1);
    }
  });
  recordSnapshot();
  saveToStorage();
  closeModal('acc');
  markDirty('accounts','transactions','dashboard');
}

function accDragStart(e,i){
  _dragAccIdx=i;
  e.currentTarget.classList.add('acc-card-dragging');
  e.dataTransfer.effectAllowed='move';
}
function accDragOver(e){
  e.preventDefault();
  e.currentTarget.classList.add('acc-card-dragover');
}
function accDrop(e,toIdx){
  e.preventDefault();
  e.currentTarget.classList.remove('acc-card-dragover');
  if(_dragAccIdx===null||_dragAccIdx===toIdx) return;
  // Zapamatovat staré pořadí objektů před přesunem
  const oldOrder=[...accounts];
  // Přesunout účet
  const moved=accounts.splice(_dragAccIdx,1)[0];
  accounts.splice(toIdx,0,moved);
  // Opravit accIdx a toAccIdx v transakcích pomocí identity objektů
  transactions.forEach(t=>{
    if(t.accIdx!==undefined&&t.accIdx!==''){
      const obj=oldOrder[parseInt(t.accIdx)];
      if(obj!==undefined){const ni=accounts.indexOf(obj);if(ni!==-1)t.accIdx=String(ni);}
    }
    if(t.toAccIdx!=null&&t.toAccIdx!==''){
      const obj=oldOrder[parseInt(t.toAccIdx)];
      if(obj!==undefined){const ni=accounts.indexOf(obj);if(ni!==-1)t.toAccIdx=String(ni);}
    }
  });
  saveToStorage();
  renderAccounts();
  refreshTxnFilters();
  refreshAccSelect();
}
function accDragEnd(e){
  e.currentTarget.classList.remove('acc-card-dragging');
  document.querySelectorAll('.acc-card-dragover').forEach(el=>el.classList.remove('acc-card-dragover'));
  _dragAccIdx=null;
}

function renderAccounts(){
  const list=document.getElementById('accounts-list');
  const empty=document.getElementById('accounts-empty');
  if(!accounts.length){list.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  list.innerHTML=accounts.map((a,i)=>{
    const excluded=a.includeInTotal===false;
    const bal=getBalance(i);
    const col=bal>=0?(excluded?'var(--text-secondary)':'var(--accent)'):'var(--red)';
    return`<div class="account-card" draggable="true" data-acc-idx="${i}"
      ondragstart="accDragStart(event,${i})"
      ondragover="accDragOver(event)"
      ondrop="accDrop(event,${i})"
      ondragend="accDragEnd(event)">
      <span class="drag-handle" title="Přetáhnout pro změnu pořadí">⠿</span>
      <div class="account-icon" style="background:${excluded?'rgba(255,255,255,0.05)':'var(--accent-dim)'}">${accIcons[a.type]||'🏦'}</div>
      <div style="flex:1;min-width:0;">
        <div class="account-name" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
          ${escHtml(a.name)}
          ${excluded?`<span style="font-size:10px;padding:2px 6px;border-radius:10px;background:rgba(255,255,255,0.07);color:var(--text-secondary);white-space:nowrap">mimo majetek</span>`:''}
        </div>
        <div class="account-num">${accTypeLabels[a.type]||a.type}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;margin-left:8px;">
        <div style="font-size:14px;font-weight:600;color:${col};white-space:nowrap">${fmt(bal,a.currency)}</div>
        <div style="display:flex;gap:4px;">
          <button class="btn-transfer" onclick="openTransferFromAcc(${i})">⇄</button>
          <button class="btn-edit" onclick="openAccModal(${i})">Upravit</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function labelToDate(label){
  const parts=label.split('.');
  if(parts.length>=2){
    const now=new Date();
    return new Date(now.getFullYear(),parseInt(parts[1])-1,parseInt(parts[0]));
  }
  return new Date(0);
}

function getCustomRange(prefix){
  const from=document.getElementById(prefix+'-from')?.value;
  const to=document.getElementById(prefix+'-to')?.value;
  if(from&&to) return{from:new Date(from),to:new Date(to)};
  return null;
}

function filterHistoryByPeriod(history, period, currentVal, prefix){
  if(period==='vse') return history;
  let range;
  if(period==='vlastni'){
    range=getCustomRange(prefix);
    if(!range) return history;
  } else {
    range=getDateRange(period);
  }
  if(!range) return history;
  const filtered=history.filter(h=>{
    const d=h.date?new Date(h.date+'T12:00:00'):labelToDate(h.label);
    return d>=range.from&&d<=range.to;
  });
  if(filtered.length>=1) return filtered;
  return [{label:range.from.toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:range.from.toISOString().split('T')[0],value:0,invested:0},{label:range.to.toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:range.to.toISOString().split('T')[0],value:currentVal,invested:currentVal}];
}

function renderAccChart(){
  const ctx=document.getElementById('chartAccounts');
  if(!ctx) return;
  if(chartAcc){chartAcc.destroy();chartAcc=null;}
  renderAccChartFilter();

  // Filtrovat účty podle výběru
  const selectedAccs=accChartFilter.size>0?[...accChartFilter]:accounts.map((_,i)=>i).filter(i=>accounts[i].includeInTotal!==false);

  // Přepočítat historii jen pro vybrané účty
  let history=buildBalanceHistoryForAccounts(selectedAccs);
  const currentVal=selectedAccs.reduce((s,i)=>s+(accounts[i]?toCZK(getBalance(i),accounts[i].currency):0),0);
  if(history.length<2){
    const nowLbl=new Date().toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'});
    history=[{label:'Start',value:0},{label:nowLbl,value:Math.round(currentVal*100)/100}];
  }
  const todayStr=today();
  if(history[history.length-1]?.date!==todayStr){
    history=[...history,{label:new Date().toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:todayStr,value:Math.round(currentVal*100)/100}];
  }

  // Filtrovat dle období s offsetem
  if(accPeriod!=='vse'&&accPeriod!=='vlastni'){
    const range=getChartDateRange(accPeriod, accOffset);
    if(range) history=history.filter(h=>{const d=h.date?new Date(h.date+'T12:00:00'):new Date();return d>=range.from&&d<=range.to;});
    if(!history.length) history=[{label:'-',value:0}];
  } else {
    history=filterHistoryByPeriod(history, accPeriod, Math.round(currentVal*100)/100, 'acc');
  }

  chartAcc=new Chart(ctx,{type:'line',data:{labels:history.map(h=>h.label),datasets:[{label:'Zůstatky (Kč)',data:history.map(h=>h.value),borderColor:'#4f8ef7',backgroundColor:'rgba(79,142,247,0.1)',borderWidth:2,pointRadius:0,pointHoverRadius:4,pointBackgroundColor:'#4f8ef7',fill:true,tension:0.35}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>v.raw.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kč'}}},scales:{x:{ticks:{color:'#8b92a8',font:{size:11},maxRotation:45,autoSkip:true},grid:{color:'rgba(255,255,255,0.05)'}},y:{ticks:{color:'#8b92a8',font:{size:11},callback:v=>v.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})},grid:{color:'rgba(255,255,255,0.05)'}}}}});
}
