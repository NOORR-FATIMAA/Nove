// Light/dark theme toggle. Default is light — dark is opt-in only.
//
// This file is loaded, unminified and un-deferred, from <head> (after the
// stylesheet) specifically so the IIFE below runs before first paint and
// sets data-theme="dark" synchronously when that's the stored preference —
// avoiding a flash of the light theme on every dark-mode page load. The
// toggle-button UI is built later, on DOMContentLoaded, same as the rest of
// the site's chrome.
const THEME_KEY = 'nove_theme';

(function applyStoredTheme() {
  try {
    if (localStorage.getItem(THEME_KEY) === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (err) {
    // localStorage unavailable (privacy mode, etc.) — fall back to light.
  }
})();

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function renderThemeToggle() {
  const el = document.getElementById('themeToggle');
  if (!el) return;

  const dark = isDarkTheme();
  el.innerHTML = `
    <button
      type="button"
      class="theme-toggle-btn"
      id="themeToggleBtn"
      aria-label="${dark ? 'Switch to light theme' : 'Switch to dark theme'}"
      aria-pressed="${dark}"
      title="${dark ? 'Switch to light theme' : 'Switch to dark theme'}"
    >${dark ? '☀' : '☾'}</button>
  `;

  document.getElementById('themeToggleBtn').addEventListener('click', async () => {
    const nextDark = !isDarkTheme();
    if (nextDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(THEME_KEY, nextDark ? 'dark' : 'light');
    } catch (err) {
      // ignore — theme still applied for this page view
    }
    renderThemeToggle();

    // Logged-in users also get their choice saved server-side, so it follows
    // them to a new device/browser instead of only living in localStorage.
    if (typeof window.noveUserReady !== 'undefined' && typeof api !== 'undefined') {
      try {
        const user = await window.noveUserReady;
        if (user) {
          api.patch('/users/me/theme', { themePreference: nextDark ? 'dark' : 'light' }).catch(() => {});
        }
      } catch (err) {
        // not logged in / not available yet — theme still applies locally
      }
    }
  });
}

// On a device/browser with no stored choice yet, a logged-in user's saved
// account preference initializes the theme instead of always defaulting to
// light — this only runs once localStorage is confirmed empty, so an
// explicit choice already made on this device is never overridden.
async function syncThemeWithAccount() {
  if (typeof window.noveUserReady === 'undefined') return;

  let hasLocalChoice = true;
  try {
    hasLocalChoice = localStorage.getItem(THEME_KEY) !== null;
  } catch (err) {
    hasLocalChoice = true;
  }
  if (hasLocalChoice) return;

  const user = await window.noveUserReady;
  if (user && user.themePreference === 'dark' && !isDarkTheme()) {
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      localStorage.setItem(THEME_KEY, 'dark');
    } catch (err) {
      // ignore
    }
    renderThemeToggle();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderThemeToggle();
  syncThemeWithAccount();
});
