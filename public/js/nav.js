// Shared header/footer behavior: auth state, cart/wishlist badges, search, newsletter.
window.noveUser = null;

window.noveUserReady = (async () => {
  try {
    const res = await api.get('/auth/me');
    window.noveUser = res.data;
  } catch (err) {
    window.noveUser = null;
  }
  return window.noveUser;
})();

function renderAuthArea() {
  const el = document.getElementById('authArea');
  if (!el) return;

  if (window.noveUser) {
    el.innerHTML = `
      <span class="greeting">Hi, ${escapeHtml(window.noveUser.name.split(' ')[0])}</span>
      <a href="/account.html">Account</a>
      <button type="button" class="btn btn-sm btn-ghost" id="navLogoutBtn">Logout</button>
    `;
    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await api.post('/auth/logout');
        window.location.href = '/index.html';
      });
    }
  } else {
    el.innerHTML = `
      <a href="/login.html">Login</a>
      <a href="/signup.html" class="btn btn-sm">Sign Up</a>
    `;
  }
}

async function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;

  let count = 0;
  if (window.noveUser) {
    try {
      const res = await api.get('/cart');
      count = res.data.items.reduce((sum, i) => sum + i.quantity, 0);
    } catch (err) {
      count = 0;
    }
  } else {
    count = guestCartCount();
  }

  badge.textContent = count;
  badge.classList.toggle('show', count > 0);
}

async function updateWishlistBadge() {
  const badge = document.getElementById('wishlistCount');
  if (!badge) return;

  if (!window.noveUser) {
    badge.classList.remove('show');
    return;
  }

  try {
    const res = await api.get('/wishlist');
    const count = res.data.products.length;
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
  } catch (err) {
    badge.classList.remove('show');
  }
}

function highlightActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  // Direct children only — on mobile the drawer also holds the reparented
  // account links and filters, which shouldn't be treated as primary nav.
  document.querySelectorAll('.main-nav > a').forEach((a) => {
    const href = a.getAttribute('href').split('?')[0].split('/').pop();
    if (href === path) a.classList.add('active');
  });
}

function wireSearchForm() {
  const form = document.getElementById('navSearchForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('navSearchInput');
    const term = input.value.trim();
    window.location.href = `/products.html${term ? `?search=${encodeURIComponent(term)}` : ''}`;
  });
}

function wireNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const msgEl = document.getElementById('newsletterMsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[name="email"]');
    try {
      const res = await api.post('/newsletter', { email: input.value.trim() });
      if (msgEl) {
        msgEl.textContent = res.message || 'Subscribed!';
        msgEl.style.color = '#a8e0bd';
      }
      input.value = '';
    } catch (err) {
      if (msgEl) {
        msgEl.textContent = err.message;
        msgEl.style.color = '#f0b0b0';
      }
    }
  });
}

function wireContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const alertEl = document.getElementById('contactAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await api.post('/contact', {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        subject: form.subject.value.trim(),
        message: form.message.value.trim(),
      });
      showAlert(alertEl, "Message sent! We'll get back to you soon.", 'success');
      form.reset();
    } catch (err) {
      showAlert(alertEl, err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Below 900px, the header only has room for the logo, wishlist, cart, and
// the hamburger itself — the theme toggle, account/login links, and (on
// products.html) the filters sidebar all fold into the same off-canvas
// drawer as the nav links instead of overflowing the header row.
function mergeIntoMobileNav(nav) {
  if (!window.matchMedia('(max-width: 900px)').matches) return;

  const themeToggle = document.getElementById('themeToggle');
  const authArea = document.getElementById('authArea');
  const filtersPanel = document.getElementById('filtersPanel');

  if (themeToggle || authArea) {
    const accountRow = document.createElement('div');
    accountRow.className = 'mobile-nav-divider mobile-nav-account-row';
    accountRow.innerHTML = '<span>Account</span>';
    if (themeToggle) accountRow.appendChild(themeToggle);
    nav.appendChild(accountRow);
  }

  if (authArea) {
    nav.appendChild(authArea);
    authArea.classList.add('auth-area-mobile');
  }

  if (filtersPanel) {
    const filtersDivider = document.createElement('div');
    filtersDivider.className = 'mobile-nav-divider';
    filtersDivider.textContent = 'Filters';
    nav.appendChild(filtersDivider);
    nav.appendChild(filtersPanel);
    filtersPanel.classList.add('filters-panel-mobile');
  }
}

function initMobileNav() {
  const toggle = document.getElementById('mobileNavToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  mergeIntoMobileNav(nav);

  // Broad enough to include the filters panel's inputs once it's merged in —
  // Tab/Shift+Tab should cycle through the whole drawer, not just links/buttons.
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])';

  function isOpen() {
    return nav.classList.contains('mobile-open');
  }

  function handleOutsideClick(e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeMenu({ restoreFocus: true });
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(nav.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openMenu() {
    nav.classList.add('mobile-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('keydown', handleKeydown);
    const first = nav.querySelector(FOCUSABLE_SELECTOR);
    if (first) first.focus();
  }

  function closeMenu({ restoreFocus = false } = {}) {
    nav.classList.remove('mobile-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick, true);
    document.removeEventListener('keydown', handleKeydown);
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && isOpen()) closeMenu();
  });
}

async function initNav() {
  await window.noveUserReady;
  renderAuthArea();
  updateCartBadge();
  updateWishlistBadge();
  highlightActiveNav();
  wireSearchForm();
  wireNewsletterForm();
  wireContactForm();
  initMobileNav();
}

document.addEventListener('DOMContentLoaded', initNav);
