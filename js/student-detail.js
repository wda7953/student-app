const studentId = new URLSearchParams(location.search).get('id');

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
      const badge = label === '初級'
        ? `<span class="level-label level-beginner">初級</span>`
        : `<span class="level-label level-advanced">中級</span>`;
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

function goAddClass() { location.href = `add-class.html?id=${studentId}`; }
function goAddPayment() { location.href = `add-payment.html?id=${studentId}`; }

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

function renderInfoView(s) {
  const ledClass = s.status === 'active' ? 'led-green' : 'led-red';
  return `
    <div class="card-row">
      <span class="card-label">狀態</span>
      <span class="status-led ${ledClass}"></span>
    </div>
    <div class="card-row">
      <span class="card-label">地點</span>
      <span class="card-value">${s.venue || '-'}</span>
    </div>
    <div class="card-row">
      <span class="card-label">等級</span>
      <span class="card-value">${s.level || '-'}</span>
    </div>
    ${s.notes ? `<div class="card-row"><span class="card-label">備注</span><span class="card-value">${s.notes}</span></div>` : ''}
    <div class="card-row" style="justify-content:flex-end;border-bottom:none">
      <button onclick="editInfo()" style="background:none;border:none;color:#4A90D9;font-size:14px;cursor:pointer;font-weight:600">編輯</button>
    </div>
  `;
}

function renderInfoEdit(s) {
  return `
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">狀態</span>
      <select id="edit-status" class="edit-select">
        <option value="active" ${s.status === 'active' ? 'selected' : ''}>在線</option>
        <option value="inactive" ${s.status !== 'active' ? 'selected' : ''}>離線</option>
      </select>
    </div>
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">地點</span>
      <select id="edit-venue" class="edit-select">
        <option value="武士" ${s.venue === '武士' ? 'selected' : ''}>武士</option>
        <option value="柔力" ${s.venue === '柔力' ? 'selected' : ''}>柔力</option>
      </select>
    </div>
    <div class="card-row">
      <span class="card-label" style="flex-shrink:0">等級</span>
      <input id="edit-level" value="${s.level || ''}" class="edit-input" placeholder="-">
    </div>
    <div style="padding:12px 16px;border-bottom:1px solid #f2f2f7">
      <div class="card-label" style="margin-bottom:6px">備注</div>
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
  const data = {
    id: currentStudent.id,
    venue: document.getElementById('edit-venue').value,
    level: document.getElementById('edit-level').value,
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
  let students, classes, payments;
  try {
    [students, classes, payments] = await Promise.all([
      API.apiGet('getStudents'),
      API.apiGet('getClasses', { studentId }),
      API.apiGet('getPayments', { studentId })
    ]);
  } catch (e) {
    ['info-card', 'classes-card', 'payments-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.innerHTML = `<div class="empty">載入失敗，請重新整理</div>`; el.classList.remove('hidden'); }
    });
    return;
  }

  try {
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
    const sessionTag = p
      ? `<span class="session-tag">第${c._session_number}堂／${p.period_sessions}堂 ${p.package_name || ''}</span>`
      : '<span class="session-tag" style="background:#f5f5f5;color:#8e8e93">未連結付款</span>';
    const extraTag = Number(c.extra_charge) > 0
      ? `<span class="extra-charge-tag">+$${Number(c.extra_charge).toLocaleString()}</span>` : '';
    return `<div class="class-item ${classTypeClass(c.type)}">
      <div class="class-date-row">
        <span>${c.date}${c.notes ? ' · ' + escHtml(c.notes) : ''}</span>
        <span>${c.venue || ''} · ${c.type || ''}</span>
      </div>
      <div class="class-content">${formatContent(c.content)}</div>
      <div style="margin-top:6px">${sessionTag}${extraTag}</div>
    </div>`;
  }

  // 判斷是否有雙場地資料（重訓 + Pilates 在不同地點）
  const wushuClasses  = classes.filter(c => c.venue === '武士');
  const rouliClasses  = classes.filter(c => c.venue === '柔力');
  const isDual = wushuClasses.length > 0 && rouliClasses.length > 0;

  // 單欄卡片（縱向或只有單場地）
  document.getElementById('classes-card').innerHTML = classes.length
    ? classes.map(c => renderClassItem(c, payments)).join('')
    : '<div class="empty">尚無上課記錄</div>';

  // 雙欄分頁（橫向 iPad）
  const dualEl = document.getElementById('dual-classes');
  const singleCard = document.getElementById('classes-card');
  const toggleBtn = document.getElementById('toggle-view-btn');

  if (isDual && dualEl) {
    dualEl.innerHTML = `
      <div class="dual-view-col">
        <div class="dual-view-col-title wushu">武士 重訓</div>
        ${wushuClasses.length ? wushuClasses.map(c => renderClassItem(c, payments)).join('') : '<div class="empty">-</div>'}
      </div>
      <div class="dual-view-col">
        <div class="dual-view-col-title pilates">柔力 Pilates</div>
        ${rouliClasses.length ? rouliClasses.map(c => renderClassItem(c, payments)).join('') : '<div class="empty">-</div>'}
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

  document.getElementById('payments-card').innerHTML = payments.length
    ? [...payments].sort((a, b) => String(a.date).localeCompare(String(b.date))).map(p => {
        const used = classes.filter(c => c.payment_id === p.id).length;
        const pct = Math.min(100, Math.round(used / Number(p.period_sessions) * 100));
        return `<div class="payment-period">
          <div class="card-row" style="padding:0 0 8px">
            <div>
              <div class="card-value">${p.date} ${p.venue ? `· ${p.venue}` : ''}</div>
              <div class="card-label">${p.package_name || ''} · ${used}／${p.period_sessions} 堂</div>
            </div>
            <div style="text-align:right">
              <div class="card-value">$${Number(p.paid_amount).toLocaleString()}</div>
              <div class="card-label">共 $${Number(p.total_amount).toLocaleString()}</div>
            </div>
          </div>
          <div class="payment-progress"><div class="payment-progress-bar" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')
    : '<div class="empty">尚無收款記錄</div>';
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
