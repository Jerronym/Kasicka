// Kasička — plánování: spořící cíle + přání

let goalsActiveTab = 'goals';
let selectedGoalIcon = '🎯';
let selectedGoalColor = GRP_COLORS[0];

function switchGoalsTab(tab) {
  goalsActiveTab = tab;
  document.getElementById('tab-goals').classList.toggle('active', tab === 'goals');
  document.getElementById('tab-wishes').classList.toggle('active', tab === 'wishes');
  document.getElementById('goals-tab-content').style.display = tab === 'goals' ? '' : 'none';
  document.getElementById('wishes-tab-content').style.display = tab === 'wishes' ? '' : 'none';
  const btn = document.getElementById('goals-add-btn');
  if (tab === 'goals') {
    btn.textContent = '+ Přidat cíl';
    btn.onclick = () => openGoalModal(-1);
  } else {
    btn.textContent = '+ Přidat přání';
    btn.onclick = () => openWishModal(-1);
  }
  renderGoalsSection();
}

function renderGoalsSection() {
  if (goalsActiveTab === 'goals') renderGoals();
  else renderWishlist();
}

// ── Spořící cíle ──────────────────────────────────────────

function calcAvgMonthlySaving(linkedAccIdx) {
  if (linkedAccIdx === '' || linkedAccIdx === undefined || linkedAccIdx === null) return null;
  const accIdx = String(linkedAccIdx);
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const relevant = transactions.filter(t =>
    t.type === 'prevod' &&
    String(t.toAccIdx) === accIdx &&
    new Date(t.date + 'T12:00:00') >= threeMonthsAgo
  );
  if (!relevant.length) return null;
  const total = relevant.reduce((s, t) => s + toCZK(t.amount, t.cur || 'CZK'), 0);
  return total / 3;
}

