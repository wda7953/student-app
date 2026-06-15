const studentId = new URLSearchParams(location.search).get('id');

function goAddClass() { location.href = `add-class.html?id=${studentId}`; }
function goAddPayment() { location.href = `add-payment.html?id=${studentId}`; }

function sessionLabel(cls, payments) {
  if (!cls.payment_id) return '';
  const p = payments.find(p => p.id === cls.payment_id);
  if (!p) return '';
  // 找這堂是第幾堂：同 payment 的課，按日期排序
  const linked = [];
  // 先取所有 classes（已在外部排好）
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

  document.getElementById('student-name').textContent = s.name;
  document.getElementById('info-card').innerHTML = `
    <div class="card-row"><span class="card-label">地點</span><span class="card-value">${s.venue || '-'}</span></div>
    <div class="card-row"><span class="card-label">等級</span><span class="card-value">${s.level || '-'}</span></div>
    <div class="card-row"><span class="card-label">電話</span><span class="card-value">${s.phone || '-'}</span></div>
    <div class="card-row"><span class="card-label">狀態</span><span class="card-value">${s.status === 'active' ? '在線' : '結案'}</span></div>
    ${s.notes ? `<div class="card-row"><span class="card-label">備註</span><span class="card-value">${s.notes}</span></div>` : ''}
  `;

  // 計算每堂課是第幾堂（依付款周期）
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
