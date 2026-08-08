// Handles: homepage "Curated Sets" section + bundle-details.html

function renderBundleCard(bundle) {
  const img = (bundle.images && bundle.images[0]) || '/img/placeholder.svg';
  const itemCount = bundle.products.reduce((sum, p) => sum + p.quantity, 0);

  return `
    <div class="product-card reveal" data-slug="${escapeHtml(bundle.slug)}">
      <div class="thumb-wrap">
        ${bundle.savings > 0 ? '<span class="sale-tag">Bundle Deal</span>' : ''}
        <a href="/bundle-details.html?slug=${encodeURIComponent(bundle.slug)}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(bundle.name)}">
        </a>
      </div>
      <div class="card-body">
        <span class="cat-label">${itemCount} piece set</span>
        <a href="/bundle-details.html?slug=${encodeURIComponent(bundle.slug)}" class="name">${escapeHtml(bundle.name)}</a>
        <div class="price-row">
          <span class="price">${formatMoney(bundle.bundlePrice)}</span>
          ${bundle.savings > 0 ? `<span class="price-strike">${formatMoney(bundle.separateTotal)}</span>` : ''}
        </div>
        ${bundle.savings > 0 ? `<span class="out-of-stock" style="color:var(--success);">Save ${formatMoney(bundle.savings)}</span>` : ''}
        <a href="/bundle-details.html?slug=${encodeURIComponent(bundle.slug)}" class="btn btn-sm btn-outline">View Set</a>
      </div>
    </div>
  `;
}

async function initBundlesSection() {
  const grid = document.getElementById('bundlesGrid');
  const section = document.getElementById('bundlesSection');
  if (!grid) return;

  if (window.currencyReady) await window.currencyReady;

  try {
    const res = await api.get('/bundles');
    if (res.data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    grid.innerHTML = res.data.map(renderBundleCard).join('');
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
  } catch (err) {
    if (section) section.style.display = 'none';
  }
}

async function initBundleDetailPage() {
  const root = document.getElementById('bundleDetailRoot');
  if (!root) return;

  if (window.currencyReady) await window.currencyReady;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
    root.innerHTML = '<div class="empty-state"><h3>Bundle not found</h3></div>';
    return;
  }

  try {
    const res = await api.get(`/bundles/${slug}`);
    const bundle = res.data;

    document.title = `${bundle.name} — Nove`;
    document.getElementById('bundleName').textContent = bundle.name;
    document.getElementById('bundleDescription').textContent = bundle.description;

    const img = (bundle.images && bundle.images[0]) || '/img/placeholder.svg';
    document.getElementById('bundleMainImg').src = img;
    document.getElementById('bundleMainImg').alt = bundle.name;

    document.getElementById('bundlePrice').textContent = formatMoney(bundle.bundlePrice);
    const strikeEl = document.getElementById('bundleSeparateTotal');
    const savingsEl = document.getElementById('bundleSavings');
    if (bundle.savings > 0) {
      strikeEl.textContent = formatMoney(bundle.separateTotal);
      strikeEl.style.display = 'inline';
      savingsEl.textContent = `You save ${formatMoney(bundle.savings)} buying this as a set`;
    } else {
      strikeEl.style.display = 'none';
      savingsEl.textContent = '';
    }

    const itemsList = document.getElementById('bundleItemsList');
    itemsList.innerHTML = bundle.products
      .filter((item) => item.product)
      .map((item) => {
        const p = item.product;
        const pImg = (p.images && p.images[0]) || '/img/placeholder.svg';
        return `
          <div class="cart-item">
            <img src="${escapeHtml(pImg)}" alt="${escapeHtml(p.name)}">
            <div>
              <div class="item-name">${escapeHtml(p.name)}</div>
              <div class="item-meta">Qty ${item.quantity}</div>
            </div>
            <div></div>
            <div class="price">${formatMoney(productCurrentPrice(p) * item.quantity)}</div>
          </div>
        `;
      })
      .join('');

    const addBtn = document.getElementById('addBundleToCartBtn');
    const outOfStockItems = bundle.products.filter((item) => item.product && item.product.stock < item.quantity);

    if (outOfStockItems.length > 0) {
      addBtn.disabled = true;
      addBtn.textContent = 'Some items are out of stock';
    } else {
      addBtn.addEventListener('click', async () => {
        addBtn.disabled = true;
        try {
          for (const item of bundle.products) {
            if (item.product) {
              // eslint-disable-next-line no-await-in-loop
              await addProductToCart(item.product._id, item.quantity);
            }
          }
          addBtn.textContent = 'Added to Cart!';
          setTimeout(() => {
            addBtn.textContent = 'Add All to Cart';
            addBtn.disabled = false;
          }, 1400);
        } catch (err) {
          addBtn.disabled = false;
          alert(err.message);
        }
      });
    }

    if (window.NoveAnimations) window.NoveAnimations.observeReveal(document.getElementById('bundleDetailRoot'));
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Bundle not found</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBundlesSection();
  initBundleDetailPage();
});