function renderGoals() {
  const list = document.getElementById('goals-list');
  const empty = document.getElementById('goals-empty');
  if (!goals.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = goals.map((g, i) => {
    const target = toCZK(g.targetAmount || 0, g.currency || 'CZK');
    const hasLinkedAcc = g.linkedAccIdx !== '' && g.linkedAccIdx !== undefined && g.linkedAccIdx !== null;
    const rawCurrent = hasLinkedAcc ? getBalance(parseInt(g.linkedAccIdx)) : (g.currentAmount || 0);
    const current = toCZK(rawCurrent, hasLinkedAcc ? (accounts[parseInt(g.linkedAccIdx)]?.currency || 'CZK') : (g.currency || 'CZK'));
    const pct = target > 0 ? Math.min(current / target * 100, 100) : 0;
    const remaining = Math.max(target - current, 0);
    let monthsHtml = '';
    const avg = calcAvgMonthlySaving(g.linkedAccIdx);
    if (remaining === 0) {
      monthsHtml = `<span style="font-size:11.5px;color:var(--green)">✓ Cíl splněn!</span>`;
    } else if (avg && avg > 0) {
      const months = Math.ceil(remaining / avg);
      monthsHtml = `<span style="font-size:11.5px;color:var(--text-secondary)">~ ${months} měs. do cíle (průměr ${fmt(avg)} / měs.)</span>`;
    } else {
      monthsHtml = `<span style="font-size:11.5px;color:var(--text-secondary)">Zbývá ${fmt(remaining, g.currency || 'CZK')}</span>`;
    }
    let deadlineBadge = '';
    if (g.deadline) {
      const dl = new Date(g.deadline + 'T12:00:00');
      const now2 = new Date(); now2.setHours(0, 0, 0, 0);
      const overdue = dl < now2 && remaining > 0;
      deadlineBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${overdue ? 'var(--red)' : 'var(--accent-dim)'};color:${overdue ? 'white' : 'var(--accent)'}">${overdue ? '⚠ Překročeno!' : '📅 ' + dl.toLocaleDateString('cs-CZ')}</span>`;
    }
    const acc = g.linkedAccIdx !== '' && g.linkedAccIdx !== undefined && g.linkedAccIdx !== null ? accounts[parseInt(g.linkedAccIdx)] : null;
    const accBadge = acc ? `<span style="font-size:11px;color:var(--text-secondary)">🏦 ${escHtml(acc.name)}</span>` : '';
    return `<div class="card" style="display:flex;flex-direction:column;gap:8px;border-left:4px solid ${g.color || 'var(--accent)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">${g.icon || '🎯'}</span>
          <div>
            <div style="font-weight:500;font-size:14px">${escHtml(g.name)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px">${deadlineBadge}${accBadge}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-size:13px;font-weight:500;color:var(--text-secondary)">${fmt(rawCurrent, hasLinkedAcc ? (accounts[parseInt(g.linkedAccIdx)]?.currency || 'CZK') : (g.currency || 'CZK'))} / ${fmt(g.targetAmount || 0, g.currency || 'CZK')}</span>
          <button class="btn-edit" onclick="openGoalModal(${i})">Upravit</button>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color || 'var(--accent)'}"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
        <div>${monthsHtml}</div>
        <span style="font-size:11.5px;color:var(--text-secondary)">${pct.toFixed(0)} % splněno</span>
      </div>
      ${g.note ? `<div style="font-size:12px;color:var(--text-secondary);font-style:italic">${escHtml(g.note)}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Přání ─────────────────────────────────────────────────

const WISH_PRIORITY_ORDER = { 'vysoká': 0, 'střední': 1, 'nízká': 2 };
const WISH_PRIORITY_DOTS = { 'vysoká': '🔴', 'střední': '🟡', 'nízká': '🟢' };

function renderWishlist() {
  const list = document.getElementById('wishes-list');
  const empty = document.getElementById('wishes-empty');
  if (!wishlist.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  const active = wishlist.filter(w => !w.bought);
  const bought = wishlist.filter(w => w.bought);
  const sorted = [...active].sort((a, b) => {
    const pd = (WISH_PRIORITY_ORDER[a.priority] ?? 1) - (WISH_PRIORITY_ORDER[b.priority] ?? 1);
    if (pd !== 0) return pd;
    return (a.price || 0) - (b.price || 0);
  });
  let html = '';
  if (sorted.length) {
    html += sorted.map(w => {
      const i = wishlist.indexOf(w);
      const urlHtml = w.url ? `<a href="${escAttr(w.url)}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px;color:var(--accent);text-decoration:none;">🔗 Odkaz</a>` : '';
      const priceHtml = w.price ? `<span style="font-size:13px;font-weight:500;color:var(--text-primary)">${fmt(w.price, w.currency || 'CZK')}</span>` : '';
      const dot = WISH_PRIORITY_DOTS[w.priority] || '🟡';
      return `<div class="card" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0">
          <span style="font-size:18px;flex-shrink:0;margin-top:2px">${dot}</span>
          <div style="min-width:0">
            <div style="font-weight:500;font-size:14px">${escHtml(w.name)}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:3px">
              ${priceHtml}${urlHtml}
              ${w.note ? `<span style="font-size:11.5px;color:var(--text-secondary);font-style:italic">${escHtml(w.note)}</span>` : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button class="btn btn-sm" onclick="markWishBought(${i})" style="font-size:12px">Koupit</button>
          <button class="btn-edit" onclick="openWishModal(${i})">✎</button>
        </div>
      </div>`;
    }).join('');
  }
  if (bought.length) {
    html += `<details style="margin-top:8px">
      <summary style="font-size:12px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;cursor:pointer;padding:8px 0">Koupeno (${bought.length})</summary>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">`;
    html += bought.map(w => {
      const i = wishlist.indexOf(w);
      const priceHtml = w.price ? `<span style="font-size:12px;color:var(--text-secondary)">${fmt(w.price, w.currency || 'CZK')}</span>` : '';
      const boughtDate = w.boughtDate ? new Date(w.boughtDate + 'T12:00:00').toLocaleDateString('cs-CZ') : '';
      return `<div class="card" style="opacity:0.65;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <div>
          <span style="font-size:14px;text-decoration:line-through;color:var(--text-secondary)">${escHtml(w.name)}</span>
          <span style="margin-left:8px;font-size:11.5px;color:var(--green)">✓ Koupeno ${boughtDate}</span>
          ${priceHtml}
        </div>
        <button class="btn-edit" onclick="openWishModal(${i})">✎</button>
      </div>`;
    }).join('');
    html += `</div></details>`;
  }
  list.innerHTML = html;
}

// ── Modální okna — cíle ───────────────────────────────────

function renderGoalIconPicker() {
  const wrap = document.getElementById('goal-icon-picker');
  if (!wrap) return;
  wrap.innerHTML = CAT_ICONS.map(icon =>
    `<span onclick="selectedGoalIcon='${icon}';renderGoalIconPicker()" style="font-size:20px;cursor:pointer;padding:4px;border-radius:6px;background:${icon === selectedGoalIcon ? 'var(--accent-dim)' : 'transparent'};border:1px solid ${icon === selectedGoalIcon ? 'var(--accent)' : 'transparent'}">${icon}</span>`
  ).join('');
}

function renderGoalColorPicker() {
  const wrap = document.getElementById('goal-color-picker');
  if (!wrap) return;
  wrap.innerHTML = GRP_COLORS.map(c =>
    `<div onclick="selectedGoalColor='${c}';renderGoalColorPicker()" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c === selectedGoalColor ? '#fff' : 'transparent'};outline:${c === selectedGoalColor ? '2px solid ' + c : 'none'};"></div>`
  ).join('');
}

function toggleGoalCurrentField() {
  const hasAcc = document.getElementById('goal-account').value !== '';
  const wrap = document.getElementById('goal-current-wrap');
  if (wrap) wrap.style.display = hasAcc ? 'none' : '';
}

function _fillGoalAccSelect() {
  const sel = document.getElementById('goal-account');
  if (!sel) return;
  sel.innerHTML = '<option value="">— bez účtu —</option>' +
    accounts.map((a, i) => `<option value="${i}">${escHtml(a.name)} (${a.currency})</option>`).join('');
}

function openGoalModal(idx) {
  editingGoal = idx;
  selectedGoalIcon = '🎯';
  selectedGoalColor = GRP_COLORS[0];
  const del = document.getElementById('goal-delete-btn');
  _fillGoalAccSelect();
  if (idx === -1) {
    document.getElementById('goal-modal-title').textContent = 'Nový cíl';
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-current').value = '';
    document.getElementById('goal-currency').value = 'CZK';
    document.getElementById('goal-deadline').value = '';
    document.getElementById('goal-account').value = '';
    document.getElementById('goal-note').value = '';
    del.style.display = 'none';
  } else {
    const g = goals[idx];
    document.getElementById('goal-modal-title').textContent = 'Upravit cíl';
    document.getElementById('goal-name').value = g.name || '';
    document.getElementById('goal-target').value = g.targetAmount || '';
    document.getElementById('goal-current').value = g.currentAmount || '';
    document.getElementById('goal-currency').value = g.currency || 'CZK';
    document.getElementById('goal-deadline').value = g.deadline || '';
    document.getElementById('goal-account').value = g.linkedAccIdx !== undefined ? g.linkedAccIdx : '';
    document.getElementById('goal-note').value = g.note || '';
    selectedGoalIcon = g.icon || '🎯';
    selectedGoalColor = g.color || GRP_COLORS[0];
    del.style.display = 'block';
  }
  renderGoalIconPicker();
  renderGoalColorPicker();
  toggleGoalCurrentField();
  openModal('goal');
}

function saveGoal() {
  const name = document.getElementById('goal-name').value.trim();
  if (!name) { toast('Zadej název cíle.', 'warn'); return; }
  const target = parseFloat(document.getElementById('goal-target').value) || 0;
  if (target <= 0) { toast('Zadej cílovou částku (> 0).', 'warn'); return; }
  const obj = {
    name,
    icon: selectedGoalIcon,
    color: selectedGoalColor,
    targetAmount: target,
    currency: document.getElementById('goal-currency').value || 'CZK',
    currentAmount: parseFloat(document.getElementById('goal-current').value) || 0,
    linkedAccIdx: document.getElementById('goal-account').value,
    deadline: document.getElementById('goal-deadline').value || '',
    note: document.getElementById('goal-note').value.trim(),
  };
  if (editingGoal === -1) {
    goals.push(obj);
    toast('Cíl přidán.', 'success');
  } else {
    goals[editingGoal] = { ...goals[editingGoal], ...obj };
    toast('Cíl uložen.', 'success');
  }
  closeModal('goal');
  markDirty('goals');
  saveToStorage();
}

function deleteGoal() {
  if (editingGoal === -1) return;
  goals.splice(editingGoal, 1);
  closeModal('goal');
  toast('Cíl smazán.', 'success');
  markDirty('goals');
  saveToStorage();
}

// ── Modální okna — přání ──────────────────────────────────

function openWishModal(idx) {
  editingWish = idx;
  const del = document.getElementById('wish-delete-btn');
  if (idx === -1) {
    document.getElementById('wish-modal-title').textContent = 'Nové přání';
    document.getElementById('wish-name').value = '';
    document.getElementById('wish-price').value = '';
    document.getElementById('wish-currency').value = 'CZK';
    document.getElementById('wish-priority').value = 'střední';
    document.getElementById('wish-url').value = '';
    document.getElementById('wish-note').value = '';
    del.style.display = 'none';
  } else {
    const w = wishlist[idx];
    document.getElementById('wish-modal-title').textContent = 'Upravit přání';
    document.getElementById('wish-name').value = w.name || '';
    document.getElementById('wish-price').value = w.price || '';
    document.getElementById('wish-currency').value = w.currency || 'CZK';
    document.getElementById('wish-priority').value = w.priority || 'střední';
    document.getElementById('wish-url').value = w.url || '';
    document.getElementById('wish-note').value = w.note || '';
    del.style.display = 'block';
  }
  openModal('wish');
}

function saveWish() {
  const name = document.getElementById('wish-name').value.trim();
  if (!name) { toast('Zadej název přání.', 'warn'); return; }
  const price = parseFloat(document.getElementById('wish-price').value) || 0;
  const obj = {
    name,
    price,
    currency: document.getElementById('wish-currency').value || 'CZK',
    priority: document.getElementById('wish-priority').value || 'střední',
    url: document.getElementById('wish-url').value.trim(),
    note: document.getElementById('wish-note').value.trim(),
    addedDate: editingWish === -1 ? today() : (wishlist[editingWish].addedDate || today()),
    bought: editingWish === -1 ? false : wishlist[editingWish].bought,
    boughtDate: editingWish === -1 ? '' : (wishlist[editingWish].boughtDate || ''),
  };
  if (editingWish === -1) {
    wishlist.push(obj);
    toast('Přání přidáno.', 'success');
  } else {
    wishlist[editingWish] = { ...wishlist[editingWish], ...obj };
    toast('Přání uloženo.', 'success');
  }
  closeModal('wish');
  markDirty('goals');
  saveToStorage();
}

function deleteWish() {
  if (editingWish === -1) return;
  wishlist.splice(editingWish, 1);
  closeModal('wish');
  toast('Přání smazáno.', 'success');
  markDirty('goals');
  saveToStorage();
}

function markWishBought(idx) {
  if (!wishlist[idx]) return;
  wishlist[idx].bought = true;
  wishlist[idx].boughtDate = today();
  toast('Označeno jako koupeno! 🎉', 'success');
  markDirty('goals');
  saveToStorage();
}
