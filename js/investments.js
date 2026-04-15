// Kasička — investice, portfolio, API ceny

function refreshInvGroupSelect(selectedVal){
  const sel=document.getElementById('inv-group-select');
  if(!sel) return;
  sel.innerHTML='<option value="">— bez skupiny —</option>';
  invGroups.forEach((g,i)=>{
    const o=document.createElement('option');
    o.value=i; o.textContent=g.name;
    sel.appendChild(o);
  });
  if(selectedVal!==undefined&&selectedVal!=='') sel.value=selectedVal;
}

function refreshInvAccSelect(selectedVal){
  const sel=document.getElementById('inv-acc-select');
  if(!sel) return;
  sel.innerHTML='<option value="">— bez účtu —</option>';
  accounts.forEach((a,i)=>{
    const o=document.createElement('option');
    o.value=i; o.textContent=a.name+' ('+a.currency+')';
    sel.appendChild(o);
  });
  if(selectedVal!==undefined&&selectedVal!=='') sel.value=selectedVal;
}

function renderInvGroupColorPicker(){
  const el=document.getElementById('inv-group-color-picker');
  if(!el) return;
  el.innerHTML=GRP_COLORS.map(c=>`<div onclick="selectedGrpColor='${c}';renderInvGroupColorPicker();"
    style="width:26px;height:26px;border-radius:6px;background:${c};cursor:pointer;border:3px solid ${c===selectedGrpColor?'#fff':'transparent'};transition:0.15s;"></div>`).join('');
}

function openInvGroupModal(idx){
  editingInvGroup=idx;
  const del=document.getElementById('inv-group-delete-btn');
  selectedGrpColor=GRP_COLORS[0];
  if(idx===-1){
    document.getElementById('inv-group-modal-title').textContent='Nová skupina investic';
    document.getElementById('inv-group-name').value='';
    document.getElementById('inv-group-note').value='';
    del.style.display='none';
  } else {
    const g=invGroups[idx];
    document.getElementById('inv-group-modal-title').textContent='Upravit skupinu';
    document.getElementById('inv-group-name').value=g.name;
    document.getElementById('inv-group-note').value=g.note||'';
    selectedGrpColor=g.color||GRP_COLORS[0];
    del.style.display='block';
  }
  renderInvGroupColorPicker();
  openModal('inv-group');
}

function saveInvGroup(){
  const name=document.getElementById('inv-group-name').value.trim();
  if(!name) return;
  const note=document.getElementById('inv-group-note').value.trim();
  const obj={name,color:selectedGrpColor,note};
  if(editingInvGroup===-1){
    invGroups.push(obj);
  } else {
    invGroups[editingInvGroup]={...invGroups[editingInvGroup],...obj};
  }
  saveToStorage();
  closeModal('inv-group');
  markDirty('investments');
}

function deleteInvGroup(){
  if(editingInvGroup===-1) return;
  investments.forEach(inv=>{ if(inv.groupIdx===editingInvGroup) delete inv.groupIdx; });
  investments.forEach(inv=>{ if(inv.groupIdx>editingInvGroup) inv.groupIdx--; });
  invGroups.splice(editingInvGroup,1);
  saveToStorage();
  closeModal('inv-group');
  markDirty('investments');
}

function confirmDeleteInvGroup(gi){
  const g=invGroups[gi];
  if(!g) return;
  const members=investments.filter(inv=>inv.groupIdx===gi).length;
  const msg=members?`Smazat skupinu "${g.name}"? ${members} investice budou přesunuty do sekce "Bez skupiny".`:`Smazat skupinu "${g.name}"?`;
  if(!confirm(msg)) return;
  investments.forEach(inv=>{ if(inv.groupIdx===gi) delete inv.groupIdx; });
  investments.forEach(inv=>{ if(inv.groupIdx>gi) inv.groupIdx--; });
  invGroups.splice(gi,1);
  saveToStorage();
  markDirty('investments');
}

let invGroupsPanelOpen=true;
function toggleInvGroupsPanel(){
  invGroupsPanelOpen=!invGroupsPanelOpen;
  const panel=document.getElementById('inv-grp-panel');
  const arrow=document.getElementById('inv-grp-panel-arrow');
  if(panel) panel.style.display=invGroupsPanelOpen?'block':'none';
  if(arrow) arrow.textContent=invGroupsPanelOpen?'▼':'▶';
}

function setInvMode(mode){
  invMode=mode;
  document.getElementById('inv-tab-auto').classList.toggle('active', mode==='auto');
  document.getElementById('inv-tab-manual').classList.toggle('active', mode==='manual');
  document.getElementById('inv-section-auto').style.display=mode==='auto'?'block':'none';
  document.getElementById('inv-section-manual').style.display=mode==='manual'?'block':'none';
  document.getElementById('inv-date-label').textContent=mode==='auto'?'Datum nákupu':'Datum začátku sledování';
}

function calcInvInvested(){
  const shares=parseFloat(document.getElementById('inv-shares').value)||0;
  const price=parseFloat(document.getElementById('inv-purchase-price').value)||0;
  if(shares&&price){
    const total=Math.round(shares*price*100)/100;
    document.getElementById('inv-invested').value=total;
    document.getElementById('inv-value').value=total;
  }
}

async function fetchPriceForModal(){
  const symbol=document.getElementById('inv-api-symbol').value.trim().toUpperCase();
  if(!symbol){toast('Nejdřív zadej symbol instrumentu (např. SXR8.DE, AAPL, BTC).','warn');return;}
  const date=document.getElementById('inv-start-date').value;
  if(!date){toast('Nejdřív zadej datum nákupu.','warn');return;}
  const btn=document.getElementById('inv-fetch-price-btn');
  btn.textContent='Načítám…';btn.disabled=true;

  await fetchExchangeRates();
  const usdRate=_usdCzkRate;

  const cryptoSymbols=['BTC','ETH','BNB','SOL','ADA','XRP','DOGE'];
  let result=null;
  if(cryptoSymbols.includes(symbol)){
    // Krypto: Twelve Data k datu, CoinGecko fallback
    const tdResult=await fetchTwelvePriceAtDate(symbol+'/USD', date);
    if(tdResult){
      result={price:tdResult.price, currency:tdResult.currency, source:'twelvedata ('+tdResult.date+')'};
    } else {
      const hist=await fetchCoinGeckoHistory(symbol, date);
      if(hist&&hist.length){
        const target=hist.find(d=>d.date>=date)||hist[hist.length-1];
        result={price:target.close, currency:'CZK', source:'coingecko'};
      }
    }
  } else {
    // Akcie/ETF: Twelve Data k datu (primární), Stooq/Yahoo historie jako fallback
    const tdResult=await fetchTwelvePriceAtDate(symbol, date);
    if(tdResult){
      result={price:tdResult.price, currency:tdResult.currency, source:'twelvedata ('+tdResult.date+')'};
    } else {
      // Fallback: historická data ze Stooq/Yahoo (NE aktuální cenu!)
      try{
        const histResult=await Promise.any([
          fetchStooqHistory(symbol, date).then(r=>{if(!r||!r.values.length)throw 0;return r;}),
          fetchYahooHistory(symbol, date).then(r=>{if(!r||!r.values.length)throw 0;return r;})
        ]);
        if(histResult&&histResult.values.length){
          result={price:histResult.values[0].close, currency:histResult.currency, source:'history-fallback'};
        }
      }catch(e){console.warn('Fallback historie selhala pro',symbol,e.message);result=null;}
    }
  }

  btn.textContent='Načíst cenu';btn.disabled=false;

  if(!result){
    toast('Cenu k datu '+date+' se nepodařilo načíst. Zkontroluj symbol a datum.','error',6000);
    return;
  }

  let priceCzk=result.price;
  if(result.currency==='EUR') priceCzk=result.price*eurCzkRate;
  else if(result.currency==='USD') priceCzk=result.price*usdRate;
  else if(result.currency==='GBP') priceCzk=result.price*(eurCzkRate*1.17);
  else if(result.currency==='GBp'||result.currency==='GBX') priceCzk=(result.price/100)*(eurCzkRate*1.17);

  document.getElementById('inv-purchase-price').value=Math.round(priceCzk*100)/100;
  document.getElementById('inv-price-source').textContent=`(${result.source}, ${result.currency||'CZK'})`;
  calcInvInvested();
}

function openInvModal(idx){
  editingInv=idx;
  const del=document.getElementById('inv-delete-btn');
  refreshInvGroupSelect();
  refreshInvAccSelect();
  if(idx===-1){
    document.getElementById('inv-modal-title').textContent='Nová investice';
    document.getElementById('inv-ticker').value='';
    document.getElementById('inv-api-symbol').value='';
    document.getElementById('inv-shares').value='';
    document.getElementById('inv-purchase-price').value='';
    document.getElementById('inv-price-source').textContent='';
    document.getElementById('inv-invested').value='';
    document.getElementById('inv-value').value='';
    document.getElementById('inv-invested-m').value='';
    document.getElementById('inv-value-m').value='';
    document.getElementById('inv-type').value='Akcie';
    document.getElementById('inv-start-date').value='';
    document.getElementById('inv-group-select').value='';
    document.getElementById('inv-acc-select').value='';
    del.style.display='none';
    setInvMode('auto');
  } else {
    const inv=investments[idx];
    document.getElementById('inv-modal-title').textContent='Upravit investici';
    document.getElementById('inv-ticker').value=inv.ticker;
    document.getElementById('inv-api-symbol').value=inv.apiSymbol||'';
    document.getElementById('inv-shares').value=inv.shares||'';
    document.getElementById('inv-purchase-price').value='';
    document.getElementById('inv-price-source').textContent='';
    document.getElementById('inv-invested').value=inv.invested;
    document.getElementById('inv-value').value=getInvValue(idx);
    document.getElementById('inv-invested-m').value=inv.invested;
    document.getElementById('inv-value-m').value=getInvValue(idx);
    document.getElementById('inv-type').value=inv.type;
    document.getElementById('inv-start-date').value=inv.startDate||'';
    refreshInvGroupSelect(inv.groupIdx!==undefined?String(inv.groupIdx):'');
    refreshInvAccSelect(inv.accIdx!==undefined&&inv.accIdx!==''?String(inv.accIdx):'');
    del.style.display='block';
    setInvMode(inv.apiSymbol?'auto':'manual');
  }
  openModal('inv');
}

