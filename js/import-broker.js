// Kasička — import investic z brokerů (Trading212 CSV, XTB XLSX/CSV)

let _ibParsed = [];
let _ibBroker = 'xtb';
let _ibNewInvIdxs = [];

function openImportBrokerModal() {
  _ibParsed = [];
  _ibNewInvIdxs = [];
  showIbStep(1);
  const fileInp = document.getElementById('ib-file');
  if (fileInp) fileInp.value = '';
  const statusEl = document.getElementById('ib-status');
  if (statusEl) statusEl.textContent = '';
  ibRefreshAccSelect();
  openModal('import-broker');
}

function closeImportBrokerModal() {
  closeModal('import-broker');
}

function showIbStep(n) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('ib-step-' + i);
    if (el) el.style.display = (i === n) ? 'block' : 'none';
  }
}

// ── PARSERY ───────────────────────────────────────────────────────────────────

// Jednoduchý CSV parser zvládající quoted fields
function parseCsvLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

function parseTrading212Csv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (!lines.length) return [];

  // Najít header řádek
  let headerIdx = lines.findIndex(l => l.includes('Action') && l.includes('No. of shares'));
  if (headerIdx < 0) headerIdx = 0;

  const headers = parseCsvLine(lines[headerIdx]);
  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h.trim().replace(/"/g,'')] = i; });

  const actionIdx  = colIdx['Action'];
  const timeIdx    = colIdx['Time'];
  const tickerIdx  = colIdx['Ticker'];
  const nameIdx    = colIdx['Name'];
  const sharesIdx  = colIdx['No. of shares'];
  const priceIdx   = colIdx['Price / share'];
  const currIdx    = colIdx['Currency (Price / share)'];
  const totalIdx   = colIdx['Total'];

  if (actionIdx === undefined || sharesIdx === undefined) return null;

  const BUY_ACTIONS  = new Set(['Market buy', 'Limit buy', 'Stop buy']);
  const SELL_ACTIONS = new Set(['Market sell', 'Limit sell', 'Stop sell']);

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 3) continue;
    const action = (cols[actionIdx] || '').trim().replace(/"/g, '');
    if (!BUY_ACTIONS.has(action) && !SELL_ACTIONS.has(action)) continue;

    const type = BUY_ACTIONS.has(action) ? 'buy' : 'sell';
    const dateStr = (cols[timeIdx] || '').trim().slice(0, 10);
    const ticker  = (cols[tickerIdx] || '').trim().replace(/"/g, '');
    const name    = (cols[nameIdx] || '').trim().replace(/"/g, '');
    const shares  = parseFloat((cols[sharesIdx] || '').replace(',', '.').replace(/"/g, '')) || 0;
    const price   = parseFloat((cols[priceIdx] || '').replace(',', '.').replace(/"/g, '')) || 0;
    const priceCurrency = (cols[currIdx] || '').trim().replace(/"/g, '') || 'USD';
    let totalAccCur = parseFloat((cols[totalIdx] || '').replace(',', '.').replace(/"/g, ''));
    if (isNaN(totalAccCur)) totalAccCur = shares * price;
    if (totalAccCur < 0) totalAccCur = -totalAccCur;

    if (!ticker || !dateStr || shares <= 0) continue;
    rows.push({ type, date: dateStr, ticker, name, shares, price, priceCurrency, totalAccCur });
  }
  return rows;
}

function normalizeXtbHeader(h) {
  const norm = h.toLowerCase().replace(/\s+/g, '').replace(/\(utc\)$/, '').replace(/\(.+?\)/, '');
  if (norm === 'ticker' || norm === 'symbol') return 'Ticker';
  if (norm === 'type' || norm === 'operation') return 'Type';
  if (norm === 'opentime' || norm === 'time' || norm === 'date') return 'Time';
  if (norm === 'volume' || norm === 'noofshares' || norm === 'lots') return 'Volume';
  if (norm === 'openprice' || norm === 'price') return 'Price';
  if (norm === 'amount') return 'Amount';
  if (norm === 'comment' || norm === 'notes') return 'Comment';
  if (norm === 'instrument' || norm === 'name') return 'Name';
  return h;
}

function _xtbExcelSerialToDate(serial) {
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function _xtbParseDate(val) {
  if (typeof val === 'number') return _xtbExcelSerialToDate(val);
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) {
    const p = s.split('.');
    return `${p[2].slice(0, 4)}-${p[1]}-${p[0]}`;
  }
  return '';
}

function _xtbTickerCurrency(ticker) {
  const suffix = (ticker.split('.').pop() || '').toUpperCase();
  if (['DE', 'F', 'PA', 'AS', 'MI', 'MC', 'BR', 'VI', 'HE', 'LS', 'WA'].includes(suffix)) return 'EUR';
  if (['L', 'IL'].includes(suffix)) return 'GBP';
  return 'USD';
}

function _processXtbRows(rows, colIdx) {
  const typeIdx    = colIdx['Type'];
  const tickerIdx  = colIdx['Ticker'];
  const nameIdx    = colIdx['Name'];
  const timeIdx    = colIdx['Time'];
  const amountIdx  = colIdx['Amount'];
  const commentIdx = colIdx['Comment'];

  if (typeIdx === undefined) return null;

  const result = [];
  for (const cells of rows) {
    const type = String(cells[typeIdx] || '').trim().toLowerCase();
    if (type !== 'stock purchase' && type !== 'stock sell') continue;

    const isBuy  = type === 'stock purchase';
    const ticker = String(cells[tickerIdx] || '').trim();
    const name   = String(cells[nameIdx]   || '').trim();
    const timeVal = cells[timeIdx];
    const amtRaw  = parseFloat(String(cells[amountIdx] || '').replace(',', '.'));
    const comment = String(cells[commentIdx] || '').trim();

    if (!ticker) continue;

    const date = _xtbParseDate(timeVal);
    if (!date) continue;

    // parse kusy + cenu z komentáře: "OPEN BUY 0.0334 @ 610.14" nebo "CLOSE BUY 0.129/1.4085 @ 57.900"
    const m = comment.match(/(?:OPEN|CLOSE)\s+BUY\s+([\d.]+)(?:\/[\d.]+)?\s*@\s*([\d.]+)/i);
    if (!m) continue;
    const shares = parseFloat(m[1]);
    const price  = parseFloat(m[2]);
    if (!shares || isNaN(shares)) continue;

    const totalAccCur = Math.abs(isNaN(amtRaw) ? shares * price : amtRaw);
    const priceCurrency = _xtbTickerCurrency(ticker);

    result.push({ type: isBuy ? 'buy' : 'sell', date, ticker, name, shares, price, priceCurrency, totalAccCur });
  }
  return result;
}

function parseXtbCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  const sep = (lines.slice(0, 10).join('\n').split(';').length > lines.slice(0, 10).join('\n').split(',').length) ? ';' : ',';

  let headerIdx = lines.findIndex(l => {
    const cols = l.split(sep);
    return cols.some(c => c.trim().replace(/"/g,'') === 'Type') && cols.some(c => ['Ticker','Symbol'].includes(c.trim().replace(/"/g,'')));
  });
  if (headerIdx < 0) return null;

  const headers = lines[headerIdx].split(sep).map(h => normalizeXtbHeader(h.trim().replace(/"/g, '')));
  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const dataRows = lines.slice(headerIdx + 1).map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
  return _processXtbRows(dataRows, colIdx);
}

function parseXtbXlsx(workbook) {
  const sheetName = workbook.SheetNames.find(n => /cash/i.test(n)) || workbook.SheetNames[1] || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

  let headerIdx = data.findIndex(row =>
    row.some(c => String(c).trim() === 'Type') && row.some(c => ['Ticker', 'Symbol'].includes(String(c).trim()))
  );
  if (headerIdx < 0) return null;

  const headers = data[headerIdx].map(h => normalizeXtbHeader(String(h).trim()));
  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  return _processXtbRows(data.slice(headerIdx + 1), colIdx);
}

// ── DUPLIKÁTY ──────────────────────────────────────────────────────────────────

function classifyImportRow(parsed) {
  const invIdx = investments.findIndex(inv =>
    (inv.apiSymbol || '').toUpperCase() === parsed.ticker.toUpperCase() ||
    (inv.ticker || '').toUpperCase()    === parsed.ticker.toUpperCase()
  );
  if (invIdx < 0) return 'new';

  const txnType = parsed.type === 'buy' ? 'vydaj' : 'prijem';
  const dayMatchTxns = transactions.filter(t =>
    t.cat === 'INVESTICE' &&
    String(t.invIdx) === String(invIdx) &&
    t.date === parsed.date &&
    t.type === txnType
  );
  if (!dayMatchTxns.length) return 'new';

  // Shoda na kusech přes history entry
  const histMatch = (investments[invIdx].history || []).find(h =>
    h.date === parsed.date &&
    ((parsed.type === 'buy'  && h.isPurchase && Math.abs((h.sharesBought || 0) - parsed.shares) < 0.0001) ||
     (parsed.type === 'sell' && h.isSale     && Math.abs((h.sharesSold   || 0) - parsed.shares) < 0.0001))
  );
  return histMatch ? 'exists' : 'maybe';
}

// ── MODAL FLOW ─────────────────────────────────────────────────────────────────

async function ibLoadAndParse() {
  const fileInp = document.getElementById('ib-file');
  if (!fileInp || !fileInp.files.length) { toast('Vyber soubor.', 'warn'); return; }
  const file = fileInp.files[0];
  const broker = document.querySelector('input[name="ib-broker"]:checked')?.value || 'xtb';
  _ibBroker = broker;

  const statusEl = document.getElementById('ib-status');
  statusEl.textContent = 'Načítám soubor…';

  try {
    let rows = null;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      if (typeof XLSX === 'undefined') {
        statusEl.textContent = 'Chyba: SheetJS knihovna není dostupná (CDN nedostupné). Zkus exportovat soubor jako CSV.';
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      rows = broker === 'xtb' ? parseXtbXlsx(wb) : null;
      if (!rows) { statusEl.textContent = 'Nepodařilo se zpracovat XLSX soubor. Zkus exportovat jako CSV.'; return; }
    } else if (ext === 'csv' || ext === 'txt') {
      const text = await file.text();
      rows = broker === 'trading212' ? parseTrading212Csv(text) : parseXtbCsv(text);
      if (!rows) { statusEl.textContent = 'Neplatný formát souboru. Zkontroluj, zda jde o správný broker export.'; return; }
    } else {
      statusEl.textContent = 'Nepodporovaný typ souboru. Použij .csv nebo .xlsx.';
      return;
    }

    if (!rows.length) { statusEl.textContent = 'Nenalezeny žádné investiční transakce.'; return; }

    _ibParsed = rows;
    statusEl.textContent = `Nalezeno ${rows.length} transakcí. Nyní vyber účet.`;
    ibRefreshAccSelect();
    showIbStep(2);

  } catch (e) {
    console.error('Import parse error:', e);
    statusEl.textContent = 'Chyba při čtení souboru: ' + e.message;
  }
}

function ibRefreshAccSelect() {
  const sel = document.getElementById('ib-acc');
  if (!sel) return;
  sel.innerHTML = '<option value="">— vyber účet —</option>';
  accounts.forEach((a, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = a.name + ' (' + a.currency + ')';
    sel.appendChild(o);
  });
  const noAccWarn = document.getElementById('ib-no-acc-warn');
  if (noAccWarn) noAccWarn.style.display = accounts.length ? 'none' : 'block';
}

function ibConfirmAccount() {
  const accVal = document.getElementById('ib-acc').value;
  if (accVal === '') { toast('Vyber účet.', 'warn'); return; }
  const accIdx = parseInt(accVal);
  const acc = accounts[accIdx];

  let newCount = 0, maybeCount = 0, existsCount = 0;
  const classified = _ibParsed.map(row => {
    const status = classifyImportRow(row);
    if (status === 'new')       newCount++;
    else if (status === 'maybe') maybeCount++;
    else                         existsCount++;
    return { ...row, status };
  });
  // uložit status zpět pro executeImport
  classified.forEach((r, i) => { _ibParsed[i].status = r.status; });

  // Warning při měnové neshoda
  let mismatchHtml = '';
  const detectedCurs = new Set(_ibParsed.map(r => r.priceCurrency));
  const majorCur = _ibBroker === 'xtb' ? 'EUR' : null;
  if (majorCur && acc.currency !== majorCur) {
    mismatchHtml = `<div style="background:color-mix(in srgb,var(--amber) 15%,transparent);border:1px solid var(--amber);border-radius:8px;padding:10px 14px;font-size:12.5px;margin-bottom:12px;">
      ⚠ Vybraný účet je v <strong>${escHtml(acc.currency)}</strong>, ale XTB export je v EUR. Částky budou přepočítány přes aktuální kurzy (1 EUR ≈ ${RATES.EUR?.toFixed(2)||'25'} Kč).
    </div>`;
  }

  const tableEl = document.getElementById('ib-txn-table');
  let html = mismatchHtml + `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12.5px;">
    <thead><tr style="border-bottom:2px solid var(--card-border);">
      <th style="padding:6px 4px;text-align:left;width:28px;"><input type="checkbox" id="ib-check-all" checked onchange="ibToggleAll(this.checked)"></th>
      <th style="padding:6px 8px;text-align:left;">Datum</th>
      <th style="padding:6px 8px;text-align:left;">Ticker</th>
      <th style="padding:6px 8px;text-align:left;">Typ</th>
      <th style="padding:6px 8px;text-align:right;">Kusů</th>
      <th style="padding:6px 8px;text-align:right;">Cena/ks</th>
      <th style="padding:6px 4px;text-align:center;min-width:90px;">Status</th>
    </tr></thead><tbody>`;

  classified.forEach((row, i) => {
    const checked = row.status !== 'exists';
    const statusBadge = row.status === 'new'
      ? '<span style="color:var(--green);font-size:11px;white-space:nowrap;">✅ Nová</span>'
      : row.status === 'maybe'
        ? '<span style="color:var(--amber);font-size:11px;white-space:nowrap;">⚠️ Duplikát?</span>'
        : '<span style="color:var(--text-secondary);font-size:11px;white-space:nowrap;">🔁 Existuje</span>';
    const rowBg = row.status === 'maybe' ? 'background:color-mix(in srgb,var(--amber) 7%,transparent);' : '';
    html += `<tr style="border-bottom:1px solid var(--border-subtle);${rowBg}">
      <td style="padding:5px 4px;"><input type="checkbox" class="ib-row-check" data-idx="${i}" ${checked ? 'checked' : ''} onchange="ibUpdateCount()"></td>
      <td style="padding:5px 8px;font-size:12px;">${escHtml(row.date)}</td>
      <td style="padding:5px 8px;font-weight:600;color:var(--accent);">${escHtml(row.ticker)}</td>
      <td style="padding:5px 8px;color:${row.type === 'buy' ? 'var(--green)' : 'var(--red)'};">${row.type === 'buy' ? 'Nákup' : 'Prodej'}</td>
      <td style="padding:5px 8px;text-align:right;font-variant-numeric:tabular-nums;">${row.shares.toFixed(4)}</td>
      <td style="padding:5px 8px;text-align:right;font-variant-numeric:tabular-nums;">${row.price.toFixed(3)}&nbsp;${escHtml(row.priceCurrency)}</td>
      <td style="padding:5px 4px;text-align:center;">${statusBadge}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  tableEl.innerHTML = html;

  document.getElementById('ib-summary').textContent =
    `Celkem: ${newCount} nových, ${maybeCount} možných duplikátů, ${existsCount} existujících`;

  ibUpdateCount();
  showIbStep(3);
}

function ibToggleAll(checked) {
  document.querySelectorAll('.ib-row-check').forEach(cb => {
    const idx = parseInt(cb.dataset.idx);
    if (_ibParsed[idx]?.status !== 'exists') cb.checked = checked;
  });
  ibUpdateCount();
}

function ibUpdateCount() {
  const n = document.querySelectorAll('.ib-row-check:checked').length;
  const btn = document.getElementById('ib-execute-btn');
  if (btn) { btn.disabled = n === 0; btn.textContent = `Importovat vybrané (${n})`; }
}

// ── IMPORT ─────────────────────────────────────────────────────────────────────

function guessInvType(name, ticker) {
  const n = (name || ticker || '').toLowerCase();
  if (/etf|msci|s&p|nasdaq|stoxx|index|ucits/i.test(n)) return 'ETF';
  if (/btc|eth|bitcoin|ethereum|crypto|krypto/i.test(n)) return 'Krypto';
  if (/bond|dluhopis/i.test(n)) return 'Dluhopisy';
  return 'Akcie';
}

async function ibExecuteImport() {
  const accVal = document.getElementById('ib-acc').value;
  const accIdx = parseInt(accVal);
  const acc = accounts[accIdx];
  if (!acc) { toast('Neplatný účet.', 'warn'); return; }

  const fetchPrices = document.getElementById('ib-fetch-prices')?.checked || false;

  const selectedIdxs = [];
  document.querySelectorAll('.ib-row-check:checked').forEach(cb => {
    selectedIdxs.push(parseInt(cb.dataset.idx));
  });
  if (!selectedIdxs.length) return;

  showLoading('Importuji…');

  // Zajistit skupinu brokera
  const brokerLabel = _ibBroker === 'trading212' ? 'Trading212' : 'XTB';
  let groupIdx = invGroups.findIndex(g => g.name === brokerLabel);
  if (groupIdx < 0) {
    invGroups.push({ name: brokerLabel, color: GRP_COLORS[invGroups.length % GRP_COLORS.length], note: 'Importováno z ' + brokerLabel });
    groupIdx = invGroups.length - 1;
  }

  let imported = 0, skipped = 0, failed = 0;
  const newInvIdxs = [];

  // Seřadit podle data (starší transakce jako první, aby startDate byl správně nastaven)
  const sortedIdxs = [...selectedIdxs].sort((a, b) => _ibParsed[a].date.localeCompare(_ibParsed[b].date));

  for (const rowIdx of sortedIdxs) {
    const row = _ibParsed[rowIdx];
    try {
      // Částka v měně účtu — přepočíst pokud nesouhlasí měna
      let totalAccCur = row.totalAccCur;
      if (_ibBroker === 'xtb' && acc.currency !== 'EUR') {
        // XTB amount je v EUR, účet je v jiné měně (např. CZK)
        totalAccCur = toCZK(row.totalAccCur, 'EUR');
      }
      const inCZK = toCZK(totalAccCur, acc.currency);

      // Najít existující investici
      let invIdx = investments.findIndex(inv =>
        (inv.apiSymbol || '').toUpperCase() === row.ticker.toUpperCase() ||
        (inv.ticker || '').toUpperCase()    === row.ticker.toUpperCase()
      );

      if (row.type === 'buy') {
        if (invIdx < 0) {
          // Nová pozice
          const invType = guessInvType(row.name, row.ticker);
          const newInv = {
            ticker: row.ticker, apiSymbol: row.ticker, shares: row.shares,
            type: invType, invested: inCZK, value: inCZK,
            startDate: row.date,
            history: [{ date: row.date, value: inCZK, prevValue: inCZK, note: 'Import ' + brokerLabel + ' — počáteční nákup', importSource: _ibBroker }],
            accIdx: String(accIdx), groupIdx
          };
          investments.push(newInv);
          invIdx = investments.length - 1;
          newInvIdxs.push(invIdx);
        } else {
          // Dokup do existující
          const inv = investments[invIdx];
          const prevVal = getInvValue(invIdx);
          inv.invested += inCZK;
          inv.value = (inv.value || 0) + inCZK;
          inv.shares = (inv.shares || 0) + row.shares;
          if (!inv.startDate || row.date < inv.startDate) inv.startDate = row.date;

          if (!inv.history) inv.history = [];
          const newVal = getInvValue(invIdx);
          inv.history.push({ date: row.date, value: newVal, prevValue: prevVal, note: 'Import ' + brokerLabel, isPurchase: true, sharesBought: row.shares, importSource: _ibBroker });
          inv.history.sort((a, b) => a.date.localeCompare(b.date));
        }

        transactions.unshift({ desc: 'Investice → ' + row.ticker, amount: totalAccCur, date: row.date, type: 'vydaj', cat: 'INVESTICE', cur: acc.currency, accIdx: String(accIdx), invIdx: String(invIdx), importSource: _ibBroker });
        imported++;

      } else {
        // SELL
        if (invIdx < 0) { skipped++; continue; }
        const inv = investments[invIdx];
        const prevVal = getInvValue(invIdx);
        const sharesSold = Math.min(row.shares, inv.shares || 0);
        const sellPct = (inv.shares || 0) > 0 ? sharesSold / inv.shares : 1;
        const investedReduction = inv.invested * sellPct;

        inv.shares   = Math.max(0, (inv.shares || 0) - sharesSold);
        inv.invested = Math.max(0, inv.invested - investedReduction);
        inv.value    = Math.max(0, (inv.value  || 0) * (1 - sellPct));

        transactions.unshift({ desc: 'Prodej ← ' + row.ticker, amount: totalAccCur, date: row.date, type: 'prijem', cat: 'INVESTICE', cur: acc.currency, accIdx: String(accIdx), invIdx: String(invIdx), importSource: _ibBroker });

        if (!inv.history) inv.history = [];
        const newVal = getInvValue(invIdx);
        inv.history.push({ date: row.date, value: newVal, prevValue: prevVal, note: 'Import ' + brokerLabel + ' prodej', isSale: true, sharesSold, investedReduction, importSource: _ibBroker });
        inv.history.sort((a, b) => a.date.localeCompare(b.date));
        imported++;
      }
    } catch (e) {
      console.error('Import row error:', e, row);
      failed++;
    }
  }

  if (typeof recordSnapshot === 'function') recordSnapshot();
  if (typeof recordInvSnapshot === 'function') recordInvSnapshot();
  saveToStorage();
  markDirty('investments', 'dashboard', 'accounts', 'transactions');
  hideLoading();

  _ibNewInvIdxs = newInvIdxs;

  let resultHtml = `<div style="font-size:13.5px;"><strong style="color:var(--green);">Importováno: ${imported}</strong>`;
  if (skipped)  resultHtml += `<br>Přeskočeno (neznámá pozice): ${skipped}`;
  if (failed)   resultHtml += `<br><span style="color:var(--red);">Chyby: ${failed} — viz konzoli</span>`;
  resultHtml += '</div>';
  document.getElementById('ib-result-text').innerHTML = resultHtml;

  const fetchSection = document.getElementById('ib-result-fetch-section');
  if (fetchSection) fetchSection.style.display = (newInvIdxs.length > 0) ? 'block' : 'none';

  showIbStep(4);

  if (fetchPrices && newInvIdxs.length) {
    ibFetchPriceHistory(newInvIdxs);
  }
}

async function ibFetchPriceHistory(invIdxArr) {
  const progEl = document.getElementById('ib-fetch-progress');
  if (progEl) progEl.style.display = 'block';
  let done = 0;
  for (const idx of invIdxArr) {
    const inv = investments[idx];
    if (!inv || !inv.apiSymbol || !inv.shares || !inv.startDate) { done++; continue; }
    if (progEl) progEl.textContent = `Načítám historii ${done + 1}/${invIdxArr.length}: ${inv.apiSymbol}…`;
    try {
      await buildInvHistoryFromAPI(idx);
    } catch (e) { console.warn('API history fetch failed:', inv.apiSymbol, e); }
    done++;
    if (done < invIdxArr.length) await new Promise(r => setTimeout(r, 1200));
  }
  if (progEl) progEl.textContent = '✓ Historické ceny načteny.';
  saveToStorage();
  markDirty('investments', 'dashboard');
}
