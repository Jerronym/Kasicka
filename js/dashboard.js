// Kasička — dashboard, graf celkových zůstatků

let dashCatAccFilter='';
let dashCatMode=localStorage.getItem('kasicka_dash_cat_mode')||'vydaj';

function refreshDashCatAccFilter(){
  const sel=document.getElementById('dash-cat-acc-filter');
  if(!sel) return;
  const prev=sel.value;
  sel.innerHTML='<option value="">Všechny účty</option>'+
    accounts.map((a,i)=>`<option value="${i}">${escHtml(a.name)}</option>`).join('');
  if(prev!==''&&accounts[parseInt(prev)]) sel.value=prev;
}

function setDashCatAccFilter(val){
  dashCatAccFilter=val;
  renderCategoryChart();
}

function setDashCatMode(mode){
  dashCatMode=mode;
  localStorage.setItem('kasicka_dash_cat_mode',mode);
  // Update button styles
  ['cista','vydaj','prijem'].forEach(m=>{
    const btn=document.getElementById('dash-cat-mode-'+m);
    if(btn) btn.classList.toggle('active',m===mode);
  });
  renderCategoryChart();
}

function renderDashboard(){
  updateDashNavLabel();
  const range=getDashDateRange();

  // Period label
  const labelEl=document.getElementById('dash-month-label');
  if(labelEl) labelEl.textContent=range
    ? range.from.toLocaleDateString('cs-CZ',{day:'2-digit',month:'long',year:'numeric'})+
      ' – '+range.to.toLocaleDateString('cs-CZ',{day:'2-digit',month:'long',year:'numeric'})
    : '';

  // Filter transactions by period
  const periodTxns=range
    ? transactions.filter(t=>{const d=new Date(t.date+'T12:00:00');return d>=range.from&&d<=range.to;})
    : transactions;

  const income=periodTxns.filter(t=>t.type==='prijem').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
  const expense=periodTxns.filter(t=>t.type==='vydaj').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
  const net=income-expense;

  // Period label for cards
  const periodShort=dashPeriod==='tyden'?'týden':dashPeriod==='mesic'?'měsíc':dashPeriod==='rok'?'rok':'období';
  document.getElementById('dash-income-label').textContent=`Příjmy (${periodShort})`;
  document.getElementById('dash-expense-label').textContent=`Výdaje (${periodShort})`;

  const accTotal=accounts.reduce((s,a,i)=>s+(a.includeInTotal!==false?toCZK(getBalance(i),a.currency):0),0);
  const invTotal=investments.reduce((s,inv,i)=>s+getInvValue(i),0);
  document.getElementById('dash-total').textContent=fmt(accTotal+invTotal);
  document.getElementById('dash-income').textContent=fmt(income);
  document.getElementById('dash-expense').textContent=fmt(expense);
  document.getElementById('dash-net').textContent=(net>=0?'+':'')+fmt(net);
  document.getElementById('dash-net').style.color=net>=0?'var(--green)':'var(--red)';

  // Recent transactions filtered by period (newest first, max 8)
  const recentEl=document.getElementById('dash-recent-txn');
  const txnTitle=document.getElementById('dash-txn-title');
  const recent=[...periodTxns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  if(txnTitle) txnTitle.textContent=`Transakce (${periodShort})`;
  if(!recent.length){
    recentEl.innerHTML='<p style="padding:18px;color:var(--text-secondary);font-size:13px;">Žádné transakce v tomto období</p>';
  } else {
    recentEl.innerHTML='<table><tbody>'+recent.map(t=>{
      const sign=t.type==='prijem'?'+':t.type==='prevod'?'⇄':'-';
      const col=t.type==='prijem'?'var(--green)':t.type==='prevod'?'var(--text-secondary)':'var(--red)';
      const accName=t.accIdx!==''&&accounts[t.accIdx]?accounts[t.accIdx].name:'';
      return`<tr>
        <td style="font-size:11.5px;padding:8px 14px;color:var(--text-secondary);white-space:nowrap">${t.date}</td>
        <td style="font-size:12.5px;padding:8px 4px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.desc||t.cat)}</td>
        <td style="text-align:right;padding:8px 14px;font-weight:500;color:${col};font-size:12.5px;white-space:nowrap">${sign} ${fmt(t.amount,t.cur)}</td>
      </tr>`;
    }).join('')+'</tbody></table>';
  }

  // Budget preview
  const budEl=document.getElementById('dash-budget-preview');
  if(!budgets.length){budEl.innerHTML='<p style="color:var(--text-secondary);font-size:13px;">Přidej kategorie v Rozpočtu</p>';}
  else{
    budEl.innerHTML=budgets.slice(0,4).map(b=>{
      const spent=getBudgetSpentForRange(b, range);
      const pct=b.limit?Math.min(spent/b.limit*100,100):0;
      const over=b.limit>0&&spent>b.limit;
      return`<div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px">
          <span>${escHtml(b.name)}</span>
          <span style="color:${over?'var(--red)':'var(--text-secondary)'}">${b.limit?pct.toFixed(0)+' %  ·  '+fmt(spent)+' z '+fmt(b.limit):fmt(spent)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${b.limit?pct:0}%;background:${over?'var(--red)':b.color}"></div></div>
      </div>`;
    }).join('');
  }

  refreshDashCatAccFilter();
  // Sync mode button state on render
  ['cista','vydaj','prijem'].forEach(m=>{
    const btn=document.getElementById('dash-cat-mode-'+m);
    if(btn) btn.classList.toggle('active',m===dashCatMode);
  });
  renderBalanceChart();
  renderCategoryChart();
  renderTrendChart();
}

// Spočítá výdaje pro rozpočet v daném rozsahu (pro Přehled)
// Deleguje na sdílený calcBudgetSpent() v config.js
function getBudgetSpentForRange(b, range){
  return calcBudgetSpent(b, range);
}

function renderCategoryChart(){
  const ctx=document.getElementById('chartCategories');
  const listEl=document.getElementById('dash-top-cats');
  if(!ctx||!listEl) return;
  if(chartCategories){chartCategories.destroy();chartCategories=null;}
  const range=getDashDateRange();

  // Single pass — collect both income and expense by category
  const expByCat={}, incByCat={};
  transactions.forEach(t=>{
    if(t.type!=='vydaj'&&t.type!=='prijem') return;
    if(range){const d=new Date(t.date+'T12:00:00');if(d<range.from||d>range.to) return;}
    if(dashCatAccFilter!==''&&String(t.accIdx)!==String(dashCatAccFilter)) return;
    const val=toCZK(t.amount,t.cur);
    if(t.type==='vydaj') expByCat[t.cat]=(expByCat[t.cat]||0)+val;
    else incByCat[t.cat]=(incByCat[t.cat]||0)+val;
  });

  const getCatColor=(cat,fallback)=>{
    if(cat==='Ostatní') return cssVar('--text-secondary');
    const c=categories.find(x=>x.name===cat);
    return c?.color||cssVar(fallback);
  };

  let entries, labels, data, colors, tooltipFn, emptyMsg;

  if(dashCatMode==='vydaj'){
    entries=Object.entries(expByCat).sort((a,b)=>b[1]-a[1]);
    emptyMsg='Žádné výdaje v tomto období';
    if(!entries.length){listEl.innerHTML=`<li style="color:var(--text-secondary);list-style:none;padding-left:0">${emptyMsg}</li>`;return;}
    const total=entries.reduce((s,e)=>s+e[1],0);
    const top=entries.slice(0,9);
    if(entries.length>9){top.push(['Ostatní',entries.slice(9).reduce((s,e)=>s+e[1],0)]);}
    labels=top.map(e=>e[0]);data=top.map(e=>Math.round(e[1]));
    colors=labels.map(c=>getCatColor(c,'--accent'));
    tooltipFn=v=>{const pct=((v.raw/total)*100).toFixed(1);return` ${fmt(demoNum(v.raw))} (${pct} %)`;};
    listEl.innerHTML=entries.slice(0,5).map(e=>{
      const pct=((e[1]/total)*100).toFixed(1);
      return`<li style="margin-bottom:3px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${getCatColor(e[0],'--accent')};margin-right:6px;vertical-align:middle"></span><b>${escHtml(e[0])}</b> — ${fmt(demoNum(Math.round(e[1])))} <span style="color:var(--text-secondary)">(${pct} %)</span></li>`;
    }).join('');

  } else if(dashCatMode==='prijem'){
    entries=Object.entries(incByCat).sort((a,b)=>b[1]-a[1]);
    emptyMsg='Žádné příjmy v tomto období';
    if(!entries.length){listEl.innerHTML=`<li style="color:var(--text-secondary);list-style:none;padding-left:0">${emptyMsg}</li>`;return;}
    const total=entries.reduce((s,e)=>s+e[1],0);
    const top=entries.slice(0,9);
    if(entries.length>9){top.push(['Ostatní',entries.slice(9).reduce((s,e)=>s+e[1],0)]);}
    labels=top.map(e=>e[0]);data=top.map(e=>Math.round(e[1]));
    colors=labels.map(c=>getCatColor(c,'--green'));
    tooltipFn=v=>{const pct=((v.raw/total)*100).toFixed(1);return` ${fmt(demoNum(v.raw))} (${pct} %)`;};
    listEl.innerHTML=entries.slice(0,5).map(e=>{
      const pct=((e[1]/total)*100).toFixed(1);
      return`<li style="margin-bottom:3px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${getCatColor(e[0],'--green')};margin-right:6px;vertical-align:middle"></span><b>${escHtml(e[0])}</b> — ${fmt(demoNum(Math.round(e[1])))} <span style="color:var(--text-secondary)">(${pct} %)</span></li>`;
    }).join('');

  } else {
    // Čistá hodnota: net = income - expense per category
    const allCats=new Set([...Object.keys(expByCat),...Object.keys(incByCat)]);
    const netEntries=[...allCats].map(cat=>{
      const net=(incByCat[cat]||0)-(expByCat[cat]||0);
      return[cat,net];
    }).filter(e=>e[1]!==0);
    if(!netEntries.length){listEl.innerHTML='<li style="color:var(--text-secondary);list-style:none;padding-left:0">Žádné transakce v tomto období</li>';return;}
    const totalAbs=netEntries.reduce((s,e)=>s+Math.abs(e[1]),0);
    // Positives sorted desc (largest near 12 CW).
    // Negatives sorted desc by value = least negative first, most negative last →
    // most negative ends up closest to 12 on the CCW side (from 12 to 11).
    // No slice/Ostatní grouping — mixing absolute values of negatives into a positive
    // "Ostatní" bucket would create a misleading large positive slice.
    const pos=netEntries.filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]);
    const neg=netEntries.filter(e=>e[1]<0).sort((a,b)=>b[1]-a[1]);
    const ordered=[...pos,...neg];
    labels=ordered.map(e=>e[0]);
    data=ordered.map(e=>Math.round(Math.abs(e[1])));
    colors=ordered.map(e=>getCatColor(e[0],'--accent'));
    tooltipFn=v=>{
      const entry=ordered.find(e=>e[0]===v.label);
      const sign=entry&&entry[1]<0?'−':'+';
      const pct=((Math.abs(v.raw)/totalAbs)*100).toFixed(1);
      return` ${sign} ${fmt(demoNum(Math.abs(v.raw)))} (${pct} %)`;
    };
    // List: all net entries sorted by abs desc, top 5
    const listEntries=[...netEntries].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,5);
    listEl.innerHTML=listEntries.map(e=>{
      const isPos=e[1]>=0;
      const col=getCatColor(e[0],isPos?'--green':'--accent');
      const sign=isPos?'+':'−';
      const signCol=isPos?'var(--green)':'var(--red)';
      const pct=((Math.abs(e[1])/totalAbs)*100).toFixed(1);
      return`<li style="margin-bottom:3px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};margin-right:6px;vertical-align:middle"></span><b>${escHtml(e[0])}</b> — <span style="color:${signCol}">${sign} ${fmt(demoNum(Math.round(Math.abs(e[1]))))}</span> <span style="color:var(--text-secondary)">(${pct} %)</span></li>`;
    }).join('');
  }

  chartCategories=new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:1,borderColor:cssVarAlpha('--text-primary',0.1)}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:tooltipFn}}}}
  });
}

