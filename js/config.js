// Kasička — globální proměnné a konstanty

let transactions=[],accounts=[],investments=[],budgets=[],categories=[],invGroups=[];
let goals=[],wishlist=[];
let demoMode=false;
let _realDataBackup=null;
let txnFilter='vse';
let activeTagFilter=null;
let currentTags=[];
let editingTxn=-1,editingAcc=-1,editingInv=-1,editingBud=-1,editingGoal=-1,editingWish=-1;
let recurringMode=false;
let balanceHistory=[],invHistory=[];
let chartBalance=null,chartAcc=null,chartInv=null,chartCategories=null,chartIncome=null,chartTrend=null;
let activePeriod='mesic', periodFrom=null, periodTo=null, periodOffset=0;
let dashPeriod='mesic', accPeriod='mesic', invPeriod='mesic';

const RATES={CZK:1,EUR:25,USD:23};
const toCZK=(amount,cur)=>amount*(RATES[cur]||1);

// Aktualizace kurzů (Frankfurter API — CORS ok, free, bez klíče)
let _ratesFetched=false;
async function fetchLiveRates(){
  if(_ratesFetched) return;
  const cacheKey='fx_rates_'+today();
  const cached=localStorage.getItem(cacheKey);
  if(cached){
    try{const r=JSON.parse(cached);RATES.EUR=r.EUR;RATES.USD=r.USD;eurCzkRate=RATES.EUR;_ratesFetched=true;return;}catch(e){}
  }
  try{
    const r=await fetch('https://api.frankfurter.app/latest?from=CZK&to=EUR,USD',{signal:AbortSignal.timeout(6000)});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(d.rates?.EUR) RATES.EUR=+(1/d.rates.EUR).toFixed(4);
    if(d.rates?.USD) RATES.USD=+(1/d.rates.USD).toFixed(4);
    eurCzkRate=RATES.EUR;
    localStorage.setItem(cacheKey,JSON.stringify({EUR:RATES.EUR,USD:RATES.USD}));
    _ratesFetched=true;
    console.log('Kurzy aktualizovány: EUR='+RATES.EUR.toFixed(3)+', USD='+RATES.USD.toFixed(3));
  }catch(e){
    console.warn('Nepodařilo se načíst kurzy, použity fallback hodnoty.',e.message);
  }
}
function demoNum(n){ return n; }
const fmt=(n,cur='CZK')=>{
  if(cur==='EUR') return n.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  if(cur==='USD') return n.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' $';
  return n.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kč';
};
function toggleDemoMode(){
  if(!demoMode){
    // Zapnout demo: záloha reálných dat a načtení demo profilu
    _realDataBackup=buildExportPayload();
    applyImport(JSON.parse(JSON.stringify(DEMO_DATA)));
    demoMode=true;
  } else {
    // Vypnout demo: obnovení reálných dat
    if(_realDataBackup) applyImport(_realDataBackup);
    _realDataBackup=null;
    demoMode=false;
  }
  localStorage.setItem('kasicka_demo',demoMode?'1':'');
  document.documentElement.dataset.demo=demoMode?'true':'';
  const cb1=document.getElementById('demo-toggle');
  const cb2=document.getElementById('mobile-demo-toggle');
  if(cb1) cb1.checked=demoMode;
  if(cb2) cb2.checked=demoMode;
  if(typeof initCategories==='function') initCategories();
  if(typeof refreshCatSelect==='function') refreshCatSelect();
  if(typeof refreshTxnFilters==='function') refreshTxnFilters();
  markDirty();
}
const today=()=>new Date().toISOString().split('T')[0];

