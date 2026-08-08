// Handles: home page (categories + featured), products.html (listing/filters), product-details.html.

function renderProductCard(product) {
  const price = productCurrentPrice(product);
  const onSale = price < product.price;
  const img = (product.images && product.images[0]) || '/img/placeholder.svg';
  const categoryName = product.category && product.category.name ? product.category.name : '';
  const attrs = product.attributes || {};
  const showSwatch = attrs.type === 'polish' && attrs.swatchHex;

  return `
    <div class="product-card reveal" data-slug="${escapeHtml(product.slug)}">
      <div class="thumb-wrap">
        ${onSale ? '<span class="sale-tag">Sale</span>' : ''}
        <button type="button" class="wishlist-btn" data-product-id="${product._id}" aria-label="Add to wishlist">&#9825;</button>
        <a href="/product-details.html?slug=${encodeURIComponent(product.slug)}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}">
        </a>
      </div>
      <div class="card-body">
        <span class="cat-label">${escapeHtml(categoryName)}</span>
        <a href="/product-details.html?slug=${encodeURIComponent(product.slug)}" class="name">
          ${showSwatch ? `<span class="swatch-dot" style="background:${escapeHtml(attrs.swatchHex)}" title="${escapeHtml(attrs.shade || '')}"></span>` : ''}${escapeHtml(product.name)}
        </a>
        <span class="stars">${starsHtml(product.ratingsAverage)} <small>(${product.ratingsCount})</small></span>
        <div class="price-row">
          <span class="price">${formatMoney(price)}</span>
          ${onSale ? `<span class="price-strike">${formatMoney(product.price)}</span>` : ''}
        </div>
        ${
          product.stock <= 0
            ? '<span class="out-of-stock">Out of stock</span>'
            : `<button type="button" class="btn btn-sm btn-outline add-to-cart-btn" data-product-id="${product._id}">Add to Cart</button>`
        }
      </div>
    </div>
  `;
}

function wireAddToCartActions(container) {
  container.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await addProductToCart(btn.dataset.productId, 1);
        btn.textContent = 'Added!';
        setTimeout(() => {
          btn.textContent = 'Add to Cart';
          btn.disabled = false;
        }, 1200);
      } catch (err) {
        btn.disabled = false;
        alert(err.message);
      }
    });
  });
}

