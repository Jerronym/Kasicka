// Kasička — autentizace a inicializace
// Flag: jsme v recovery toku (reset hesla z emailu) — blokuje showApp()
let recoveryMode = window.location.hash.includes('type=recovery');
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
  const redirectTo=window.location.origin+window.location.pathname;
  await supa.auth.resetPasswordForEmail(email,{redirectTo});
  showAuthSuccess('Email pro reset hesla byl odeslán.');
}

function showRecoveryUI(){
  recoveryMode=true;
  // Vyčisti recovery hash z URL, aby reload znovu netriggeroval recovery
  history.replaceState(null,'',window.location.pathname);
  // Zobraz auth-screen, skryj hlavní app
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
  // Přepni auth-box do recovery režimu
  document.getElementById('auth-login-ui').style.display='none';
  document.getElementById('auth-recovery').style.display='block';
  document.getElementById('auth-error').style.display='none';
  document.getElementById('auth-success').style.display='none';
}

async function authUpdatePassword(){
  const pass=document.getElementById('auth-new-pass').value;
  const pass2=document.getElementById('auth-new-pass2').value;
  if(!pass||!pass2){showAuthError('Vyplň obě pole.');return;}
  if(pass!==pass2){showAuthError('Hesla se neshodují.');return;}
  if(pass.length<6){showAuthError('Heslo musí mít alespoň 6 znaků.');return;}
  const btn=document.getElementById('auth-update-btn');
  btn.disabled=true; btn.textContent='Ukládám...';
  const {error}=await supa.auth.updateUser({password:pass});
  if(error){
    showAuthError(error.message);
    btn.disabled=false; btn.textContent='Nastavit nové heslo';
    return;
  }
  showAuthSuccess('Heslo bylo změněno. Přihlas se.');
  recoveryMode=false;
  await supa.auth.signOut();
  // Návrat na login
  document.getElementById('auth-recovery').style.display='none';
  document.getElementById('auth-login-ui').style.display='block';
  switchAuthTab('login');
  btn.disabled=false; btn.textContent='Nastavit nové heslo';
}

async function authSignOut(){
  await supa.auth.signOut();
}