function renderTrendChart(){
  const ctx=document.getElementById('chartTrend');
  if(!ctx) return;
  if(chartTrend){chartTrend.destroy();chartTrend=null;}
  // Pre-group transactions by year-month (single pass)
  const monthInc={}, monthExp={};
  transactions.forEach(t=>{
    if(!t.date||(t.type!=='prijem'&&t.type!=='vydaj')) return;
    const dt=new Date(t.date+'T12:00:00');
    const key=dt.getFullYear()+'-'+dt.getMonth();
    const val=toCZK(t.amount,t.cur);
    if(t.type==='prijem') monthInc[key]=(monthInc[key]||0)+val;
    else monthExp[key]=(monthExp[key]||0)+val;
  });
  const labels=[],incomeData=[],expenseData=[];
  for(let i=11;i>=0;i--){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const key=d.getFullYear()+'-'+d.getMonth();
    const label=d.toLocaleDateString('cs-CZ',{month:'short',year:'2-digit'});
    labels.push(label);incomeData.push(Math.round(monthInc[key]||0));expenseData.push(Math.round(monthExp[key]||0));
  }
  chartTrend=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Příjmy',data:incomeData,backgroundColor:cssVarAlpha('--green',0.7),borderColor:cssVar('--green'),borderWidth:1},
      {label:'Výdaje',data:expenseData,backgroundColor:cssVarAlpha('--red',0.7),borderColor:cssVar('--red'),borderWidth:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:cssVar('--text-secondary'),font:{size:11}}},tooltip:{callbacks:{label:v=>` ${fmt(demoNum(v.raw))}`}}},scales:{x:{ticks:{color:cssVar('--text-secondary'),font:{size:10}},grid:{color:cssVar('--border-subtle')}},y:{ticks:{color:cssVar('--text-secondary'),font:{size:10},callback:v=>privacyMode?'•••':demoNum(v).toLocaleString('cs-CZ')},grid:{color:cssVar('--border-subtle')}}}}
  });
}

