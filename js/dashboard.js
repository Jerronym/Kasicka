// Kasička — dashboard, graf celkových zůstatků

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

  renderBalanceChart();
  renderCategoryChart();
  renderIncomeCategoryChart();
  renderTrendChart();
}

// Spočítá výdaje pro rozpočet v daném rozsahu (pro Přehled)
function getBudgetSpentForRange(b, range){
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
  const list=transactions.filter(t=>{
    if(!matchTxn(t)) return false;
    if(t.type==='prevod') return false;
    if(!net&&t.type!=='vydaj') return false;
    if(range){const d=new Date(t.date+'T12:00:00');return d>=range.from&&d<=range.to;}
    return true;
  });
  const out=list.filter(t=>t.type==='vydaj').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
  if(!net) return out;
  const inc=list.filter(t=>t.type==='prijem').reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
  return out-inc;
}

function renderCategoryChart(){
  const ctx=document.getElementById('chartCategories');
  const listEl=document.getElementById('dash-top-cats');
  if(!ctx||!listEl) return;
  if(chartCategories){chartCategories.destroy();chartCategories=null;}
  const range=getDashDateRange();
  const spend={};
  transactions.forEach(t=>{
    if(t.type!=='vydaj') return;
    if(range){const d=new Date(t.date+'T12:00:00');if(d<range.from||d>range.to) return;}
    spend[t.cat]=(spend[t.cat]||0)+toCZK(t.amount,t.cur);
  });
  const entries=Object.entries(spend).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){
    listEl.innerHTML='<li style="color:var(--text-secondary);list-style:none;padding-left:0">Žádné výdaje v tomto období</li>';
    return;
  }
  const total=entries.reduce((s,e)=>s+e[1],0);
  const top=entries.slice(0,9);
  const rest=entries.slice(9);
  if(rest.length){const restSum=rest.reduce((s,e)=>s+e[1],0);top.push(['Ostatní',restSum]);}
  const getColor=cat=>{
    if(cat==='Ostatní') return cssVar('--text-secondary');
    const c=categories.find(x=>x.name===cat);
    return c?.color||cssVar('--accent');
  };
  const labels=top.map(e=>e[0]);
  const data=top.map(e=>Math.round(e[1]));
  const colors=labels.map(getColor);
  chartCategories=new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:1,borderColor:'rgba(0,0,0,0.2)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>{const pct=((v.raw/total)*100).toFixed(1);return` ${v.raw.toLocaleString('cs-CZ')} Kč (${pct} %)`;}}}}}
  });
  listEl.innerHTML=entries.slice(0,5).map(e=>{
    const pct=((e[1]/total)*100).toFixed(1);
    const col=getColor(e[0]);
    return`<li style="margin-bottom:3px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};margin-right:6px;vertical-align:middle"></span><b>${escHtml(e[0])}</b> — ${Math.round(e[1]).toLocaleString('cs-CZ')} Kč <span style="color:var(--text-secondary)">(${pct} %)</span></li>`;
  }).join('');
}

