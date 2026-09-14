// 收費頁：與總覽共用 getDashboard 快取。收入認列跟 email-summary/app_income.py 同口徑：
// 一律用 total_amount(欄名 amount)；柔力100%(單次/套餐分列)；武士收款×60%(排除黃誼淇)。
const DASH_CACHE_KEY = 'sa_dashboard_cache_v2';

let ch = null;          // charging 區塊 {payments, roulieUnrealized, roulieRemainSessions, wushiSkip, wushiRate}
let curRange = '本月';

const VENUE_COLOR = { '武士': '#B85060', '柔力': '#C4A07C' };

function money(n) { return '$' + Number(n || 0).toLocaleString(); }

// 台灣 yyyy-MM / yyyy
function twMonth() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7); }
function twYear()  { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(new Date()).slice(0, 4); }
function prevMonth() {
  const [y, m] = twMonth().split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return py + '-' + String(pm).padStart(2, '0');
}

async function loadCharging() {
  try {
    const cached = JSON.parse(localStorage.getItem(DASH_CACHE_KEY) || 'null');
    if (cached && cached.charging) { ch = cached.charging; render(); }
  } catch (_) {}

  try {
    const data = await API.apiGet('getDashboard');
    if (data && data.charging) {
      ch = data.charging;
      render();
      try { localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
    } else if (!ch) {
      throw new Error('bad_response');
    }
  } catch (_) {
    if (!ch) document.getElementById('pay-list').innerHTML =
      '<div style="color:#c0392b;font-size:14px;padding:8px 2px">載入失敗，請重開</div>';
  }
}

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
  return true; // 全部
}

function render() {
  const rows = (ch.payments || []).filter(p => inRange(p.date));
  const skip = ch.wushiSkip || ['黃誼淇'];
  const rate = ch.wushiRate || 0.6;

  // 柔力：單次(period_sessions==1) / 套餐(>1)，全額 100%
  let rSingle = 0, rPackage = 0;
  // 武士：收款加總（排除名單）→ ×60%
  let wGross = 0;
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
  const total = rTotal + wIncome;

  const rangeLabel = curRange;
  document.getElementById('sum-label').textContent = rangeLabel;
  document.getElementById('sum-total').textContent = money(total);
  document.getElementById('r-single').textContent = money(rSingle);
  document.getElementById('r-package').textContent = money(rPackage);
  document.getElementById('r-total').textContent = money(rTotal);
  document.getElementById('w-gross').textContent = money(wGross);
  document.getElementById('w-income').textContent = money(wIncome);

  // 未上課預收（柔力，目前值，不隨區間變）
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

loadCharging();
