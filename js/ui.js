// Kasička — UI utilities, navigace, periody, autocomplete

// ── Theme přepínač ──────────────────────────────────
const THEME_LS_KEY='kasicka_theme';
function setTheme(id){
  if(id) document.documentElement.dataset.theme=id;
  else delete document.documentElement.dataset.theme;
  localStorage.setItem(THEME_LS_KEY,id||'');
  const s=document.getElementById('theme-select');
  const m=document.getElementById('mobile-theme-select');
  if(s) s.value=id||'';
  if(m) m.value=id||'';
  markDirty('dashboard','transactions','accounts','investments','budget');
}
function loadTheme(){setTheme(localStorage.getItem(THEME_LS_KEY)||'');}

// ── Toast notifikace ──────────────────────────────────
// Typy: 'error' (červená), 'success' (zelená), 'warn' (žlutá), 'info' (modrá)
const _TOAST_ICONS={error:'✕',success:'✓',warn:'⚠',info:'ℹ'};
function toast(message, type='info', duration=4000){
  const container=document.getElementById('toast-container');
  if(!container) return;
  const el=document.createElement('div');
  el.className='toast toast-'+type;
  el.innerHTML='<span class="toast-icon">'+(_TOAST_ICONS[type]||'ℹ')+'</span><span>'+message.replace(/\n/g,'<br>')+'</span>';
  container.appendChild(el);
  const timer=setTimeout(()=>{
    el.classList.add('toast-out');
    el.addEventListener('animationend',()=>el.remove());
  }, duration);
  el.addEventListener('click',()=>{clearTimeout(timer);el.classList.add('toast-out');el.addEventListener('animationend',()=>el.remove());});
}

function updateToggle(id){
  const cb=document.getElementById(id);
  const track=document.getElementById(id+'-track');
  const thumb=document.getElementById(id+'-thumb');
  if(!track||!thumb) return;
  track.style.background=cb.checked?'var(--accent)':'var(--toggle-off)';
  thumb.style.left=cb.checked?'21px':'3px';
}

function showSection(id){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('visible'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('section-'+id).classList.add('visible');
  document.getElementById('nav-'+id).classList.add('active');
  const bnav=document.getElementById('bnav-'+id);
  if(bnav) bnav.classList.add('active');
  _activeSection=id;
  // Renderuj sekci jen pokud je dirty (nebo při prvním zobrazení)
  _dirty[id]=true;
  _renderVisible();
}

// ── Mobilní menu ──────────────────────────────────────
function toggleMobileMenu(){
  document.getElementById('mobile-menu').classList.toggle('open');
}
function closeMobileMenu(){
  document.getElementById('mobile-menu').classList.remove('open');
}
function updateMobileUserInfo(){
  const el=document.getElementById('mobile-user-info');
  const emailEl=document.getElementById('mobile-user-email');
  if(el&&emailEl){
    if(currentUser){
      el.style.display='flex';
      emailEl.textContent=currentUser.email;
    } else {
      el.style.display='none';
    }
  }
}

function openModal(t){document.getElementById('modal-'+t).classList.add('open');}
function closeModal(t){document.getElementById('modal-'+t).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});});

function setPeriod(p, ev){
  activePeriod=p;
  periodOffset=0;
  resetTxnPaging();
  document.querySelectorAll('#txn-period-bar .period-btn').forEach(b=>b.classList.remove('active'));
  if(ev) ev.target.classList.add('active');
  const customWrap=document.getElementById('period-custom-wrap');
  const navEl=document.getElementById('period-nav');
  customWrap.classList.toggle('visible', p==='vlastni');
  navEl.style.display=(p==='tyden'||p==='mesic'||p==='rok')?'flex':'none';
  if(p!=='vlastni'){periodFrom=null;periodTo=null;}
  updatePeriodNavLabel();
  refreshTxnFilters();
  renderTxns();
}

function shiftPeriod(dir){
  periodOffset+=dir;
  resetTxnPaging();
  updatePeriodNavLabel();
  renderTxns();
}