async function loadFromCloud(){
  if(!currentUser) return;
  let data=null, error=null;
  try{
    const res=await supa.from('user_data').select('data,updated_at').eq('user_id',currentUser.id).single();
    data=res.data; error=res.error;
  }catch(e){ error=e; }
  const netFailed = !!(error && error.code!=='PGRST116'); // PGRST116 = nový uživatel (0 řádků)
  if(netFailed){
    console.warn('loadFromCloud: cloud nedostupný, používám lokální data:', error.message||error.code||error);
    if(typeof toast==='function') toast('Cloud nedostupný — pracuji s lokálními daty.','warn');
  }
  // Konflikt-bezpečné načtení: nesynchronizované offline změny nesmí stale cloud přepsat.
  const cloudData=data?.data||null;
  const cloudTime=data?.updated_at||null;
  let localSnap=null;
  try{ const raw=localStorage.getItem(LS_KEY+'_'+currentUser.id); if(raw) localSnap=JSON.parse(raw); }catch(e){}
  if(netFailed){
    // Offline — použij lokální per-user snapshot; pending flag necháme pro pozdější resync.
    applyImport(localSnap||{});
  } else if(hasPendingSync() && localSnap){
    const localTime=localSnap._exported||null;
    if(!cloudTime || (localTime && localTime>cloudTime)){
      // Offline změny jsou novější (nebo cloud prázdný) — použij lokální a nahraj nahoru.
      applyImport(localSnap);
      _lastCloudSave=cloudTime;
      saveToCloud().then(ok=>{ if(ok) toast('Offline změny synchronizovány','success'); });
    } else {
      // Cloud byl mezitím změněn z jiného zařízení → konflikt, zeptej se.
      const useLocal=await confirmDialog('Máš offline změny, které nejsou v cloudu, ale cloud byl mezitím změněn z jiného zařízení.\n\nAno = použít offline změny (přepíše cloud).\nNe = načíst cloud (offline změny se zahodí).');
      if(useLocal){
        applyImport(localSnap);
        _lastCloudSave=cloudTime;
        saveToCloud().then(ok=>{ if(ok) toast('Offline změny synchronizovány','success'); });
      } else {
        applyImport(cloudData||{});
        _lastCloudSave=cloudTime;
        clearPendingSync();
      }
    }
  } else if(cloudData){
    applyImport(cloudData);
    _lastCloudSave=cloudTime;
    clearPendingSync();
  } else {
    // Nový uživatel — začni s prázdnými daty
    applyImport({});
    clearPendingSync();
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
  // Pokud je demo mód aktivní, záloha reálných dat a načtení demo profilu
  if(demoMode){
    _realDataBackup=buildExportPayload();
    applyImport(JSON.parse(JSON.stringify(DEMO_DATA)));
  }
  markDirty();
  // Aktualizovat směnné kurzy z ČNB
  fetchLiveRates();
  // Načti sdílená data na pozadí — neblokuje loader
  loadSharedData();
}

let _lastCloudSave=null; // timestamp posledního uložení do cloudu

// ── Pending sync flag (offline → online) ───────────────────
// Nastaven když máme lokální změny ještě nenahrané do cloudu (offline zápis).
// Persistuje v localStorage, takže přežije reload i pád appky bez signálu.
function PENDING_KEY(){ return 'kasicka_pending_'+(currentUser?currentUser.id:'anon'); }
function setPendingSync(){ try{localStorage.setItem(PENDING_KEY(),'1');}catch(e){} }
function clearPendingSync(){ try{localStorage.removeItem(PENDING_KEY());}catch(e){} }
function hasPendingSync(){ try{return localStorage.getItem(PENDING_KEY())==='1';}catch(e){return false;} }

// Vrací true při úspěšném uložení do cloudu, false při selhání (offline) nebo
// přeskočení konfliktu. Při false zůstává pending flag nastavený → dosynchronizuje
// se přes 'online' listener nebo příští debounce.
async function saveToCloud(){
  if(!currentUser) return true;
  if(demoMode) return true;
  // Detekce konfliktu: zkontroluj, zda jiné zařízení neuložilo novější data
  if(_lastCloudSave){
    try{
      const {data:row}=await supa.from('user_data').select('updated_at').eq('user_id',currentUser.id).single();
      if(row&&row.updated_at&&row.updated_at>_lastCloudSave){
        const ok=await confirmDialog('Data v cloudu byla změněna z jiného zařízení.\nPřepsat cloudová data lokálními?');
        if(!ok){
          toast('Uložení do cloudu přeskočeno. Načti znovu pro synchronizaci.','warn');
          return false;
        }
      }
    }catch(e){/* pokud kontrola selže (offline?), pokračuj v uložení */}
  }
  const payload=buildExportPayload();
  const now=new Date().toISOString();
  try{
    const {error}=await supa.from('user_data').upsert({
      user_id:currentUser.id,
      data:payload,
      updated_at:now
    },{onConflict:'user_id'});
    if(error) throw error;
  }catch(e){
    // Offline / síťová chyba — pending flag necháme nastavený pro pozdější resync.
    console.warn('saveToCloud selhalo (offline?):',e.message||e);
    return false;
  }
  _lastCloudSave=now;
  clearPendingSync();
  return true;
}

function showApp(user){
  // Re-entrancy guard: token refresh fires onAuthStateChange again — skip full reload
  const alreadyLoaded=currentUser&&currentUser.id===user.id;
  currentUser=user;
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('main-app').style.display='flex';
  const emailEl=document.getElementById('user-email');
  const userInfoEl=document.getElementById('user-info');
  if(emailEl) emailEl.textContent=user.email;
  if(userInfoEl) userInfoEl.style.display='flex';
  if(typeof updateMobileUserInfo==='function') updateMobileUserInfo();
  demoMode=localStorage.getItem('kasicka_demo')==='1';
  privacyMode=localStorage.getItem('kasicka_privacy')==='1';
  if(typeof applyPrivacyMode==='function') applyPrivacyMode();
  const cb1=document.getElementById('demo-toggle');
  const cb2=document.getElementById('mobile-demo-toggle');
  if(cb1) cb1.checked=demoMode;
  if(cb2) cb2.checked=demoMode;
  if(alreadyLoaded) return; // token refresh — nezačínat znovu načítání
  showLoading('Načítání dat...');
  // Safety net: loader se skryje nejpozději za 15 s i při selhání síťového volání
  const _loadTimeout=setTimeout(hideLoading,15000);
  loadFromCloud().finally(()=>{clearTimeout(_loadTimeout);hideLoading();});
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
  if(demoMode) return;
  // Uložit lokálně (per uživatel)
  const lsKey=currentUser?LS_KEY+'_'+currentUser.id:LS_KEY;
  try{localStorage.setItem(lsKey,JSON.stringify(buildExportPayload()));}catch(e){console.warn('Chyba při ukládání do localStorage (auth):',e.message);}
  // Lokální změna ještě není v cloudu — označ jako pending (resync po připojení).
  if(currentUser) setPendingSync();
  if(syncFileHandle) writeSyncFile();
  // Uložit do cloudu (debounce 1.5s)
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    if(currentUser){
      const ok=await saveToCloud();
      const ind=document.getElementById('save-indicator');
      ind.textContent=ok?'✓ Uloženo':'⏳ Čeká na připojení';
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
// POZOR: nevolat supa.from() přímo v callbacku — supabase-js v2 drží auth lock
// během callbacku a vnořené volání by deadlockovalo. setTimeout(0) lock uvolní.
supa.auth.onAuthStateChange((event, session)=>{
  if(event==='PASSWORD_RECOVERY'){
    // Reset link z emailu — zobraz formulář pro nové heslo, nenačítej data
    setTimeout(showRecoveryUI,0);
    return;
  }
  if(session?.user && !recoveryMode){
    setTimeout(()=>showApp(session.user),0);
  } else if(!session?.user && !recoveryMode){
    setTimeout(hideApp,0);
  }
  // recoveryMode=true: ignoruj SIGNED_IN/INITIAL_SESSION — formulář pro nové heslo zůstane
});

// Zkusit obnovit session
supa.auth.getSession().then(({data:{session}})=>{
  if(recoveryMode){
    // URL hash obsahuje recovery token — zobraz formulář ihned (pojistka)
    setTimeout(showRecoveryUI,0);
  } else if(!session){
    hideApp(); // Zobraz přihlašovací obrazovku
  }
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

// ── Auto-resync po obnovení připojení ──────────────────────
// Když se vrátí signál a máme nesynchronizované offline změny, dotlač je do cloudu.
window.addEventListener('online', async ()=>{
  if(currentUser && !demoMode && hasPendingSync()){
    const ok=await saveToCloud();
    if(ok) toast('Synchronizováno','success');
  }
});
window.addEventListener('offline', ()=>{
  const ind=document.getElementById('save-indicator');
  if(ind){
    ind.textContent='⏳ Offline';
    ind.style.display='block';
    clearTimeout(ind._t);
    ind._t=setTimeout(()=>ind.style.display='none',3000);
  }
});
