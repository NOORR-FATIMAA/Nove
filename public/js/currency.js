// Visitor-facing currency display. Base prices from the API are always PKR;
// this module only decides how to *render* them (PKR, USD, or both) and never
// affects any value sent back to the server.
const CURRENCY_MODE_KEY = 'nove_currency_mode';
const EXCHANGE_RATE_SESSION_KEY = 'nove_exchange_rate';
const GEO_TIMEOUT_MS = 8000;
const FALLBACK_RATE = 280;

// Good-enough bounding box for Pakistan; avoids depending on a third-party
// reverse-geocoding API being reachable.
const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.5, minLng: 60.5, maxLng: 77.5 };

let currentMode = localStorage.getItem(CURRENCY_MODE_KEY) || null;
let currentRate = null;

function isInPakistan(lat, lng) {
  return (
    lat >= PAKISTAN_BOUNDS.minLat &&
    lat <= PAKISTAN_BOUNDS.maxLat &&
    lng >= PAKISTAN_BOUNDS.minLng &&
    lng <= PAKISTAN_BOUNDS.maxLng
  );
}

function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    const timer = setTimeout(() => reject(new Error('Geolocation timed out')), GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos.coords);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 }
    );
  });
}

// Resolves to 'pkr' or 'usd' if location is available, 'both' otherwise
// (denied, unavailable, timed out, or errored).
async function resolveModeFromGeolocation() {
  try {
    const coords = await requestGeolocation();
    return isInPakistan(coords.latitude, coords.longitude) ? 'pkr' : 'usd';
  } catch (err) {
    return 'both';
  }
}

async function fetchExchangeRate() {
  const cached = sessionStorage.getItem(EXCHANGE_RATE_SESSION_KEY);
  if (cached) return Number(cached);

  try {
    const res = await api.get('/settings');
    const rate = Number(res.data.usdExchangeRate) || FALLBACK_RATE;
    sessionStorage.setItem(EXCHANGE_RATE_SESSION_KEY, String(rate));
    return rate;
  } catch (err) {
    return FALLBACK_RATE;
  }
}

function renderCurrencyControl() {
  const el = document.getElementById('currencyControl');
  if (!el) return;

  const mode = currentMode || 'both';
  const options = [
    { value: 'pkr', label: 'PKR' },
    { value: 'usd', label: 'USD' },
    { value: 'both', label: 'Both' },
  ];

  el.innerHTML = `
    <span class="currency-control-label">Currency:</span>
    ${options
      .map(
        (opt) =>
          `<button type="button" data-mode="${opt.value}" class="currency-btn${mode === opt.value ? ' active' : ''}">${opt.label}</button>`
      )
      .join('')}
    <button type="button" class="currency-btn" data-action="use-location">Use my location</button>
  `;

  el.querySelectorAll('button[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === currentMode) return;
      window.NoveCurrency.setMode(btn.dataset.mode);
      window.location.reload();
    });
  });

  const locBtn = el.querySelector('[data-action="use-location"]');
  if (locBtn) {
    locBtn.addEventListener('click', async () => {
      locBtn.disabled = true;
      await window.NoveCurrency.useMyLocation();
      window.location.reload();
    });
  }
}

async function initCurrency() {
  currentRate = await fetchExchangeRate();

  if (!currentMode) {
    currentMode = await resolveModeFromGeolocation();
    localStorage.setItem(CURRENCY_MODE_KEY, currentMode);
  }

  renderCurrencyControl();
  return { mode: currentMode, rate: currentRate };
}

// Other scripts (products.js, cart.js, checkout.js, ...) await this before
// rendering any price, the same way they already await window.noveUserReady.
window.currencyReady = initCurrency();

window.NoveCurrency = {
  getMode: () => currentMode || 'both',
  getRate: () => currentRate || FALLBACK_RATE,
  setMode(mode) {
    currentMode = mode;
    localStorage.setItem(CURRENCY_MODE_KEY, mode);
    renderCurrencyControl();
  },
  async useMyLocation() {
    const mode = await resolveModeFromGeolocation();
    window.NoveCurrency.setMode(mode);
    return mode;
  },
};

// Overrides the plain $-only formatMoney from api.js with a currency-mode-aware version.
function formatMoney(amountInPKR) {
  const amount = Number(amountInPKR) || 0;
  const mode = window.NoveCurrency ? window.NoveCurrency.getMode() : 'both';
  const rate = window.NoveCurrency ? window.NoveCurrency.getRate() : FALLBACK_RATE;

  const pkrStr = formatPKR(amount);
  const usdStr = `$${(amount / rate).toFixed(2)}`;

  if (mode === 'pkr') return pkrStr;
  if (mode === 'usd') return usdStr;
  return `${pkrStr} (~${usdStr})`;
}

document.addEventListener('DOMContentLoaded', () => {
  window.currencyReady.then(renderCurrencyControl);
});
