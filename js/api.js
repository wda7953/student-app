// 學員 App 前端 API — 加上密碼登入（只有知道密碼的人能讀寫學員資料）
// 流程：進 App 若無有效通行證 → 跳密碼框 → 後端驗密碼發通行證 → 存本機、之後自動帶著
const API_URL = 'https://script.google.com/macros/s/AKfycby5IQp2i2G1KyMx5EbvSfsaLaRZuCTUU3v-KyFcBUICebvDMCAxr3NHL_SMIo_yYzTL/exec';

let _session = null;
try { _session = localStorage.getItem('sa_session'); } catch (_) {}

let _authPromise = null; // 同一時間只跑一個登入流程，避免多筆請求各自跳登入

// 顯示密碼登入畫面，登入成功才 resolve
function _showLogin(errMsg) {
  return new Promise((resolve) => {
    let ov = document.getElementById('sa-login');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'sa-login';
      ov.style.cssText = 'position:fixed;inset:0;background:#faf8f5;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;box-sizing:border-box';
      ov.innerHTML =
        '<div style="font-size:22px;font-weight:700;color:#7A5C3E">學員管理</div>' +
        '<div id="sa-login-msg" style="color:#c0392b;font-size:13px;min-height:16px;text-align:center"></div>' +
        '<input id="sa-pw" type="password" autocomplete="current-password" placeholder="請輸入密碼" ' +
          'style="width:100%;max-width:280px;padding:14px;border:1px solid #d6cbbf;border-radius:12px;font-size:16px;outline:none;box-sizing:border-box">' +
        '<button id="sa-login-btn" style="width:100%;max-width:280px;padding:14px;background:#7A5C3E;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">登入</button>';
      document.body.appendChild(ov);
    }
    ov.style.display = 'flex';
    const msg = document.getElementById('sa-login-msg');
    const pw = document.getElementById('sa-pw');
    const btn = document.getElementById('sa-login-btn');
    msg.textContent = errMsg || '';
    pw.value = '';

    const submit = async () => {
      const password = pw.value;
      if (!password) return;
      btn.disabled = true; btn.textContent = '登入中…';
      try {
        const r = await fetch(API_URL + '?action=login', { method: 'POST', body: JSON.stringify({ password }) });
        const j = await r.json();
        if (j && j.success && j.session) {
          _session = j.session;
          try { localStorage.setItem('sa_session', _session); } catch (_) {}
          ov.style.display = 'none';
          btn.disabled = false; btn.textContent = '登入';
          resolve();
        } else {
          msg.textContent = '密碼錯誤，請再試一次';
          btn.disabled = false; btn.textContent = '登入';
          pw.focus();
        }
      } catch (err) {
        msg.textContent = '連線失敗，請稍後再試';
        btn.disabled = false; btn.textContent = '登入';
      }
    };
    btn.onclick = submit;
    pw.onkeydown = (ev) => { if (ev.key === 'Enter') submit(); };
    setTimeout(() => pw.focus(), 100);
  });
}

// 確保有通行證（沒有就登入）；多筆請求共用同一個登入流程
function ensureAuth(errMsg) {
  if (_session && !errMsg) return Promise.resolve();
  if (!_authPromise) {
    _authPromise = _showLogin(errMsg).then(() => { _authPromise = null; });
  }
  return _authPromise;
}

// 通行證失效時清掉
function _clearSession() {
  _session = null;
  try { localStorage.removeItem('sa_session'); } catch (_) {}
}

async function apiGet(action, params = {}) {
  await ensureAuth();
  const build = () => {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('session', _session);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  };
  let json = await (await fetch(build())).json();
  if (json && json.error === 'unauthorized') {
    _clearSession();
    await ensureAuth('登入已過期，請重新登入');
    json = await (await fetch(build())).json();
  }
  return json;
}

async function apiPost(action, data = {}) {
  await ensureAuth();
  const build = () => {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('session', _session);
    return url.toString();
  };
  let json = await (await fetch(build(), { method: 'POST', body: JSON.stringify(data) })).json();
  if (json && json.error === 'unauthorized') {
    _clearSession();
    await ensureAuth('登入已過期，請重新登入');
    json = await (await fetch(build(), { method: 'POST', body: JSON.stringify(data) })).json();
  }
  return json;
}

window.API = { apiGet, apiPost };