function wireWishlistAddActions(container) {
  container.querySelectorAll('.wishlist-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await window.noveUserReady;
      if (!window.noveUser) {
        window.location.href = '/login.html';
        return;
      }
      try {
        await api.post('/wishlist', { productId: btn.dataset.productId });
        btn.classList.add('active');
        btn.innerHTML = '&#9829;';
        if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function wireProductCardActions(container) {
  wireAddToCartActions(container);
  wireWishlistAddActions(container);
}

// --- Home page ---

async function initHomePage() {
  const categoryGrid = document.getElementById('categoryGrid');
  const featuredGrid = document.getElementById('featuredGrid');
  if (!categoryGrid && !featuredGrid) return;

  if (window.currencyReady) await window.currencyReady;

  if (categoryGrid) {
    try {
      const res = await api.get('/categories');
      categoryGrid.innerHTML = res.data
        .map(
          (cat) => `
          <a class="category-card reveal" href="/products.html?category=${cat._id}">
            ${cat.image ? `<img src="${escapeHtml(cat.image)}" alt="${escapeHtml(cat.name)}">` : ''}
            <span class="category-label">${escapeHtml(cat.name)}</span>
          </a>
        `
        )
        .join('');
      if (window.NoveAnimations) window.NoveAnimations.observeReveal(categoryGrid);
    } catch (err) {
      categoryGrid.innerHTML = '';
    }
  }

  if (featuredGrid) {
    try {
      const res = await api.get('/products/featured');
      featuredGrid.innerHTML = res.data.map(renderProductCard).join('');
      wireProductCardActions(featuredGrid);
      if (window.NoveAnimations) window.NoveAnimations.observeReveal(featuredGrid);
    } catch (err) {
      featuredGrid.innerHTML = '<p>Could not load featured products.</p>';
    }
  }
}

// --- Listing page ---

function getListingState() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get('type') || '',
    category: params.get('category') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    inStock: params.get('inStock') || '',
    search: params.get('search') || '',
    sort: params.get('sort') || '-createdAt',
    page: Number(params.get('page')) || 1,
  };
}

function setListingState(state) {
  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  window.history.replaceState({}, '', `/products.html?${params.toString()}`);
}

async function populateCategoryFilter(state) {
  const container = document.getElementById('categoryFilterGroup');
  if (!container) return;
  try {
    const res = await api.get('/categories');
    container.innerHTML = res.data
      .map(
        (cat) => `
        <label class="filter-option">
          <input type="radio" name="categoryFilter" value="${cat._id}" ${state.category === cat._id ? 'checked' : ''}>
          ${escapeHtml(cat.name)}
        </label>
      `
      )
      .join('');
  } catch (err) {
    container.innerHTML = '';
  }
}

async function loadListing() {
  const state = getListingState();
  const grid = document.getElementById('productGrid');
  const resultCount = document.getElementById('resultCount');
  const pagination = document.getElementById('pagination');
  if (!grid) return;

  if (window.currencyReady) await window.currencyReady;

  grid.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await api.get(
      `/products${qs({
        type: state.type,
        category: state.category,
        minPrice: state.minPrice,
        maxPrice: state.maxPrice,
        inStock: state.inStock,
        search: state.search,
        sort: state.sort,
        page: state.page,
        limit: 12,
      })}`
    );

    if (res.data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your filters.</p></div>';
    } else {
      grid.innerHTML = res.data.map(renderProductCard).join('');
      wireProductCardActions(grid);
      if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
    }

    if (resultCount) resultCount.textContent = `${res.total} product${res.total === 1 ? '' : 's'} found`;

    if (pagination) {
      const totalPages = Math.max(1, Math.ceil(res.total / res.pagination.limit));
      pagination.innerHTML = '';
      for (let i = 1; i <= totalPages; i += 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = i;
        if (i === state.page) btn.classList.add('active');
        btn.addEventListener('click', () => {
          const newState = { ...state, page: i };
          setListingState(newState);
          loadListing();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        pagination.appendChild(btn);
      }
    }
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function wireListingFilters() {
  const typeGroup = document.getElementById('typeFilterGroup');
  const priceForm = document.getElementById('priceFilterForm');
  const inStockCheckbox = document.getElementById('inStockFilter');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('listingSearchInput');
  const clearBtn = document.getElementById('clearFiltersBtn');

  const state = getListingState();

  if (typeGroup) {
    const typeInputs = typeGroup.querySelectorAll('input[name="typeFilter"]');
    typeInputs.forEach((input) => {
      input.checked = input.value === state.type;
      input.addEventListener('change', () => {
        if (input.checked) {
          typeInputs.forEach((other) => {
            if (other !== input) other.checked = false;
          });
        }
        setListingState({ ...getListingState(), type: input.checked ? input.value : '', page: 1 });
        loadListing();
      });
    });
  }

  if (priceForm) {
    priceForm.minPrice.value = state.minPrice;
    priceForm.maxPrice.value = state.maxPrice;
    priceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      setListingState({
        ...getListingState(),
        minPrice: priceForm.minPrice.value,
        maxPrice: priceForm.maxPrice.value,
        page: 1,
      });
      loadListing();
    });
  }

  if (inStockCheckbox) {
    inStockCheckbox.checked = state.inStock === 'true';
    inStockCheckbox.addEventListener('change', () => {
      setListingState({ ...getListingState(), inStock: inStockCheckbox.checked ? 'true' : '', page: 1 });
      loadListing();
    });
  }

  if (sortSelect) {
    sortSelect.value = state.sort;
    sortSelect.addEventListener('change', () => {
      setListingState({ ...getListingState(), sort: sortSelect.value, page: 1 });
      loadListing();
    });
  }

  if (searchInput) {
    searchInput.value = state.search;
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setListingState({ ...getListingState(), search: searchInput.value.trim(), page: 1 });
        loadListing();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.location.href = '/products.html';
    });
  }

  document.addEventListener('change', (e) => {
    if (e.target.name === 'categoryFilter') {
      setListingState({ ...getListingState(), category: e.target.value, page: 1 });
      loadListing();
    }
  });
}

