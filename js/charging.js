// 收費頁：第二層鎖。要輸入收費密碼 → 後端 getCharging 驗證 CHARGING_PASSWORD 才回資料。
// 收入認列同 email-summary/app_income.py：金額用 total_amount；柔力100%(單次/套餐分列)；武士收款×60%排除黃誼淇。
// ⚠️ 收費資料不寫 localStorage（避免收入外洩）；收費密碼只暫存 sessionStorage（關掉 App 就要重輸）。

let ch = null;          // charging 資料（只放記憶體）
let curRange = '本月';

const VENUE_COLOR = { '武士': '#B85060', '柔力': '#C4A07C' };
const CP_KEY = 'sa_charge_cp';

function money(n) { return '$' + Number(n || 0).toLocaleString(); }
function twMonth() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7); }
function twYear()  { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(new Date()).slice(0, 4); }
function prevMonth() {
  const [y, m] = twMonth().split('-').map(Number);
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  return py + '-' + String(pm).padStart(2, '0');
}

// ── 解鎖 ──
// 回傳 'ok' | 'wrong'(密碼錯) | 'fail'(連線/其他)
async function tryCp(pass) {
  let data;
  try { data = await API.apiPost('getCharging', { cp: pass }); } catch (_) { return 'fail'; }
  if (data && data.payments) {
    ch = data;
    try { sessionStorage.setItem(CP_KEY, pass); } catch (_) {}
    return 'ok';
  }
  if (data && data.error === 'charge_unauthorized') return 'wrong';
  return 'fail';
}

function showLock(errMsg) {
  let ov = document.getElementById('charge-lock');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'charge-lock';
    ov.style.cssText = 'position:fixed;inset:0;background:#FAF7F2;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;box-sizing:border-box';
    ov.innerHTML =
      '<div style="width:52px;height:52px;border-radius:16px;background:#F2EBE0;display:flex;align-items:center;justify-content:center">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7A5C3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
      '</div>' +
      '<div style="font-size:20px;font-weight:700;color:#1c1c1e">收費已上鎖</div>' +
      '<div id="cl-msg" style="color:#c0392b;font-size:13px;min-height:16px;text-align:center"></div>' +
      '<input id="cl-pw" type="password" inputmode="numeric" autocomplete="off" placeholder="輸入收費密碼" ' +
        'style="width:100%;max-width:280px;padding:14px;border:1px solid #d6cbbf;border-radius:12px;font-size:16px;outline:none;box-sizing:border-box;text-align:center">' +
      '<button id="cl-btn" style="width:100%;max-width:280px;padding:14px;background:#6B5C52;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">解鎖</button>' +
      '<a href="overview.html?v=36" style="color:#8e8e93;font-size:14px;text-decoration:none">‹ 返回總覽</a>';
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  const msg = document.getElementById('cl-msg');
  const pw = document.getElementById('cl-pw');
  const btn = document.getElementById('cl-btn');
  msg.textContent = errMsg || '';
  pw.value = '';
  const submit = async () => {
    const pass = pw.value;
    if (!pass) return;
    btn.disabled = true; btn.textContent = '驗證中…';
    const r = await tryCp(pass);
    btn.disabled = false; btn.textContent = '解鎖';
    if (r === 'ok') { ov.style.display = 'none'; render(); }
    else if (r === 'wrong') { msg.textContent = '收費密碼錯誤'; pw.value = ''; pw.focus(); }
    else { msg.textContent = '載入失敗，請稍後再試'; }
  };
  btn.onclick = submit;
  pw.onkeydown = (ev) => { if (ev.key === 'Enter') submit(); };
  setTimeout(() => pw.focus(), 100);
}

async function init() {
  let cp = null;
  try { cp = sessionStorage.getItem(CP_KEY); } catch (_) {}
  if (cp) {
    const r = await tryCp(cp);
    if (r === 'ok') { render(); return; }
    if (r === 'wrong') { try { sessionStorage.removeItem(CP_KEY); } catch (_) {} }
  }
  showLock();
}

// ── 顯示 ──
function setRange(r) {
  curRange = r;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.textContent === r));
  render();
}

function inRange(dateStr) {
  if (!dateStr) return curRange === '全部';
  if (curRange === '本月') return dateStr.slice(0, 7) === twMonth();
  if (curRange === '上月') return dateStr.slice(0, 7) === prevMonth();
  if (curRange === '今年') return dateStr.slice(0, 4) === twYear();
  return true;
}

function render() {
  if (!ch) return;
  const rows = (ch.payments || []).filter(p => inRange(p.date));
  const skip = ch.wushiSkip || ['黃誼淇'];
  const rate = ch.wushiRate || 0.6;

  let rSingle = 0, rPackage = 0, wGross = 0;
  rows.forEach(p => {
    if (p.venue === '柔力') {
      if (Number(p.period_sessions) === 1) rSingle += Number(p.amount || 0);
      else rPackage += Number(p.amount || 0);
    } else if (p.venue === '武士') {
      if (skip.indexOf(p.name) >= 0) return;
      wGross += Number(p.amount || 0);
    }
  });
  const rTotal = rSingle + rPackage;
  const wIncome = Math.round(wGross * rate);

  document.getElementById('sum-label').textContent = curRange;
  document.getElementById('sum-total').textContent = money(rTotal + wIncome);
  document.getElementById('r-single').textContent = money(rSingle);
  document.getElementById('r-package').textContent = money(rPackage);
  document.getElementById('r-total').textContent = money(rTotal);
  document.getElementById('w-gross').textContent = money(wGross);
  document.getElementById('w-income').textContent = money(wIncome);
  document.getElementById('r-unrealized').textContent = money(ch.roulieUnrealized);
  document.getElementById('r-unrealized-sessions').textContent = (ch.roulieRemainSessions || 0) + ' 堂';

  renderList(rows);
}

function renderList(rows) {
  document.getElementById('ch-count').textContent = curRange + ' ' + rows.length + ' 筆';
  const el = document.getElementById('pay-list');
  if (!rows.length) {
    el.innerHTML = '<div style="color:#8e8e93;font-size:14px;padding:8px 2px">此區間沒有收費紀錄</div>';
    return;
  }
  el.innerHTML = rows.map(p => {
    const color = VENUE_COLOR[p.venue] || '#8e8e93';
    const kind = Number(p.period_sessions) === 1 ? '單次' : (p.period_sessions ? p.period_sessions + ' 堂' : '');
    const tag = [p.venue, kind].filter(Boolean).join(' · ');
    const meta = [p.date, p.package_name].filter(Boolean).join(' · ');
    return `<div class="pay-card">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex-grow:1">
        <div style="display:flex;align-items:baseline;justify-content:space-between">
          <span style="font-size:16px;font-weight:700">${p.name}</span>
          <span style="font-size:17px;font-weight:700;color:#6B5C52">${money(p.amount)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap">
          <span style="font-size:12px;color:#8e8e93">${meta}</span>
          ${tag ? `<span class="venue-tag ${p.venue}">${tag}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

init();
