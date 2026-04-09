// Kasička — transakce, převody, štítky

function openTxnModal(idx, recurring=false){
  editingTxn=idx;
  if(idx===-1) recurringMode=recurring;
  else recurringMode=!!transactions[idx]?.recurring;
  const del=document.getElementById('txn-delete-btn');
  if(idx===-1){
    document.getElementById('txn-modal-title').textContent=recurringMode?'Nová opakující se transakce':'Nová transakce';
    document.getElementById('txn-date').value=today();
    document.getElementById('txn-desc').value='';
    currentTags=[];
    renderTagsPreview();
    document.getElementById('txn-amount').value='';
    document.getElementById('txn-type').value='vydaj';
    document.getElementById('txn-currency').value='CZK';
    document.getElementById('txn-cat').value=categories.length?categories[0].name:'JÍDLO';
    del.style.display='none';
  } else {
    const t=transactions[idx];
    document.getElementById('txn-modal-title').textContent='Upravit transakci';
    document.getElementById('txn-desc').value=t.desc;
    currentTags=Array.isArray(t.tags)?[...t.tags]:(t.tag?[t.tag]:[]);
    renderTagsPreview();
    document.getElementById('txn-amount').value=t.amount;
    document.getElementById('txn-date').value=t.date;
    document.getElementById('txn-type').value=t.type;
    document.getElementById('txn-currency').value=t.cur;
    document.getElementById('txn-cat').value=t.cat;
    del.style.display='block';
  }
  refreshAccSelect(idx===-1?'':transactions[idx]?.accIdx||'');
  refreshCatSelect(idx===-1?'':transactions[idx]?.cat||'');
  renderTagQuickPicks();
  // Naplň select sdílených skupin
  const sgSel=document.getElementById('txn-shared-group');
  sgSel.innerHTML='<option value="">— nesdílet —</option>'+sharedGroupsList.map(g=>
    `<option value="${escAttr(g.id)}">${escHtml(g.name)}</option>`).join('');
  sgSel.value=idx===-1?'':(transactions[idx]?.sharedGroupId||'');
  // Zobraz jen pokud existují skupiny
  document.getElementById('txn-shared-group-row').style.display=sharedGroupsList.length?'':'none';
  // Recurring pole
  const recRow=document.getElementById('txn-recurring-row');
  const dateRow=document.getElementById('txn-date-row');
  const isRec=recurringMode||(idx!==-1&&transactions[idx]?.recurring);
  if(isRec){
    recRow.style.display='';
    dateRow.style.display='none';
    if(idx!==-1&&transactions[idx]?.recurring){
      const rec=transactions[idx].recurring;
      document.getElementById('txn-recurring-interval').value=rec.interval||'monthly';
      document.getElementById('txn-recurring-start').value=rec.nextDate||today();
      document.getElementById('txn-recurring-end').value=rec.endDate||'';
      document.getElementById('txn-recurring-enabled').checked=rec.enabled!==false;
      updateToggle('txn-recurring-enabled');
    } else {
      document.getElementById('txn-recurring-interval').value='monthly';
      document.getElementById('txn-recurring-start').value=today();
      document.getElementById('txn-recurring-end').value='';
      document.getElementById('txn-recurring-enabled').checked=true;
      updateToggle('txn-recurring-enabled');
    }
    updateRecurringHint();
  } else {
    recRow.style.display='none';
    dateRow.style.display='';
  }
  openModal('txn');
}

function refreshAccSelect(selectedVal){
  const sel=document.getElementById('txn-acc-select');
  sel.innerHTML='<option value="">— žádný —</option>';
  accounts.forEach((a,i)=>{const o=document.createElement('option');o.value=i;o.textContent=a.name+' ('+a.currency+')';sel.appendChild(o);});
  if(selectedVal!==undefined) sel.value=selectedVal;
}

function refreshTransferSelects(){
  ['tr-from','tr-to'].forEach(id=>{
    const sel=document.getElementById(id);
    const prev=sel.value;
    sel.innerHTML='<option value="">— vybrat —</option>';
    accounts.forEach((a,i)=>{const o=document.createElement('option');o.value=i;o.textContent=a.name+' ('+fmt(getBalance(i),a.currency)+')';sel.appendChild(o);});
    sel.value=prev;
  });
}

function duplicateTxn(idx){
  const t=transactions[idx];
  if(!t||t.type==='prevod') return;
  openTxnModal(-1);
  document.getElementById('txn-modal-title').textContent='Duplikovat transakci';
  document.getElementById('txn-desc').value=t.desc||'';
  document.getElementById('txn-amount').value=t.amount;
  document.getElementById('txn-type').value=t.type;
  document.getElementById('txn-currency').value=t.cur||'CZK';
  document.getElementById('txn-cat').value=t.cat||'';
  document.getElementById('txn-acc-select').value=t.accIdx!==''?t.accIdx:'';
  currentTags=Array.isArray(t.tags)?[...t.tags]:(t.tag?[t.tag]:[]);
  renderTagsPreview();
}

function openTransferModal(){
  document.getElementById('tr-amount').value='';
  document.getElementById('tr-note').value='';
  document.getElementById('tr-date').value=today();
  refreshTransferSelects();
  if(accounts.length>=2){
    document.getElementById('tr-from').value='0';
    document.getElementById('tr-to').value='1';
  }
  updateTransferHint();
  openModal('transfer');
}

