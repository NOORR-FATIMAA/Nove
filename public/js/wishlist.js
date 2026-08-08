// wishlist.html page logic

async function initWishlistPage() {
  const grid = document.getElementById('wishlistGrid');
  const emptyState = document.getElementById('wishlistEmptyState');
  if (!grid) return;

  await window.noveUserReady;
  if (window.currencyReady) await window.currencyReady;

  if (!window.noveUser) {
    window.location.href = `/login.html?redirect=${encodeURIComponent('/wishlist.html')}`;
    return;
  }

  try {
    const res = await api.get('/wishlist');
    const products = res.data.products;

    if (products.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    grid.innerHTML = products.map(renderProductCard).join('');
    wireAddToCartActions(grid);
    wireCardTilt(grid);
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);

    grid.querySelectorAll('.wishlist-btn').forEach((btn) => {
      btn.classList.add('active');
      btn.innerHTML = '&#9829;';
      btn.addEventListener('click', async () => {
        try {
          await api.delete(`/wishlist/${btn.dataset.productId}`);
          btn.closest('.product-card').remove();
          if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
          if (grid.children.length === 0 && emptyState) emptyState.style.display = 'block';
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', initWishlistPage);
