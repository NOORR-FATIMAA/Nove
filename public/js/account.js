// account.html (profile/addresses/change password) and orders.html (order history)

async function requireLogin(redirectPath) {
  await window.noveUserReady;
  if (!window.noveUser) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(redirectPath)}`;
    return false;
  }
  return true;
}

// --- account.html ---

function wireAccountTabs() {
  document.querySelectorAll('.account-nav [data-tab-target]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.account-nav a').forEach((a) => a.classList.remove('active'));
      document.querySelectorAll('.account-panel').forEach((p) => p.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(link.dataset.tabTarget).classList.add('active');
    });
  });
}

function fillProfileForm(user) {
  const form = document.getElementById('profileForm');
  if (!form) return;
  form.name.value = user.name;
  form.email.value = user.email;
  form.phone.value = user.phone || '';
}

function wireProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  const alertEl = document.getElementById('profileAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    try {
      const res = await api.patch('/users/me', { name: form.name.value.trim(), phone: form.phone.value.trim() });
      window.noveUser = res.data;
      showAlert(alertEl, 'Profile updated.', 'success');
      renderAuthArea();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

function wireChangePasswordForm() {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;
  const alertEl = document.getElementById('passwordAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    if (form.newPassword.value !== form.confirmNewPassword.value) {
      showAlert(alertEl, 'New passwords do not match.');
      return;
    }

    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword.value,
        newPassword: form.newPassword.value,
      });
      showAlert(alertEl, 'Password changed successfully.', 'success');
      form.reset();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

function renderAddresses(user) {
  const container = document.getElementById('addressList');
  if (!container) return;

  const addresses = user.addresses || [];
  if (addresses.length === 0) {
    container.innerHTML = '<p>No saved addresses yet.</p>';
    return;
  }

  container.innerHTML = addresses
    .map(
      (addr) => `
      <div class="card" data-address-id="${addr.id || addr._id}">
        <strong>${escapeHtml(addr.label || 'Address')}</strong> ${addr.isDefault ? '<span class="status-pill">Default</span>' : ''}
        <p>${escapeHtml(addr.fullName)}<br>
        ${escapeHtml(addr.line1)}${addr.line2 ? `, ${escapeHtml(addr.line2)}` : ''}<br>
        ${escapeHtml(addr.city)}, ${escapeHtml(addr.state || '')} ${escapeHtml(addr.postalCode)}<br>
        ${escapeHtml(addr.country)} · ${escapeHtml(addr.phone)}</p>
        <button type="button" class="btn btn-sm btn-danger" data-action="delete-address">Remove</button>
      </div>
    `
    )
    .join('');

  container.querySelectorAll('[data-action="delete-address"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const addressId = btn.closest('[data-address-id]').dataset.addressId;
      try {
        const res = await api.delete(`/users/me/addresses/${addressId}`);
        window.noveUser = res.data;
        renderAddresses(res.data);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function wireAddAddressForm() {
  const form = document.getElementById('addAddressForm');
  if (!form) return;
  const alertEl = document.getElementById('addAddressAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    try {
      const res = await api.post('/users/me/addresses', {
        label: form.label.value.trim() || 'Home',
        fullName: form.fullName.value.trim(),
        phone: form.phone.value.trim(),
        line1: form.line1.value.trim(),
        line2: form.line2.value.trim(),
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        postalCode: form.postalCode.value.trim(),
        country: form.country.value.trim(),
        isDefault: form.isDefault.checked,
      });
      window.noveUser = res.data;
      renderAddresses(res.data);
      form.reset();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

async function initAccountPage() {
  const root = document.getElementById('accountRoot');
  if (!root) return;

  const ok = await requireLogin('/account.html');
  if (!ok) return;

  if (window.currencyReady) await window.currencyReady;

  fillProfileForm(window.noveUser);
  renderLoyaltyCard(window.noveUser);
  renderAddresses(window.noveUser);
  wireAccountTabs();
  wireProfileForm();
  wireChangePasswordForm();
  wireAddAddressForm();
}

function renderLoyaltyCard(user) {
  const card = document.getElementById('loyaltyCard');
  if (!card) return;
  const balance = user.pointsBalance || 0;
  document.getElementById('loyaltyPointsBalance').textContent = balance;
  document.getElementById('loyaltyPointsValue').textContent = formatMoney(balance);
}

// --- orders.html ---

function statusPillClass(status) {
  if (status === 'delivered') return 'status-pill delivered';
  if (status === 'cancelled') return 'status-pill cancelled';
  return 'status-pill';
}

function renderOrders(orders) {
  const container = document.getElementById('ordersList');
  const emptyState = document.getElementById('ordersEmptyState');

  if (orders.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = orders
    .map(
      (order) => `
      <div class="order-row reveal">
        <div>
          <strong>${escapeHtml(order.orderNumber)}</strong><br>
          <small>${new Date(order.createdAt).toLocaleDateString()} · ${order.items.length} item(s)</small>
          ${
            order.pointsRedeemed > 0 || order.pointsEarned > 0
              ? `<br><small style="color:var(--success);">${
                  order.pointsRedeemed > 0 ? `-${order.pointsRedeemed} pts redeemed` : ''
                }${order.pointsRedeemed > 0 && order.pointsEarned > 0 ? ' · ' : ''}${
                  order.pointsEarned > 0 ? `+${order.pointsEarned} pts earned` : ''
                }</small>`
              : ''
          }
        </div>
        <div>${formatMoney(order.total)}</div>
        <span class="${statusPillClass(order.orderStatus)}">${escapeHtml(order.orderStatus)}</span>
      </div>
    `
    )
    .join('');

  if (window.NoveAnimations) window.NoveAnimations.observeReveal(container);
}

async function initOrdersPage() {
  const container = document.getElementById('ordersList');
  if (!container) return;

  const ok = await requireLogin('/orders.html');
  if (!ok) return;

  if (window.currencyReady) await window.currencyReady;

  const params = new URLSearchParams(window.location.search);
  const justPlaced = params.get('justPlaced');
  const banner = document.getElementById('orderPlacedBanner');
  if (justPlaced && banner) {
    banner.textContent = `Thank you! Your order ${justPlaced} has been placed.`;
    banner.classList.add('show');
  }

  try {
    const res = await api.get('/orders/mine');
    renderOrders(res.data);
  } catch (err) {
    container.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAccountPage();
  initOrdersPage();
});