function openTransferFromAcc(idx){
  document.getElementById('tr-amount').value='';
  document.getElementById('tr-note').value='';
  document.getElementById('tr-date').value=today();
  refreshTransferSelects();
  document.getElementById('tr-from').value=idx;
  const other=accounts.findIndex((_,i)=>i!==idx);
  document.getElementById('tr-to').value=other>=0?other:'';
  updateTransferHint();
  openModal('transfer');
}

function updateTransferHint(){
  const fi=document.getElementById('tr-from').value;
  const ti=document.getElementById('tr-to').value;
  const amount=parseFloat(document.getElementById('tr-amount').value)||0;
  const hint=document.getElementById('tr-hint');
  if(accounts.length<2){hint.textContent='Pro převod potřebuješ aspoň 2 účty. Přidej je v sekci Účty.';hint.style.color='var(--amber)';return;}
  if(fi===''||ti===''){hint.textContent='';return;}
  if(fi===ti){hint.textContent='Zdrojový a cílový účet musí být různé.';hint.style.color='var(--red)';return;}
  const from=accounts[fi],to=accounts[ti];
  if(!from||!to){hint.textContent='';return;}
  if(from.currency===to.currency){
    hint.textContent=amount>0?'Převede se '+fmt(amount,from.currency)+' → '+fmt(amount,to.currency):'';
  } else {
    const rate=RATES[from.currency]/RATES[to.currency];
    const converted=amount*rate;
    hint.textContent=amount>0?'Kurz: 1 '+from.currency+' = '+rate.toFixed(4)+' '+to.currency+' → '+fmt(converted,to.currency):'Různé měny — bude přepočítáno.';
  }
  hint.style.color='var(--text-secondary)';
}

async function saveTxn(){
  const desc=document.getElementById('txn-desc').value.trim();
  const tags=[...currentTags];
  const amount=parseFloat(document.getElementById('txn-amount').value);
  const type=document.getElementById('txn-type').value;
  const cat=document.getElementById('txn-cat').value;
  const cur=document.getElementById('txn-currency').value;
  const accIdx=document.getElementById('txn-acc-select').value;
  const sharedGroupId=document.getElementById('txn-shared-group').value||'';
  if(isNaN(amount)||amount<=0){toast('Zadej platnou částku.','warn');return;}
  if(!cat){toast('Vyber kategorii.','warn');return;}
  if(!accIdx){toast('Vyber účet.','warn');return;}
  // Recurring pole
  const isRecurring=recurringMode||(editingTxn!==-1&&transactions[editingTxn]?.recurring);
  let recurringObj=null;
  let date;
  if(isRecurring){
    const interval=document.getElementById('txn-recurring-interval').value;
    const startDate=document.getElementById('txn-recurring-start').value;
    const endDate=document.getElementById('txn-recurring-end').value;
    const enabled=document.getElementById('txn-recurring-enabled').checked;
    if(!startDate){toast('Zadej datum opakování.','warn');return;}
    date=startDate;
    // Zjisti dayOfMonth
    const dd=new Date(startDate+'T12:00:00');
    const lastDayOfMonth=new Date(dd.getFullYear(),dd.getMonth()+1,0).getDate();
    const dayOfMonth=(interval==='monthly'||interval==='yearly')
      ?(dd.getDate()>=lastDayOfMonth?'last':dd.getDate())
      :null;
    recurringObj={interval,nextDate:startDate,endDate,enabled,dayOfMonth};
  } else {
    date=document.getElementById('txn-date').value;
    if(!date){toast('Zadej datum.','warn');return;}
  }
  recurringMode=false;

  // Kontrola: transakce před počátečním datem účtu
  const accI=parseInt(accIdx);
  if(isNaN(accI)||accI<0||accI>=accounts.length){toast('Neplatný účet.','warn');return;}
  const acc=accounts[accI];
  if(acc&&acc.startDate&&date<acc.startDate){
    const ok=await confirmDialog('Transakce ('+new Date(date+'T12:00:00').toLocaleDateString('cs-CZ')+') je před počátečním datem účtu „'+acc.name+'" ('+new Date(acc.startDate+'T12:00:00').toLocaleDateString('cs-CZ')+').\nPosunout počáteční datum účtu?');
    if(!ok) return;
    acc.startDate=date;
  }

  if(editingTxn===-1){
    const txnObj={desc,tags,amount,date,type,cat,cur,accIdx};
    if(recurringObj) txnObj.recurring=recurringObj;
    if(sharedGroupId) txnObj.sharedGroupId=sharedGroupId;
    // Zapiš do Supabase shared_transactions (před uložením lokálně, abychom měli ID)
    if(sharedGroupId&&currentUser){
      const stId=await syncSharedTxn(null,{group_id:sharedGroupId,user_id:currentUser.id,amount,currency:cur,category:cat,description:desc,date});
      if(stId) txnObj.sharedTxnId=stId;
    }
    transactions.unshift(txnObj);
  } else {
    const old=transactions[editingTxn];
    // Pokud stará transakce byla investiční, revertujeme dopad na investici
    reverseInvestmentTxn(old);
    // Zachováme invIdx/toAccIdx pokud existovaly
    const preserve={};
    if(old.invIdx!=null&&old.invIdx!=='') preserve.invIdx=old.invIdx;
    if(old.toAccIdx!=null&&old.toAccIdx!=='') preserve.toAccIdx=old.toAccIdx;
    if(old.convertedAmount!=null) preserve.convertedAmount=old.convertedAmount;
    if(old.toCur) preserve.toCur=old.toCur;
    if(old.sharedTxnId) preserve.sharedTxnId=old.sharedTxnId;
    const newTxn={desc,tags,amount,date,type,cat,cur,accIdx,...preserve};
    if(recurringObj) newTxn.recurring=recurringObj;
    else delete newTxn.recurring;
    if(sharedGroupId) newTxn.sharedGroupId=sharedGroupId;
    else { delete newTxn.sharedGroupId; delete newTxn.sharedTxnId; }
    // Sync se Supabase
    if(currentUser){
      if(sharedGroupId){
        const stId=await syncSharedTxn(preserve.sharedTxnId||null,{group_id:sharedGroupId,user_id:currentUser.id,amount,currency:cur,category:cat,description:desc,date});
        if(stId) newTxn.sharedTxnId=stId;
      } else if(preserve.sharedTxnId){
        await supa.from('shared_transactions').delete().eq('id',preserve.sharedTxnId);
      }
    }
    transactions[editingTxn]=newTxn;
    // Pokud transakce je stále investiční, znovu aplikujeme dopad
    if(preserve.invIdx!=null){
      const inv=investments[preserve.invIdx];
      if(inv){
        const inCZK=toCZK(amount,cur);
        inv.invested+=inCZK;
        if(inv.apiSymbol) inv.value+=inCZK;
      }
    }
  }
  recordSnapshot();
  saveToStorage();
  closeModal('txn');
  // Ihned zpracovat recurring (pokud nová šablona má datum v minulosti)
  if(recurringObj) processRecurringTxns();
  markDirty('transactions','accounts','dashboard','investments','budget');
}

