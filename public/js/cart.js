// Shared add-to-cart helper (used on home/listing/detail pages) plus full cart.html logic.

async function addProductToCart(productId, quantity = 1) {
  await window.noveUserReady;
  if (window.noveUser) {
    await api.post('/cart/items', { productId, quantity });
  } else {
    addToGuestCart(productId, quantity);
  }
  if (typeof updateCartBadge === 'function') updateCartBadge();
}

function productCurrentPrice(product) {
  const hasSale =
    product.salePrice != null &&
    product.salePrice < product.price &&
    (!product.saleStartsAt || new Date(product.saleStartsAt) <= new Date()) &&
    (!product.saleEndsAt || new Date(product.saleEndsAt) >= new Date());
  return hasSale ? product.salePrice : product.price;
}

// --- cart.html page logic ---

const COUPON_STORAGE_KEY = 'nove_coupon';

async function loadCartItems() {
  await window.noveUserReady;
  if (window.currencyReady) await window.currencyReady;

  if (window.noveUser) {
    const res = await api.get('/cart');
    return res.data.items
      .filter((i) => i.product)
      .map((i) => ({ product: i.product, quantity: i.quantity }));
  }

  const guestItems = getGuestCart();
  if (guestItems.length === 0) return [];

  const ids = guestItems.map((i) => i.productId).join(',');
  const res = await api.get(`/products${qs({ ids, limit: 100 })}`);
  return guestItems
    .map((gi) => {
      const product = res.data.find((p) => p._id === gi.productId);
      return product ? { product, quantity: gi.quantity } : null;
    })
    .filter(Boolean);
}

async function changeCartQty(productId, quantity) {
  if (window.noveUser) {
    await api.patch(`/cart/items/${productId}`, { quantity });
  } else {
    updateGuestCartItem(productId, quantity);
  }
}

async function removeCartItem(productId) {
  if (window.noveUser) {
    await api.delete(`/cart/items/${productId}`);
  } else {
    removeFromGuestCart(productId);
  }
}

function renderCartPage(items) {
  const container = document.getElementById('cartItemsContainer');
  const emptyState = document.getElementById('cartEmptyState');
  const summaryEl = document.getElementById('cartSummary');

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (summaryEl) summaryEl.style.display = 'none';
    updateCartBadge();
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (summaryEl) summaryEl.style.display = 'block';

  container.innerHTML = items
    .map((item) => {
      const p = item.product;
      const price = productCurrentPrice(p);
      const img = (p.images && p.images[0]) || '/img/placeholder.svg';
      return `
        <div class="cart-item" data-product-id="${p._id}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}">
          <div>
            <div class="item-name">${escapeHtml(p.name)}</div>
            <div class="item-meta">${escapeHtml(p.attributes && p.attributes.shade ? p.attributes.shade : '')} ${escapeHtml(
        p.attributes && p.attributes.size ? p.attributes.size : ''
      )}</div>
            <div class="item-meta">${formatMoney(price)} each</div>
            <button type="button" class="remove-link" data-action="remove">Remove</button>
          </div>
          <div class="qty-selector">
            <button type="button" data-action="dec">-</button>
            <input type="number" min="1" value="${item.quantity}" data-role="qty-input">
            <button type="button" data-action="inc">+</button>
          </div>
          <div class="price">${formatMoney(price * item.quantity)}</div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.cart-item').forEach((el) => {
    const productId = el.dataset.productId;
    const qtyInput = el.querySelector('[data-role="qty-input"]');

    el.querySelector('[data-action="remove"]').addEventListener('click', async () => {
      await removeCartItem(productId);
      await refreshCart();
    });

    el.querySelector('[data-action="inc"]').addEventListener('click', async () => {
      const newQty = Number(qtyInput.value) + 1;
      qtyInput.value = newQty;
      await changeCartQty(productId, newQty);
      await refreshCart();
    });

    el.querySelector('[data-action="dec"]').addEventListener('click', async () => {
      const newQty = Math.max(1, Number(qtyInput.value) - 1);
      qtyInput.value = newQty;
      await changeCartQty(productId, newQty);
      await refreshCart();
    });

    qtyInput.addEventListener('change', async () => {
      const newQty = Math.max(1, Number(qtyInput.value) || 1);
      await changeCartQty(productId, newQty);
      await refreshCart();
    });
  });
}

function getSubtotal(items) {
  return items.reduce((sum, item) => sum + productCurrentPrice(item.product) * item.quantity, 0);
}

function loadStoredCoupon() {
  try {
    const raw = sessionStorage.getItem(COUPON_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function renderSummary(items) {
  const subtotal = getSubtotal(items);
  const coupon = loadStoredCoupon();
  const discount = coupon ? coupon.discount : 0;
  const total = Math.max(0, subtotal - discount);

  const subtotalEl = document.getElementById('summarySubtotal');
  const discountRow = document.getElementById('summaryDiscountRow');
  const discountEl = document.getElementById('summaryDiscount');
  const totalEl = document.getElementById('summaryTotal');

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (totalEl) totalEl.textContent = formatMoney(total);
  if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
  if (discountEl) discountEl.textContent = `-${formatMoney(discount)}`;

  const appliedNote = document.getElementById('appliedCouponNote');
  if (appliedNote) {
    appliedNote.textContent = coupon ? `Applied: ${coupon.code}` : '';
  }
}

async function refreshCart() {
  const items = await loadCartItems();
  renderCartPage(items);
  renderSummary(items);
  return items;
}

function wireCouponForm() {
  const form = document.getElementById('couponForm');
  if (!form) return;
  const msgEl = document.getElementById('couponMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(msgEl);
    const code = form.code.value.trim();
    if (!code) return;

    try {
      const items = await loadCartItems();
      const subtotal = getSubtotal(items);
      const res = await api.post('/coupons/validate-code', { code, subtotal });
      sessionStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(res.data));
      showAlert(msgEl, `Coupon applied: -${formatMoney(res.data.discount)}`, 'success');
      renderSummary(items);
    } catch (err) {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
      showAlert(msgEl, err.message);
      renderSummary(await loadCartItems());
    }
  });

  const removeCouponBtn = document.getElementById('removeCouponBtn');
  if (removeCouponBtn) {
    removeCouponBtn.addEventListener('click', async () => {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
      renderSummary(await loadCartItems());
    });
  }
}

async function initCartPage() {
  const container = document.getElementById('cartItemsContainer');
  if (!container) return;

  await refreshCart();
  wireCouponForm();
}

document.addEventListener('DOMContentLoaded', initCartPage);