async function initListingPage() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  await populateCategoryFilter(getListingState());
  wireListingFilters();
  await loadListing();
}

// --- Product detail page ---

// Other polish products in the same category, so the shade swatches can offer
// real alternate variants rather than just labelling the current one.
async function fetchSiblingShades(product) {
  if (!product.attributes || product.attributes.type !== 'polish') return [];
  const categoryId = product.category && product.category._id ? product.category._id : product.category;
  if (!categoryId) return [];

  try {
    const res = await api.get(`/products${qs({ category: categoryId, type: 'polish', limit: 20 })}`);
    return res.data.filter((p) => p._id !== product._id && p.attributes && p.attributes.swatchHex);
  } catch (err) {
    return [];
  }
}

async function renderSwatches(product) {
  const container = document.getElementById('productAttributes');
  if (!container) return;
  const { shade, finish, size, swatchHex, type } = product.attributes || {};
  let html = '';

  if (type === 'polish' && swatchHex) {
    const siblings = await fetchSiblingShades(product);
    const swatches = [{ slug: product.slug, swatchHex, shade, current: true }, ...siblings.map((p) => ({
      slug: p.slug,
      swatchHex: p.attributes.swatchHex,
      shade: p.attributes.shade,
      current: false,
    }))];

    html += `<div class="swatch-group">
      <div class="label">Shade${shade ? `: ${escapeHtml(shade)}` : ''}</div>
      <div class="swatch-dots">
        ${swatches
          .map(
            (s) => `
          <a href="/product-details.html?slug=${encodeURIComponent(s.slug)}"
             class="swatch-dot-link${s.current ? ' active' : ''}"
             style="background:${escapeHtml(s.swatchHex || '#ccc')}"
             title="${escapeHtml(s.shade || '')}"
             aria-label="${escapeHtml(s.shade || 'Shade')}"></a>
        `
          )
          .join('')}
      </div>
    </div>`;
  } else if (shade) {
    html += `<div class="swatch-group"><div class="label">Shade</div><span class="swatch-value">${escapeHtml(shade)}</span></div>`;
  }

  if (finish) {
    html += `<div class="swatch-group"><div class="label">Finish</div><span class="swatch-value">${escapeHtml(finish)}</span></div>`;
  }
  if (size) {
    html += `<div class="swatch-group"><div class="label">Size</div><span class="swatch-value">${escapeHtml(size)}</span></div>`;
  }
  container.innerHTML = html;
}

function renderGallery(product) {
  const mainImg = document.getElementById('galleryMainImg');
  const thumbs = document.getElementById('galleryThumbs');
  const images = product.images && product.images.length ? product.images : ['/img/placeholder.svg'];

  mainImg.src = images[0];
  mainImg.alt = product.name;

  thumbs.innerHTML = images
    .map((img, idx) => `<img src="${escapeHtml(img)}" data-idx="${idx}" class="${idx === 0 ? 'active' : ''}">`)
    .join('');

  thumbs.querySelectorAll('img').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      mainImg.src = images[thumb.dataset.idx];
      thumbs.querySelectorAll('img').forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewsList');
  if (!list) return;

  if (reviews.length === 0) {
    list.innerHTML = '<p>No reviews yet. Be the first to share your thoughts!</p>';
    return;
  }

  list.innerHTML = reviews
    .map(
      (r) => `
      <div class="review-item">
        <div class="review-head">
          <span class="review-author">${escapeHtml(r.user ? r.user.name : 'Anonymous')}</span>
          <span class="stars">${starsHtml(r.rating)}</span>
        </div>
        <p>${escapeHtml(r.comment)}</p>
      </div>
    `
    )
    .join('');
}