function reverseInvestmentTxn(old){
  if(!old) return;
  const invIdx=old.invIdx;
  if(invIdx===undefined||invIdx===null||invIdx==='') return;
  const inv=investments[invIdx];
  if(!inv) return;
  const inCZK=toCZK(old.amount,old.cur||'CZK');
  inv.invested=Math.max(0,inv.invested-inCZK);
  // Pro API investice aktualizujeme value přímo; pro ruční je odvozená z transakcí
  if(inv.apiSymbol) inv.value=Math.max(0,inv.value-inCZK);
  if(inv.history){
    const tickerSuffix=' → '+inv.ticker;
    const histNote=(old.desc&&old.desc.endsWith(tickerSuffix))?old.desc.slice(0,-tickerSuffix.length):old.desc;
    inv.history=inv.history.filter(h=>!(h.date===old.date&&h.note===histNote));
  }
}

function deleteTxn(){
  if(editingTxn===-1) return;
  const old=transactions[editingTxn];
  deleteSharedTxnForLocal(old);
  reverseInvestmentTxn(old);
  transactions.splice(editingTxn,1);
  recordSnapshot();
  saveToStorage();
  closeModal('txn');
  markDirty('transactions','accounts','dashboard','investments','budget');
}

function quickDeleteTxn(idx){
  const old=transactions[idx];
  deleteSharedTxnForLocal(old);
  reverseInvestmentTxn(old);
  transactions.splice(idx,1);
  recordSnapshot();
  saveToStorage();
  markDirty('transactions','accounts','dashboard','investments','budget');
}

// Smaže sdílenou transakci ze Supabase (spolehlivě i bez sharedTxnId)
async function deleteSharedTxnForLocal(txn){
  if(!supa||!currentUser||!txn.sharedGroupId) return;
  if(txn.sharedTxnId){
    await supa.from('shared_transactions').delete().eq('id',txn.sharedTxnId);
  } else {
    // Fallback — najdi podle shody dat
    await supa.from('shared_transactions').delete()
      .eq('group_id',txn.sharedGroupId)
      .eq('user_id',currentUser.id)
      .eq('amount',txn.amount)
      .eq('date',txn.date)
      .eq('category',txn.cat)
      .eq('description',txn.desc||'')
      .limit(1);
  }
  // Přenačti detail skupiny pokud je otevřený
  if(viewingSharedGroup===txn.sharedGroupId){
    await loadSharedGroupDetail();
    renderSharedGroupDetail();
  }
}