function saveInv(){
  const ticker=document.getElementById('inv-ticker').value.trim();
  const type=document.getElementById('inv-type').value;
  const startDate=document.getElementById('inv-start-date').value||'';
  const grpVal=document.getElementById('inv-group-select').value;
  const groupIdx=grpVal!==''?parseInt(grpVal):undefined;
  const accVal=document.getElementById('inv-acc-select').value;
  const accIdx=accVal!==''?accVal:'';
  if(!startDate){toast('Zadej datum nákupu.','warn');return;}
  if(accVal===''){toast('Vyber účet.','warn');return;}
  if(!ticker){toast('Zadej název/ticker investice.','warn');return;}

  const isAuto=invMode==='auto';
  const apiSymbol=isAuto?document.getElementById('inv-api-symbol').value.trim().toUpperCase():'';
  const sharesRaw=isAuto?parseFloat(document.getElementById('inv-shares').value):null;
  const shares=isAuto?(isNaN(sharesRaw)?null:sharesRaw):null;
  const invested=isAuto
    ?(parseFloat(document.getElementById('inv-invested').value)||0)
    :(parseFloat(document.getElementById('inv-invested-m').value)||0);
  const value=isAuto
    ?(parseFloat(document.getElementById('inv-value').value)||0)
    :(parseFloat(document.getElementById('inv-value-m').value)||0);
  if(!invested||invested<=0){toast('Zadej investovanou částku.','warn');return;}
  if(invested<0||value<0){toast('Investovaná částka a hodnota nemohou být záporné.','warn');return;}

  let invIdx;
  if(editingInv===-1){
    const initHistory=(!apiSymbol&&startDate)?[{date:startDate,value,prevValue:value,note:'Počáteční hodnota'}]:[];
    investments.push({ticker,apiSymbol,shares,type,invested,value,startDate,history:initHistory,groupIdx,accIdx});
    invIdx=investments.length-1;
    // Vytvoř transakci — odečti investovanou částku z účtu
    if(accIdx!==''){
      const accI=parseInt(accIdx);
      const acc=(accI>=0&&accI<accounts.length)?accounts[accI]:null;
      if(acc){
        const txnAmount=acc.currency==='CZK'?invested:(RATES[acc.currency]?invested/RATES[acc.currency]:invested);
        transactions.unshift({desc:'Investice → '+ticker,amount:txnAmount,date:startDate,type:'vydaj',cat:'INVESTICE',cur:acc.currency,accIdx:String(accIdx),invIdx:String(invIdx)});
        recordSnapshot();
      }
    }
  } else {
    investments[editingInv]={...investments[editingInv],ticker,apiSymbol,shares,type,invested,value,startDate,groupIdx,accIdx};
    invIdx=editingInv;
  }
  recordInvSnapshot();
  saveToStorage();
  closeModal('inv');
  markDirty('investments','dashboard','accounts','transactions');
  // Pokud má symbol + počet kusů + datum → automaticky načteme historii z API
  if(apiSymbol&&shares&&startDate){
    const btn=document.getElementById('btn-auto-update');
    if(btn){btn.textContent='⟳ Načítám historii...';btn.disabled=true;}
    buildInvHistoryFromAPI(invIdx).then(ok=>{
      if(btn){btn.textContent='⟳ Aktualizovat ceny';btn.disabled=false;}
      if(ok){saveToStorage();markDirty('investments','dashboard');}
      else toast('Nepodařilo se načíst historické ceny. Zkontroluj symbol (např. SXR8.DE, AAPL, BTC) a datum nákupu.','error',6000);
    });
  }
}

function deleteInv(){
  if(editingInv===-1) return;
  const delIdx=editingInv;
  investments.splice(delIdx,1);
  // Smazat transakce navázané na tuto investici
  transactions=transactions.filter(t=>!(t.invIdx!=null&&t.invIdx!==''&&parseInt(t.invIdx)===delIdx));
  // Přečíslovat invIdx u zbývajících transakcí
  transactions.forEach(t=>{
    if(t.invIdx!=null&&t.invIdx!==''){
      const ii=parseInt(t.invIdx);
      if(ii>delIdx) t.invIdx=String(ii-1);
    }
  });
  recordInvSnapshot();
  saveToStorage();
  closeModal('inv');
  markDirty('investments','dashboard','transactions');
}

function openInvUpdateModal(invIdx){
  const sel=document.getElementById('inv-update-select');
  sel.innerHTML='';
  if(!investments.length){
    sel.innerHTML='<option>Žádné investice</option>';
    document.getElementById('inv-update-prev').textContent='Nejdřív přidej investici.';
    document.getElementById('inv-update-value').value='';
    document.getElementById('inv-update-note').value='';
    document.getElementById('inv-update-date').value=today();
    document.getElementById('inv-update-preview').textContent='';
    editingInvUpdate=-1;
    openModal('inv-update');
    return;
  }
  investments.forEach((inv,i)=>{
    const o=document.createElement('option');
    o.value=i;
    o.textContent=inv.ticker+' — aktuálně '+fmt(getInvValue(i));
    sel.appendChild(o);
  });
  editingInvUpdate=invIdx!==undefined?invIdx:0;
  sel.value=editingInvUpdate;
  loadInvUpdateFields();
  openModal('inv-update');
}

function onInvUpdateSelect(){
  const sel=document.getElementById('inv-update-select');
  editingInvUpdate=parseInt(sel.value);
  loadInvUpdateFields();
}

function loadInvUpdateFields(){
  const inv=investments[editingInvUpdate];
  if(!inv) return;
  const curVal=getInvValue(editingInvUpdate);
  document.getElementById('inv-update-prev').textContent=fmt(curVal);
  document.getElementById('inv-update-value').value=curVal;
  document.getElementById('inv-update-note').value='';
  document.getElementById('inv-update-date').value=today();
  updateInvPreview();
}

function updateInvPreview(){
  const el=document.getElementById('inv-update-preview');
  if(editingInvUpdate===-1||!investments[editingInvUpdate]){el.textContent='';return;}
  const newVal=parseFloat(document.getElementById('inv-update-value').value)||0;
  const oldVal=investments[editingInvUpdate].value;
  const diff=newVal-oldVal;
  const pct=oldVal?(diff/oldVal*100):0;
  const col=diff>=0?'var(--green)':'var(--red)';
  el.innerHTML=`<span style="color:${col};font-weight:500">${diff>=0?'+':''}${fmt(diff)} (${diff>=0?'+':''}${pct.toFixed(1)} %)</span> oproti předchozí hodnotě`;
}

function saveInvUpdate(){
  if(editingInvUpdate===-1||!investments[editingInvUpdate]) return;
  const newVal=parseFloat(document.getElementById('inv-update-value').value);
  const date=document.getElementById('inv-update-date').value;
  const note=document.getElementById('inv-update-note').value.trim();
  if(isNaN(newVal)||newVal<0){toast('Zadej platnou hodnotu investice.','warn');return;}
  if(!date){toast('Zadej datum aktualizace.','warn');return;}
  const inv=investments[editingInvUpdate];
  if(!inv.history) inv.history=[];
  inv.history.push({date, value:newVal, prevValue:getInvValue(editingInvUpdate), note});
  inv.history.sort((a,b)=>a.date.localeCompare(b.date));
  inv.value=newVal;
  recordInvSnapshot();
  saveToStorage();
  closeModal('inv-update');
  markDirty('investments','dashboard');
}

function toggleInvHist(i){
  const el=document.getElementById('inv-hist-'+i);
  const arrow=document.getElementById('inv-hist-arrow-'+i);
  if(!el) return;
  const open=el.style.display==='none';
  el.style.display=open?'block':'none';
  if(arrow) arrow.style.transform=open?'rotate(90deg)':'';
}

