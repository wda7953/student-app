const SVG_EDIT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const SVG_TRASH = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

const studentId = new URLSearchParams(location.search).get('id');

// 將日期轉為本地 YYYY-MM-DD，避免 UTC 時區差 -1 天
function localDate(val) {
  const d = new Date(val);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 解析課程內容：每個動作獨立一行，左邊名稱、右邊 setting（若有）
function formatContent(content) {
  if (!content) return '-';

  function parseItem(raw) {
    raw = raw.trim();
    const m = raw.match(/^(.+?)\s+\((.+)\)$/);
    return m ? { name: m[1].trim(), setting: m[2].trim() } : { name: raw, setting: '' };
  }

  function renderRow(raw) {
    const { name, setting } = parseItem(raw);
    return `<div class="content-ex-row">
      <span class="content-ex-name">${escHtml(name)}</span>
      ${setting ? `<span class="content-ex-setting">${escHtml(setting)}</span>` : ''}
    </div>`;
  }

  // Pilates 含初級/中級分組
  if (content.includes('初級：') || content.includes('中級：')) {
    return content.split('｜').map(section => {
      section = section.trim();
      let label = '', items = section;
      if (section.startsWith('初級：')) { label = '初級'; items = section.slice(3); }
      else if (section.startsWith('中級：')) { label = '中級'; items = section.slice(3); }
      const rows = items.split(' / ').map(renderRow).join('');
      const badge = `<span class="level-label level-beginner">${label}</span>`;
      return label ? `<div class="content-level-header">${badge}</div>${rows}` : rows;
    }).join('');
  }

  // 一般動作清單（/ 分隔）
  if (content.includes(' / ')) {
    return content.split(' / ').map(renderRow).join('');
  }

  // 純文字單行
  return renderRow(content);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// 課程項目的 CSS 類別（依類型加顏色）
function classTypeClass(type) {
  if (!type) return '';
  if (type === '重訓+Pilates' || type === '重訓＋Pilates') return 'type-重訓Pilates';
  if (type === 'Pilates') return 'type-Pilates';
  return 'type-重訓';
}

function goAddClass() {
  const v = currentStudent?.venue || '';
  location.href = `add-class.html?id=${studentId}${v ? '&venue=' + encodeURIComponent(v) : ''}`;
}
function goAddPayment() {
  const v = currentStudent?.venue || '';
  location.href = `add-payment.html?id=${studentId}${v ? '&venue=' + encodeURIComponent(v) : ''}`;
}

function toggleDualView() {
  const dual = document.getElementById('dual-classes');
  const single = document.getElementById('classes-card');
  const btn = document.getElementById('toggle-view-btn');
  const isDualShown = !dual.classList.contains('hidden');
  if (isDualShown) {
    dual.classList.add('hidden');
    single.classList.remove('hidden');
    btn.textContent = '分欄';
  } else {
    dual.classList.remove('hidden');
    single.classList.add('hidden');
    btn.textContent = '單欄';
  }
}

let currentStudent = null;
let allStudents = [];

function getPartnerName() {
  const pid = localStorage.getItem('partner_' + studentId);
  if (!pid) return null;
  const p = allStudents.find(s => s.id === pid);
  return p ? p.name : null;
}

function renderInfoView(s) {
  const ledClass = s.status === 'active' ? 'led-green' : 'led-red';
  const partnerName = getPartnerName();
  return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap">
      <span class="status-led ${ledClass}"></span>
      <span style="font-size:15px;font-weight:500">${s.venue || '-'}</span>
      <span style="color:#8e8e93;font-size:14px">共課夥伴：<span style="color:#1c1c1e">${partnerName || '-'}</span></span>
      <span style="color:#8e8e93;font-size:14px">備註：<span style="color:#1c1c1e">${s.notes || '-'}</span></span>
      <button onclick="editInfo()" style="margin-left:auto;background:none;border:none;color:#4A90D9;font-size:14px;cursor:pointer;font-weight:600">編輯</button>
    </div>
  `;
}

function renderInfoEdit(s) {
  const currentPartnerId = localStorage.getItem('partner_' + studentId) || '';
  const partnerOptions = allStudents
    .filter(p => p.id !== studentId && p.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
    .map(p => `<option value="${p.id}" ${p.id === currentPartnerId ? 'selected' : ''}>${p.name}</option>`)
    .join('');
  return `
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">狀態</span>
      <select id="edit-status" class="edit-select">
        <option value="active" ${s.status === 'active' ? 'selected' : ''}>在線</option>
        <option value="inactive" ${s.status !== 'active' ? 'selected' : ''}>離線</option>
      </select>
    </div>
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">預設地點</span>
      <select id="edit-venue" class="edit-select">
        <option value="武士" ${s.venue === '武士' ? 'selected' : ''}>武士</option>
        <option value="柔力" ${s.venue === '柔力' ? 'selected' : ''}>柔力</option>
      </select>
    </div>
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">單次費率</span>
      <input id="edit-single-rate" value="${localStorage.getItem('single_rate_' + studentId) || ''}" class="edit-input" placeholder="無（填金額啟用）" style="text-align:right">
    </div>
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">共課夥伴</span>
      <select id="edit-partner" class="edit-select">
        <option value="">無</option>
        ${partnerOptions}
      </select>
    </div>
    <div style="padding:12px 16px;border-bottom:1px solid #f2f2f7">
      <div class="card-label" style="margin-bottom:6px">備註</div>
      <textarea id="edit-notes" class="edit-textarea">${s.notes || ''}</textarea>
    </div>
    <div class="card-row" style="justify-content:flex-end;border-bottom:none;gap:16px">
      <button onclick="cancelEdit()" style="background:none;border:none;color:#8e8e93;font-size:14px;cursor:pointer">取消</button>
      <button onclick="saveInfo()" style="background:none;border:none;color:#4A90D9;font-size:14px;cursor:pointer;font-weight:600">儲存</button>
    </div>
  `;
}

function editInfo() {
  document.getElementById('info-card').innerHTML = renderInfoEdit(currentStudent);
}

function cancelEdit() {
  document.getElementById('info-card').innerHTML = renderInfoView(currentStudent);
}

async function saveInfo() {
  const saveBtn = document.querySelector('[onclick="saveInfo()"]');
  if (saveBtn) saveBtn.textContent = '儲存中…';
  const singleRateVal = document.getElementById('edit-single-rate')?.value.trim();
  if (singleRateVal) {
    localStorage.setItem('single_rate_' + studentId, singleRateVal);
  } else {
    localStorage.removeItem('single_rate_' + studentId);
  }
  const partnerVal = document.getElementById('edit-partner')?.value;
  if (partnerVal !== undefined) {
    if (partnerVal) {
      localStorage.setItem('partner_' + studentId, partnerVal);
      localStorage.setItem('partner_' + partnerVal, studentId); // 雙向
    } else {
      localStorage.removeItem('partner_' + studentId);
    }
  }
  const data = {
    id: currentStudent.id,
    venue: document.getElementById('edit-venue').value,
    status: document.getElementById('edit-status').value,
    notes: document.getElementById('edit-notes').value
  };
  await API.apiPost('updateStudent', data);
  currentStudent = { ...currentStudent, ...data };
  document.getElementById('info-card').innerHTML = renderInfoView(currentStudent);
}

function sessionLabel(cls, payments) {
  if (!cls.payment_id) return '';
  const p = payments.find(p => p.id === cls.payment_id);
  if (!p) return '';
  return p;
}

async function load() {
  let students, classes, payments, partnerClasses = [];
  try {
    const partnerId = localStorage.getItem('partner_' + studentId) || '';
    const reqs = [
      API.apiGet('getStudents'),
      API.apiGet('getClasses', { studentId }),
      API.apiGet('getPayments', { studentId }),
      partnerId ? API.apiGet('getClasses', { studentId: partnerId }) : Promise.resolve([])
    ];
    const [s0, s1, s2, s3] = await Promise.all(reqs);
    [students, classes, payments, partnerClasses] = [s0, s1, s2, s3];
  } catch (e) {
    ['info-card', 'classes-card', 'payments-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.innerHTML = `<div class="empty">載入失敗，請重新整理</div>`; el.classList.remove('hidden'); }
    });
    return;
  }

  try {
  allStudents = students;
  const s = students.find(s => s.id === studentId);
  if (!s) { document.body.innerHTML = '<div class="empty">找不到學員</div>'; return; }
  currentStudent = s;

  document.getElementById('student-name').textContent = s.name;
  document.getElementById('info-card').innerHTML = renderInfoView(s);

  const usedCount = {};
  const classesAsc = [...classes].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  classesAsc.forEach(c => {
    if (c.payment_id) {
      usedCount[c.payment_id] = (usedCount[c.payment_id] || 0) + 1;
      c._session_number = usedCount[c.payment_id];
    }
  });

  function renderClassItem(c, payments) {
    const p = c.payment_id ? payments.find(p => p.id === c.payment_id) : null;
    const sessionInfo = !c.payment_id
      ? `<span class="unlink-tag" onclick="openLinkModal('${c.id}')">未連結 · 連結▸</span>`
      : p
        ? `<span class="header-session">第${c._session_number}堂／${p.period_sessions}堂</span>`
        : `<span class="header-session">已連結（共用）</span>`;
    const extraTag = Number(c.extra_charge) > 0
      ? `<span class="extra-charge-tag">+$${Number(c.extra_charge).toLocaleString()}</span>` : '';
    const dateStr = localDate(c.date);
    const typeClass = c.type === 'Pilates' ? 'type-Pilates' : 'type-重訓';
    return `<div class="class-item ${typeClass}">
      <div class="class-header">
        <span class="header-date">${dateStr}${c.notes ? ' · ' + escHtml(c.notes) : ''}</span>
        <span style="display:flex;align-items:center;gap:6px">
          ${sessionInfo}${extraTag}
          <button onclick="editClassItem('${c.id}')" style="background:none;border:none;color:#8e8e93;cursor:pointer;padding:0;line-height:1" title="編輯">${SVG_EDIT}</button>
          <button onclick="deleteClassItem('${c.id}')" style="background:none;border:none;color:#c7c7cc;cursor:pointer;padding:0;line-height:1" title="刪除">${SVG_TRASH}</button>
        </span>
      </div>
      <div class="class-body"><div class="class-content">${formatContent(c.content)}</div></div>
    </div>`;
  }

  // 最新在最上：日期降冪排列
  const classesDesc = [...classes].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // 按月份分組渲染，最新月份展開，其餘收合
  function renderByMonth(classList, pmts) {
    if (!classList.length) return '<div class="empty">尚無上課記錄</div>';
    const groups = {};
    classList.forEach(c => {
      const key = localDate(c.date).slice(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    const months = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return months.map((month, idx) => {
      const [y, m] = month.split('-');
      const label = `${y}年${Number(m)}月`;
      const count = groups[month].length;
      const isOpen = idx === 0;
      const mid = 'mg_' + month + '_' + Math.random().toString(36).slice(2, 6);
      return `<div class="month-group">
        <div class="month-header" onclick="toggleMonth('${mid}')">
          <span class="month-arrow">${isOpen ? '▼' : '▶'}</span>
          <span>${label}（${count}堂）</span>
        </div>
        <div id="${mid}"${isOpen ? '' : ' class="hidden"'}>
          ${groups[month].map(c => renderClassItem(c, pmts)).join('')}
        </div>
      </div>`;
    }).join('');
  }

  // 判斷是否有雙場地資料（重訓 + Pilates 在不同地點）
  const wushuClasses = classesDesc.filter(c => c.venue === '武士');
  const rouliClasses = classesDesc.filter(c => c.venue === '柔力');
  const isDual = wushuClasses.length > 0 && rouliClasses.length > 0;

  // 單欄卡片（縱向或只有單場地）
  document.getElementById('classes-card').innerHTML = renderByMonth(classesDesc, payments);

  // 雙欄分頁（橫向 iPad）
  const dualEl = document.getElementById('dual-classes');
  const singleCard = document.getElementById('classes-card');
  const toggleBtn = document.getElementById('toggle-view-btn');

  if (isDual && dualEl) {
    const firstIsRouli = s.venue === '柔力';
    dualEl.innerHTML = firstIsRouli ? `
      <div class="dual-view-col">
        ${rouliClasses.length ? renderByMonth(rouliClasses, payments) : '<div class="empty">-</div>'}
      </div>
      <div class="dual-view-col">
        ${wushuClasses.length ? renderByMonth(wushuClasses, payments) : '<div class="empty">-</div>'}
      </div>` : `
      <div class="dual-view-col">
        ${wushuClasses.length ? renderByMonth(wushuClasses, payments) : '<div class="empty">-</div>'}
      </div>
      <div class="dual-view-col">
        ${rouliClasses.length ? renderByMonth(rouliClasses, payments) : '<div class="empty">-</div>'}
      </div>`;
    // 預設：雙欄顯示、單欄隱藏
    dualEl.classList.remove('hidden');
    singleCard.classList.add('hidden');
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
  } else if (dualEl) {
    dualEl.classList.add('hidden');
    singleCard.classList.remove('hidden');
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  function renderPaymentItem(p) {
    const selfUsed = classes.filter(c => c.payment_id === p.id).length;
    const partnerUsed = (partnerClasses || []).filter(c => c.payment_id === p.id).length;
    const totalUsed = selfUsed + partnerUsed;
    const total = Number(p.period_sessions);
    const partnerName = partnerUsed > 0 ? getPartnerName() : '';
    const usedLabel = partnerUsed > 0
      ? `${selfUsed}＋${partnerUsed}（${partnerName}）＝${totalUsed}／${total} 堂`
      : `${totalUsed}／${total} 堂`;
    const ringColor = p.venue === '柔力' ? '#C4A07C' : '#B85060';
    const circ = 125.7;
    const dash = (Math.min(totalUsed / total, 1) * circ).toFixed(1);
    return `<div class="payment-period venue-${p.venue || ''}">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div class="card-value" style="display:flex;justify-content:space-between;align-items:baseline">
            <span>${localDate(p.date)}</span>
            <span style="margin-right:8px">$${Number(p.total_amount).toLocaleString()}</span>
          </div>
          <div class="card-label">${p.package_name || ''} · ${usedLabel}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e5ea" stroke-width="4"/>
            <circle cx="24" cy="24" r="20" fill="none" stroke="${ringColor}" stroke-width="4"
              stroke-dasharray="${dash} ${circ}" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 24 24)"/>
            <text x="24" y="28" text-anchor="middle" font-size="10" font-weight="700" fill="#1c1c1e">${totalUsed}/${total}</text>
          </svg>
          <button onclick="editPaymentItem('${p.id}')" style="background:none;border:none;color:#4A90D9;cursor:pointer;padding:0;line-height:1" title="編輯">${SVG_EDIT}</button>
        </div>
      </div>
    </div>`;
  }

  function renderPaymentsByMonth(paymentList) {
    if (!paymentList.length) return '<div class="empty">尚無收款記錄</div>';
    const groups = {};
    paymentList.forEach(p => {
      const key = localDate(p.date).slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    const months = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return months.map((month, idx) => {
      const [y, m] = month.split('-');
      const label = `${y}年${Number(m)}月`;
      const isOpen = idx === 0;
      const mid = 'pm_' + month + '_' + Math.random().toString(36).slice(2, 6);
      return `<div class="month-group">
        <div class="month-header" onclick="toggleMonth('${mid}')">
          <span class="month-arrow">${isOpen ? '▼' : '▶'}</span>
          <span>${label}（${groups[month].length}筆）</span>
        </div>
        <div id="${mid}"${isOpen ? '' : ' class="hidden"'}>
          ${groups[month].map(renderPaymentItem).join('')}
        </div>
      </div>`;
    }).join('');
  }

  const sortedPayments = [...payments].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const wushuPayments = sortedPayments.filter(p => p.venue === '武士');
  const rouliPayments = sortedPayments.filter(p => p.venue === '柔力');
  const hasBoth = wushuPayments.length > 0 && rouliPayments.length > 0;

  if (hasBoth) {
    document.getElementById('payments-card').classList.add('hidden');
    const dual = document.getElementById('dual-payments');
    dual.classList.remove('hidden');
    const firstIsRouli = s.venue === '柔力';
    dual.innerHTML = firstIsRouli ? `
      <div class="dual-view-col">
        ${renderPaymentsByMonth(rouliPayments)}
      </div>
      <div class="dual-view-col">
        ${renderPaymentsByMonth(wushuPayments)}
      </div>` : `
      <div class="dual-view-col">
        ${renderPaymentsByMonth(wushuPayments)}
      </div>
      <div class="dual-view-col">
        ${renderPaymentsByMonth(rouliPayments)}
      </div>`;
  } else {
    document.getElementById('dual-payments').classList.add('hidden');
    document.getElementById('payments-card').classList.remove('hidden');
    document.getElementById('payments-card').innerHTML = renderPaymentsByMonth(sortedPayments);
  }
  } catch(e) {
    ['info-card', 'classes-card', 'payments-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.innerHTML = `<div class="empty">錯誤：${e.message}</div>`; el.classList.remove('hidden'); }
    });
  }
}

load();

// bfcache 恢復時（iOS Safari PWA history.back()）重新載入資料
window.addEventListener('pageshow', (e) => { if (e.persisted) load(); });

// ── 連結付款 modal ────────────────────────────────────
let linkingClassId = null;

function openLinkModal(classId) {
  linkingClassId = classId;
  const modal = document.getElementById('link-modal');
  modal.classList.remove('hidden');
  const partnerId = localStorage.getItem('partner_' + studentId) || '';
  const sel = document.getElementById('link-student-sel');
  const self = allStudents.find(s => s.id === studentId);
  const others = allStudents
    .filter(s => s.status === 'active' && s.id !== studentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
  const allOpts = self ? [self, ...others] : others;
  sel.innerHTML = allOpts
    .map(s => `<option value="${s.id}" ${s.id === (partnerId || studentId) ? 'selected' : ''}>${s.name}${s.id === studentId ? '（本人）' : ''}</option>`)
    .join('');
  loadLinkPayments();
}

async function loadLinkPayments() {
  const targetId = document.getElementById('link-student-sel').value;
  const list = document.getElementById('link-payments-list');
  if (!targetId) { list.innerHTML = ''; return; }
  list.innerHTML = '<div class="empty">載入中…</div>';
  const [payments, targetClasses] = await Promise.all([
    API.apiGet('getPayments', { studentId: targetId }),
    API.apiGet('getClasses', { studentId: targetId })
  ]);
  if (!payments.length) { list.innerHTML = '<div class="empty">無收款記錄</div>'; return; }

  const usedMap = {};
  targetClasses.forEach(c => { if (c.payment_id) usedMap[c.payment_id] = (usedMap[c.payment_id] || 0) + 1; });

  const active = payments
    .filter(p => (usedMap[p.id] || 0) < Number(p.period_sessions))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!active.length) { list.innerHTML = '<div class="empty">無未完成的付款週期</div>'; return; }

  list.innerHTML = active.map((p, i) => {
    const remaining = Number(p.period_sessions) - (usedMap[p.id] || 0);
    return `<label class="link-payment-row">
      <input type="radio" name="link-payment" value="${p.id}" ${i === 0 ? 'checked' : ''}>
      <div>
        <div class="card-value">${localDate(p.date)} ${p.package_name || ''}</div>
        <div class="card-label">剩 ${remaining}/${p.period_sessions} 堂 · $${Number(p.paid_amount).toLocaleString()}</div>
      </div>
    </label>`;
  }).join('');
}

function closeLinkModal() {
  document.getElementById('link-modal').classList.add('hidden');
  linkingClassId = null;
}

async function confirmLink() {
  const paymentId = document.querySelector('#link-payments-list input[name=link-payment]:checked')?.value;
  if (!paymentId || !linkingClassId) return;
  await API.apiPost('updateClass', { id: linkingClassId, payment_id: paymentId });
  closeLinkModal();
  load();
}

function toggleMonth(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const isHidden = body.classList.toggle("hidden");
  const arrow = body.previousElementSibling.querySelector(".month-arrow");
  if (arrow) arrow.textContent = isHidden ? "▶" : "▼";
}

async function deleteClassItem(classId) {
  if (!confirm('確定刪除這筆上課記錄？')) return;
  await API.apiPost('deleteClass', { id: classId });
  load();
}

function editClassItem(classId) {
  location.href = `add-class.html?edit=${classId}&id=${studentId}`;
}

function editPaymentItem(paymentId) {
  location.href = `add-payment.html?edit=${paymentId}&id=${studentId}`;
}
