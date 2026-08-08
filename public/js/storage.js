// Guest cart persistence (localStorage) for unauthenticated shoppers. Merged into the
// server cart on login.
const GUEST_CART_KEY = 'nove_guest_cart';

function getGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function setGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function addToGuestCart(productId, quantity = 1) {
  const items = getGuestCart();
  const existing = items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  setGuestCart(items);
  return items;
}

function updateGuestCartItem(productId, quantity) {
  let items = getGuestCart();
  if (quantity <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const existing = items.find((i) => i.productId === productId);
    if (existing) existing.quantity = quantity;
  }
  setGuestCart(items);
  return items;
}

function removeFromGuestCart(productId) {
  const items = getGuestCart().filter((i) => i.productId !== productId);
  setGuestCart(items);
  return items;
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function guestCartCount() {
  return getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
}