// Generic accessible modal open/close: Escape closes, backdrop click closes,
// focus moves into the dialog on open and returns to the trigger on close.
function wireModal(overlay, triggerEl, closeBtn) {
  if (!overlay || !triggerEl) return;

  function handleKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal() {
    overlay.classList.add('open');
    document.addEventListener('keydown', handleKeydown);
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.removeEventListener('keydown', handleKeydown);
    triggerEl.focus();
  }

  triggerEl.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

function wireSizeGuide(product) {
  const trigger = document.getElementById('sizeGuideTrigger');
  const overlay = document.getElementById('sizeGuideModal');
  const closeBtn = document.getElementById('sizeGuideCloseBtn');
  if (!trigger || !overlay) return;

  if (product.attributes && product.attributes.type === 'press-ons') {
    trigger.style.display = 'inline-flex';
    wireModal(overlay, trigger, closeBtn);
  }
}

function wireTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tabTarget).classList.add('active');
    });
  });
}

async function wireReviewForm(productId) {
  const form = document.getElementById('reviewForm');
  const loginPrompt = document.getElementById('reviewLoginPrompt');
  if (!form) return;

  await window.noveUserReady;
  if (!window.noveUser) {
    form.style.display = 'none';
    if (loginPrompt) loginPrompt.style.display = 'block';
    return;
  }

  const alertEl = document.getElementById('reviewFormAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating: Number(form.rating.value),
        comment: form.comment.value.trim(),
      });
      window.location.reload();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

async function initProductDetailPage() {
  const root = document.getElementById('productDetailRoot');
  if (!root) return;

  if (window.currencyReady) await window.currencyReady;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    root.innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>';
    return;
  }

  try {
    const res = await api.get(`/products/${slug}`);
    const { product, reviews } = res.data;

    document.title = `${product.name} — Nove`;
    document.getElementById('detailCategory').textContent = product.category ? product.category.name : '';
    document.getElementById('detailName').textContent = product.name;
    document.getElementById('detailDescription').textContent = product.description;
    document.getElementById('detailRatingStars').textContent = starsHtml(product.ratingsAverage);
    document.getElementById('detailRatingCount').textContent = `(${product.ratingsCount} reviews)`;

    const price = productCurrentPrice(product);
    const onSale = price < product.price;
    document.getElementById('detailPrice').textContent = formatMoney(price);
    const strikeEl = document.getElementById('detailPriceStrike');
    strikeEl.textContent = onSale ? formatMoney(product.price) : '';
    strikeEl.style.display = onSale ? 'inline' : 'none';

    const stockNote = document.getElementById('stockNote');
    const addBtn = document.getElementById('addToCartBtn');
    if (product.stock <= 0) {
      stockNote.textContent = 'Out of stock';
      stockNote.style.color = 'var(--danger)';
      addBtn.disabled = true;
    } else {
      stockNote.textContent = `${product.stock} in stock`;
      addBtn.disabled = false;
    }

    await renderSwatches(product);
    renderGallery(product);
    renderReviews(reviews);
    wireTabs();
    wireSizeGuide(product);
    if (typeof initProductGallery === 'function') initProductGallery(product._id);

    const qtyInput = document.getElementById('qtyInput');
    document.getElementById('qtyDec').addEventListener('click', () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });
    document.getElementById('qtyInc').addEventListener('click', () => {
      qtyInput.value = Math.min(product.stock, Number(qtyInput.value) + 1);
    });

    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      try {
        await addProductToCart(product._id, Number(qtyInput.value) || 1);
        addBtn.textContent = 'Added to Cart!';
        setTimeout(() => {
          addBtn.textContent = 'Add to Cart';
          addBtn.disabled = false;
        }, 1400);
      } catch (err) {
        addBtn.disabled = false;
        alert(err.message);
      }
    });

    const wishlistBtn = document.getElementById('detailWishlistBtn');
    wishlistBtn.addEventListener('click', async () => {
      await window.noveUserReady;
      if (!window.noveUser) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      try {
        await api.post('/wishlist', { productId: product._id });
        wishlistBtn.textContent = '♥ Saved to Wishlist';
        if (typeof updateWishlistBadge === 'function') updateWishlistBadge();
      } catch (err) {
        alert(err.message);
      }
    });

    await wireReviewForm(product._id);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Product not found</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHomePage();
  initListingPage();
  initProductDetailPage();
});
