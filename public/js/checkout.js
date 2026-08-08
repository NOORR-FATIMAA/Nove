// checkout.html page logic — client only ever sends cart contents, never a total.

const POINTS_REDEEM_KEY = 'nove_points_redeem';
const POINTS_REDEEM_RATE = 1; // 1 point = Rs 1, mirrors server-side rate

function loadStoredPointsRedeem() {
  return Number(sessionStorage.getItem(POINTS_REDEEM_KEY)) || 0;
}

async function initCheckoutPage() {
  const root = document.getElementById('checkoutRoot');
  if (!root) return;

  await window.noveUserReady;
  if (window.currencyReady) await window.currencyReady;

  const items = await loadCartItems();
  if (items.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  wirePointsRedemption(items);
  renderCheckoutSummary(items);
  await renderSavedAddresses();
  wireCheckoutForm(items);

  const guestEmailGroup = document.getElementById('guestEmailGroup');
  if (guestEmailGroup) {
    guestEmailGroup.style.display = window.noveUser ? 'none' : 'block';
  }
}

function wirePointsRedemption(items) {
  const card = document.getElementById('pointsRedeemCard');
  if (!card || !window.noveUser || !window.noveUser.pointsBalance) return;

  card.style.display = 'block';
  document.getElementById('pointsAvailable').textContent = window.noveUser.pointsBalance;
  document.getElementById('pointsAvailableValue').textContent = formatMoney(
    window.noveUser.pointsBalance * POINTS_REDEEM_RATE
  );

  const input = document.getElementById('pointsRedeemInput');
  const note = document.getElementById('pointsAppliedNote');
  const stored = loadStoredPointsRedeem();
  if (stored > 0) {
    input.value = stored;
    note.textContent = `Applying ${stored} points (-${formatMoney(stored * POINTS_REDEEM_RATE)})`;
  }

  document.getElementById('applyPointsBtn').addEventListener('click', () => {
    const subtotal = getSubtotal(items);
    const coupon = loadStoredCoupon();
    const couponDiscount = coupon ? coupon.discount : 0;
    const maxRedeemable = Math.min(
      window.noveUser.pointsBalance,
      Math.floor(Math.max(0, subtotal - couponDiscount) / POINTS_REDEEM_RATE)
    );

    const requested = Math.max(0, Math.floor(Number(input.value) || 0));
    const applied = Math.min(requested, maxRedeemable);
    input.value = applied;

    if (applied > 0) {
      sessionStorage.setItem(POINTS_REDEEM_KEY, String(applied));
      note.textContent = `Applying ${applied} points (-${formatMoney(applied * POINTS_REDEEM_RATE)})`;
    } else {
      sessionStorage.removeItem(POINTS_REDEEM_KEY);
      note.textContent = '';
    }

    renderCheckoutSummary(items);
  });
}

function renderCheckoutSummary(items) {
  const list = document.getElementById('checkoutItemsList');
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const totalEl = document.getElementById('checkoutTotal');
  const discountRow = document.getElementById('checkoutDiscountRow');
  const discountEl = document.getElementById('checkoutDiscount');
  const pointsRow = document.getElementById('checkoutPointsRow');
  const pointsEl = document.getElementById('checkoutPointsDiscount');

  list.innerHTML = items
    .map((item) => {
      const p = item.product;
      const price = productCurrentPrice(p);
      return `
        <div class="summary-row">
          <span>${escapeHtml(p.name)} × ${item.quantity}</span>
          <span>${formatMoney(price * item.quantity)}</span>
        </div>
      `;
    })
    .join('');

  const subtotal = getSubtotal(items);
  const coupon = loadStoredCoupon();
  const discount = coupon ? coupon.discount : 0;
  const pointsRedeemed = window.noveUser ? loadStoredPointsRedeem() : 0;
  const pointsDiscount = pointsRedeemed * POINTS_REDEEM_RATE;
  const estimatedTotal = Math.max(0, subtotal - discount - pointsDiscount);

  subtotalEl.textContent = formatMoney(subtotal);
  discountRow.style.display = discount > 0 ? 'flex' : 'none';
  discountEl.textContent = `-${formatMoney(discount)}`;

  if (pointsRow && pointsEl) {
    pointsRow.style.display = pointsDiscount > 0 ? 'flex' : 'none';
    pointsEl.textContent = `-${formatMoney(pointsDiscount)}`;
  }

  totalEl.textContent = `${formatMoney(estimatedTotal)} + shipping`;
}

async function renderSavedAddresses() {
  const container = document.getElementById('savedAddresses');
  if (!container || !window.noveUser) return;

  const addresses = window.noveUser.addresses || [];
  if (addresses.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = addresses
    .map(
      (addr) => `
      <div class="saved-address-card" data-address-id="${addr.id || addr._id}">
        <strong>${escapeHtml(addr.fullName)}</strong> (${escapeHtml(addr.label || 'Address')})<br>
        ${escapeHtml(addr.line1)}, ${escapeHtml(addr.city)}, ${escapeHtml(addr.postalCode)}, ${escapeHtml(addr.country)}<br>
        ${escapeHtml(addr.phone)}
      </div>
    `
    )
    .join('');

  container.querySelectorAll('.saved-address-card').forEach((card) => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.saved-address-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      const addr = addresses.find((a) => (a.id || a._id) === card.dataset.addressId);
      if (addr) fillAddressForm(addr);
    });
  });
}

function fillAddressForm(addr) {
  const form = document.getElementById('checkoutForm');
  form.fullName.value = addr.fullName || '';
  form.phone.value = addr.phone || '';
  form.line1.value = addr.line1 || '';
  form.line2.value = addr.line2 || '';
  form.city.value = addr.city || '';
  form.state.value = addr.state || '';
  form.postalCode.value = addr.postalCode || '';
  form.country.value = addr.country || '';
}

function wireCheckoutForm(items) {
  const form = document.getElementById('checkoutForm');
  const alertEl = document.getElementById('checkoutAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const coupon = loadStoredCoupon();
    const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked');

    const payload = {
      items: items.map((item) => ({ product: item.product._id, quantity: item.quantity })),
      shippingAddress: {
        fullName: form.fullName.value.trim(),
        phone: form.phone.value.trim(),
        line1: form.line1.value.trim(),
        line2: form.line2.value.trim(),
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        postalCode: form.postalCode.value.trim(),
        country: form.country.value.trim(),
      },
      paymentMethod: paymentMethod ? paymentMethod.value : 'cod',
      couponCode: coupon ? coupon.code : undefined,
      redeemPoints: window.noveUser ? loadStoredPointsRedeem() : undefined,
    };

    if (!window.noveUser) {
      payload.guestEmail = form.guestEmail.value.trim();
    }

    try {
      const res = await api.post('/orders', payload);

      if (window.noveUser) {
        await api.delete('/cart');
      } else {
        clearGuestCart();
      }
      sessionStorage.removeItem('nove_coupon');
      sessionStorage.removeItem(POINTS_REDEEM_KEY);

      window.location.href = `/orders.html?justPlaced=${encodeURIComponent(res.data.orderNumber)}`;
    } catch (err) {
      showAlert(alertEl, err.message);
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initCheckoutPage);
