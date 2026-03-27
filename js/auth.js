// Kasička — autentizace a inicializace
function switchAuthTab(mode){
  authMode=mode;
  document.getElementById('tab-login').classList.toggle('active', mode==='login');
  document.getElementById('tab-register').classList.toggle('active', mode==='register');
  document.getElementById('auth-btn').textContent=mode==='login'?'Přihlásit se':'Zaregistrovat se';
  document.getElementById('auth-pass2-wrap').style.display=mode==='register'?'block':'none';
  document.getElementById('auth-forgot').style.display=mode==='login'?'block':'none';
  document.getElementById('auth-error').style.display='none';
  document.getElementById('auth-success').style.display='none';
}

function showAuthError(msg){
  const el=document.getElementById('auth-error');
  el.textContent=msg; el.style.display='block';
  document.getElementById('auth-success').style.display='none';
}
function showAuthSuccess(msg){
  const el=document.getElementById('auth-success');
  el.textContent=msg; el.style.display='block';
  document.getElementById('auth-error').style.display='none';
}

async function authSubmit(){
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value;
  const btn=document.getElementById('auth-btn');
  if(!email||!password){showAuthError('Vyplň email a heslo.');return;}
  btn.disabled=true; btn.textContent='Chvíli strpení...';
  if(authMode==='register'){
    const pass2=document.getElementById('auth-password2').value;
    if(password!==pass2){showAuthError('Hesla se neshodují.');btn.disabled=false;btn.textContent='Zaregistrovat se';return;}
    const {error}=await supa.auth.signUp({email,password});
    if(error){showAuthError(error.message);btn.disabled=false;btn.textContent='Zaregistrovat se';return;}
    showAuthSuccess('Registrace proběhla! Zkontroluj email pro potvrzení.');
    btn.disabled=false; btn.textContent='Zaregistrovat se';
  } else {
    const {data,error}=await supa.auth.signInWithPassword({email,password});
    if(error){showAuthError('Špatný email nebo heslo.');btn.disabled=false;btn.textContent='Přihlásit se';return;}
    // onAuthStateChange se postará o zbytek
  }
}

async function authResetPassword(){
  const email=document.getElementById('auth-email').value.trim();
  if(!email){showAuthError('Zadej nejdřív email.');return;}
  await supa.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  showAuthSuccess('Email pro reset hesla byl odeslán.');
}

async function authSignOut(){
  await supa.auth.signOut();
}

async function loadFromCloud(){
  if(!currentUser) return;
  const {data,error}=await supa.from('user_data').select('data').eq('user_id',currentUser.id).single();
  if(error&&error.code!=='PGRST116') return; // PGRST116 = no rows
  if(data?.data){
    applyImport(data.data);
  } else {
    // Nový uživatel — začni s čistými daty (nenačítej localStorage jiného uživatele)
    applyImport(DEMO_DATA);
  }
  processRecurringTxns();
  initCategories();
  refreshCatSelect();
  refreshTxnFilters();
  updateDashNavLabel();
  updateChartNavLabel('acc');
  updateChartNavLabel('inv');
  updatePeriodNavLabel();

  const _initNavs=['acc-period-nav','inv-period-nav','period-nav'];
  _initNavs.forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='flex';});
  markDirty();
  // Aktualizovat směnné kurzy z ČNB
  fetchLiveRates();
  // Načti sdílená data (profil, přátelé, skupiny) z Supabase
  await loadSharedData();
}

async function saveToCloud(){
  if(!currentUser) return;
  const payload=buildExportPayload();
  // Upsert — vytvoří nebo aktualizuje
  await supa.from('user_data').upsert({
    user_id:currentUser.id,
    data:payload,
    updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
}

function showApp(user){
  currentUser=user;
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('main-app').style.display='flex';
  const emailEl=document.getElementById('user-email');
  const userInfoEl=document.getElementById('user-info');
  if(emailEl) emailEl.textContent=user.email;
  if(userInfoEl) userInfoEl.style.display='flex';
  if(typeof updateMobileUserInfo==='function') updateMobileUserInfo();
  loadFromCloud();
}

function hideApp(){
  currentUser=null;
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
  const userInfoEl=document.getElementById('user-info');
  if(userInfoEl) userInfoEl.style.display='none';
  if(typeof updateMobileUserInfo==='function') updateMobileUserInfo();
}

// Přepsat saveToStorage aby ukládal i do cloudu
const _origSaveToStorage=saveToStorage;
saveToStorage=function(){
  // Uložit lokálně (per uživatel)
  const lsKey=currentUser?LS_KEY+'_'+currentUser.id:LS_KEY;
  try{localStorage.setItem(lsKey,JSON.stringify(buildExportPayload()));}catch(e){console.warn('Chyba při ukládání do localStorage (auth):',e.message);}
  if(syncFileHandle) writeSyncFile();
  // Uložit do cloudu (debounce 2s)
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    if(currentUser){
      await saveToCloud();
      const ind=document.getElementById('save-indicator');
      ind.textContent='✓ Uloženo';
      ind.style.display='block';
      clearTimeout(ind._t);
      ind._t=setTimeout(()=>ind.style.display='none',2000);
    } else {
      const ind=document.getElementById('save-indicator');
      ind.textContent='✓ Uloženo lokálně';
      ind.style.display='block';
      clearTimeout(ind._t);
      ind._t=setTimeout(()=>ind.style.display='none',2000);
    }
  }, 1500);
};

// Spustit auth listener
supa.auth.onAuthStateChange((event, session)=>{
  if(session?.user){
    showApp(session.user);
  } else {
    hideApp();
  }
});

// Zkusit obnovit session
supa.auth.getSession().then(({data:{session}})=>{
  if(!session) hideApp(); // Zobraz přihlašovací obrazovku
});

// ── Init ──────────────────────────────────────────────────
// Inicializace proběhne po přihlášení v loadFromCloud()
// Lokální fallback pokud není internet
if(!navigator.onLine){
  loadFromStorage();
  processRecurringTxns();
  initCategories();
  refreshCatSelect();
  refreshTxnFilters();
  updateDashNavLabel();
  updateChartNavLabel('acc');
  updateChartNavLabel('inv');
  updatePeriodNavLabel();

  const _initNavs=['acc-period-nav','inv-period-nav','period-nav'];
  _initNavs.forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='flex';});
  markDirty();
  fetchLiveRates();
}
