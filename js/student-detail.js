const studentId = new URLSearchParams(location.search).get('id');

function goAddClass() { location.href = `add-class.html?id=${studentId}`; }
function goAddPayment() { location.href = `add-payment.html?id=${studentId}`; }

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
  const [students, classes, payments] = await Promise.all([
    API.apiGet('getStudents'),
    API.apiGet('getClasses', { studentId }),
    API.apiGet('getPayments', { studentId })
  ]);

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

  document.getElementById('classes-card').innerHTML = classes.length
    ? classes.map(c => {
        const p = c.payment_id ? payments.find(p => p.id === c.payment_id) : null;
        const sessionTag = p ? `<span class="session-tag">第${c._session_number}堂／${p.period_sessions}堂 ${p.package_name || ''}</span>` : '<span class="session-tag" style="background:#f5f5f5;color:#8e8e93">未連結付款</span>';
        const extraTag = Number(c.extra_charge) > 0 ? `<span class="extra-charge-tag">+$${Number(c.extra_charge).toLocaleString()}</span>` : '';
        return `<div class="class-item">
          <div class="class-date">${c.date} · ${c.venue || ''} · ${c.type || ''}</div>
          <div class="class-content">${c.content || '-'}</div>
          <div style="margin-top:6px">${sessionTag}${extraTag}</div>
          ${c.notes ? `<div class="class-date" style="margin-top:4px">${c.notes}</div>` : ''}
        </div>`;
      }).join('')
    : '<div class="empty">尚無上課記錄</div>';

  document.getElementById('payments-card').innerHTML = payments.length
    ? payments.map(p => {
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
}

load();
