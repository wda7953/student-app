let allStudents = [];
let lastClassMap = {};
let currentFilter = '全部';

// 快取帶版本號：改了資料結構或修 bug 時 bump 版本，舊格式快取自動失效
const OVERVIEW_CACHE_KEY = 'sa_overview_cache_v2';

// 標題列右側的同步狀態小字（更新中／更新失敗），避免「先畫舊快取」看起來像卡住
function setSyncStatus(text, kind) {
  let el = document.getElementById('sync-status');
  if (!el) {
    const header = document.querySelector('.header');
    if (!header) return;
    el = document.createElement('span');
    el.id = 'sync-status';
    el.style.cssText = 'font-size:12px;font-weight:400;margin-left:auto;margin-right:8px;align-self:center';
    // 插在「＋」按鈕之前
    const addBtn = header.querySelector('.back-btn');
    header.insertBefore(el, addBtn || null);
  }
  el.textContent = text || '';
  // 標題列是深棕底白字，用淺色系才看得清
  el.style.color = kind === 'error' ? '#ffd2cc' : 'rgba(255,255,255,0.8)';
  el.style.display = text ? '' : 'none';
}

async function loadStudents() {
  // 1) 先用本機快取「秒畫」出上次的清單，開 App 不必等後端醒來（Apps Script 冷啟動）
  let hadCache = false;
  try {
    const cached = JSON.parse(localStorage.getItem(OVERVIEW_CACHE_KEY) || 'null');
    if (cached && cached.students) {
      allStudents = cached.students;
      lastClassMap = cached.lastClassMap || {};
      applyFilter();
      hadCache = true;
    }
  } catch (_) {}

  // 2) 背景抓最新資料，回來再更新畫面並寫回快取
  setSyncStatus('更新中…');
  try {
    const data = await API.apiGet('getStudentsOverview');
    if (data && data.students) {
      allStudents = data.students;
      lastClassMap = data.lastClassMap || {};
      applyFilter();
      try {
        localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify({
          students: allStudents, lastClassMap: lastClassMap
        }));
      } catch (_) {}
      setSyncStatus('');            // 更新成功，清掉狀態
    } else {
      // 後端有回但不是預期格式（例如登入過期未完成）
      throw new Error('bad_response');
    }
  } catch (_) {
    // 失敗就明講，不再靜默卡在舊資料
    if (hadCache) {
      setSyncStatus('更新失敗，顯示的是上次資料', 'error');
    } else {
      setSyncStatus('更新失敗，請下拉重開', 'error');
      const list = document.getElementById('active-list');
      if (list) list.innerHTML = '<li class="student-item" style="color:#c0392b">載入失敗，請重開 App</li>';
    }
  }
}

function sortByLastClass(students) {
  return [...students].sort((a, b) => {
    const da = lastClassMap[a.id] || '';
    const db = lastClassMap[b.id] || '';
    return db.localeCompare(da);
  });
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === filter);
  });
  applyFilter();
}

function applyFilter() {
  const query = document.getElementById('search').value;
  let students = allStudents;

  if (query) students = students.filter(s => s.name.includes(query));

  if (currentFilter === '武士') {
    students = students.filter(s => s.venue === '武士');
  } else if (currentFilter === '柔力') {
    students = students.filter(s => s.venue === '柔力');
  } else if (currentFilter === '共課夥伴') {
    students = students.filter(s => s.partner_id);
  } else if (currentFilter === '單次') {
    students = students.filter(s => localStorage.getItem('single_rate_' + s.id));
  }

  renderStudents(students);
}

function renderStudents(students) {
  const active   = sortByLastClass(students.filter(s => s.status === 'active'));
  const inactive = sortByLastClass(students.filter(s => s.status !== 'active'));
  document.getElementById('active-list').innerHTML = active.length
    ? active.map(studentRow).join('')
    : '<li class="student-item" style="color:#8e8e93">無符合學員</li>';
  document.getElementById('inactive-list').innerHTML = inactive.map(studentRow).join('');
}

function studentRow(s) {
  const lastDate = lastClassMap[s.id] ? lastClassMap[s.id] : '未有記錄';
  const hasPartner = s.partner_id;
  const hasRate = localStorage.getItem('single_rate_' + s.id);
  const tags = [
    hasPartner ? '共課' : null,
    hasRate ? '單次' : null
  ].filter(Boolean).map(t => `<span style="font-size:11px;padding:1px 5px;border-radius:8px;background:#EDE5D8;color:#7A5C3E;font-weight:600">${t}</span>`).join(' ');
  return `<li class="student-item" onclick="location.href='student.html?id=${s.id}&v=39'">
    <div>
      <div class="student-name">${s.name} ${tags}</div>
      <div class="student-meta">${[s.venue, lastDate].filter(Boolean).join(' · ')}</div>
    </div>
    <span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}">
      ${s.status === 'active' ? '在線' : '結案'}
    </span>
  </li>`;
}

// 舊的 filterStudents 保留相容
function filterStudents(query) { applyFilter(); }

loadStudents();