async function saveTransfer(){
  const fi=document.getElementById('tr-from').value;
  const ti=document.getElementById('tr-to').value;
  const amount=parseFloat(document.getElementById('tr-amount').value);
  const date=document.getElementById('tr-date').value;
  const note=document.getElementById('tr-note').value.trim()||'Převod';
  if(fi===''||ti===''){toast('Vyber zdrojový i cílový účet.','warn');return;}
  if(fi===ti){toast('Zdrojový a cílový účet musí být různé.','warn');return;}
  if(isNaN(amount)||amount<=0){toast('Zadej platnou částku.','warn');return;}
  if(!date){toast('Zadej datum.','warn');return;}
  const from=accounts[fi],to=accounts[ti];
  // Kontrola: převod před počátečním datem účtu
  const earlyAccs=[from,to].filter(a=>a&&a.startDate&&date<a.startDate);
  if(earlyAccs.length){
    const names=earlyAccs.map(a=>'„'+a.name+'" ('+new Date(a.startDate+'T12:00:00').toLocaleDateString('cs-CZ')+')').join(', ');
    const ok=await confirmDialog('Převod ('+new Date(date+'T12:00:00').toLocaleDateString('cs-CZ')+') je před počátečním datem účtu '+names+'.\nPosunout počáteční datum?');
    if(!ok) return;
    earlyAccs.forEach(a=>{a.startDate=date;});
  }
  const rate=RATES[from.currency]/RATES[to.currency];
  const converted=amount*rate;
  transactions.unshift({desc:note+' ('+from.name+' → '+to.name+')',amount,date,type:'prevod',cat:'Převod',cur:from.currency,accIdx:fi,toAccIdx:ti,convertedAmount:converted,toCur:to.currency});
  recordSnapshot();
  saveToStorage();
  closeModal('transfer');
  markDirty('transactions','accounts','dashboard');
}

// Vrátí dopad transakce t na zůstatek účtu s indexem i (v měně účtu)
function txnImpact(t,i){
  const si=String(i);
  if(t.type==='prijem'&&String(t.accIdx)===si) return t.amount||0;
  if(t.type==='vydaj'&&String(t.accIdx)===si) return -(t.amount||0);
  if(t.type==='prevod'){
    if(String(t.accIdx)===si) return -(t.amount||0);
    if(t.toAccIdx!=null&&String(t.toAccIdx)===si) return t.convertedAmount||0;
  }
  return 0;
}

// Vrátí aktuální zůstatek účtu odvozený z initialBalance + součtu transakcí
function getBalance(i){
  const a=accounts[i];
  if(!a) return 0;
  return (a.initialBalance||0)+transactions.reduce((s,t)=>s+txnImpact(t,i),0);
}

// Vrátí aktuální hodnotu investice – pro ruční: poslední ruční aktualizace + vklady od té doby
function getInvValue(i){
  const inv=investments[i];
  if(!inv) return 0;
  // API investice – hodnota pochází z API
  if(inv.apiSymbol) return inv.value||0;
  // Ruční investice – odvozená hodnota
  const hist=inv.history||[];
  let baseValue=inv.value||0, lastManualDate='';
  for(let j=hist.length-1;j>=0;j--){
    if(!hist[j].isPurchase){baseValue=hist[j].value;lastManualDate=hist[j].date;break;}
  }
  // Přičteme vklady (z transakcí) po poslední ruční aktualizaci
  const si=String(i);
  const purchasesSince=transactions
    .filter(t=>t.type==='vydaj'&&t.cat==='INVESTICE'&&t.date&&(!lastManualDate||t.date>lastManualDate)&&(
      (t.invIdx!=null&&String(t.invIdx)===si)||
      (t.invIdx==null&&inv.ticker&&t.desc&&t.desc.includes(inv.ticker))
    ))
    .reduce((s,t)=>s+toCZK(t.amount,t.cur||'CZK'),0);
  return baseValue+purchasesSince;
}

function buildBalanceHistory(){
  return buildBalanceHistoryForAccounts(accounts.map((_,i)=>i).filter(i=>accounts[i]?.includeInTotal!==false));
}

function buildBalanceHistoryForAccounts(accIndices){
  // Projdeme všechna data transakcí a spočítáme kumulativní zůstatek
  if(!transactions.length&&!accounts.length) return [];
  const accSet=new Set(accIndices.map(i=>String(i)));

  // Počáteční zůstatky vybraných účtů (před transakcemi)
  const initBalance={};
  accIndices.forEach(i=>{
    const a=accounts[i];
    if(!a) return;
    initBalance[i]=(initBalance[i]||0)+toCZK(a.initialBalance||0,a.currency);
  });
  const totalInit=Object.values(initBalance).reduce((s,v)=>s+v,0);

  // Seřadit transakce dle data
  const sorted=[...transactions].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));

  // Seskupit po dnech — pouze pro vybrané účty
  const byDate={};
  sorted.forEach(t=>{
    if(!byDate[t.date]) byDate[t.date]=0;
    const accInSelected=t.accIdx===''?false:accSet.has(String(t.accIdx));
    const toAccInSelected=t.toAccIdx!==undefined&&t.toAccIdx!==null&&accSet.has(String(t.toAccIdx));
    if(t.type==='prijem'&&accInSelected) byDate[t.date]+=toCZK(t.amount,t.cur);
    else if(t.type==='vydaj'&&accInSelected) byDate[t.date]-=toCZK(t.amount,t.cur);
    else if(t.type==='prevod'){
      if(accInSelected&&!toAccInSelected) byDate[t.date]-=toCZK(t.amount,t.cur);
      else if(!accInSelected&&toAccInSelected) byDate[t.date]+=toCZK(t.convertedAmount||0,'CZK');
    }
  });

  let running=totalInit;
  const history=[];

  // Přidej počáteční bod — nejstarší startDate ze vybraných účtů
  const startDates=accIndices.map(i=>accounts[i]?.startDate).filter(Boolean).sort();
  const globalStart=startDates[0]||'';
  history.push({
    label:new Date(globalStart).toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),
    date:globalStart,
    value:Math.round(totalInit*100)/100
  });

  const dates=Object.keys(byDate).filter(d=>d>globalStart).sort();
  dates.forEach(date=>{
    running+=byDate[date];
    history.push({label:new Date(date).toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date,value:Math.round(running*100)/100});
  });
  return history;
}