function renderBalanceChart(){
  const ctx=document.getElementById('chartBalance');
  if(!ctx) return;
  if(chartBalance){chartBalance.destroy();chartBalance=null;}
  const currentTotal=accounts.reduce((s,a,i)=>s+(a.includeInTotal!==false?toCZK(getBalance(i),a.currency):0),0);
  let history=buildBalanceHistory();
  if(history.length<2){
    const nowLbl=new Date().toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'});
    history=[{label:'Start',value:0},{label:nowLbl,date:today(),value:Math.round(currentTotal*100)/100}];
  }
  const todayStr=today();
  if(history[history.length-1]?.date!==todayStr){
    history=[...history,{label:new Date().toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:todayStr,value:Math.round(currentTotal*100)/100}];
  }
  // Filter by dash period
  const range=getDashDateRange();
  if(range){
    const filtered=history.filter(h=>{const d=new Date((h.date||'2000-01-01')+'T12:00:00');return d>=range.from&&d<=range.to;});
    if(filtered.length>=1) history=filtered;
  }
  chartBalance=new Chart(ctx,{type:'line',data:{labels:history.map(h=>h.label),datasets:[{label:'Majetek (Kč)',data:history.map(h=>h.value),borderColor:cssVar('--accent'),backgroundColor:cssVarAlpha('--accent',0.08),borderWidth:2,pointRadius:0,pointHoverRadius:4,pointBackgroundColor:cssVar('--accent'),fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>fmt(demoNum(v.raw))}}},scales:{x:{ticks:{color:cssVar('--text-secondary'),font:{size:11},maxRotation:45,autoSkip:true},grid:{color:cssVar('--border-subtle')}},y:{ticks:{color:cssVar('--text-secondary'),font:{size:11},callback:v=>privacyMode?'•••':demoNum(v).toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})},grid:{color:cssVar('--border-subtle')}}}}});
}