function renderInvRow(inv, i, current){
  const typeColors={'Akcie':'var(--accent)','ETF':'var(--green)','Krypto':'var(--amber)','Dluhopisy':'var(--purple)','Podílový fond':'#2dd4bf','Jiné':'#2dd4bf'};
  const val=getInvValue(i);
  const p=val-inv.invested; const pp=inv.invested?(p/inv.invested*100):0;
  const share=current?(val/current*100):0;
  const col=typeColors[inv.type]||'var(--text-secondary)';
  const hist=inv.history&&inv.history.length?[...inv.history].reverse():[];
  const histHtml=hist.length?`
    <div style="border-top:1px solid var(--border-subtle);margin-top:10px;padding-top:10px;">
      <button onclick="toggleInvHist(${i})" style="background:none;border:none;color:var(--text-secondary);font-size:11.5px;cursor:pointer;padding:0;display:flex;align-items:center;gap:5px;margin-bottom:6px;width:100%;"><span id="inv-hist-arrow-${i}" style="font-size:10px;transition:transform 0.2s;">▶</span><span style="text-transform:uppercase;letter-spacing:0.4px">Historie aktualizací (${hist.length})</span></button>
      <div id="inv-hist-${i}" style="display:none;">${hist.map(h=>{
        const d=h.value-h.prevValue; const dp=h.prevValue?(d/h.prevValue*100):0;
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border-subtle);">
          <div><span style="font-size:12px;color:var(--text-secondary)">${h.date}</span>${h.isSale?'<span style="color:var(--red);font-size:10.5px;font-weight:600;margin-left:6px;">PRODEJ</span>':''}${h.isPurchase?'<span style="color:var(--green);font-size:10.5px;font-weight:600;margin-left:6px;">NÁKUP</span>':''}${h.note?`<span style="font-size:11.5px;color:var(--text-secondary);margin-left:8px;font-style:italic">${escHtml(h.note)}</span>`:''}</div>
          <div style="text-align:right"><span style="font-size:13px;font-weight:500">${fmt(h.value)}</span><span style="font-size:11.5px;margin-left:6px;color:${d>=0?'var(--green)':'var(--red)'}">${d>=0?'+':''}${dp.toFixed(1)} %</span></div>
        </div>`;
      }).join('')}</div>
    </div>`:'';
  return`<div style="padding:12px 18px;border-bottom:1px solid var(--border-subtle);">
    <div class="invest-row" style="padding:0;border:none;">
      <div style="min-width:60px">
        <div style="font-size:13px;font-weight:600;color:${col}">${escHtml(inv.ticker)}</div>
        <div style="font-size:12px;color:var(--text-secondary)">${escHtml(inv.type)}</div>
        ${inv.apiSymbol?`<div style="font-size:10.5px;color:var(--text-secondary);opacity:0.7">${escHtml(inv.apiSymbol)}${inv.lastPriceDate?' · '+inv.lastPriceDate:''}</div>`:''}
      </div>
      <div style="flex:1"><div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:4px">${share.toFixed(1)} % portfolia</div><div class="progress-bar"><div class="progress-fill" style="width:${share}%;background:${col}"></div></div></div>
      <div style="text-align:right;font-size:13px;font-weight:500;min-width:90px">${fmt(val)}</div>
      <div style="text-align:right;font-size:12px;min-width:70px;color:${p>=0?'var(--green)':'var(--red)'}">${p>=0?'+':''}${pp.toFixed(1)} %</div>
      <div style="display:flex;gap:5px;">
        <button class="btn-edit" style="color:var(--amber);border-color:color-mix(in srgb, var(--amber) 30%, transparent)" onclick="openInvUpdateModal(${i})">↻</button>
        <button class="btn-edit" style="color:var(--red);border-color:color-mix(in srgb, var(--red) 30%, transparent)" onclick="openSellInvModal(${i})">Prodat</button>
        <button class="btn-edit" onclick="openInvModal(${i})">Upravit</button>
      </div>
    </div>${histHtml}
  </div>`;
}

function renderInvestments(){
  const total=investments.reduce((s,i)=>s+i.invested,0);
  const current=investments.reduce((s,inv,i)=>s+getInvValue(i),0);
  const pnl=current-total; const pct=total?(pnl/total*100):0;
  document.getElementById('inv-total').textContent=fmt(total);
  document.getElementById('inv-current').textContent=fmt(current);
  document.getElementById('inv-pnl').textContent=(pnl>=0?'+':'')+fmt(pnl);
  document.getElementById('inv-pnl').style.color=pnl>=0?'var(--green)':'var(--red)';
  document.getElementById('inv-pct').textContent=(pct>=0?'+':'')+pct.toFixed(1)+' %';
  document.getElementById('inv-pct').style.color=pct>=0?'var(--green)':'var(--red)';

  // Skupiny — přehled
  const gc=document.getElementById('inv-groups-card');
  if(gc){
    if(!invGroups.length){gc.style.display='none';gc.innerHTML='';}
    else{
      gc.style.display='block';
      let gh=`<div class="table-card"><div class="table-header" style="cursor:pointer;" onclick="toggleInvGroupsPanel()">
        <span class="table-title">Skupiny investic <span id="inv-grp-panel-arrow" style="font-size:11px;color:var(--text-secondary);">▼</span></span>
        <button class="btn btn-sm btn-outline" style="border-color:color-mix(in srgb, var(--purple) 40%, transparent);color:var(--purple);" onclick="event.stopPropagation();openInvGroupModal(-1)">+ Přidat skupinu</button>
      </div>
      <div id="inv-grp-panel">`;
      invGroups.forEach((g,gi)=>{
        const members=investments.filter(inv=>inv.groupIdx===gi);
        const gVal=members.reduce((s,inv)=>s+getInvValue(investments.indexOf(inv)),0);
        const gInv=members.reduce((s,inv)=>s+inv.invested,0);
        const gPnl=gVal-gInv; const gPct=gInv?(gPnl/gInv*100):0;
        gh+=`<div style="display:flex;align-items:center;gap:12px;padding:11px 18px;border-bottom:1px solid var(--border-subtle);">
          <div style="width:12px;height:12px;border-radius:3px;background:${g.color};flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:500;color:${g.color}">${escHtml(g.name)}</div>
            ${g.note?`<div style="font-size:11.5px;color:var(--text-secondary)">${escHtml(g.note)}</div>`:''}
          </div>
          <div style="text-align:right;min-width:80px;">
            <div style="font-size:13px;font-weight:500">${fmt(gVal)}</div>
            <div style="font-size:11.5px;color:${gPnl>=0?'var(--green)':'var(--red)'}">${gPnl>=0?'+':''}${gPct.toFixed(1)} %</div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);min-width:60px;text-align:right">${members.length} investic${members.length===1?'e':members.length>=2&&members.length<=4?'e':'í'}</div>
          <div style="display:flex;gap:5px;">
            <button class="btn-edit" onclick="openInvGroupModal(${gi})">Upravit</button>
            <button class="btn-del" onclick="confirmDeleteInvGroup(${gi})">Smazat</button>
          </div>
        </div>`;
      });
      gh+=`</div></div>`;
      gc.innerHTML=gh;
    }
  }

  const el=document.getElementById('inv-list');
  if(!investments.length){el.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:13px;">Zatím žádné investice. Přidej skupinu nebo investici.</div>';return;}

  let html='';

  // Skupiny
  invGroups.forEach((g,gi)=>{
    const members=investments.map((inv,i)=>({inv,i})).filter(({inv})=>inv.groupIdx===gi);
    if(!members.length) return;
    const gTotal=members.reduce((s,{inv})=>s+inv.invested,0);
    const gValue=members.reduce((s,{inv,i})=>s+getInvValue(i),0);
    const gPnl=gValue-gTotal; const gPct=gTotal?(gPnl/gTotal*100):0;
    html+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:0;">
      <div style="padding:14px 18px;background:${g.color}18;border-bottom:1px solid ${g.color}33;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="width:12px;height:12px;border-radius:3px;background:${g.color};flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:${g.color}">${escHtml(g.name)}</div>
          ${g.note?`<div style="font-size:11.5px;color:var(--text-secondary);margin-top:1px">${escHtml(g.note)}</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:600">${fmt(gValue)}</div>
          <div style="font-size:12px;color:${gPnl>=0?'var(--green)':'var(--red)'};">${gPnl>=0?'+':''}${gPct.toFixed(1)} % · ${gPnl>=0?'+':''}${fmt(gPnl)}</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;">
          <button onclick="toggleInvGroup(${gi})" class="btn-edit" id="inv-grp-toggle-${gi}">▶ ${members.length}</button>
          <button class="btn-edit" onclick="openInvGroupModal(${gi})">Upravit</button>
        </div>
      </div>
      <div id="inv-grp-${gi}" style="display:none;">
        ${members.map(({inv,i})=>renderInvRow(inv,i,current)).join('')}
      </div>
    </div>`;
  });

  // Investice bez skupiny
  const ungrouped=investments.map((inv,i)=>({inv,i})).filter(({inv})=>inv.groupIdx===undefined||inv.groupIdx===null);
  if(ungrouped.length){
    if(invGroups.length) html+=`<div style="font-size:11.5px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding:12px 4px 4px">Bez skupiny</div>`;
    html+=`<div class="table-card" style="overflow:hidden;">`;
    html+=ungrouped.map(({inv,i})=>renderInvRow(inv,i,current)).join('');
    html+=`</div>`;
  }

  el.innerHTML=html;
}

function toggleInvGroup(gi){
  const el=document.getElementById('inv-grp-'+gi);
  const btn=document.getElementById('inv-grp-toggle-'+gi);
  if(!el) return;
  const open=el.style.display==='block';
  el.style.display=open?'none':'block';
  const count=btn.textContent.split(' ')[1];
  btn.textContent=(open?'▶':'▼')+' '+count;
}

async function fetchInflation(){
  // Zkusíme ČNB API, fallback na embedded data
  if(inflationCache) return inflationCache;
  try{
    const r=await fetch('https://api.cnb.cz/cnbapi/exrates/daily?date='+today(),{signal:AbortSignal.timeout(3000)});
    // ČNB rates API funguje, ale inflaci nemá přímo — použijeme embedded
    inflationCache=INFLATION_CZ;
  }catch(e){console.warn('Fetch inflace selhal:',e.message);}
  inflationCache=INFLATION_CZ;
  return inflationCache;
}

function calcInflationLine(inflData, history){
  // Pro každý bod v historii spočítáme: kolik MUSÍ být hodnota portfolia,
  // aby pokrylo inflaci od data první investice.
  //
  // Logika: bereme investovanou částku v každém bodě a aplikujeme na ni
  // kumulativní inflaci od data té investice do aktuálního bodu.
  // Pokud v lednu investuješ 50 000 a v únoru dalších 20 000,
  // březnová inflační čára = 50000*(1+inf)^(3m) + 20000*(1+inf)^(1m)
  //
  // Zjednodušená verze: pro každý bod v historii bereme investovanou částku
  // k tomu datu a počítáme kolik musí být na konci grafu (dnes).

  if(!history.length) return [];

  return history.map(h=>{
    if(!h.date) return null;
    const hYear=parseInt(h.date.substring(0,4));
    const hMonth=parseInt(h.date.substring(5,7)||'6');
    const invested=h.invested||0;
    if(invested<=0) return null;

    // Kolik musí být hodnota portfolia NA TOMTO MÍSTĚ v čase,
    // aby investovaná částka k tomuto datu "stačila" na inflaci od začátku portfolia.
    // = investováno * kumulativní inflace od začátku do tohoto bodu

    const firstPoint=history.find(p=>p.date&&(p.invested||0)>0);
    if(!firstPoint) return null;
    const startYear=parseInt(firstPoint.date.substring(0,4));
    const startMonth=parseInt(firstPoint.date.substring(5,7)||'1');

    if(hYear<startYear||(hYear===startYear&&hMonth<=startMonth)) return invested;

    let factor=1.0;
    for(let y=startYear;y<=hYear;y++){
      const annual=(inflData[String(y)]||2.5)/100;
      const mFrom=y===startYear?startMonth:1;
      const mTo=y===hYear?hMonth:12;
      const months=Math.max(mTo-mFrom,0);
      if(months>0) factor*=(1+annual*(months/12));
    }
    return Math.round(invested*factor*100)/100;
  });
}

function renderInvGroupFilter(){
  const el=document.getElementById('inv-group-filter');
  if(!el) return;
  if(!invGroups.length){el.innerHTML='';return;}
  const allActive=invGroupChartFilter===null;
  let html=`<span onclick="invGroupChartFilter=null;invChartFilter.clear();renderInvChart();" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${allActive?'var(--accent-dim)':'var(--card-bg)'};border:1px solid ${allActive?'var(--accent)':'var(--card-border)'};color:${allActive?'var(--accent)':'var(--text-secondary)'};">Vše</span>`;
  html+=invGroups.map((g,i)=>{
    const active=invGroupChartFilter===i;
    const col=g.color||cssVar('--accent');
    return`<span onclick="invGroupChartFilter=${i};invChartFilter.clear();renderInvChart();" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${active?col+'33':'var(--card-bg)'};border:1px solid ${active?col:'var(--card-border)'};color:${active?col:'var(--text-secondary)'};">${escHtml(g.name)}</span>`;
  }).join('');
  el.innerHTML=html;
}