function updatePeriodNavLabel(){
  const el=document.getElementById('period-nav-label');
  if(!el) return;
  const now=new Date();
  if(activePeriod==='tyden'){
    const base=new Date(now);
    base.setDate(base.getDate()-(base.getDay()||7)+1+periodOffset*7);
    const end=new Date(base);end.setDate(end.getDate()+6);
    el.textContent=base.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short'})+' – '+end.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short',year:'numeric'});
  } else if(activePeriod==='mesic'){
    const d=new Date(now.getFullYear(),now.getMonth()+periodOffset,1);
    el.textContent=d.toLocaleDateString('cs-CZ',{month:'long',year:'numeric'});
  } else if(activePeriod==='rok'){
    el.textContent=String(now.getFullYear()+periodOffset);
  }
}

function applyCustomPeriod(){
  periodFrom=document.getElementById('period-from').value||null;
  periodTo=document.getElementById('period-to').value||null;
  renderTxns();
}

function getDateRange(period){
  const now=new Date(); now.setHours(0,0,0,0);
  if(period==='dnes') return {from:now,to:now};
  if(period==='tyden'){
    const mon=new Date(now);
    mon.setDate(mon.getDate()-(mon.getDay()||7)+1+periodOffset*7);
    mon.setHours(0,0,0,0);
    const sun=new Date(mon);sun.setDate(sun.getDate()+6);sun.setHours(23,59,59,999);
    return{from:mon,to:sun};
  }
  if(period==='mesic'){
    const f=new Date(now.getFullYear(),now.getMonth()+periodOffset,1);
    const t=new Date(now.getFullYear(),now.getMonth()+periodOffset+1,0);
    t.setHours(23,59,59,999);return{from:f,to:t};
  }
  if(period==='rok'){
    const y=now.getFullYear()+periodOffset;
    const _ye=new Date(y,11,31);_ye.setHours(23,59,59,999);return{from:new Date(y,0,1),to:_ye};
  }
  if(period==='vlastni'&&periodFrom&&periodTo){return{from:new Date(periodFrom),to:new Date(periodTo)};}
  return null;
}

function todayCheck(inputId, cb, renderFn){
  const el=document.getElementById(inputId);
  if(!el) return;
  if(cb.checked){
    const t=new Date(),p=n=>String(n).padStart(2,'0');
    el.value=`${t.getFullYear()}-${p(t.getMonth()+1)}-${p(t.getDate())}`;
    el.disabled=true;
  } else {
    el.disabled=false;
  }
  renderFn();
}

function refreshTxnFilters(){
  const accSel=document.getElementById('filter-account');
  const catSel=document.getElementById('filter-category');
  if(!accSel||!catSel) return;
  const prevAcc=accSel.value, prevCat=catSel.value;
  accSel.innerHTML='<option value="">Všechny účty</option>';
  accounts.forEach((a,i)=>{const o=document.createElement('option');o.value=i;o.textContent=a.name;accSel.appendChild(o);});
  accSel.value=prevAcc;
  catSel.innerHTML='<option value="">Všechny kategorie</option>';
  categories.forEach(c=>{const o=document.createElement('option');o.value=c.name;o.textContent=c.name;catSel.appendChild(o);});
  catSel.value=prevCat;
}

function filterByPeriod(list, period){
  const range=getDateRange(period);
  if(!range) return list;
  return list.filter(t=>{
    const d=new Date(t.date+'T12:00:00');
    return d>=range.from&&d<=range.to;
  });
}

function shiftDashPeriod(dir){
  dashOffset+=dir;
  updateDashNavLabel();
  renderDashboard();
}