function buildInvHistory(){
  // Sbírá snapshoty z investičních aktualizací
  const allDates=new Set();
  investments.forEach(inv=>{
    if(inv.history) inv.history.forEach(h=>allDates.add(h.date));
  });
  if(allDates.size<2) return [];
  const sorted=[...allDates].sort();
  return sorted.map(date=>{
    let val=0;
    investments.forEach(inv=>{
      const snap=[...(inv.history||[])].filter(h=>h.date<=date).pop();
      val+=snap?snap.value:0;
    });
    const totalInvested=investments.reduce((s,i)=>s+i.invested,0);
    return{
      label:new Date(date).toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),
      date,
      invested:Math.round(totalInvested*100)/100,
      value:Math.round(val*100)/100
    };
  });
}

// Ponecháme prázdné — již nepotřebujeme ukládat snapshoty při uložení
function recordSnapshot(){}
function recordInvSnapshot(){}

function getAllTags(){
  const set=new Set();
  transactions.forEach(t=>{
    const tags=Array.isArray(t.tags)?t.tags:(t.tag?[t.tag]:[]);
    tags.forEach(tag=>set.add(tag));
  });
  return [...set].sort();
}

function renderTagsPreview(){
  const wrap=document.getElementById('txn-tags-preview');
  if(!wrap) return;
  wrap.innerHTML=currentTags.map((tag,i)=>
    `<span class="tag-badge">${escHtml(tag)}<button class="tag-badge-rm" onclick="removeTag(${i})">✕</button></span>`
  ).join('');
}

function handleTagKey(e){
  const input=e.target;
  const val=input.value.trim();
  if((e.key==='Enter'||e.key===','||e.key===';')&&val){
    e.preventDefault();
    addTag(val);
    input.value='';
    document.getElementById('tag-suggestions').style.display='none';
  } else if(e.key==='Backspace'&&!val&&currentTags.length){
    currentTags.pop();
    renderTagsPreview();
  }
}

function addTag(tag){
  const tmp=document.createElement('span');tmp.innerHTML=tag;tag=tmp.textContent;
  const clean=tag.trim();
  if(clean&&!currentTags.includes(clean)){
    currentTags.push(clean);
    renderTagsPreview();
    renderTagQuickPicks();
  }
}

function removeTag(idx){
  currentTags.splice(idx,1);
  renderTagsPreview();
  renderTagQuickPicks();
}

function showTagSuggestions(val){
  const box=document.getElementById('tag-suggestions');
  if(!val){box.style.display='none';return;}
  const all=getAllTags().filter(t=>t.toLowerCase().startsWith(val.toLowerCase())&&!currentTags.includes(t));
  if(!all.length){box.style.display='none';return;}
  box.innerHTML=all.map(t=>`<div class="tag-suggestion-item" onmousedown="event.preventDefault();addTag('${escAttr(t)}');document.getElementById('txn-tag-input').value='';document.getElementById('tag-suggestions').style.display='none';">${escHtml(t)}</div>`).join('');
  box.style.display='block';
}

function renderTagFilterBar(){
  const chips=document.getElementById('tag-filter-chips');
  if(!chips) return;
  const all=getAllTags();
  if(!all.length){chips.innerHTML='<span style="font-size:12px;color:var(--text-secondary);font-style:italic">žádné štítky</span>';return;}
  chips.innerHTML=all.map(tag=>{
    const active=activeTagFilter===tag;
    return`<span class="tag-badge${active?' active-tag-filter':''}" style="cursor:pointer;${active?'':''}padding:4px 10px;font-size:12px;" onclick="toggleTagFilter('${escAttr(tag)}')">${escHtml(tag)}<span onclick="event.stopPropagation();deleteTag('${escAttr(tag)}')" style="margin-left:5px;cursor:pointer;opacity:0.5;font-size:11px;" title="Smazat štítek ze všech transakcí">✕</span></span>`;
  }).join('');
}

function toggleTagFilter(tag){
  const tmp=document.createElement('span');tmp.innerHTML=tag;tag=tmp.textContent;
  activeTagFilter=activeTagFilter===tag?null:tag;
  resetTxnPaging();
  renderTagFilterBar();
  renderTagStats();
  renderTxns();
}

