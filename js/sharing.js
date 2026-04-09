// Kasička — sdílení, přátelé, skupiny, vyúčtování

// ── Načtení sdílených dat ──────────────────────────────────
async function loadSharedData(){
  if(!currentUser) return;
  await loadMyProfile();
  await loadFriends();
  await loadSharedGroups();
  renderSidebarGroups();
}

async function loadMyProfile(){
  if(!currentUser) return;
  const {data}=await supa.from('user_profiles').select('*').eq('user_id',currentUser.id).single();
  if(data){
    myProfile=data;
    if(data.email!==currentUser.email){
      await supa.from('user_profiles').update({email:currentUser.email}).eq('user_id',currentUser.id);
      myProfile.email=currentUser.email;
    }
  } else {
    myProfile=null;
  }
}

async function loadFriends(){
  if(!currentUser) return;
  const {data}=await supa.from('friendships').select('*').or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);
  const rows=data||[];
  const friendIds=rows.map(r=>r.user1_id===currentUser.id?r.user2_id:r.user1_id);
  let profilesMap={};
  if(friendIds.length){
    const {data:profs}=await supa.from('user_profiles').select('*').in('user_id',friendIds);
    (profs||[]).forEach(p=>profilesMap[p.user_id]=p);
  }
  friendsList=rows.map(r=>{
    const friendId=r.user1_id===currentUser.id?r.user2_id:r.user1_id;
    const isSender=r.user1_id===currentUser.id;
    return {id:r.id, friendId, status:r.status, isSender, profile:profilesMap[friendId]||null};
  });
}

async function loadSharedGroups(){
  if(!currentUser) return;
  const {data}=await supa.from('shared_groups').select('*, shared_group_members(user_id)');
  sharedGroupsList=(data||[]).map(g=>({
    ...g,
    memberIds:(g.shared_group_members||[]).map(m=>m.user_id)
  }));
}

// ── Můj profil ─────────────────────────────────────────────
function openMyProfileModal(){
  document.getElementById('mp-name').value=myProfile?myProfile.display_name:'';
  selectedAvatar=myProfile?myProfile.avatar:PROFILE_AVATARS[0];
  renderAvatarPicker();
  openModal('myprofile');
}

function renderAvatarPicker(){
  document.getElementById('mp-icon-picker').innerHTML=PROFILE_AVATARS.map(ic=>
    `<span onclick="selectedAvatar='${ic}';renderAvatarPicker()" style="font-size:22px;cursor:pointer;padding:4px 6px;border-radius:8px;border:2px solid ${ic===selectedAvatar?'var(--accent)':'transparent'};background:${ic===selectedAvatar?'var(--accent-dim)':'transparent'}">${ic}</span>`
  ).join('');
}

async function saveMyProfile(){
  const name=document.getElementById('mp-name').value.trim();
  if(!name||!currentUser) return;
  const email=currentUser.email||'';
  if(myProfile){
    await supa.from('user_profiles').update({display_name:name, avatar:selectedAvatar, email}).eq('user_id',currentUser.id);
    myProfile={...myProfile,display_name:name,avatar:selectedAvatar,email};
  } else {
    const row={user_id:currentUser.id, display_name:name, avatar:selectedAvatar, email};
    const {data}=await supa.from('user_profiles').insert(row).select().single();
    myProfile=data;
  }
  closeModal('myprofile');
  toast('Profil uložen','success');
  renderLinks();
}

// ── Přátelé ────────────────────────────────────────────────
function openAddFriendModal(){
  document.getElementById('af-email').value='';
  const st=document.getElementById('af-status');
  st.style.display='none';
  openModal('addfriend');
}