function renderIncomeCategoryChart(){
  const ctx=document.getElementById('chartIncome');
  const listEl=document.getElementById('dash-top-income');
  if(!ctx||!listEl) return;
  if(chartIncome){chartIncome.destroy();chartIncome=null;}
  const range=getDashDateRange();
  const earn={};
  transactions.forEach(t=>{
    if(t.type!=='prijem') return;
    if(range){const d=new Date(t.date+'T12:00:00');if(d<range.from||d>range.to) return;}
    earn[t.cat]=(earn[t.cat]||0)+toCZK(t.amount,t.cur);
  });
  const entries=Object.entries(earn).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){
    listEl.innerHTML='<li style="color:var(--text-secondary);list-style:none;padding-left:0">Žádné příjmy v tomto období</li>';
    return;
  }
  const total=entries.reduce((s,e)=>s+e[1],0);
  const top=entries.slice(0,9);
  const rest=entries.slice(9);
  if(rest.length){const restSum=rest.reduce((s,e)=>s+e[1],0);top.push(['Ostatní',restSum]);}
  const getColor=cat=>{
    if(cat==='Ostatní') return cssVar('--text-secondary');
    const c=categories.find(x=>x.name===cat);
    return c?.color||cssVar('--green');
  };
  const labels=top.map(e=>e[0]);
  const data=top.map(e=>Math.round(e[1]));
  const colors=labels.map(getColor);
  chartIncome=new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:1,borderColor:'rgba(0,0,0,0.2)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>{const pct=((v.raw/total)*100).toFixed(1);return` ${v.raw.toLocaleString('cs-CZ')} Kč (${pct} %)`;}}}}}
  });
  listEl.innerHTML=entries.slice(0,5).map(e=>{
    const pct=((e[1]/total)*100).toFixed(1);
    const col=getColor(e[0]);
    return`<li style="margin-bottom:3px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};margin-right:6px;vertical-align:middle"></span><b>${escHtml(e[0])}</b> — ${Math.round(e[1]).toLocaleString('cs-CZ')} Kč <span style="color:var(--text-secondary)">(${pct} %)</span></li>`;
  }).join('');
}

function renderTrendChart(){
  const ctx=document.getElementById('chartTrend');
  if(!ctx) return;
  if(chartTrend){chartTrend.destroy();chartTrend=null;}
  const labels=[],incomeData=[],expenseData=[];
  for(let i=11;i>=0;i--){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const y=d.getFullYear(),m=d.getMonth();
    const label=d.toLocaleDateString('cs-CZ',{month:'short',year:'2-digit'});
    const inc=transactions.filter(t=>t.type==='prijem'&&t.date&&new Date(t.date+'T12:00:00').getFullYear()===y&&new Date(t.date+'T12:00:00').getMonth()===m)
      .reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
    const exp=transactions.filter(t=>t.type==='vydaj'&&t.date&&new Date(t.date+'T12:00:00').getFullYear()===y&&new Date(t.date+'T12:00:00').getMonth()===m)
      .reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
    labels.push(label);incomeData.push(Math.round(inc));expenseData.push(Math.round(exp));
  }
  chartTrend=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Příjmy',data:incomeData,backgroundColor:cssVarAlpha('--green',0.7),borderColor:cssVar('--green'),borderWidth:1},
      {label:'Výdaje',data:expenseData,backgroundColor:cssVarAlpha('--red',0.7),borderColor:cssVar('--red'),borderWidth:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:cssVar('--text-secondary'),font:{size:11}}},tooltip:{callbacks:{label:v=>` ${v.raw.toLocaleString('cs-CZ')} Kč`}}},scales:{x:{ticks:{color:cssVar('--text-secondary'),font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:cssVar('--text-secondary'),font:{size:10},callback:v=>v.toLocaleString('cs-CZ')},grid:{color:'rgba(255,255,255,0.04)'}}}}
  });
}

function renderBalanceChart(){
  const ctx=document.getElementById('chartBalance');
  if(!ctx) return;
  if(chartBalance){chartBalance.destroy();chartBalance=null;}
  const currentTotal=accounts.reduce((s,a,i)=>s+(a.includeInTotal!==false?toCZK(getBalance(i),a.currency):0),0)+investments.reduce((s,inv,i)=>s+getInvValue(i),0);
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
  chartBalance=new Chart(ctx,{type:'line',data:{labels:history.map(h=>h.label),datasets:[{label:'Majetek (Kč)',data:history.map(h=>h.value),borderColor:cssVar('--accent'),backgroundColor:cssVarAlpha('--accent',0.08),borderWidth:2,pointRadius:0,pointHoverRadius:4,pointBackgroundColor:cssVar('--accent'),fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>v.raw.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kč'}}},scales:{x:{ticks:{color:cssVar('--text-secondary'),font:{size:11},maxRotation:45,autoSkip:true},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:cssVar('--text-secondary'),font:{size:11},callback:v=>v.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})},grid:{color:'rgba(255,255,255,0.04)'}}}}});
}
