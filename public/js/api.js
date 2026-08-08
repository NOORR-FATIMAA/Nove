// Thin fetch wrapper for the Nove API. JWT is handled automatically via the httpOnly cookie.
const API_BASE = '/api';

async function apiRequest(path, { method = 'GET', body, isFormData = false } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (body !== undefined) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body, opts = {}) => apiRequest(path, { method: 'POST', body, ...opts }),
  patch: (path, body, opts = {}) => apiRequest(path, { method: 'PATCH', body, ...opts }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};

function qs(obj) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  const str = params.toString();
  return str ? `?${str}` : '';
}

// Base prices from the API are always PKR. formatPKR always renders PKR
// regardless of visitor currency preference (used by the admin panel, which
// must show the business's own bookkeeping currency).
function formatPKR(amount) {
  return `Rs ${Math.round(Number(amount) || 0).toLocaleString('en-US')}`;
}

// currency.js overrides this with a currency-mode-aware version on storefront
// pages; this is the fallback for any page that doesn't load currency.js.
function formatMoney(amount) {
  return formatPKR(amount);
}

function showAlert(el, message, type = 'error') {
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
}

function hideAlert(el) {
  if (!el) return;
  el.className = 'alert';
  el.textContent = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function starsHtml(rating) {
  const rounded = Math.round(Number(rating) || 0);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}