// CSS proměnné pro Chart.js (neumí var() přímo)
function cssVar(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim();}
function cssVarAlpha(name,alpha){const hex=cssVar(name);const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${alpha})`;}

// Bezpečné escapování uživatelských dat proti XSS
const escHtml=(s)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escAttr=(s)=>escHtml(s).replace(/'/g,'&#39;');
const nowLabel=()=>{const d=new Date();return d.toLocaleDateString('cs-CZ',{month:'long',year:'numeric'});};

const DEFAULT_CATS=[
  {name:'JÍDLO',color:'#fbbf24',icon:'🍽️'},
  {name:'BYDLENÍ',color:'#4f8ef7',icon:'🏠'},
  {name:'DOPRAVA',color:'#4f8ef7',icon:'🚗'},
  {name:'ZÁBAVA',color:'#a78bfa',icon:'🎬'},
  {name:'ZDRAVÍ',color:'#34d399',icon:'❤️'},
  {name:'OBLEČENÍ',color:'#a78bfa',icon:'👕'},
  {name:'SPOŘENÍ',color:'#34d399',icon:'💰'},
  {name:'INVESTICE',color:'#4f8ef7',icon:'📈'},
  {name:'MZDA',color:'#34d399',icon:'💼'},
  {name:'OSTATNÍ',color:'#8b92a8',icon:'📦'},
];
const CAT_COLORS=['#4f8ef7','#34d399','#f87171','#fbbf24','#a78bfa','#2dd4bf','#f472b6','#fb923c','#8b92a8'];
const CAT_ICONS=['🍽️','🏠','🚗','🎬','❤️','👕','💰','💼','📦','✈️','🎓','🐾','🛒','💊','🎁','🏋️','📱','🔧','🍺','☕'];

let editingCat=-1, selectedCatColor=CAT_COLORS[0], selectedCatIcon=CAT_ICONS[0];

let myProfile=null, friendsList=[], sharedGroupsList=[], viewingSharedGroup=null, sgTxns=[], sgMembers=[], sgTabFilter='all', sgPeriodFilter='all', sgCatFilter='vse';
const PROFILE_AVATARS=['👤','👩','👨','👧','👦','🧑','👵','👴','🐱','🐶','🏠','💼','🎭','⭐','🌈'];
let selectedAvatar=PROFILE_AVATARS[0];

const GRP_COLORS=['#a78bfa','#4f8ef7','#34d399','#fbbf24','#f87171','#2dd4bf','#fb923c','#f472b6'];
let selectedGrpColor=GRP_COLORS[0], editingInvGroup=-1;

let invMode='auto'; // 'auto' | 'manual'

let currentBudTrackMode='cats', selectedBudTags=[], currentBudFlowMode='vydaj';

const BUD_COLORS=['#4f8ef7','#34d399','#f87171','#fbbf24','#a78bfa','#2dd4bf','#f472b6','#fb923c','#8b92a8'];
let currentBudType='periodic', selectedBudColor='#4f8ef7', selectedBudCats=[];

let dashOffset=0;
const TXN_PAGE_SIZE=50;
let txnShownCount=50;

let accOffset=0, invOffset=0;
let accChartFilter=new Set(), invChartFilter=new Set();
let invGroupChartFilter=null; // null = všechny skupiny, číslo = index skupiny
let inflationCache=null;

const catBadgeColors={'#4f8ef7':'badge-blue','#34d399':'badge-green','#f87171':'badge-red','#fbbf24':'badge-amber','#a78bfa':'badge-purple','#2dd4bf':'badge-teal','#f472b6':'badge-purple','#fb923c':'badge-amber','#8b92a8':'badge-blue'};

const accIcons={bank:'🏦',savings:'💰',cash:'💵',card:'💳'};
const accTypeLabels={bank:'Běžný',savings:'Spořicí',cash:'Hotovost',card:'Karta'};

let _dragAccIdx=null;

let editingInvUpdate=-1;

// Inflace ČR — roční průměrná míra CPI (ČSÚ data, aktualizuj ručně nebo přes API)
const INFLATION_CZ={
  '1994':10.0,'1995':9.1,'1996':8.8,'1997':8.5,'1998':10.7,'1999':2.1,
  '2000':3.9,'2001':4.7,'2002':1.8,'2003':0.1,'2004':2.8,'2005':1.9,
  '2006':2.5,'2007':2.8,'2008':6.3,'2009':1.0,'2010':1.5,'2011':1.9,
  '2012':3.3,'2013':1.4,'2014':0.4,'2015':0.3,'2016':0.7,'2017':2.5,
  '2018':2.1,'2019':2.8,'2020':3.2,'2021':3.8,'2022':15.1,'2023':10.7,
  '2024':2.4,'2025':2.8,'2026':2.5
};

let eurCzkRate=25; // fallback

// Twelve Data API — klíč přesunut na server (Supabase Edge proxy)

// ── Supabase ───────────────────────────────────────────────
const SUPA_URL='https://bjjpaympgilbkzmhmdcy.supabase.co';
const SUPA_KEY='sb_publishable_yJSg_MYaAnCOcryppSYP1A_UAkXxQOX';
const supa=supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser=null;
let authMode='login';
let saveTimer=null;

// ── Dirty-flag systém pro výkon ─────────────────────────
// Místo kaskády renderTxns();renderAccounts();renderDashboard();renderInvestments();
// se označí co je "dirty" a renderuje se jen viditelná sekce.
const _dirty={dashboard:false,transactions:false,accounts:false,investments:false,budget:false,categories:false,links:false,'links-group':false,goals:false};
let _activeSection='dashboard';
let _renderRAF=null;

function markDirty(...sections){
  if(!sections.length) sections=['dashboard','transactions','accounts','investments','budget'];
  sections.forEach(s=>{if(s in _dirty) _dirty[s]=true;});
  // Naplánovat render viditelné sekce v dalším frame
  if(!_renderRAF){
    _renderRAF=requestAnimationFrame(()=>{
      _renderRAF=null;
      _renderVisible();
    });
  }
}

function _renderVisible(){
  const s=_activeSection;
  if(!_dirty[s]) return;
  _dirty[s]=false;
  if(s==='dashboard') renderDashboard();
  else if(s==='transactions'){refreshTxnFilters();renderTxns();}
  else if(s==='accounts'){renderAccounts();renderAccChartFilter();renderAccChart();}
  else if(s==='investments'){renderInvestments();renderInvChartFilter();renderInvChart();}
  else if(s==='budget') renderBudget();
  else if(s==='categories' && typeof renderCategories==='function') renderCategories();
  else if(s==='links' && typeof renderLinks==='function') renderLinks();
  else if(s==='links-group' && typeof renderSharedGroupDetail==='function') renderSharedGroupDetail();
  else if(s==='goals' && typeof renderGoalsSection==='function') renderGoalsSection();
}

// ── Sdílený výpočet rozpočtu (budget.js + dashboard.js) ────
function calcBudgetSpent(b, range){
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

// ── Loading indikátor ──────────────────────────────────────
function showLoading(msg){
  msg=msg||'Načítání...';
  let el=document.getElementById('global-loading');
  if(!el){
    el=document.createElement('div');
    el.id='global-loading';
    el.style.cssText='position:fixed;inset:0;background:var(--scrim);display:flex;align-items:center;justify-content:center;z-index:300;';
    el.innerHTML='<div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;padding:24px 36px;text-align:center;"><div class="loading-spinner"></div><div style="margin-top:12px;font-size:13px;color:var(--text-secondary)"></div></div>';
    document.body.appendChild(el);
  }
  el.querySelector('div > div:last-child').textContent=msg;
  el.style.display='flex';
}
function hideLoading(){
  const el=document.getElementById('global-loading');
  if(el) el.style.display='none';
}