function updateDashNavLabel(){
  const el=document.getElementById('dash-period-nav-label');
  if(!el) return;
  const now=new Date();
  if(dashPeriod==='tyden'){
    const base=new Date(now);
    base.setDate(base.getDate()-(base.getDay()||7)+1+dashOffset*7);
    const end=new Date(base);end.setDate(end.getDate()+6);
    el.textContent=base.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short'})+' – '+end.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short',year:'numeric'});
  } else if(dashPeriod==='mesic'){
    const d=new Date(now.getFullYear(),now.getMonth()+dashOffset,1);
    el.textContent=d.toLocaleDateString('cs-CZ',{month:'long',year:'numeric'});
  } else if(dashPeriod==='rok'){
    el.textContent=String(now.getFullYear()+dashOffset);
  } else {
    el.textContent='';
  }
}

function getDashDateRange(){
  const now=new Date(); now.setHours(0,0,0,0);
  if(dashPeriod==='tyden'){
    const mon=new Date(now);
    mon.setDate(mon.getDate()-(mon.getDay()||7)+1+dashOffset*7);
    mon.setHours(0,0,0,0);
    const sun=new Date(mon);sun.setDate(sun.getDate()+6);sun.setHours(23,59,59,999);
    return{from:mon,to:sun};
  }
  if(dashPeriod==='mesic'){
    const f=new Date(now.getFullYear(),now.getMonth()+dashOffset,1);
    const t=new Date(now.getFullYear(),now.getMonth()+dashOffset+1,0);t.setHours(23,59,59,999);
    return{from:f,to:t};
  }
  if(dashPeriod==='rok'){
    const y=now.getFullYear()+dashOffset;
    const _ye=new Date(y,11,31);_ye.setHours(23,59,59,999);return{from:new Date(y,0,1),to:_ye};
  }
  if(dashPeriod==='vlastni'){
    const f=document.getElementById('dash-from')?.value;
    const t=document.getElementById('dash-to')?.value;
    if(f&&t) return{from:new Date(f),to:new Date(t)};
  }
  return null;
}