async function sendFriendRequest(){
  const email=document.getElementById('af-email').value.trim();
  const st=document.getElementById('af-status');
  if(!email||!currentUser){st.textContent='Zadej email.';st.style.color='var(--red)';st.style.display='block';return;}

  const {data:found}=await supa.from('user_profiles').select('user_id').eq('email',email).single();
  if(!found){
    st.textContent='Uživatel s tímto emailem nebyl nalezen. Musí se nejdřív zaregistrovat a nastavit profil.';
    st.style.color='var(--red)';st.style.display='block';return;
  }
  if(found.user_id===currentUser.id){
    st.textContent='Nemůžeš přidat sám sebe.';
    st.style.color='var(--red)';st.style.display='block';return;
  }

  const {data:existing}=await supa.from('friendships').select('id')
    .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${found.user_id}),and(user1_id.eq.${found.user_id},user2_id.eq.${currentUser.id})`);
  if(existing&&existing.length>0){
    st.textContent='Žádost o přátelství již existuje.';
    st.style.color='var(--amber)';st.style.display='block';return;
  }

  const {error}=await supa.from('friendships').insert({user1_id:currentUser.id, user2_id:found.user_id});
  if(error){
    st.textContent='Chyba: '+error.message;
    st.style.color='var(--red)';st.style.display='block';return;
  }
  st.textContent='Žádost o přátelství odeslána!';
  st.style.color='var(--green)';st.style.display='block';
  await loadFriends();
  renderLinks();
}

async function acceptFriendship(id){
  await supa.from('friendships').update({status:'accepted'}).eq('id',id);
  toast('Přátelství potvrzeno','success');
  await loadFriends();
  renderLinks();
}

async function removeFriendship(id){
  if(!confirm('Opravdu odebrat toto přátelství?')) return;
  await supa.from('friendships').delete().eq('id',id);
  toast('Přátelství odebráno','info');
  await loadFriends();
  renderLinks();
}

// ── Sdílené skupiny ────────────────────────────────────────
function openCreateGroupModal(){
  document.getElementById('cg-name').value='';
  document.getElementById('cg-title').textContent='Nová sdílená skupina';
  _editingGroupId=null;
  _renderGroupFriendsPicker();
  openModal('creategroup');
}

let _editingGroupId=null;

function _renderGroupFriendsPicker(selectedIds=null){
  const picker=document.getElementById('cg-friends-picker');
  const accepted=friendsList.filter(f=>f.status==='accepted');
  picker.innerHTML=accepted.length?accepted.map(f=>{
    const name=f.profile?f.profile.avatar+' '+escHtml(f.profile.display_name):f.friendId.slice(0,8);
    const checked=selectedIds?selectedIds.includes(f.friendId):true;
    return`<label style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;background:var(--accent-dim);border:1px solid var(--card-border);cursor:pointer;font-size:12px;">
      <input type="checkbox" value="${f.friendId}" ${checked?'checked':''} style="width:14px;height:14px;">${name}
    </label>`;
  }).join(''):'<span style="font-size:12px;color:var(--text-secondary)">Nejdříve přidej přátele</span>';
}

function openEditGroupModal(groupId){
  const g=sharedGroupsList.find(gr=>gr.id===groupId);
  if(!g) return;
  _editingGroupId=groupId;
  document.getElementById('cg-name').value=g.name;
  document.getElementById('cg-title').textContent='Upravit skupinu';
  // Vybrané: členové kromě sebe
  const otherMembers=g.memberIds.filter(uid=>uid!==currentUser?.id);
  _renderGroupFriendsPicker(otherMembers);
  openModal('creategroup');
}

async function saveSharedGroup(){
  const name=document.getElementById('cg-name').value.trim();
  if(!name){toast('Zadej název skupiny','warn');return;}
  if(!currentUser){toast('Nejsi přihlášen','warn');return;}
  const selectedFriends=[...document.querySelectorAll('#cg-friends-picker input:checked')].map(cb=>cb.value);

  if(_editingGroupId){
    // Editace existující skupiny — ověření vlastnictví
    const g=sharedGroupsList.find(gr=>gr.id===_editingGroupId);
    if(g&&g.created_by!==currentUser?.id){toast('Nemáš oprávnění upravit tuto skupinu.','warn');return;}
    const {error}=await supa.from('shared_groups').update({name}).eq('id',_editingGroupId);
    if(error){toast('Chyba při úpravě skupiny: '+error.message,'error');return;}

    // Synchronizace členů — zjisti rozdíl
    const currentMembers=(g?.memberIds||[]).filter(uid=>uid!==currentUser.id);
    const toAdd=selectedFriends.filter(uid=>!currentMembers.includes(uid));
    const toRemove=currentMembers.filter(uid=>!selectedFriends.includes(uid));

    for(const uid of toAdd){
      await supa.from('shared_group_members').insert({group_id:_editingGroupId, user_id:uid});
    }
    for(const uid of toRemove){
      await supa.from('shared_group_members').delete().eq('group_id',_editingGroupId).eq('user_id',uid);
    }

    toast('Skupina upravena','success');
  } else {
    // Nová skupina
    const {data:group,error}=await supa.from('shared_groups').insert({name, created_by:currentUser.id}).select().single();
    if(error){toast('Chyba při vytváření skupiny: '+error.message,'error');return;}
    if(!group){toast('Skupina se nevytvořila','error');return;}

    const members=[currentUser.id,...selectedFriends].map(uid=>({group_id:group.id, user_id:uid}));
    const {error:memErr}=await supa.from('shared_group_members').insert(members);
    if(memErr){toast('Skupina vytvořena, ale chyba při přidávání členů: '+memErr.message,'warn');}
    else toast('Skupina vytvořena','success');
  }

  _editingGroupId=null;
  closeModal('creategroup');
  await loadSharedGroups();
  renderSidebarGroups();
  renderLinks();
}

async function deleteSharedGroup(groupId){
  const g=sharedGroupsList.find(gr=>gr.id===groupId);
  if(g&&g.created_by!==currentUser?.id){toast('Nemáš oprávnění smazat tuto skupinu.','warn');return;}
  if(!confirm('Opravdu smazat tuto skupinu? Všechny sdílené transakce budou smazány.')) return;
  await supa.from('shared_groups').delete().eq('id',groupId);
  viewingSharedGroup=null;
  toast('Skupina smazána','info');
  await loadSharedGroups();
  renderSidebarGroups();
  showSection('links');
}

async function leaveSharedGroup(groupId){
  if(!confirm('Opravdu chceš opustit tuto skupinu?')) return;
  await supa.from('shared_group_members').delete().eq('group_id',groupId).eq('user_id',currentUser.id);
  viewingSharedGroup=null;
  toast('Opustil jsi skupinu','info');
  await loadSharedGroups();
  renderSidebarGroups();
  showSection('links');
}

// ── Detail sdílené skupiny ─────────────────────────────────
async function openSharedGroupPage(groupId){
  viewingSharedGroup=groupId;
  sgTabFilter='all';
  sgPeriodFilter='all';
  sgCatFilter='vse';
  showLoading('Načítání skupiny...');
  try{await loadSharedGroupDetail();}finally{hideLoading();}
  showSection('links-group');
}

async function loadSharedGroupDetail(){
  if(!viewingSharedGroup) return;
  const {data:members}=await supa.from('shared_group_members').select('user_id').eq('group_id',viewingSharedGroup);
  const memberIds=(members||[]).map(m=>m.user_id);
  const {data:profs}=await supa.from('user_profiles').select('*').in('user_id',memberIds);
  sgMembers=memberIds.map(uid=>{
    const p=(profs||[]).find(pr=>pr.user_id===uid);
    return {user_id:uid, name:p?p.display_name:'?', avatar:p?p.avatar:'👤'};
  });
  const {data:txns}=await supa.from('shared_transactions').select('*').eq('group_id',viewingSharedGroup).order('date',{ascending:false});
  sgTxns=txns||[];
}

function closeSharedGroupDetail(){
  viewingSharedGroup=null;
  showSection('links');
}

function switchSgTab(userId,ev){
  sgTabFilter=userId;
  document.querySelectorAll('#sg-detail-tabs .tab').forEach(t=>t.classList.remove('active'));
  ev.target.classList.add('active');
  renderSharedGroupDetail();
}

// ── Filtry detailu skupiny ─────────────────────────────────
function getSgDateRange(){
  const now=new Date();
  if(sgPeriodFilter==='all') return null;
  if(sgPeriodFilter==='vlastni'){
    const f=document.getElementById('sg-from')?.value;
    const t=document.getElementById('sg-to')?.value;
    if(!f||!t) return null;
    return {from:new Date(f+'T00:00:00'),to:new Date(t+'T23:59:59')};
  }
  const from=new Date(now);
  if(sgPeriodFilter==='tyden'){const day=(now.getDay()||7);from.setDate(now.getDate()-day+1);from.setHours(0,0,0,0);}
  else if(sgPeriodFilter==='mesic'){from.setDate(1);from.setHours(0,0,0,0);}
  else if(sgPeriodFilter==='rok'){from.setMonth(0,1);from.setHours(0,0,0,0);}
  const to=new Date(now);to.setHours(23,59,59,999);
  return {from,to};
}
function setSgPeriod(p,btn){
  sgPeriodFilter=p;
  document.querySelectorAll('#sg-p-all,#sg-p-week,#sg-p-month,#sg-p-year,#sg-p-custom').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const wrap=document.getElementById('sg-custom-wrap');
  if(wrap) wrap.style.display=p==='vlastni'?'flex':'none';
  renderSharedGroupDetail();
}
function setSgCatFilter(val){
  sgCatFilter=val;
  renderSharedGroupDetail();
}

// ── Vyúčtování (kdo komu dluží) ───────────────────────────
function calculateSettlement(txnList=sgTxns){
  if(!sgMembers.length||!txnList.length) return [];
  const n=sgMembers.length;
  const total=txnList.reduce((s,t)=>s+toCZK(Number(t.amount),t.currency),0);
  const perPerson=total/n;

  // Kolik kdo zaplatil
  const paid={};
  sgMembers.forEach(m=>paid[m.user_id]=0);
  txnList.forEach(t=>{paid[t.user_id]=(paid[t.user_id]||0)+toCZK(Number(t.amount),t.currency);});

  // Bilance: kladná = přeplatil (ostatní mu dluží), záporná = dluží
  const balances=sgMembers.map(m=>({
    user_id:m.user_id, name:m.name, avatar:m.avatar,
    paid:paid[m.user_id], balance:paid[m.user_id]-perPerson
  }));

  // Minimální převody — greedy algoritmus
  const debtors=balances.filter(b=>b.balance<-0.5).map(b=>({...b,owe:-b.balance})).sort((a,b)=>b.owe-a.owe);
  const creditors=balances.filter(b=>b.balance>0.5).map(b=>({...b,owed:b.balance})).sort((a,b)=>b.owed-a.owed);

  const transfers=[];
  let di=0, ci=0;
  while(di<debtors.length&&ci<creditors.length){
    const amount=Math.min(debtors[di].owe, creditors[ci].owed);
    if(amount>0.5){
      transfers.push({
        from:debtors[di], to:creditors[ci],
        amount:Math.round(amount*100)/100
      });
    }
    debtors[di].owe-=amount;
    creditors[ci].owed-=amount;
    if(debtors[di].owe<0.5) di++;
    if(creditors[ci].owed<0.5) ci++;
  }

  return {balances, transfers, total, perPerson};
}

// ── Sdílená transakce ──────────────────────────────────────
let _editingSharedTxnId=null;

function openAddSharedTxnModal(){
  _editingSharedTxnId=null;
  document.getElementById('st-modal-title').textContent='Nový sdílený výdaj';
  document.getElementById('st-amount').value='';
  document.getElementById('st-currency').value='CZK';
  document.getElementById('st-category').value='';
  document.getElementById('st-desc').value='';
  document.getElementById('st-date').value=today();
  openModal('sharedtxn');
}

function openEditSharedTxnModal(txnId){
  const t=sgTxns.find(tx=>tx.id===txnId);
  if(!t) return;
  _editingSharedTxnId=txnId;
  document.getElementById('st-modal-title').textContent='Upravit výdaj';
  document.getElementById('st-amount').value=t.amount;
  document.getElementById('st-currency').value=t.currency;
  document.getElementById('st-category').value=t.category;
  document.getElementById('st-desc').value=t.description;
  document.getElementById('st-date').value=t.date;
  openModal('sharedtxn');
}

async function saveSharedTxn(){
  const amount=parseFloat(document.getElementById('st-amount').value);
  const currency=document.getElementById('st-currency').value;
  const category=document.getElementById('st-category').value.trim();
  const description=document.getElementById('st-desc').value.trim();
  const date=document.getElementById('st-date').value;
  if(isNaN(amount)||amount<=0){toast('Zadej platnou částku.','warn');return;}
  if(!date){toast('Zadej datum.','warn');return;}
  if(!viewingSharedGroup||!currentUser) return;

  if(_editingSharedTxnId){
    const existing=sgTxns.find(t=>t.id===_editingSharedTxnId);
    if(existing&&existing.user_id!==currentUser?.id){toast('Můžeš upravit jen své výdaje.','warn');return;}
    const {error}=await supa.from('shared_transactions').update({
      amount, currency, category:category||'Ostatní', description, date
    }).eq('id',_editingSharedTxnId);
    if(error){toast('Chyba při úpravě: '+error.message,'error');return;}
    toast('Výdaj upraven','success');
  } else {
    const {error}=await supa.from('shared_transactions').insert({
      group_id:viewingSharedGroup, user_id:currentUser.id,
      amount, currency, category:category||'Ostatní', description, date
    });
    if(error){toast('Chyba při ukládání: '+error.message,'error');return;}
    toast('Výdaj přidán','success');
  }

  _editingSharedTxnId=null;
  closeModal('sharedtxn');
  await loadSharedGroupDetail();
  renderSharedGroupDetail();
}

async function deleteSharedTxn(txnId){
  const t=sgTxns.find(tx=>tx.id===txnId);
  const g=sharedGroupsList.find(gr=>gr.id===viewingSharedGroup);
  if(t&&t.user_id!==currentUser?.id&&g?.created_by!==currentUser?.id){toast('Nemáš oprávnění smazat tento výdaj.','warn');return;}
  if(!confirm('Opravdu smazat tento sdílený výdaj?')) return;
  await supa.from('shared_transactions').delete().eq('id',txnId);
  await loadSharedGroupDetail();
  renderSharedGroupDetail();
}

// Upsert sdílené transakce do Supabase (vrací ID)
async function syncSharedTxn(existingId, data){
  if(!supa||!currentUser) return null;
  if(existingId){
    await supa.from('shared_transactions').update({amount:data.amount,currency:data.currency,category:data.category,description:data.description,date:data.date,group_id:data.group_id}).eq('id',existingId);
    return existingId;
  } else {
    const {data:row,error}=await supa.from('shared_transactions').insert(data).select('id').single();
    if(error){console.error('syncSharedTxn:',error.message);return null;}
    return row?.id||null;
  }
}

// ── Render záložky Sdílení ─────────────────────────────────
function renderLinks(){
  // Můj profil
  const profCard=document.getElementById('my-profile-card');
  if(myProfile){
    profCard.innerHTML=`<div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:28px">${myProfile.avatar}</span>
      <div><div style="font-size:15px;font-weight:500">${escHtml(myProfile.display_name)}</div>
        <div style="font-size:12px;color:var(--text-secondary)">${currentUser?currentUser.email:''}</div></div>
    </div>`;
  } else {
    profCard.innerHTML=`<div style="color:var(--amber);font-size:13px;padding:4px 0;">Nastav si jméno a avatar kliknutím na "Upravit".</div>`;
  }

  // Přátelé
  const friendsEl=document.getElementById('friends-list');
  const pending=friendsList.filter(f=>f.status==='pending'&&!f.isSender);
  const sent=friendsList.filter(f=>f.status==='pending'&&f.isSender);
  const accepted=friendsList.filter(f=>f.status==='accepted');

  let html='';
  if(pending.length){
    html+=`<div style="font-size:11px;text-transform:uppercase;color:var(--amber);font-weight:600;margin-bottom:6px;padding:0 4px;">Čekající žádosti</div>`;
    html+=pending.map(f=>{
      const name=f.profile?f.profile.avatar+' '+escHtml(f.profile.display_name):'Neznámý uživatel';
      return`<div class="card" style="padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;font-size:13px;">${name}</div>
        <button class="btn btn-sm" onclick="acceptFriendship('${f.id}')">Přijmout</button>
        <button class="btn-del" onclick="removeFriendship('${f.id}')">Odmítnout</button>
      </div>`;
    }).join('');
  }
  if(sent.length){
    html+=`<div style="font-size:11px;text-transform:uppercase;color:var(--text-secondary);font-weight:600;margin:8px 0 6px;padding:0 4px;">Odeslané žádosti</div>`;
    html+=sent.map(f=>{
      const name=f.profile?f.profile.avatar+' '+escHtml(f.profile.display_name):'Čeká na registraci...';
      return`<div class="card" style="padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;font-size:13px;color:var(--text-secondary);">${name} <span style="font-size:11px;">(čeká na potvrzení)</span></div>
        <button class="btn-del" onclick="removeFriendship('${f.id}')">Zrušit</button>
      </div>`;
    }).join('');
  }
  if(accepted.length){
    if(pending.length||sent.length) html+=`<div style="font-size:11px;text-transform:uppercase;color:var(--green);font-weight:600;margin:8px 0 6px;padding:0 4px;">Přátelé</div>`;
    html+=accepted.map(f=>{
      const name=f.profile?f.profile.avatar+' '+escHtml(f.profile.display_name):'Neznámý';
      return`<div class="card" style="padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;font-size:13px;">${name}</div>
        <button class="btn-del" onclick="removeFriendship('${f.id}')">Odebrat</button>
      </div>`;
    }).join('');
  }
  if(!html) html='<div style="color:var(--text-secondary);font-size:13px;padding:8px 4px;">Zatím žádní přátelé. Přidej přítele pomocí emailu.</div>';
  friendsEl.innerHTML=html;

  // Sdílené skupiny
  const groupsEl=document.getElementById('shared-groups-list');
  groupsEl.innerHTML=sharedGroupsList.length
    ?sharedGroupsList.map(g=>{
      const isOwner=g.created_by===currentUser?.id;
      return`<div class="card" style="padding:14px 16px;margin-bottom:8px;cursor:pointer;" onclick="openSharedGroupPage('${g.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:14px;font-weight:600;">${escHtml(g.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;">${g.memberIds.length} členů</div>
          </div>
          <div style="display:flex;gap:6px;" onclick="event.stopPropagation()">
            ${isOwner?`<button class="btn-edit" onclick="openEditGroupModal('${g.id}')">✎</button>`:''}
            ${isOwner
              ?`<button class="btn-del" onclick="deleteSharedGroup('${g.id}')">Smazat</button>`
              :`<button class="btn-del" onclick="leaveSharedGroup('${g.id}')">Opustit</button>`}
          </div>
        </div>
      </div>`;
    }).join('')
    :'<div style="color:var(--text-secondary);font-size:13px;padding:8px 4px;">Žádné sdílené skupiny. Vytvoř skupinu a přidej přátele.</div>';
}

function renderSharedGroupDetail(){
  const g=sharedGroupsList.find(gr=>gr.id===viewingSharedGroup);
  if(!g) return;
  const isOwner=g.created_by===currentUser?.id;
  document.getElementById('sg-detail-title').textContent=g.name;
  document.getElementById('sg-detail-sub').textContent=sgMembers.map(m=>m.avatar+' '+m.name).join(', ');
  const editBtn=document.getElementById('sg-edit-btn');
  if(editBtn) editBtn.style.display=isOwner?'':'none';

  // Taby
  const tabsEl=document.getElementById('sg-detail-tabs');
  tabsEl.innerHTML=`<button class="tab${sgTabFilter==='all'?' active':''}" onclick="switchSgTab('all',event)">Vše</button>`+
    sgMembers.map(m=>`<button class="tab${sgTabFilter===m.user_id?' active':''}" onclick="switchSgTab('${escAttr(m.user_id)}',event)">${m.avatar} ${escHtml(m.name)}</button>`).join('');

  // Filtrované transakce
  let txns=sgTabFilter==='all'?sgTxns:sgTxns.filter(t=>t.user_id===sgTabFilter);

  // Filtr dle období
  const sgRange=getSgDateRange();
  if(sgRange) txns=txns.filter(t=>{const d=new Date(t.date+'T12:00:00');return d>=sgRange.from&&d<=sgRange.to;});

  // Filtr dle kategorie
  if(sgCatFilter!=='vse') txns=txns.filter(t=>t.category===sgCatFilter);

  // Naplnit category select (z nefilt. transakcí skupiny)
  const catSel=document.getElementById('sg-cat-filter');
  if(catSel){
    const cats=[...new Set(sgTxns.map(t=>t.category).filter(Boolean))].sort();
    catSel.innerHTML='<option value="vse">Všechny kategorie</option>'+
      cats.map(c=>`<option value="${escAttr(c)}"${sgCatFilter===c?' selected':''}>${escHtml(c)}</option>`).join('');
  }

  // Souhrn + vyúčtování (reaguje na filtry)
  const settlement=calculateSettlement(txns);
  let summaryHtml='';
  if(settlement.balances){
    const parts=settlement.balances.map(b=>{
      const diff=b.balance;
      const clr=diff>0.5?'var(--green)':diff<-0.5?'var(--red)':'var(--text-secondary)';
      return`<div style="text-align:center;">
        <div style="font-size:12px;color:var(--text-secondary);">${b.avatar} ${escHtml(b.name)}</div>
        <div style="font-size:16px;font-weight:600;">${fmt(b.paid)}</div>
        <div style="font-size:11px;color:${clr};margin-top:2px;">${diff>0.5?'+':diff<-0.5?'':'±'}${fmt(diff)}</div>
      </div>`;
    }).join('');

    let transfersHtml='';
    if(settlement.transfers.length){
      transfersHtml=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--card-border);">
        <div style="font-size:11px;text-transform:uppercase;color:var(--text-secondary);font-weight:600;margin-bottom:8px;">Vyúčtování</div>
        ${settlement.transfers.map(t=>
          `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;">
            <span>${t.from.avatar} ${escHtml(t.from.name)}</span>
            <span style="color:var(--accent);">→</span>
            <span>${t.to.avatar} ${escHtml(t.to.name)}</span>
            <span style="margin-left:auto;font-weight:600;color:var(--accent);">${fmt(t.amount)}</span>
          </div>`
        ).join('')}
      </div>`;
    } else if(txns.length){
      transfersHtml=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--card-border);font-size:12px;color:var(--green);text-align:center;">Vše je vyrovnáno ✓</div>`;
    }

    summaryHtml=`<div class="card" style="padding:14px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">${parts}</div>
      <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-secondary);">
        Celkem: <b>${fmt(settlement.total)}</b> · Na osobu: <b>${fmt(settlement.perPerson)}</b>
      </div>
      ${transfersHtml}
    </div>`;
  }
  document.getElementById('sg-summary').innerHTML=summaryHtml;

  // Transakce
  document.getElementById('sg-txn-list').innerHTML=txns.length?txns.map(t=>{
    const m=sgMembers.find(mm=>mm.user_id===t.user_id);
    const canEdit=t.user_id===currentUser?.id;
    const canDelete=t.user_id===currentUser?.id||isOwner;
    return`<div class="card" style="padding:12px 16px;margin-bottom:6px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:18px;">${m?m.avatar:'👤'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;">${escHtml(t.description||t.category)}</div>
        <div style="font-size:11.5px;color:var(--text-secondary);">${new Date(t.date+'T12:00:00').toLocaleDateString('cs-CZ')} · ${m?escHtml(m.name):'?'} · ${escHtml(t.category)}</div>
      </div>
      <div style="font-size:14px;font-weight:600;color:var(--red);white-space:nowrap;">-${fmt(Number(t.amount),t.currency)}</div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        ${canEdit?`<button class="btn-edit" onclick="openEditSharedTxnModal('${t.id}')">✎</button>`:''}
        ${canDelete?`<button class="btn-del" onclick="deleteSharedTxn('${t.id}')">×</button>`:''}
      </div>
    </div>`;
  }).join(''):'<div style="text-align:center;color:var(--text-secondary);padding:20px;">Žádné sdílené transakce</div>';
}