function deleteTag(tag){
  const tmp=document.createElement('span');tmp.innerHTML=tag;tag=tmp.textContent;
  const count=transactions.filter(t=>(Array.isArray(t.tags)?t.tags:[]).includes(tag)).length;
  if(!confirm(`Smazat štítek "${tag}" ze všech transakcí (${count})? Toto nelze vrátit.`)) return;
  transactions.forEach(t=>{
    if(Array.isArray(t.tags)){
      const idx=t.tags.indexOf(tag);
      if(idx!==-1) t.tags.splice(idx,1);
    }
  });
  budgets.forEach(b=>{
    if(b.trackTags&&b.trackTags.length){
      const idx=b.trackTags.indexOf(tag);
      if(idx!==-1) b.trackTags.splice(idx,1);
    }
  });
  if(activeTagFilter===tag) activeTagFilter=null;
  markDirty('transactions','budget','dashboard');
  saveToStorage();
  toast('Štítek smazán.','success');
}

function clearTagFilter(){
  activeTagFilter=null;
  renderTagFilterBar();
  renderTagStats();
  renderTxns();
}

function renderTagStats(){
  const panel=document.getElementById('tag-stats-panel');
  if(!activeTagFilter){panel.style.display='none';return;}
  panel.style.display='block';
  document.getElementById('tag-stats-title').textContent='Štítek: '+activeTagFilter;
  const tagged=transactions.filter(t=>{
    const tags=Array.isArray(t.tags)?t.tags:(t.tag?[t.tag]:[]);
    return tags.includes(activeTagFilter);
  });
  const total=tagged.filter(t=>t.type==='vydaj').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
  const income=tagged.filter(t=>t.type==='prijem').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
  const count=tagged.length;
  document.getElementById('tag-stats-content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
      <div style="background:var(--card-bg);border-radius:8px;padding:10px;border:1px solid var(--card-border);">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">VÝDAJE</div>
        <div style="font-size:17px;font-weight:600;color:var(--red)">${fmt(total)}</div>
      </div>
      <div style="background:var(--card-bg);border-radius:8px;padding:10px;border:1px solid var(--card-border);">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">PŘÍJMY</div>
        <div style="font-size:17px;font-weight:600;color:var(--green)">${fmt(income)}</div>
      </div>
      <div style="background:var(--card-bg);border-radius:8px;padding:10px;border:1px solid var(--card-border);">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">TRANSAKCÍ</div>
        <div style="font-size:17px;font-weight:600;color:var(--accent)">${count}</div>
      </div>
    </div>`;
}

function loadMoreTxns(){
  txnShownCount+=TXN_PAGE_SIZE;
  renderTxns();
}

function resetTxnPaging(){
  txnShownCount=TXN_PAGE_SIZE;
}

function filterTxn(f,ev){
  txnFilter=f;
  resetTxnPaging();
  document.querySelectorAll('#txn-filter .tab').forEach(t=>t.classList.remove('active'));
  if(ev) ev.target.classList.add('active');
  renderTxns();
}

function getCatBadge(name){
  const c=categories.find(c=>c.name===name);
  if(!c) return 'badge-blue';
  return catBadgeColors[c.color]||'badge-blue';
}

function renderTxns(){
  const tbody=document.getElementById('txn-tbody');
  const empty=document.getElementById('txn-empty');
  const mobileList=document.getElementById('txn-mobile-list');
  const mobileEmpty=document.getElementById('txn-empty-mobile');

  const filterAcc=document.getElementById('filter-account')?.value||'';
  const filterCat=document.getElementById('filter-category')?.value||'';

  let list=transactions.filter(t=>txnFilter==='vse'||t.type===txnFilter);
  list=filterByPeriod(list, activePeriod);
  if(activeTagFilter){
    list=list.filter(t=>{
      const tags=Array.isArray(t.tags)?t.tags:(t.tag?[t.tag]:[]);
      return tags.includes(activeTagFilter);
    });
  }
  if(filterAcc!=='') list=list.filter(t=>String(t.accIdx)===filterAcc);
  if(filterCat!=='') list=list.filter(t=>t.cat===filterCat);

  // Seřadit podle data, nejnovější nahoře
  list=[...list].sort((a,b)=>b.date.localeCompare(a.date));

  const totalCount=list.length;
  const hasMore=totalCount>txnShownCount;
  const visible=hasMore?list.slice(0,txnShownCount):list;

  renderTagFilterBar();

  const summaryEl=document.getElementById('period-summary');
  const summaryInner=document.getElementById('period-summary-inner');
  if(activePeriod!=='vse'){
    const inc=list.filter(t=>t.type==='prijem').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
    const exp=list.filter(t=>t.type==='vydaj').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
    const net=inc-exp;
    summaryInner.innerHTML=`
      <div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:3px">PŘÍJMY</div><div style="font-size:16px;font-weight:600;color:var(--green)">${fmt(inc)}</div></div>
      <div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:3px">VÝDAJE</div><div style="font-size:16px;font-weight:600;color:var(--red)">${fmt(exp)}</div></div>
      <div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:3px">BILANCE</div><div style="font-size:16px;font-weight:600;color:${net>=0?'var(--green)':'var(--red)'}">${net>=0?'+':''}${fmt(net)}</div></div>`;
    summaryEl.style.display='block';
  } else {
    summaryEl.style.display='none';
  }

  if(!list.length){
    tbody.innerHTML='';
    empty.style.display='block';
    mobileList.innerHTML='';
    mobileEmpty.style.display='block';
    return;
  }
  empty.style.display='none';
  mobileEmpty.style.display='none';

  const tagsHtml=(t)=>{
    const tags=Array.isArray(t.tags)?t.tags:(t.tag?[t.tag]:[]);
    return tags.map(tag=>`<span class="tag-badge" style="cursor:pointer" onclick="toggleTagFilter('${escAttr(tag)}')">${escHtml(tag)}</span>`).join('');
  };
  const sharedBadge=(t)=>{
    if(!t.sharedGroupId) return '';
    const g=sharedGroupsList.find(sg=>sg.id===t.sharedGroupId);
    return `<span style="font-size:10px;background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent);padding:1px 6px;border-radius:8px;white-space:nowrap">👥 ${g?escHtml(g.name):'Sdílená'}</span>`;
  };

  tbody.innerHTML=visible.map(t=>{
    const realIdx=transactions.indexOf(t);
    let sign=t.type==='prijem'?'+':'-';
    let col=t.type==='prijem'?'var(--green)':t.type==='prevod'?'var(--text-secondary)':'var(--red)';
    if(t.type==='prevod') sign='⇄';
    const accName=t.accIdx!==''&&accounts[t.accIdx]?escHtml(accounts[t.accIdx].name):'—';
    const toAccName=t.toAccIdx!==undefined&&t.toAccIdx!==''&&accounts[t.toAccIdx]?escHtml(accounts[t.toAccIdx].name):null;
    const accCell=t.type==='prevod'&&toAccName
      ?`<span style="color:var(--text-secondary)">${accName}</span><span style="color:var(--text-secondary);margin:0 4px">→</span><span style="color:var(--text-secondary)">${toAccName}</span>`
      :`<span style="color:var(--text-secondary)">${accName}</span>`;
    return`<tr>
      <td style="color:var(--text-secondary);font-size:12px;white-space:nowrap">${t.date}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${t.desc?'inherit':'var(--text-secondary);font-style:italic'}">${(t.recurring||t.recurringGenerated)?'<span title="Opakující se" style="font-size:11px;margin-right:3px">🔁</span>':''}${escHtml(t.desc||t.cat)}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">${sharedBadge(t)}${tagsHtml(t)||(!t.sharedGroupId?'—':'')}</div></td>
      <td><span class="badge ${getCatBadge(t.cat)}" style="text-transform:uppercase;letter-spacing:0.3px">${escHtml(t.cat)}</span></td>
      <td style="font-size:12px;white-space:nowrap">${accCell}</td>
      <td style="text-align:right;font-weight:500;color:${col};white-space:nowrap">${sign} ${fmt(t.amount,t.cur)}</td>
      <td><div class="action-btns">${t.type!=='prevod'?`<button class="btn-edit" onclick="openTxnModal(${realIdx})">Upravit</button><button class="btn-edit" onclick="duplicateTxn(${realIdx})" title="Duplikovat">⧉</button>`:''}<button class="btn-del" onclick="quickDeleteTxn(${realIdx})">✕</button></div></td>
    </tr>`;
  }).join('');
  if(hasMore){
    const remaining=totalCount-txnShownCount;
    tbody.innerHTML+=`<tr><td colspan="7" style="text-align:center;padding:12px">
      <span style="font-size:12px;color:var(--text-secondary)">Zobrazeno ${txnShownCount} z ${totalCount} transakcí</span>
      <button onclick="loadMoreTxns()" style="margin-left:10px;padding:6px 16px;border-radius:8px;border:1px solid var(--accent);background:var(--accent-dim);color:var(--accent);cursor:pointer;font-size:13px">Načíst dalších ${Math.min(remaining,TXN_PAGE_SIZE)}</button>
    </td></tr>`;
  }

  mobileList.innerHTML=visible.map(t=>{
    const realIdx=transactions.indexOf(t);
    let sign=t.type==='prijem'?'+':'-';
    let col=t.type==='prijem'?'var(--green)':t.type==='prevod'?'var(--text-secondary)':'var(--red)';
    if(t.type==='prevod') sign='⇄';
    const accName=t.accIdx!==''&&accounts[t.accIdx]?escHtml(accounts[t.accIdx].name):'';
    const toAccName=t.toAccIdx!==undefined&&t.toAccIdx!==''&&accounts[t.toAccIdx]?escHtml(accounts[t.toAccIdx].name):null;
    const accDisplay=t.type==='prevod'&&toAccName
      ?`${accName} → ${toAccName}`
      :accName;
    return`<div class="txn-card">
      <div class="txn-card-row">
        <span class="txn-card-desc">${(t.recurring||t.recurringGenerated)?'<span title="Opakující se" style="font-size:11px;margin-right:3px">🔁</span>':''}${escHtml(t.desc||t.cat)}</span>
        <span class="txn-card-amount" style="color:${col}">${sign} ${fmt(t.amount,t.cur)}</span>
      </div>
      <div class="txn-card-meta">
        <span style="font-size:11.5px;color:var(--text-secondary)">${t.date}</span>
        <span class="badge ${getCatBadge(t.cat)}" style="font-size:11px;padding:2px 7px;text-transform:uppercase;letter-spacing:0.3px">${escHtml(t.cat)}</span>
        ${sharedBadge(t)}${tagsHtml(t)}
        ${accDisplay?`<span style="font-size:11.5px;color:var(--text-secondary)">${accDisplay}</span>`:''}
        <div class="txn-card-actions">
          ${t.type!=='prevod'?`<button class="btn-edit" onclick="openTxnModal(${realIdx})">Upravit</button><button class="btn-edit" onclick="duplicateTxn(${realIdx})" title="Duplikovat">⧉</button>`:''}
          <button class="btn-del" onclick="quickDeleteTxn(${realIdx})">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
  if(hasMore){
    const remaining=totalCount-txnShownCount;
    mobileList.innerHTML+=`<div style="text-align:center;padding:12px">
      <span style="font-size:12px;color:var(--text-secondary)">Zobrazeno ${txnShownCount} z ${totalCount}</span>
      <button onclick="loadMoreTxns()" style="margin-left:10px;padding:6px 16px;border-radius:8px;border:1px solid var(--accent);background:var(--accent-dim);color:var(--accent);cursor:pointer;font-size:13px">Načíst dalších ${Math.min(remaining,TXN_PAGE_SIZE)}</button>
    </div>`;
  }
}

// ── Opakující se transakce (Recurring) ───────────────────

const RECURRING_INTERVALS={weekly:'Týdně',monthly:'Měsíčně',yearly:'Ročně'};

function advanceDate(dateStr, interval, dayOfMonth){
  const d=new Date(dateStr+'T12:00:00');
  if(interval==='weekly'){
    d.setDate(d.getDate()+7);
  } else if(interval==='yearly'){
    d.setDate(1); // prevent overflow
    d.setFullYear(d.getFullYear()+1);
    if(dayOfMonth==='last'){
      d.setDate(new Date(d.getFullYear(),d.getMonth()+1,0).getDate());
    } else if(dayOfMonth){
      const maxDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(dayOfMonth,maxDay));
    }
  } else {
    // monthly — den na 1, posunout měsíc, pak nastavit správný den
    d.setDate(1);
    d.setMonth(d.getMonth()+1);
    if(dayOfMonth==='last'){
      d.setDate(new Date(d.getFullYear(),d.getMonth()+1,0).getDate());
    } else if(dayOfMonth){
      const maxDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(dayOfMonth,maxDay));
    }
  }
  return d.toISOString().split('T')[0];
}

function updateRecurringHint(){
  const hint=document.getElementById('txn-recurring-hint');
  if(!hint) return;
  const interval=document.getElementById('txn-recurring-interval').value;
  const dateVal=document.getElementById('txn-recurring-start').value;
  if(!dateVal){hint.textContent='';return;}
  const d=new Date(dateVal+'T12:00:00');
  const day=d.getDate();
  if(interval==='weekly'){
    const days=['neděli','pondělí','úterý','středu','čtvrtek','pátek','sobotu'];
    hint.textContent='Vždy každé '+days[d.getDay()];
  } else if(interval==='yearly'){
    hint.textContent='Vždy '+day+'. '+d.toLocaleDateString('cs-CZ',{month:'long'});
  } else {
    const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    if(day>=lastDay){
      hint.textContent='Vždy k poslednímu dni v měsíci';
    } else {
      hint.textContent='Vždy k '+day+'. dni v měsíci';
    }
  }
}

function openRecurringTxnModal(){
  openTxnModal(-1, true);
}

function processRecurringTxns(){
  const td=today();
  let generated=0;
  const MAX_ITER=365; // bezpečnostní limit proti nekonečné smyčce
  // Deduplikační set: klíč = desc|amount|date|accIdx
  const existing=new Set(
    transactions.filter(t=>t.recurringGenerated).map(t=>t.desc+'|'+t.amount+'|'+t.date+'|'+t.accIdx)
  );
  transactions.forEach(t=>{
    if(!t.recurring||!t.recurring.enabled||!t.recurring.nextDate) return;
    let iter=0;
    while(t.recurring.nextDate<=td&&iter<MAX_ITER){
      iter++;
      if(t.recurring.endDate&&t.recurring.nextDate>t.recurring.endDate){t.recurring.enabled=false;break;}
      const key=t.desc+'|'+t.amount+'|'+t.recurring.nextDate+'|'+t.accIdx;
      if(!existing.has(key)){
        // Vytvoř kopii (normální transakce bez recurring pole)
        const copy={desc:t.desc,tags:t.tags?[...t.tags]:[],amount:t.amount,date:t.recurring.nextDate,type:t.type,cat:t.cat,cur:t.cur,accIdx:t.accIdx,recurringGenerated:true};
        // Zachovat pole převodu pokud jde o opakující se převod
        if(t.type==='prevod'){
          if(t.toAccIdx!=null&&t.toAccIdx!=='') copy.toAccIdx=t.toAccIdx;
          if(t.convertedAmount!=null) copy.convertedAmount=t.convertedAmount;
          if(t.toCur) copy.toCur=t.toCur;
        }
        transactions.unshift(copy);
        existing.add(key);
        generated++;
      }
      t.recurring.nextDate=advanceDate(t.recurring.nextDate, t.recurring.interval, t.recurring.dayOfMonth);
    }
  });
  if(generated){
    recordSnapshot();
    saveToStorage();
    markDirty('transactions','accounts','dashboard','budget');
    toast('Vygenerováno '+generated+' opakujících se transakcí.','info');
  }
}