async function renderInvChart(){
  const ctx=document.getElementById('chartInvestments');
  if(!ctx) return;
  if(chartInv){chartInv.destroy();chartInv=null;}
  renderInvGroupFilter();
  renderInvChartFilter();
  if(!investments.length) return;

  const showInflation=document.getElementById('inv-show-inflation')?.checked;
  document.getElementById('inv-inflation-legend').style.display=showInflation?'flex':'none';

  // Vybrané investice (nejprve group filter, pak individual filter)
  let allIdxs=investments.map((_,i)=>i);
  if(invGroupChartFilter!==null) allIdxs=allIdxs.filter(i=>investments[i]?.groupIdx===invGroupChartFilter);
  const selectedIdxs=invChartFilter.size>0?[...invChartFilter].filter(i=>allIdxs.includes(i)):allIdxs;
  const filteredInvs=selectedIdxs.map(i=>investments[i]).filter(Boolean);
  const filteredIdxSet=new Set(selectedIdxs.map(String));

  const todayStr=today();
  const _invStarts=filteredInvs.map(inv=>inv.startDate).filter(Boolean);
  const _txnStarts=transactions.filter(t=>t.type==='vydaj'&&t.cat==='INVESTICE'&&t.date).map(t=>t.date);
  const _histStarts=filteredInvs.flatMap(inv=>(inv.history||[]).map(h=>h.date)).filter(Boolean);
  const _allStarts=[..._invStarts,..._txnStarts,..._histStarts].sort();
  const globalStart=_allStarts[0]||today();
  const currentVal=selectedIdxs.reduce((s,i)=>s+getInvValue(i),0);
  const totalInvested=filteredInvs.reduce((s,i)=>s+i.invested,0);

  // Transakce INVESTICE pro vybrané investice
  const invTxns=transactions
    .filter(t=>t.type==='vydaj'&&t.cat==='INVESTICE'&&t.date)
    .filter(t=>{
      if(invChartFilter.size===0) return true;
      if(t.invIdx!==undefined) return filteredIdxSet.has(String(t.invIdx));
      return filteredInvs.some(inv=>inv.ticker&&t.desc&&t.desc.includes(' '+inv.ticker));
    })
    .sort((a,b)=>a.date.localeCompare(b.date));

  // Klicova data v grafu
  const keyDates=new Set([globalStart,todayStr]);
  invTxns.forEach(t=>keyDates.add(t.date));
  filteredInvs.forEach(inv=>(inv.history||[]).forEach(h=>{if(h.date&&!h.isPurchase)keyDates.add(h.date);}));
  // Přidej 1. a poslední den každého měsíce v rozsahu → graf nikdy nemá prázdné měsíce
  {
    const gEnd=new Date(todayStr+'T12:00:00');
    let mc=new Date(new Date(globalStart+'T12:00:00').getFullYear(), new Date(globalStart+'T12:00:00').getMonth(), 1);
    while(mc<=gEnd){
      const y=mc.getFullYear(), m=mc.getMonth();
      const pad=n=>String(n).padStart(2,'0');
      const d1=`${y}-${pad(m+1)}-01`;
      const lastDay=new Date(y,m+1,0).getDate();
      const dL=`${y}-${pad(m+1)}-${pad(lastDay)}`;
      if(d1>=globalStart) keyDates.add(d1);
      if(dL<=todayStr) keyDates.add(dL);
      mc=new Date(y,m+1,1);
    }
  }

  let history=[...keyDates].sort().map(date=>{
    // Pro každou investici spočítáme kolik bylo investováno K TOMUTO DATU:
    // Počáteční zůstatek k startDate = inv.invested - součet VŠECH transakcí po startDate
    // K tomu přičteme transakce do tohoto data
    let invested=0;
    filteredInvs.forEach((inv,fi)=>{
      const invStart=inv.startDate||globalStart;
      if(date<invStart) return;
      // Najdi nákupní transakce pro tuto investici
      const myTxns=invTxns.filter(t=>{
        if(t.invIdx!==undefined&&t.invIdx!==null) return String(t.invIdx)===String(selectedIdxs[fi]);
        return inv.ticker&&t.desc&&(t.desc.includes(inv.ticker)||t.desc.includes(inv.ticker.split(' ')[0]));
      });
      // Prodejní záznamy z historie — obsahují investedReduction (kolik z investované částky se odebralo)
      const saleHist=(inv.history||[]).filter(h=>h.isSale);
      const saleReduction=h=>h.investedReduction!=null?h.investedReduction:(h.prevValue>0?h.prevValue-h.value:0);
      const allSaleReductions=saleHist.reduce((s,h)=>s+saleReduction(h),0);
      // Počáteční zůstatek = (inv.invested + všechny prodejní redukce) - všechny nákupy
      const allTxnSum=myTxns.reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
      const startBalance=Math.max(0, inv.invested + allSaleReductions - allTxnSum);
      // K tomuto datu: startBalance + nákupy do data - prodejní redukce do data
      const txnToDate=myTxns.filter(t=>t.date<=date).reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
      const reductionsToDate=saleHist.filter(h=>h.date<=date).reduce((s,h)=>s+saleReduction(h),0);
      invested+=startBalance+txnToDate-reductionsToDate;
    });

    let value=null;
    filteredInvs.forEach((inv,fi)=>{
      const invStart=inv.startDate||globalStart;
      if(date<invStart) return;

      // Transakce pro tuto investici
      const myTxns=invTxns.filter(t=>{
        if(t.invIdx!=null) return String(t.invIdx)===String(selectedIdxs[fi]);
        return inv.ticker&&t.desc&&t.desc.includes(inv.ticker);
      });

      // Najdi snapshot přesně k tomuto datu nebo dřívější (nákupy vynechat — způsobují skokové výkyvy)
      const snap=[...(inv.history||[])].filter(h=>h.date<=date&&!h.isPurchase).sort((a,b)=>b.date.localeCompare(a.date))[0];

      if(snap){
        // Máme reálnou aktualizaci hodnoty — přičteme vklady od snapshotu do tohoto data
        const purchasesSince=myTxns.filter(t=>t.date>snap.date&&t.date<=date).reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
        value=(value||0)+snap.value+purchasesSince;
      } else {
        // Nemáme snapshot — pro minulá data zobrazíme investovanou částku jako odhad,
        // pro dnešek aktuální hodnotu nastavenou uživatelem
        const allTxnSum=myTxns.reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
        const startBalance=Math.max(0, inv.invested - allTxnSum);
        const txnToDate=myTxns.filter(t=>t.date<=date).reduce((s,t)=>s+toCZK(t.amount,t.cur),0);
        const investedAtDate=startBalance+txnToDate;
        if(date>=todayStr){
          const ratio=inv.invested>0?investedAtDate/inv.invested:1;
          value=(value||0)+(getInvValue(investments.indexOf(inv))*ratio);
        } else {
          // Historická data bez snapshotu — zobrazíme jen investovanou částku (bez zisku/ztráty)
          value=(value||0)+investedAtDate;
        }
      }
    });
    return{
      label:new Date(date+'T12:00:00').toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),
      date,
      invested:Math.round(Math.max(0,invested)*100)/100,
      value:value!==null?Math.round(value*100)/100:null
    };
  });

  if(history.length<2) history=[
    {label:new Date(globalStart+'T12:00:00').toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:globalStart,invested:0,value:null},
    {label:'Nynl',date:todayStr,invested:Math.round(totalInvested*100)/100,value:Math.round(currentVal*100)/100}
  ];

  // Filtr obdobi
  if(invPeriod!=='vse'&&invPeriod!=='vlastni'){
    const range=getChartDateRange(invPeriod,invOffset);
    if(range){
      const pad=n=>String(n).padStart(2,'0');
      const fmtD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const rangeFrom=fmtD(range.from);
      const rangeTo=fmtD(range.to);
      history=history.filter(h=>h.date>=rangeFrom&&h.date<=rangeTo);
      // Přidej nulový bod na start období pokud investice ještě nezačala
      if(!history.length||history[0].date>rangeFrom){
        history.unshift({label:new Date(rangeFrom+'T12:00:00').toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:rangeFrom,invested:0,value:0});
      }
      // Týdenní pohled: doplň chybějící dny (víkendy = hodnota z předchozího dne)
      if(invPeriod==='tyden'){
        const filled=[];
        let d=new Date(range.from);
        while(fmtD(d)<=rangeTo){
          const ds=fmtD(d);
          const ex=history.find(h=>h.date===ds);
          if(ex){filled.push(ex);}
          else{
            const prev=filled.length?filled[filled.length-1]:null;
            filled.push({label:new Date(ds+'T12:00:00').toLocaleDateString('cs-CZ',{weekday:'short',day:'numeric',month:'numeric'}),date:ds,invested:prev?.invested??0,value:prev?.value??null});
          }
          d.setDate(d.getDate()+1);
        }
        history=filled;
      }
    }
    if(!history.length) history=[{label:'-',invested:0,value:null}];
  } else {
    if(invPeriod==='vlastni'){
      const customRange=getCustomRange('inv');
      if(customRange){
        const pad=n=>String(n).padStart(2,'0');
        const fmtD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const rangeFrom=fmtD(customRange.from);
        history=filterHistoryByPeriod(history,invPeriod,Math.round(currentVal*100)/100,'inv');
        if(!history.length||history[0].date>rangeFrom){
          history.unshift({label:new Date(rangeFrom+'T12:00:00').toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'2-digit'}),date:rangeFrom,invested:0,value:0});
        }
      } else {
        history=filterHistoryByPeriod(history,invPeriod,Math.round(currentVal*100)/100,'inv');
      }
    } else {
      history=filterHistoryByPeriod(history,invPeriod,Math.round(currentVal*100)/100,'inv');
    }
  }

  const datasets=[
    {label:'Investovano',data:history.map(h=>h.invested),borderColor:cssVar('--accent'),backgroundColor:cssVarAlpha('--accent',0.08),borderWidth:2,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:cssVar('--accent'),fill:false,tension:0.1},
    {label:'Hodnota',data:history.map(h=>h.value),borderColor:cssVar('--green'),backgroundColor:cssVarAlpha('--green',0.08),borderWidth:2,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:cssVar('--green'),fill:false,tension:0.1,spanGaps:true},
  ];

  if(showInflation){
    const inflData=await fetchInflation();
    const inflLine=calcInflationLine(inflData, history);
    if(inflLine.some(v=>v!==null)){
      datasets.push({
        label:'Min. hodnota (inflace)',
        data:inflLine,
        borderColor:cssVar('--red'),
        backgroundColor:'transparent',
        borderWidth:2,
        borderDash:[5,4],
        pointRadius:0,
        pointHoverRadius:4,
        pointHoverBackgroundColor:cssVar('--red'),
        fill:false,
        tension:0.1,
        spanGaps:true
      });
    }
  }

  chartInv=new Chart(ctx,{type:'line',data:{labels:history.map(h=>h.label),datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>v.dataset.label+': '+(v.raw!=null?v.raw.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2}):'-')+' Kc'}}},scales:{x:{ticks:{color:cssVar('--text-secondary'),font:{size:11},maxRotation:45,autoSkip:false,callback:(val,idx)=>{const d=history[idx]?.date;if(!d)return null;const dt=new Date(d+'T12:00:00');if(invPeriod==='tyden')return dt.toLocaleDateString('cs-CZ',{weekday:'short',day:'numeric',month:'numeric'});if(invPeriod==='mesic'){if(dt.getDay()!==1)return null;return dt.toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit'});}if(!d.endsWith('-01'))return null;return dt.toLocaleDateString('cs-CZ',{month:'short',year:'2-digit'});}},grid:{color:cssVar('--border-subtle')}},y:{ticks:{color:cssVar('--text-secondary'),font:{size:11},callback:v=>v.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})},grid:{color:cssVar('--border-subtle')}}}},});
}

// ── Supabase Edge Function proxy (server-side, injektuje API klíče) ──
async function supaFetch(url){
  if(!currentUser) return null;
  try{
    const {data,error}=await supa.functions.invoke('proxy-fetch',{body:{url}});
    if(error||data==null) return null;
    const text=typeof data==='string'?data:JSON.stringify(data);
    return{ok:true,text:async()=>text,json:async()=>typeof data==='string'?JSON.parse(data):data};
  }catch(e){console.warn('supaFetch selhal:',e.message);return null;}
}

// Pomocná funkce: fetch přes Supabase proxy (přihlášen) nebo CORS proxy (offline)
async function fetchCors(url, timeout=10000){
  // Přihlášený uživatel → použij Supabase proxy (server-side, žádné CORS chyby)
  if(currentUser){
    const r=await supaFetch(url);
    if(r) return r;
  }
  // Fallback: CORS proxy (pro offline/nepřihlášené)
  const enc=encodeURIComponent(url);
  const sources=[
    ()=>fetch('https://api.allorigins.win/raw?url='+enc,{signal:AbortSignal.timeout(timeout)}).then(r=>{if(!r.ok)throw new Error(r.status);return r;}),
    ()=>fetch('https://corsproxy.io/?url='+enc,{signal:AbortSignal.timeout(timeout)}).then(r=>{if(!r.ok)throw new Error(r.status);return r;}),
    ()=>fetch('https://api.codetabs.com/v1/proxy?quest='+enc,{signal:AbortSignal.timeout(timeout)}).then(r=>{if(!r.ok)throw new Error(r.status);return r;}),
  ];
  try{
    return await Promise.any(sources.map(fn=>fn()));
  }catch(e){console.warn('Všechny CORS proxy selhaly pro URL:',url.slice(0,60));return null;}
}

// ── Twelve Data API ──────────────────────────────────────
// Mapování Yahoo/Stooq přípony → Twelve Data exchange
const TD_EXCHANGE_MAP={
  'DE':'XETR','F':'XFRA','PA':'XPAR','AS':'XAMS','MI':'XMIL',
  'MC':'XMAD','BR':'XBRU','VI':'XWBO','HE':'XHEL','LS':'XLIS',
  'WA':'XWAR','L':'XLON','IL':'XLON','SW':'XSWX','CO':'XCSE',
  'OL':'XOSL','ST':'XSTO','TO':'XTSE','AX':'XASX','HK':'XHKG',
  'T':'XTKS','SS':'XSHG','SZ':'XSHE','NS':'XNSE','BO':'XBOM',
};
// Převede "SXR8.DE" → {symbol:"SXR8", exchange:"XETR"} → query string "symbol=SXR8&exchange=XETR"
function tdSymbolParams(rawSymbol){
  const dot=rawSymbol.lastIndexOf('.');
  if(dot>0){
    const base=rawSymbol.slice(0,dot);
    const suffix=rawSymbol.slice(dot+1).toUpperCase();
    const exchange=TD_EXCHANGE_MAP[suffix];
    if(exchange) return `symbol=${encodeURIComponent(base)}&exchange=${exchange}`;
  }
  return `symbol=${encodeURIComponent(rawSymbol)}`;
}

async function fetchTwelvePrice(symbol){
  try{
    const r=await fetchCors(`https://api.twelvedata.com/price?${tdSymbolParams(symbol)}`,8000);
    if(!r) return null;
    const d=await r.json();
    if(d.code||!d.price) return null;
    return{price:parseFloat(d.price),currency:'USD',source:'twelvedata'};
  }catch(e){console.warn('fetchTwelvePrice selhal:',symbol,e.message);return null;}
}

async function fetchTwelvePriceWithCurrency(symbol, _retries=2){
  const url=`https://api.twelvedata.com/quote?${tdSymbolParams(symbol)}`;
  for(let attempt=0;attempt<=_retries;attempt++){
    try{
      if(attempt>0) await new Promise(ok=>setTimeout(ok,1500*attempt));
      const r=await fetchCors(url,10000);
      if(!r) return null;
      const d=await r.json();
      if(d.code===429){continue;}
      if(d.code||!d.close) return null;
      return{price:parseFloat(d.close),currency:d.currency||'USD',source:'twelvedata'};
    }catch(e){
      if(attempt===_retries){console.warn('fetchTwelvePriceWithCurrency selhal:',symbol,e.message);return null;}
    }
  }
  return null;
}

async function fetchTwelveHistory(symbol, fromDate, _retries=2){
  const url=`https://api.twelvedata.com/time_series?${tdSymbolParams(symbol)}&interval=1day&start_date=${fromDate}&order=ASC&outputsize=5000`;
  for(let attempt=0;attempt<=_retries;attempt++){
    try{
      if(attempt>0) await new Promise(ok=>setTimeout(ok,1500*attempt));
      const r=await fetchCors(url,18000);
      if(!r) return null;
      const d=await r.json();
      if(d.code===429){continue;}
      if(d.code||!d.values) return null;
      const currency=d.meta?.currency||'USD';
      return{values:d.values.map(v=>({date:v.datetime, close:parseFloat(v.close)})).filter(v=>v.close>0), currency};
    }catch(e){
      if(attempt===_retries){console.warn('fetchTwelveHistory selhal:',symbol,e.message);return null;}
    }
  }
  return null;
}

async function fetchTwelvePriceAtDate(symbol, date, _retries=2){
  const dd=new Date(date+'T00:00:00');
  dd.setDate(dd.getDate()-10);
  const from=dd.toISOString().split('T')[0];
  const url=`https://api.twelvedata.com/time_series?${tdSymbolParams(symbol)}&interval=1day&start_date=${from}&order=DESC&outputsize=30`;
  for(let attempt=0;attempt<=_retries;attempt++){
    try{
      if(attempt>0) await new Promise(ok=>setTimeout(ok,2000*attempt));
      const r=await fetchCors(url,15000);
      if(!r) return null;
      const resp=await r.json();
      if(resp.code===429){continue;} // rate limit → retry
      if(resp.status==='error') return null; // paid plan / invalid → no retry, no log
      if(!resp.values||!resp.values.length) return null;
      const match=resp.values.find(v=>v.datetime<=date);
      if(!match) return null;
      const currency=resp.meta?.currency||'USD';
      return{price:parseFloat(match.close),currency,source:'twelvedata',date:match.datetime};
    }catch(e){
      if(attempt===_retries){console.warn('fetchTwelvePriceAtDate selhal:',symbol,date,e.message);return null;}
    }
  }
  return null;
}

// Cache kurzů — stahujeme max 1× za session
let _ratesCached=false, _usdCzkRate=23;
async function fetchExchangeRates(){
  if(_ratesCached) return;
  // Primární: Twelve Data forex přes server proxy
  try{
    const [rEur,rUsd]=await Promise.all([
      fetchCors('https://api.twelvedata.com/exchange_rate?symbol=EUR/CZK',8000),
      fetchCors('https://api.twelvedata.com/exchange_rate?symbol=USD/CZK',8000)
    ]);
    if(rEur&&rUsd){
      const dEur=await rEur.json(), dUsd=await rUsd.json();
      if(dEur.rate){eurCzkRate=parseFloat(dEur.rate);RATES.EUR=eurCzkRate;}
      if(dUsd.rate){_usdCzkRate=parseFloat(dUsd.rate);RATES.USD=_usdCzkRate;}
      _ratesCached=true; return;
    }
  }catch(e){console.warn('Twelve Data forex kurzy selhaly:',e.message);}
  // Fallback: CNB přes CORS proxy
  try{
    const r=await fetchCors('https://api.cnb.cz/cnbapi/exrates/daily?date='+today()+'&lang=EN',6000);
    if(r){
      const d=await r.json();
      const eur=d.rates?.find(x=>x.currencyCode==='EUR');
      const usd=d.rates?.find(x=>x.currencyCode==='USD');
      if(eur){eurCzkRate=eur.rate/eur.amount;RATES.EUR=eurCzkRate;}
      if(usd){_usdCzkRate=usd.rate/usd.amount;RATES.USD=_usdCzkRate;}
      _ratesCached=true; return;
    }
  }catch(e){console.warn('ČNB kurzy (fallback) selhaly:',e.message);}
}
async function fetchEurCzkRate(){
  await fetchExchangeRates();
  return eurCzkRate;
}

async function fetchStooqPrice(symbol){
  try{
    const sym=symbol.toLowerCase();
    const url=`https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`;
    const r=await fetchCors(url);
    if(!r) return null;
    const text=await r.text();
    const lines=text.trim().split('\n');
    if(lines.length<2) return null;
    const parts=lines[1].split(',');
    const close=parseFloat(parts[6]);
    if(!close||isNaN(close)) return null;
    // Určit měnu podle přípony symbolu
    const suffix=symbol.split('.').pop()?.toUpperCase();
    let currency='USD'; // default pro US akcie
    if(['DE','F','PA','AS','MI','MC','BR','VI','HE','LS','WA'].includes(suffix)) currency='EUR';
    else if(['L','IL'].includes(suffix)) currency='GBP';
    else if(suffix==='UK') currency='GBp'; // pence
    else if(/\.[A-Z]{2,3}$/.test(symbol)) currency='USD'; // jiná burza
    return{price:close, currency, source:'stooq'};
  }catch(e){console.warn('fetchStooqPrice selhal:',symbol,e.message);return null;}
}

async function fetchYahooPrice(symbol){
  try{
    const url=`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const r=await fetchCors(url,8000);
    if(!r) return null;
    const data=await r.json();
    const price=data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const currency=data?.chart?.result?.[0]?.meta?.currency;
    return price?{price,currency,source:'yahoo'}:null;
  }catch(e){console.warn('fetchYahooPrice selhal:',symbol,e.message);return null;}
}

async function fetchCryptoPrice(symbol){
  // CoinGecko API — zdarma, bez klíče
  const map={
    'BTC':'bitcoin','ETH':'ethereum','BNB':'binancecoin',
    'SOL':'solana','ADA':'cardano','XRP':'ripple','DOGE':'dogecoin'
  };
  const id=map[symbol.toUpperCase()];
  if(!id) return null;
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=czk`,{signal:AbortSignal.timeout(8000)});
    const d=await r.json();
    return d[id]?.czk?{price:d[id].czk,currency:'CZK'}:null;
  }catch(e){console.warn('fetchCryptoPrice selhal:',symbol,e.message);return null;}
}

function parseStooqCsv(text, fromDate){
  const lines=text.trim().split('\n');
  if(lines.length<2) return null;
  const startTs=new Date(fromDate+'T00:00:00').getTime();
  const data=[];
  for(let i=1;i<lines.length;i++){
    const parts=lines[i].split(',');
    if(parts.length<5) continue;
    const date=parts[0];
    const close=parseFloat(parts[4]);
    if(date&&!isNaN(close)&&close>0&&new Date(date+'T00:00:00').getTime()>=startTs)
      data.push({date,close});
  }
  data.sort((a,b)=>a.date.localeCompare(b.date));
  return data.length?data:null;
}

async function fetchStooqHistory(symbol, fromDate){
  try{
    const d1=fromDate.replace(/-/g,'');
    const d2=today().replace(/-/g,'');
    const url=`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase())}&d1=${d1}&d2=${d2}&i=d`;
    const r=await fetchCors(url, 20000);
    if(!r) return null;
    const text=await r.text();
    if(text.startsWith('<')) return null; // HTML chybová stránka
    const parsed=parseStooqCsv(text, fromDate);
    if(!parsed) return null;
    const suffix=(symbol.split('.')[1]||'').toUpperCase();
    let currency='USD';
    if(['DE','F','PA','AS','MI','MC','BR','VI','HE','LS','WA'].includes(suffix)) currency='EUR';
    else if(['L','IL'].includes(suffix)) currency='GBP';
    else if(suffix==='UK') currency='GBp';
    return{values:parsed, currency};
  }catch(e){console.warn('fetchStooqHistory selhal:',symbol,e.message);return null;}
}

async function fetchYahooHistory(symbol, fromDate){
  try{
    const period1=Math.floor(new Date(fromDate+'T00:00:00').getTime()/1000);
    const period2=Math.floor(Date.now()/1000);
    const url=`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
    const r=await fetchCors(url, 20000);
    if(!r) return null;
    const json=await r.json();
    const result=json?.chart?.result?.[0];
    if(!result) return null;
    const timestamps=result.timestamp||[];
    const closes=result.indicators?.adjclose?.[0]?.adjclose||result.indicators?.quote?.[0]?.close||[];
    const pad=n=>String(n).padStart(2,'0');
    const data=timestamps
      .map((ts,i)=>{const d=new Date(ts*1000);return{date:`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`,close:closes[i]};})
      .filter(d=>d.close&&!isNaN(d.close)&&d.close>0);
    if(!data.length) return null;
    const currency=result.meta?.currency||'USD';
    return{values:data, currency};
  }catch(e){console.warn('fetchYahooHistory selhal:',symbol,e.message);return null;}
}

async function fetchCoinGeckoHistory(symbol, fromDate){
  const map={'BTC':'bitcoin','ETH':'ethereum','BNB':'binancecoin','SOL':'solana','ADA':'cardano','XRP':'ripple','DOGE':'dogecoin'};
  const id=map[symbol.toUpperCase()];
  if(!id) return null;
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=czk&days=max&interval=daily`,{signal:AbortSignal.timeout(20000)});
    const d=await r.json();
    if(!d.prices) return null;
    const startTs=new Date(fromDate+'T00:00:00').getTime();
    const data=d.prices
      .filter(([ts])=>ts>=startTs)
      .map(([ts,price])=>({date:new Date(ts).toISOString().split('T')[0],close:price}));
    return data.length?data:null;
  }catch(e){console.warn('fetchCoinGeckoHistory selhal:',symbol,e.message);return null;}
}

async function buildInvHistoryFromAPI(invIdx){
  const inv=investments[invIdx];
  if(!inv||!inv.apiSymbol||!inv.shares||!inv.startDate) return false;

  // Aktuální kurzy (cache)
  await fetchExchangeRates();
  const usdRate=_usdCzkRate;

  const cryptoSymbols=['BTC','ETH','BNB','SOL','ADA','XRP','DOGE'];
  const isCrypto=cryptoSymbols.includes(inv.apiSymbol.toUpperCase());

  let rawData=null;
  let currency='CZK'; // CoinGecko vrací CZK, ostatní nastaví z API
  if(isCrypto){
    rawData=await fetchCoinGeckoHistory(inv.apiSymbol, inv.startDate);
  } else {
    // Twelve Data jako primární, Stooq/Yahoo jako fallback
    const tdResult=await fetchTwelveHistory(inv.apiSymbol, inv.startDate);
    if(tdResult){rawData=tdResult.values;currency=tdResult.currency;}
    if(!rawData){
      try{
        const fallback=await Promise.any([
          fetchYahooHistory(inv.apiSymbol, inv.startDate).then(r=>{if(!r)throw 0;return r;}),
          fetchStooqHistory(inv.apiSymbol, inv.startDate).then(r=>{if(!r)throw 0;return r;})
        ]);
        rawData=fallback.values;currency=fallback.currency;
      }catch(e){console.warn('History fallback selhal pro',inv.apiSymbol);rawData=null;}
    }
  }
  if(!rawData||rawData.length<1) return false;

  // Zachovat isPurchase a isSale záznamy před přepsáním
  const oldEvents=(inv.history||[]).filter(h=>h.isPurchase||h.isSale);

  // Rekonstruovat časovou osu počtu podílů z dokoupení a prodejů
  const purchaseEvents=oldEvents.filter(h=>h.isPurchase&&h.sharesBought>0).sort((a,b)=>a.date.localeCompare(b.date));
  const saleEvents=oldEvents.filter(h=>h.isSale&&h.sharesSold>0).sort((a,b)=>a.date.localeCompare(b.date));
  const totalPurchaseShares=purchaseEvents.reduce((s,p)=>s+(p.sharesBought||0),0);
  const totalSaleShares=saleEvents.reduce((s,p)=>s+(p.sharesSold||0),0);
  const initialShares=Math.max(0,(inv.shares||0)-totalPurchaseShares+totalSaleShares);
  // Sloučit nákupy a prodeje do jedné časové osy
  const allShareEvents=[
    ...purchaseEvents.map(p=>({date:p.date,delta:p.sharesBought})),
    ...saleEvents.map(s=>({date:s.date,delta:-s.sharesSold}))
  ].sort((a,b)=>a.date.localeCompare(b.date));
  const shareTimeline=[{date:'0000-00-00',cumShares:initialShares}];
  let cumShares=initialShares;
  for(const e of allShareEvents){cumShares=Math.max(0,cumShares+e.delta);shareTimeline.push({date:e.date,cumShares});}
  const getSharesAt=date=>{let s=shareTimeline[0].cumShares;for(const t of shareTimeline){if(t.date<=date)s=t.cumShares;else break;}return s;};

  // Každý obchodní den = jeden záznam v historii
  const newHistory=rawData.map(({date,close})=>{
    let priceCzk=close;
    if(currency==='EUR') priceCzk=close*eurCzkRate;
    else if(currency==='USD') priceCzk=close*usdRate;
    else if(currency==='GBP') priceCzk=close*(eurCzkRate*1.17);
    else if(currency==='GBp'||currency==='GBX') priceCzk=(close/100)*(eurCzkRate*1.17);
    const value=Math.round(priceCzk*getSharesAt(date)*100)/100;
    return{date,value,prevValue:0,note:`API: ${inv.apiSymbol}`};
  });
  newHistory.sort((a,b)=>a.date.localeCompare(b.date));
  for(let i=1;i<newHistory.length;i++) newHistory[i].prevValue=newHistory[i-1].value;

  // Spojit API záznamy s isPurchase a isSale záznamy
  inv.history=[...newHistory,...oldEvents].sort((a,b)=>a.date.localeCompare(b.date));
  if(newHistory.length){
    const last=newHistory[newHistory.length-1];
    inv.value=last.value;
    const rawClose=rawData[rawData.length-1].close;
    let lastPriceCzk=rawClose;
    if(currency==='EUR') lastPriceCzk=rawClose*eurCzkRate;
    else if(currency==='USD') lastPriceCzk=rawClose*usdRate;
    else if(currency==='GBP') lastPriceCzk=rawClose*(eurCzkRate*1.17);
    else if(currency==='GBp'||currency==='GBX') lastPriceCzk=(rawClose/100)*(eurCzkRate*1.17);
    inv.lastPrice=lastPriceCzk;
    inv.lastPriceDate=last.date;
  }
  return true;
}

async function autoUpdatePrices(){
  const btn=document.getElementById('btn-auto-update');
  btn.textContent='⟳ Načítám...';
  btn.disabled=true;

  await fetchExchangeRates();
  const usdRate=_usdCzkRate;

  const dateStr=today();
  let updated=0, histBuilt=0, failed=[], noSymbol=0, noShares=[];

  for(let i=0;i<investments.length;i++){
    const inv=investments[i];
    if(!inv.apiSymbol){noSymbol++;continue;}

    // Pokud má počet kusů a datum → přebuilduji celou historii (zahrnuje i dnešek)
    if(inv.shares&&inv.startDate){
      const ok=await buildInvHistoryFromAPI(i);
      if(ok){histBuilt++;updated++;}
      else failed.push(inv.ticker);
      continue;
    }

    // Jinak: jen aktuální cena
    if(!inv.shares){noShares.push(inv.ticker);continue;}

    const cryptoSymbols=['BTC','ETH','BNB','SOL','ADA','XRP','DOGE'];
    let result=null;
    if(cryptoSymbols.includes(inv.apiSymbol.toUpperCase())){
      try{
        result=await Promise.any([
          fetchTwelvePriceWithCurrency(inv.apiSymbol+'/USD').then(r=>{if(!r)throw 0;return r;}),
          fetchCryptoPrice(inv.apiSymbol).then(r=>{if(!r)throw 0;return r;})
        ]);
      }catch(e){console.warn('Crypto cena selhala pro',inv.apiSymbol);result=null;}
    } else {
      result=await fetchTwelvePriceWithCurrency(inv.apiSymbol);
      if(!result){
        try{
          result=await Promise.any([
            fetchStooqPrice(inv.apiSymbol).then(r=>{if(!r)throw 0;return r;}),
            fetchYahooPrice(inv.apiSymbol).then(r=>{if(!r)throw 0;return r;})
          ]);
        }catch(e){console.warn('Všechny zdroje cen selhaly pro',inv.apiSymbol);result=null;}
      }
    }
    if(!result){failed.push(inv.ticker);continue;}

    let priceCzk=result.price;
    if(result.currency==='EUR') priceCzk=result.price*eurCzkRate;
    else if(result.currency==='USD') priceCzk=result.price*usdRate;
    else if(result.currency==='GBP') priceCzk=result.price*(eurCzkRate*1.17);
    else if(result.currency==='GBp'||result.currency==='GBX') priceCzk=(result.price/100)*(eurCzkRate*1.17);

    const newValue=Math.round(priceCzk*inv.shares*100)/100;
    if(!investments[i].history) investments[i].history=[];
    investments[i].history.push({date:dateStr,value:newValue,prevValue:investments[i].value,note:`Auto: ${inv.apiSymbol} @ ${priceCzk.toFixed(2)} Kč`});
    investments[i].history.sort((a,b)=>a.date.localeCompare(b.date));
    investments[i].value=newValue;
    investments[i].lastPrice=priceCzk;
    investments[i].lastPriceDate=dateStr;
    updated++;
  }

  saveToStorage();
  markDirty('investments','dashboard');

  btn.disabled=false;
  btn.textContent='⟳ Aktualizovat ceny';

  let msg=`✓ Aktualizováno: ${updated} investic`;
  if(histBuilt) msg+=` (${histBuilt}× včetně celé historie)`;
  if(noSymbol) msg+=`\n— Bez API symbolu (přeskočeno): ${noSymbol}`;
  if(noShares.length) msg+=`\n— Chybí počet kusů (uprav investici): ${noShares.join(', ')}`;
  if(failed.length) msg+=`\n✗ Selhalo: ${failed.join(', ')}\n\nTip: Zkontroluj správnost symbolu (např. SXR8.DE, AAPL, BTC)`;
  toast(msg, failed.length?'warn':'success', 6000);
}

function resetInvestments(){
  if(!confirm('Smazat vsechny investice a investicni transakce? Nejdrive exportuj zalohu pres Export JSON!')) return;
  investments=[];
  transactions=transactions.filter(t=>!(t.cat==='INVESTICE'&&(t.type==='vydaj'||t.type==='prijem')));
  invChartFilter.clear();
  saveToStorage();
  markDirty('investments','dashboard');
}

function openInvestFromAcc(){
  const accSel=document.getElementById('ifa-acc');
  const invSel=document.getElementById('ifa-inv');
  accSel.innerHTML=accounts.length?'':'<option value="">— nejdřív přidej účet —</option>';
  accounts.forEach((a,i)=>{const o=document.createElement('option');o.value=i;o.textContent=a.name+' — '+fmt(getBalance(i),a.currency);accSel.appendChild(o);});
  invSel.innerHTML=investments.length?'':'<option value="">— nejdřív přidej investici —</option>';
  investments.forEach((inv,i)=>{const o=document.createElement('option');o.value=i;o.textContent=inv.ticker+' ('+inv.type+')';invSel.appendChild(o);});
  document.getElementById('ifa-amount').value='';
  document.getElementById('ifa-amount-m').value='';
  document.getElementById('ifa-note').value='';
  document.getElementById('ifa-note-auto').value='';
  document.getElementById('ifa-date').value=today();
  document.getElementById('ifa-date-auto').value=today();
  document.getElementById('ifa-shares-bought').value='';
  document.getElementById('ifa-unit-price').value='';
  document.getElementById('ifa-price-source').textContent='';
  document.getElementById('ifa-hint').textContent='';
  onIfaInvChange();
  openModal('invest-from-acc');
}

function onIfaInvChange(){
  const ii=document.getElementById('ifa-inv').value;
  const inv=ii!==''?investments[parseInt(ii)]:null;
  const isAuto=!!(inv&&inv.apiSymbol);
  document.getElementById('ifa-auto-section').style.display=isAuto?'block':'none';
  document.getElementById('ifa-manual-section').style.display=isAuto?'none':'block';
  if(isAuto){
    document.getElementById('ifa-symbol-badge').textContent=inv.apiSymbol;
    document.getElementById('ifa-unit-price').value='';
    document.getElementById('ifa-price-source').textContent='';
    document.getElementById('ifa-shares-bought').value='';
    document.getElementById('ifa-amount').value='';
  }
  document.getElementById('ifa-hint').textContent='';
}

function resetIfaPrice(){
  document.getElementById('ifa-unit-price').value='';
  document.getElementById('ifa-price-source').textContent='';
  calcIfaAmount();
}

function calcIfaAmount(){
  const shares=parseFloat(document.getElementById('ifa-shares-bought').value)||0;
  const price=parseFloat(document.getElementById('ifa-unit-price').value)||0;
  if(shares&&price) document.getElementById('ifa-amount').value=Math.round(shares*price*100)/100;
  updateIfaHint();
}

async function fetchIfaPriceAtDate(){
  const ii=document.getElementById('ifa-inv').value;
  const inv=ii!==''?investments[parseInt(ii)]:null;
  if(!inv||!inv.apiSymbol){return;}
  const date=document.getElementById('ifa-date-auto').value;
  if(!date){toast('Nejdřív zadej datum nákupu.','warn');return;}

  const btn=document.getElementById('ifa-fetch-btn');
  btn.textContent='Načítám…';btn.disabled=true;

  await fetchExchangeRates();
  const usdRate=_usdCzkRate;

  // Stažení ceny k danému datu — Twelve Data primární, Stooq/Yahoo fallback
  let rawPrice=null, rawCurrency='USD', rawSource='';
  const cryptoSymbols=['BTC','ETH','BNB','SOL','ADA','XRP','DOGE'];
  if(cryptoSymbols.includes(inv.apiSymbol.toUpperCase())){
    // Twelve Data nebo CoinGecko
    const tdResult=await fetchTwelvePriceAtDate(inv.apiSymbol+'/USD', date);
    if(tdResult){
      rawPrice=tdResult.price; rawCurrency='USD'; rawSource='twelvedata';
    } else {
      const hist=await fetchCoinGeckoHistory(inv.apiSymbol, date);
      if(hist&&hist.length){
        const target=hist.find(d=>d.date>=date)||hist[hist.length-1];
        rawPrice=target.close; rawCurrency='CZK'; rawSource='coingecko';
      }
    }
  } else {
    // Twelve Data primární
    const tdResult=await fetchTwelvePriceAtDate(inv.apiSymbol, date);
    if(tdResult){
      rawPrice=tdResult.price; rawCurrency=tdResult.currency||'USD'; rawSource='twelvedata';
    } else {
      const hist=await fetchStooqHistory(inv.apiSymbol, date);
      if(hist&&hist.values.length){
        rawPrice=hist.values[0].close;
        rawCurrency=hist.currency;
        rawSource='stooq';
      } else {
        const yhist=await fetchYahooHistory(inv.apiSymbol, date);
        if(yhist&&yhist.values.length){
          rawPrice=yhist.values[0].close;
          rawCurrency=yhist.currency;
          rawSource='yahoo';
        }
      }
    }
  }

  btn.textContent='Načíst cenu k datu';btn.disabled=false;

  if(!rawPrice){toast('Cenu k datu '+date+' se nepodařilo načíst. Zkontroluj symbol a datum.','error',6000);return;}

  let priceCzk=rawPrice;
  if(rawCurrency==='EUR') priceCzk=rawPrice*eurCzkRate;
  else if(rawCurrency==='USD') priceCzk=rawPrice*usdRate;

  document.getElementById('ifa-unit-price').value=Math.round(priceCzk*100)/100;
  document.getElementById('ifa-price-source').textContent=`(${rawSource}, ${rawCurrency})`;
  calcIfaAmount();
}

function updateIfaHint(){
  const ai=document.getElementById('ifa-acc').value;
  const ii=document.getElementById('ifa-inv').value;
  const inv=ii!==''?investments[parseInt(ii)]:null;
  const isAuto=!!(inv&&inv.apiSymbol);
  const amount=parseFloat(isAuto
    ?document.getElementById('ifa-amount').value
    :document.getElementById('ifa-amount-m').value)||0;
  const hint=document.getElementById('ifa-hint');
  if(ai===''||!amount){hint.textContent='';return;}
  const acc=accounts[ai];
  if(!acc){hint.textContent='';return;}
  const inCZK=toCZK(amount,acc.currency);
  hint.textContent='Odečte '+fmt(amount,acc.currency)+' z účtu '+acc.name+(acc.currency!=='CZK'?' (≈ '+fmt(inCZK)+')':'')+' a přičte '+fmt(inCZK)+' k hodnotě investice.';
}

function saveInvestFromAcc(){
  const ai=document.getElementById('ifa-acc').value;
  const ii=document.getElementById('ifa-inv').value;
  if(ai===''||ii===''){toast('Vyber účet i investici.','warn');return;}
  const acc=accounts[ai];
  const inv=investments[ii];
  const isAuto=!!(inv&&inv.apiSymbol);

  const amount=parseFloat(isAuto
    ?document.getElementById('ifa-amount').value
    :document.getElementById('ifa-amount-m').value);
  const date=isAuto
    ?document.getElementById('ifa-date-auto').value
    :document.getElementById('ifa-date').value;
  const note=(isAuto
    ?document.getElementById('ifa-note-auto').value
    :document.getElementById('ifa-note').value).trim()||'Investice';
  if(isNaN(amount)||amount<=0){toast('Zadej platnou částku investice.','warn');return;}
  if(!date){toast('Zadej datum investice.','warn');return;}

  const inCZK=toCZK(amount,acc.currency);
  const prevInvValue=getInvValue(parseInt(ii));
  inv.invested+=inCZK;
  // Pro API investice aktualizujeme value přímo (API ji stejně přepíše)
  if(isAuto) inv.value+=inCZK;

  // V auto módu přičteme i počet kusů
  let sharesBoughtNow=0;
  if(isAuto){
    sharesBoughtNow=parseFloat(document.getElementById('ifa-shares-bought').value)||0;
    if(sharesBoughtNow) inv.shares=(inv.shares||0)+sharesBoughtNow;
  }

  // Nejdřív přidáme transakci (aby getInvValue mohl počítat)
  transactions.unshift({desc:note+' → '+inv.ticker,amount,date,type:'vydaj',cat:'INVESTICE',cur:acc.currency,accIdx:String(ai),invIdx:String(ii)});

  // Zaznamenej nákup do historie aktualizací
  if(!inv.history) inv.history=[];
  const newInvValue=getInvValue(parseInt(ii));
  const purchaseEntry={date, value:newInvValue, prevValue:prevInvValue, note, isPurchase:true};
  if(sharesBoughtNow) purchaseEntry.sharesBought=sharesBoughtNow;
  inv.history.push(purchaseEntry);
  inv.history.sort((a,b)=>a.date.localeCompare(b.date));

  recordSnapshot();
  recordInvSnapshot();
  saveToStorage();
  closeModal('invest-from-acc');
  markDirty('dashboard','accounts','investments','transactions');

  // Po dokoupení automaticky přebuilduji historii z API (aby se přepočítala aktuální hodnota)
  if(isAuto && inv.apiSymbol && inv.shares && inv.startDate){
    const btn=document.getElementById('btn-auto-update');
    if(btn){btn.textContent='⟳ Načítám...';btn.disabled=true;}
    buildInvHistoryFromAPI(parseInt(ii)).then(ok=>{
      if(btn){btn.textContent='⟳ Aktualizovat ceny';btn.disabled=false;}
      if(ok){saveToStorage();markDirty('investments');}
    });
  }
}

// ==================== PRODEJ INVESTICE ====================

function openSellInvModal(invIdx){
  const invSel=document.getElementById('si-inv');
  const accSel=document.getElementById('si-acc');

  // Naplnit dropdown investic (jen ty s hodnotou > 0 nebo s kusy)
  invSel.innerHTML='';
  let hasOptions=false;
  investments.forEach((inv,i)=>{
    const val=getInvValue(i);
    if(val<=0&&(!inv.shares||inv.shares<=0)) return;
    const o=document.createElement('option');
    o.value=i;
    o.textContent=inv.ticker+' ('+inv.type+') — '+fmt(val);
    invSel.appendChild(o);
    hasOptions=true;
  });
  if(!hasOptions){invSel.innerHTML='<option value="">Žádné investice k prodeji</option>';}

  // Naplnit dropdown účtů
  accSel.innerHTML='';
  accounts.forEach((a,i)=>{
    const o=document.createElement('option');
    o.value=i;
    o.textContent=a.name+' — '+fmt(getBalance(i),a.currency);
    accSel.appendChild(o);
  });

  // Předvyplnit přiřazený účet investice
  if(invIdx!==undefined&&invIdx>=0){
    invSel.value=invIdx;
    const inv=investments[invIdx];
    if(inv&&inv.accIdx!==undefined&&inv.accIdx!==''){
      accSel.value=inv.accIdx;
    }
  }

  // Reset polí
  document.getElementById('si-amount').value='';
  document.getElementById('si-amount-m').value='';
  document.getElementById('si-note-auto').value='';
  document.getElementById('si-note').value='';
  document.getElementById('si-date').value=today();
  document.getElementById('si-date-auto').value=today();
  document.getElementById('si-shares-sell').value='';
  document.getElementById('si-unit-price').value='';
  document.getElementById('si-price-source').textContent='';
  document.getElementById('si-hint').textContent='';

  onSellInvChange();
  openModal('sell-inv');
}

function onSellInvChange(){
  const ii=document.getElementById('si-inv').value;
  const inv=ii!==''?investments[parseInt(ii)]:null;
  const isAuto=!!(inv&&inv.apiSymbol);
  const infoEl=document.getElementById('si-info');

  document.getElementById('si-auto-section').style.display=isAuto?'block':'none';
  document.getElementById('si-manual-section').style.display=isAuto?'none':'block';

  if(inv){
    infoEl.style.display='block';
    const val=getInvValue(parseInt(ii));
    document.getElementById('si-cur-value').textContent=fmt(val);

    if(isAuto&&inv.shares){
      document.getElementById('si-shares-info').style.display='block';
      document.getElementById('si-unit-info').style.display='block';
      document.getElementById('si-cur-shares').textContent=(inv.shares||0).toFixed(4);
      const unitPrice=inv.shares?(val/inv.shares):0;
      document.getElementById('si-cur-unit').textContent=fmt(unitPrice);
    } else {
      document.getElementById('si-shares-info').style.display=isAuto?'block':'none';
      document.getElementById('si-unit-info').style.display=isAuto?'block':'none';
    }

    // Předvyplnit přiřazený účet
    if(inv.accIdx!==undefined&&inv.accIdx!==''){
      document.getElementById('si-acc').value=inv.accIdx;
    }

    document.getElementById('si-unit-price').value='';
    document.getElementById('si-price-source').textContent='';
    document.getElementById('si-shares-sell').value='';
    document.getElementById('si-amount').value='';
    document.getElementById('si-amount-m').value='';
  } else {
    infoEl.style.display='none';
  }
  document.getElementById('si-hint').textContent='';
}

function resetSellPrice(){
  document.getElementById('si-unit-price').value='';
  document.getElementById('si-price-source').textContent='';
  calcSellAmount();
}

function calcSellAmount(){
  const shares=parseFloat(document.getElementById('si-shares-sell').value)||0;
  const price=parseFloat(document.getElementById('si-unit-price').value)||0;
  if(shares&&price) document.getElementById('si-amount').value=Math.round(shares*price*100)/100;
  updateSellHint();
}

async function fetchSellPriceAtDate(){
  const ii=document.getElementById('si-inv').value;
  const inv=ii!==''?investments[parseInt(ii)]:null;
  if(!inv||!inv.apiSymbol) return;
  const date=document.getElementById('si-date-auto').value;
  if(!date){toast('Nejdřív zadej datum prodeje.','warn');return;}

  const btn=document.getElementById('si-fetch-btn');
  btn.textContent='Načítám…';btn.disabled=true;

  await fetchExchangeRates();
  const usdRate=_usdCzkRate;

  let rawPrice=null, rawCurrency='USD', rawSource='';
  const cryptoSymbols=['BTC','ETH','BNB','SOL','ADA','XRP','DOGE'];
  if(cryptoSymbols.includes(inv.apiSymbol.toUpperCase())){
    const tdResult=await fetchTwelvePriceAtDate(inv.apiSymbol+'/USD', date);
    if(tdResult){
      rawPrice=tdResult.price; rawCurrency='USD'; rawSource='twelvedata';
    } else {
      const hist=await fetchCoinGeckoHistory(inv.apiSymbol, date);
      if(hist&&hist.length){
        const target=hist.find(d=>d.date>=date)||hist[hist.length-1];
        rawPrice=target.close; rawCurrency='CZK'; rawSource='coingecko';
      }
    }
  } else {
    const tdResult=await fetchTwelvePriceAtDate(inv.apiSymbol, date);
    if(tdResult){
      rawPrice=tdResult.price; rawCurrency=tdResult.currency||'USD'; rawSource='twelvedata';
    } else {
      const hist=await fetchStooqHistory(inv.apiSymbol, date);
      if(hist&&hist.values.length){
        rawPrice=hist.values[0].close;
        rawCurrency=hist.currency;
        rawSource='stooq';
      } else {
        const yhist=await fetchYahooHistory(inv.apiSymbol, date);
        if(yhist&&yhist.values.length){
          rawPrice=yhist.values[0].close;
          rawCurrency=yhist.currency;
          rawSource='yahoo';
        }
      }
    }
  }

  btn.textContent='Načíst cenu k datu';btn.disabled=false;

  if(!rawPrice){toast('Cenu k datu '+date+' se nepodařilo načíst. Zkontroluj symbol a datum.','error',6000);return;}

  let priceCzk=rawPrice;
  if(rawCurrency==='EUR') priceCzk=rawPrice*eurCzkRate;
  else if(rawCurrency==='USD') priceCzk=rawPrice*usdRate;

  document.getElementById('si-unit-price').value=Math.round(priceCzk*100)/100;
  document.getElementById('si-price-source').textContent='('+rawSource+', '+rawCurrency+')';
  calcSellAmount();
}

function sellAll(){
  const ii=document.getElementById('si-inv').value;
  if(ii==='') return;
  const inv=investments[parseInt(ii)];
  const isAuto=!!(inv&&inv.apiSymbol);

  if(isAuto){
    document.getElementById('si-shares-sell').value=inv.shares||0;
    calcSellAmount();
  } else {
    const val=getInvValue(parseInt(ii));
    document.getElementById('si-amount-m').value=Math.round(val*100)/100;
    updateSellHint();
  }
}

function updateSellHint(){
  const ai=document.getElementById('si-acc').value;
  const ii=document.getElementById('si-inv').value;
  const inv=ii!==''?investments[parseInt(ii)]:null;
  const isAuto=!!(inv&&inv.apiSymbol);
  const amount=parseFloat(isAuto
    ?document.getElementById('si-amount').value
    :document.getElementById('si-amount-m').value)||0;
  const hint=document.getElementById('si-hint');
  if(ai===''||!inv||!amount){hint.textContent='';return;}
  const acc=accounts[ai];
  if(!acc){hint.textContent='';return;}

  const inCZK=toCZK(amount,acc.currency);
  const val=getInvValue(parseInt(ii));
  const sharesSelling=isAuto?(parseFloat(document.getElementById('si-shares-sell').value)||0):0;
  const pctSelling=isAuto&&inv.shares?(sharesSelling/inv.shares*100):(val?(inCZK/val*100):0);
  const investedReduction=inv.invested*(Math.min(pctSelling,100)/100);
  const profit=inCZK-investedReduction;

  hint.innerHTML='Přičte '+fmt(amount,acc.currency)+' na účet '+escHtml(acc.name)+
    (acc.currency!=='CZK'?' (≈ '+fmt(inCZK)+')':'')+
    '. Prodej '+Math.min(pctSelling,100).toFixed(1)+' % investice.'+
    ' <span style="color:'+(profit>=0?'var(--green)':'var(--red)')+'">Realizovaný '+(profit>=0?'zisk':'ztráta')+': '+(profit>=0?'+':'')+fmt(profit)+'</span>';
}

function saveSellInv(){
  const ai=document.getElementById('si-acc').value;
  const ii=document.getElementById('si-inv').value;
  if(ai===''||ii===''){toast('Vyber investici i účet.','warn');return;}
  const acc=accounts[parseInt(ai)];
  const inv=investments[parseInt(ii)];
  if(!acc||!inv){toast('Neplatný účet nebo investice.','warn');return;}
  const isAuto=!!(inv&&inv.apiSymbol);

  const amount=parseFloat(isAuto
    ?document.getElementById('si-amount').value
    :document.getElementById('si-amount-m').value);
  const date=isAuto
    ?document.getElementById('si-date-auto').value
    :document.getElementById('si-date').value;
  const note=(isAuto
    ?document.getElementById('si-note-auto').value
    :document.getElementById('si-note').value).trim()||'Prodej investice';
  if(isNaN(amount)||amount<=0){toast('Zadej platnou částku prodeje.','warn');return;}
  if(!date){toast('Zadej datum prodeje.','warn');return;}

  const inCZK=toCZK(amount,acc.currency);
  const prevInvValue=getInvValue(parseInt(ii));

  // Vypočítat procento prodeje
  let sellPct=0;
  let sharesSold=0;
  if(isAuto&&inv.shares){
    sharesSold=parseFloat(document.getElementById('si-shares-sell').value)||0;
    if(sharesSold<=0){toast('Zadej počet kusů k prodeji.','warn');return;}
    if(sharesSold>inv.shares+0.0001){toast('Nemáš tolik kusů (max '+inv.shares.toFixed(4)+').','warn');return;}
    sharesSold=Math.min(sharesSold,inv.shares);
    sellPct=sharesSold/inv.shares;
  } else {
    sellPct=prevInvValue>0?Math.min(1,inCZK/prevInvValue):1;
  }

  // 1. Snížit počet kusů
  if(isAuto&&inv.shares){
    inv.shares=Math.max(0,inv.shares-sharesSold);
    if(inv.shares<0.0001) inv.shares=0;
  }

  // 2. Snížit investovanou částku proporcionálně
  const investedReduction=inv.invested*sellPct;
  inv.invested=Math.max(0,inv.invested-investedReduction);

  // 3. Snížit hodnotu (jen u API investic — u ručních to řeší getInvValue přes salesSince)
  if(isAuto){
    inv.value=Math.max(0,(inv.value||0)*(1-sellPct));
  }

  // 4. Vytvořit příjmovou transakci
  transactions.unshift({
    desc:note+' ← '+inv.ticker,
    amount:amount,
    date:date,
    type:'prijem',
    cat:'INVESTICE',
    cur:acc.currency,
    accIdx:String(ai),
    invIdx:String(ii)
  });

  // 5. Zaznamenat prodej do historie
  if(!inv.history) inv.history=[];
  const newInvValue=getInvValue(parseInt(ii));
  const saleEntry={date, value:newInvValue, prevValue:prevInvValue, note, isSale:true, investedReduction};
  if(sharesSold) saleEntry.sharesSold=sharesSold;
  inv.history.push(saleEntry);
  inv.history.sort((a,b)=>a.date.localeCompare(b.date));

  // 6. Uložit a aktualizovat UI
  recordSnapshot();
  recordInvSnapshot();
  saveToStorage();
  closeModal('sell-inv');
  markDirty('dashboard','accounts','investments','transactions');

  // 7. Přebudovat historii z API pokud zbývají kusy
  if(isAuto&&inv.apiSymbol&&inv.shares>0&&inv.startDate){
    const btn=document.getElementById('btn-auto-update');
    if(btn){btn.textContent='⟳ Načítám...';btn.disabled=true;}
    buildInvHistoryFromAPI(parseInt(ii)).then(ok=>{
      if(btn){btn.textContent='⟳ Aktualizovat ceny';btn.disabled=false;}
      if(ok){saveToStorage();markDirty('investments');}
    });
  }

  const profit=inCZK-investedReduction;
  toast('Prodáno: '+fmt(amount,acc.currency)+' → '+escHtml(acc.name)+(profit>=0?' (zisk +'+fmt(profit)+')':' (ztráta '+fmt(profit)+')'),'ok',4000);
}
