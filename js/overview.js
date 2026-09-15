// 總覽頁：抓後端一趟算好的 getDashboard，快取先畫再背景更新（同 students.js 的秒開策略）
const DASH_CACHE_KEY = 'sa_dashboard_cache_v2';

let dashData = null;      // 完整 dashboard 回傳
let selectedDay = null;   // 目前選的日期字串 yyyy-MM-dd

const DOW = ['一', '二', '三', '四', '五', '六', '日'];  // 週一=0
const VENUE_COLOR = { '武士': '#B85060', '柔力': '#C4A07C' };

// 台灣今天 yyyy-MM-dd
function twToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

// 由 yyyy-MM-dd + n 天，回傳 yyyy-MM-dd（用 UTC 運算避免時區位移）
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return dt.getUTCFullYear() + '-' + mm + '-' + dd;
}

function refreshDashboard() { loadDashboard(true); }

async function loadDashboard(force) {
  // 頂部日期
  const now = new Date();
  const md = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'long', day: 'numeric' }).format(now);
  const wd = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'long' }).format(now);
  document.getElementById('oh-date').textContent = md + ' ' + wd;

  // 1) 快取先畫
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(DASH_CACHE_KEY) || 'null');
      if (cached && cached.overview) { dashData = cached; render(); }
    } catch (_) {}
  }

  // 2) 背景抓最新
  const btn = document.getElementById('oh-refresh');
  if (btn) btn.textContent = '更新中…';
  try {
    const data = await API.apiGet('getDashboard');
    if (data && data.overview) {
      dashData = data;
      render();
      try { localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
      if (btn) btn.textContent = '刷新';
    } else {
      throw new Error('bad_response');
    }
  } catch (_) {
    if (btn) btn.textContent = '更新失敗';
  }
}

function render() {
  const ov = dashData.overview;

  // KPI
  document.getElementById('kpi-students').textContent = ov.studentCount;
  document.getElementById('kpi-remaining').textContent = ov.remainingTotal;

  // 上課統計（本週/本月，各含武士/柔力）
  const bw = ov.weekByVenue || {}, bm = ov.monthByVenue || {};
  document.getElementById('stat-week').textContent = ov.weekCount;
  document.getElementById('stat-week-venue').textContent = `武士${bw['武士'] || 0} · 柔力${bw['柔力'] || 0}`;
  document.getElementById('stat-month').textContent = ov.monthCount;
  document.getElementById('stat-month-venue').textContent = `武士${bm['武士'] || 0} · 柔力${bm['柔力'] || 0}`;

  // 週範圍文字（9/7 – 9/13）
  const s = ov.weekRange.start, e = ov.weekRange.end;
  const short = ymd => { const p = ymd.split('-'); return `${Number(p[1])}/${Number(p[2])}`; };
  document.getElementById('week-range').textContent = `${short(s)} – ${short(e)}`;

  // 選今天（若在本週內），否則週一。若原本選的日子不在本週範圍（跨週/舊快取）也重設，
  // 避免背景更新換週後 selectedDay 停在上週造成「9/7 · 0堂」空清單。
  const today = twToday();
  if (!selectedDay || selectedDay < s || selectedDay > e) {
    selectedDay = (today >= s && today <= e) ? today : s;
  }

  renderWeekStrip();
  renderDayList();
}

// 某天有課的「代表色點」：有武士→紅，否則有柔力→棕，否則無點
function dayDotColor(dayStr) {
  const cs = dashData.overview.weekClasses.filter(c => c.date === dayStr);
  if (cs.some(c => c.venue === '武士')) return VENUE_COLOR['武士'];
  if (cs.some(c => c.venue === '柔力')) return VENUE_COLOR['柔力'];
  return 'transparent';
}

function renderWeekStrip() {
  const s = dashData.overview.weekRange.start;
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(s, i);
    const dnum = Number(day.split('-')[2]);
    const sel = day === selectedDay ? ' sel' : '';
    cells.push(
      `<div class="week-day${sel}" onclick="pickDay('${day}')">
        <div class="wd-dow">${DOW[i]}</div>
        <div class="wd-date">${dnum}</div>
        <div class="wd-dot" style="background:${dayDotColor(day)}"></div>
      </div>`
    );
  }
  document.getElementById('week-strip').innerHTML = cells.join('');
}

function pickDay(day) {
  selectedDay = day;
  renderWeekStrip();
  renderDayList();
}

function renderDayList() {
  const s = dashData.overview.weekRange.start;
  // 選日在本週的第幾天（0=週一）
  const dayIdx = Math.round((Date.parse(selectedDay + 'T00:00:00Z') - Date.parse(s + 'T00:00:00Z')) / 86400000);
  const label = DOW[dayIdx] !== undefined ? DOW[dayIdx] : '';
  const p = selectedDay.split('-');
  const cs = dashData.overview.weekClasses.filter(c => c.date === selectedDay);

  document.getElementById('day-title').textContent =
    `${Number(p[1])}/${Number(p[2])} 週${label} · ${cs.length} 堂`;

  const list = document.getElementById('day-list');
  if (!cs.length) {
    list.innerHTML = '<div style="padding:14px 0;color:#8e8e93;font-size:14px">這天沒有上課記錄</div>';
    return;
  }
  list.innerHTML = cs.map(c => {
    const color = VENUE_COLOR[c.venue] || '#8e8e93';
    const tagClass = (c.venue === '武士' || c.venue === '柔力') ? c.venue : '';
    const tagText = [c.venue, c.type].filter(Boolean).join(' · ') || '—';
    return `<div class="day-row">
      <div class="day-bar" style="background:${color}"></div>
      <div style="flex-grow:1;font-size:15px;font-weight:600">${c.name}</div>
      <span class="venue-tag ${tagClass}">${tagText}</span>
    </div>`;
  }).join('');
}

loadDashboard(false);
