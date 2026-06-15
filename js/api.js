const API_URL = 'https://script.google.com/macros/s/AKfycby5IQp2i2G1KyMx5EbvSfsaLaRZuCTUU3v-KyFcBUICebvDMCAxr3NHL_SMIo_yYzTL/exec';

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(action, data) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  const res = await fetch(url.toString(), {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}

window.API = { apiGet, apiPost };