function setDashPeriod(p, btn){
  dashPeriod=p;
  dashOffset=0;
  document.querySelectorAll('[id^="dash-p-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('dash-custom-wrap').classList.toggle('visible', p==='vlastni');
  const nav=document.getElementById('dash-period-nav');
  if(nav) nav.style.display=(p==='vlastni')?'none':'flex';
  updateDashNavLabel();
  renderDashboard();
}


function shiftChartPeriod(chart, dir){
  if(chart==='acc'){accOffset+=dir;updateChartNavLabel('acc');renderAccChart();}
  else{invOffset+=dir;updateChartNavLabel('inv');renderInvChart();}
}

function updateChartNavLabel(chart){
  const period=chart==='acc'?accPeriod:invPeriod;
  const offset=chart==='acc'?accOffset:invOffset;
  const el=document.getElementById(chart+'-period-nav-label');
  if(!el) return;
  const now=new Date();
  if(period==='tyden'){
    const base=new Date(now);
    base.setDate(base.getDate()-(base.getDay()||7)+1+offset*7);
    const end=new Date(base);end.setDate(end.getDate()+6);
    el.textContent=base.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short'})+' – '+end.toLocaleDateString('cs-CZ',{day:'2-digit',month:'short'});
  } else if(period==='mesic'){
    const d=new Date(now.getFullYear(),now.getMonth()+offset,1);
    el.textContent=d.toLocaleDateString('cs-CZ',{month:'long',year:'numeric'});
  } else if(period==='rok'){
    el.textContent=String(now.getFullYear()+offset);
  }
}

function getChartDateRange(period, offset){
  const now=new Date(); now.setHours(0,0,0,0);
  if(period==='tyden'){
    const mon=new Date(now);
    mon.setDate(mon.getDate()-(mon.getDay()||7)+1+offset*7);
    mon.setHours(0,0,0,0);
    const sun=new Date(mon);sun.setDate(sun.getDate()+6);sun.setHours(23,59,59,999);
    return{from:mon,to:sun};
  }
  if(period==='mesic'){
    const f=new Date(now.getFullYear(),now.getMonth()+offset,1);
    const t=new Date(now.getFullYear(),now.getMonth()+offset+1,0);
    t.setHours(23,59,59,999);return{from:f,to:t};
  }
  if(period==='rok'){
    const y=now.getFullYear()+offset;
    const _ye=new Date(y,11,31);_ye.setHours(23,59,59,999);return{from:new Date(y,0,1),to:_ye};
  }
  return null;
}

function renderAccChartFilter(){
  const el=document.getElementById('acc-chart-filter');
  if(!el) return;
  if(!accounts.length){el.innerHTML='';return;}
  const allActive=accChartFilter.size===0;
  let html=`<span onclick="accChartFilter.clear();renderAccChartFilter();renderAccChart();" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${allActive?'var(--accent-dim)':'var(--card-bg)'};border:1px solid ${allActive?'var(--accent)':'var(--card-border)'};color:${allActive?'var(--accent)':'var(--text-secondary)'};">Vše</span>`;
  html+=accounts.map((a,i)=>{
    const active=!allActive&&accChartFilter.has(i);
    return`<span onclick="toggleAccChartFilter(${i})" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${active?'var(--accent-dim)':'var(--card-bg)'};border:1px solid ${active?'var(--accent)':'var(--card-border)'};color:${active?'var(--accent)':'var(--text-secondary)'};">${escHtml(a.name)}</span>`;
  }).join('');
  el.innerHTML=html;
}

function toggleAccChartFilter(idx){
  if(accChartFilter.has(idx)){accChartFilter.delete(idx);}
  else{accChartFilter.add(idx);}
  // Pokud jsou vybrané všechny nebo žádné → reset na vše
  if(accChartFilter.size===accounts.length) accChartFilter.clear();
  renderAccChartFilter();
  renderAccChart();
}

function renderInvChartFilter(){
  const el=document.getElementById('inv-chart-filter');
  if(!el) return;
  if(!investments.length){el.innerHTML='';return;}
  // Lepší barvy — "Jiné" dostane výraznou teal místo šedé
  const typeColors={'Akcie':'#4f8ef7','ETF':'#34d399','Krypto':'#fbbf24','Dluhopisy':'#a78bfa','Jiné':'#2dd4bf'};
  const allActive=invChartFilter.size===0;
  let html=`<span onclick="invChartFilter.clear();renderInvChartFilter();renderInvChart();" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${allActive?'var(--accent-dim)':'var(--card-bg)'};border:1px solid ${allActive?'var(--accent)':'var(--card-border)'};color:${allActive?'var(--accent)':'var(--text-secondary)'};">Vše</span>`;
  html+=investments.map((inv,i)=>{
    const active=!allActive&&invChartFilter.has(i);
    const col=typeColors[inv.type]||'#2dd4bf';
    return`<span onclick="toggleInvChartFilter(${i})" style="padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;background:${active?col+'33':'var(--card-bg)'};border:1px solid ${active?col:'var(--card-border)'};color:${active?col:'var(--text-secondary)'};">${escHtml(inv.ticker)}</span>`;
  }).join('');
  el.innerHTML=html;
}

function toggleInvChartFilter(idx){
  if(invChartFilter.has(idx)){invChartFilter.delete(idx);}
  else{invChartFilter.add(idx);}
  if(invChartFilter.size===investments.length) invChartFilter.clear();
  renderInvChartFilter();
  renderInvChart();
}

function setAccPeriod(p, btn){
  accPeriod=p;
  accOffset=0;
  document.querySelectorAll('[id^="acc-p-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('acc-custom-wrap').classList.toggle('visible', p==='vlastni');
  const nav=document.getElementById('acc-period-nav');
  nav.style.display=(p==='tyden'||p==='mesic'||p==='rok')?'flex':'none';
  updateChartNavLabel('acc');
  if(p!=='vlastni') renderAccChart();
}

function setInvPeriod(p, btn){
  invPeriod=p;
  invOffset=0;
  document.querySelectorAll('[id^="inv-p-"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('inv-custom-wrap').classList.toggle('visible', p==='vlastni');
  const nav=document.getElementById('inv-period-nav');
  nav.style.display=(p==='tyden'||p==='mesic'||p==='rok')?'flex':'none';
  updateChartNavLabel('inv');
  if(p!=='vlastni') renderInvChart();
}

// ── Autocomplete pro popis a poznámky ─────────────────────
function getDescHistory(){
  const seen=new Set();
  const result=[];
  [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).forEach(t=>{
    if(t.desc&&!seen.has(t.desc)){
      seen.add(t.desc);
      result.push({desc:t.desc, cat:t.cat, amount:t.amount, cur:t.cur});
    }
  });
  return result;
}

function getNoteHistory(){
  const seen=new Set();
  const result=[];
  transactions.filter(t=>t.type==='prevod'&&t.desc).forEach(t=>{
    const note=t.desc.split(' (')[0];
    if(note&&!seen.has(note)){seen.add(note);result.push(note);}
  });
  return result;
}

function showAc(inputId, listId){
  const input=document.getElementById(inputId);
  const list=document.getElementById(listId);
  if(!input||!list) return;
  const val=input.value.toLowerCase().trim();
  const isDesc=inputId==='txn-desc';
  const items=isDesc
    ? getDescHistory().filter(h=>!val||h.desc.toLowerCase().includes(val)).slice(0,8)
    : getNoteHistory().filter(n=>!val||n.toLowerCase().includes(val)).slice(0,8);
  if(!items.length){list.style.display='none';return;}
  list.innerHTML=isDesc
    ? items.map((h,i)=>`<div class="ac-item" data-val="${escAttr(h.desc)}" onmousedown="pickAc(event,'${inputId}','${listId}')">
        <span>${escHtml(h.desc)}</span>
        <span class="ac-item-sub">${escHtml(h.cat)} · ${fmt(h.amount,h.cur)}</span>
      </div>`).join('')
    : items.map(n=>`<div class="ac-item" data-val="${escAttr(n)}" onmousedown="pickAc(event,'${inputId}','${listId}')">${escHtml(n)}</div>`).join('');
  list.style.display='block';
}

function pickAc(ev, inputId, listId){
  ev.preventDefault();
  const input=document.getElementById(inputId);
  const list=document.getElementById(listId);
  const val=ev.currentTarget.getAttribute('data-val');
  input.value=val;
  list.style.display='none';
}

function hideAc(listId){
  setTimeout(()=>{const l=document.getElementById(listId);if(l)l.style.display='none';},150);
}

function handleAcKey(ev, inputId, listId){
  const list=document.getElementById(listId);
  if(!list||list.style.display==='none') return;
  const items=list.querySelectorAll('.ac-item');
  const active=list.querySelector('.ac-active');
  let idx=active?[...items].indexOf(active):-1;
  if(ev.key==='ArrowDown'){ev.preventDefault();if(active)active.classList.remove('ac-active');idx=Math.min(idx+1,items.length-1);items[idx]?.classList.add('ac-active');items[idx]?.scrollIntoView({block:'nearest'});}
  else if(ev.key==='ArrowUp'){ev.preventDefault();if(active)active.classList.remove('ac-active');idx=Math.max(idx-1,0);items[idx]?.classList.add('ac-active');items[idx]?.scrollIntoView({block:'nearest'});}
  else if(ev.key==='Enter'&&active){ev.preventDefault();document.getElementById(inputId).value=active.getAttribute('data-val');list.style.display='none';}
  else if(ev.key==='Escape'){list.style.display='none';}
}

// Zavři autocomplete při kliknutí mimo
document.addEventListener('click',e=>{
  ['ac-txn-desc','ac-tr-note'].forEach(id=>{
    const l=document.getElementById(id);
    if(l&&!l.contains(e.target)&&e.target.id!==id.replace('ac-',''))l.style.display='none';
  });
});

// Načti uložené téma a synchronizuj selecty
loadTheme();
