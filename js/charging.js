// 收費頁：與總覽共用同一份 getDashboard 快取，KPI 用後端算好的值，紀錄清單前端依區間篩選
const DASH_CACHE_KEY = 'sa_dashboard_cache_v1';

let chData = null;      // charging 區塊
let curRange = '本月';

const VENUE_COLOR = { '武士': '#B85060', '柔力': '#C4A07C' };

function money(n) { return '$' + Number(n || 0).toLocaleString(); }

// 台灣的 yyyy-MM / yyyy
function twMonth() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7); }
function twYear()  { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(new Date()).slice(0, 4); }
function prevMonth() {
  const [y, m] = twMonth().split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return py + '-' + String(pm).padStart(2, '0');
}

async function loadCharging() {
  // 快取先畫
  try {
    const cached = JSON.parse(localStorage.getItem(DASH_CACHE_KEY) || 'null');
    if (cached && cached.charging) { chData = cached.charging; render(); }
  } catch (_) {}

  try {
    const data = await API.apiGet('getDashboard');
    if (data && data.charging) {
      chData = data.charging;
      render();
      try { localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
    } else if (!chData) {
      throw new Error('bad_response');
    }
  } catch (_) {
    if (!chData) document.getElementById('pay-list').innerHTML =
      '<div style="color:#c0392b;font-size:14px;padding:8px 2px">載入失敗，請重開</div>';
  }
}

function setRange(r) {
  curRange = r;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.textContent === r));
  renderList();
}

function render() {
  document.getElementById('kpi-month').textContent = money(chData.monthReceived);
  document.getElementById('kpi-month-count').textContent = chData.monthReceivedCount + ' 筆';
  document.getElementById('kpi-total').textContent = money(chData.totalIncome);
  document.getElementById('kpi-total-count').textContent = chData.totalCount + ' 筆';
  document.getElementById('kpi-prepaid').textContent = money(chData.unrealizedPrepaid);
  renderList();
}

function inRange(dateStr) {
  if (!dateStr) return curRange === '全部';
  if (curRange === '本月') return dateStr.slice(0, 7) === twMonth();
  if (curRange === '上月') return dateStr.slice(0, 7) === prevMonth();
  if (curRange === '今年') return dateStr.slice(0, 4) === twYear();
  return true; // 全部
}

function renderList() {
  const list = (chData.payments || []).filter(p => inRange(p.date));
  document.getElementById('ch-count').textContent = curRange + ' ' + list.length + ' 筆';
  const el = document.getElementById('pay-list');
  if (!list.length) {
    el.innerHTML = '<div style="color:#8e8e93;font-size:14px;padding:8px 2px">此區間沒有收費紀錄</div>';
    return;
  }
  el.innerHTML = list.map(p => {
    const color = VENUE_COLOR[p.venue] || '#8e8e93';
    const meta = [p.date, p.package_name].filter(Boolean).join(' · ');
    const sessions = p.period_sessions ? p.period_sessions + ' 堂' : '';
    return `<div class="pay-card">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex-grow:1">
        <div style="display:flex;align-items:baseline;justify-content:space-between">
          <span style="font-size:16px;font-weight:700">${p.name}</span>
          <span style="font-size:17px;font-weight:700;color:#6B5C52">${money(p.paid_amount)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap">
          <span style="font-size:12px;color:#8e8e93">${meta}</span>
          ${sessions ? `<span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;background:#F2EBE0;color:#7A5C3E">${sessions}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

loadCharging();
