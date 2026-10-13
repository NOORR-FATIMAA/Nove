// Handles: home page (categories + featured), products.html (listing/filters), product-details.html.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderProductCard(product) {
  const price = productCurrentPrice(product);
  const onSale = price < product.price;
  const images = product.images && product.images.length ? product.images : ['/img/placeholder.svg'];
  const img = images[0];
  const altImg = images[1];
  const categoryName = product.category && product.category.name ? product.category.name : '';
  const attrs = product.attributes || {};
  const showSwatch = attrs.type === 'polish' && attrs.swatchHex;

  return `
    <div class="product-card reveal" data-slug="${escapeHtml(product.slug)}">
      <div class="thumb-wrap">
        ${onSale ? '<span class="sale-tag">Sale</span>' : ''}
        <button type="button" class="wishlist-btn" data-product-id="${product._id}" aria-label="Add to wishlist">&#9825;</button>
        <a href="/product-details.html?slug=${encodeURIComponent(product.slug)}">
          <img class="thumb-img thumb-img-primary" src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}">
          ${altImg ? `<img class="thumb-img thumb-img-alt" src="${escapeHtml(altImg)}" alt="" aria-hidden="true">` : ''}
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
    const originalLabel = btn.textContent;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await addProductToCart(btn.dataset.productId, 1);
        btn.textContent = '✓ Added';
        btn.classList.add('added');
        setTimeout(() => {
          btn.textContent = originalLabel;
          btn.classList.remove('added');
          btn.disabled = false;
        }, 1200);
      } catch (err) {
        btn.disabled = false;
        alert(err.message);
      }
    });
  });
}

// Cursor-following tilt (max 4deg) on product card hover — skipped entirely
// under prefers-reduced-motion, and naturally inert on touch devices since
// they don't fire mousemove.
function wireCardTilt(container) {
  if (reduceMotion) return;
  container.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const tiltX = (0.5 - py) * 8; // -4deg..4deg
      const tiltY = (px - 0.5) * 8;
      card.style.transform = `perspective(700px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
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
  wireCardTilt(container);
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

// Main image + thumbnails, with a tap-to-zoom lightbox and touch-swipe
// support on the main image. All interaction funnels through showImage() so
// thumbs, swipe, and the lightbox's prev/next always stay in sync.
function renderGallery(product) {
  const mainWrap = document.getElementById('galleryMainWrap');
  const mainImg = document.getElementById('galleryMainImg');
  const thumbs = document.getElementById('galleryThumbs');
  const zoomBtn = document.getElementById('galleryZoomBtn');
  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn = document.getElementById('lightboxNextBtn');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const images = product.images && product.images.length ? product.images : ['/img/placeholder.svg'];
  let currentIndex = 0;

  function showImage(idx) {
    currentIndex = ((idx % images.length) + images.length) % images.length;
    mainImg.src = images[currentIndex];
    mainImg.alt = product.name;
    thumbs.querySelectorAll('img').forEach((t) => t.classList.toggle('active', Number(t.dataset.idx) === currentIndex));
    if (lightbox && lightbox.classList.contains('open')) {
      lightboxImg.src = images[currentIndex];
      lightboxImg.alt = product.name;
    }
  }

  thumbs.innerHTML = images
    .map((img, idx) => `<img src="${escapeHtml(img)}" data-idx="${idx}" alt="${escapeHtml(product.name)} — view ${idx + 1}">`)
    .join('');
  thumbs.querySelectorAll('img').forEach((thumb) => {
    thumb.addEventListener('click', () => showImage(Number(thumb.dataset.idx)));
  });

  showImage(0);

  if (images.length <= 1) {
    if (lightboxPrevBtn) lightboxPrevBtn.style.display = 'none';
    if (lightboxNextBtn) lightboxNextBtn.style.display = 'none';
  }

  if (lightbox) {
    function handleLightboxKeydown(e) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    }

    function openLightbox() {
      lightboxImg.src = images[currentIndex];
      lightboxImg.alt = product.name;
      lightbox.classList.add('open');
      document.addEventListener('keydown', handleLightboxKeydown);
      if (lightboxCloseBtn) lightboxCloseBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.removeEventListener('keydown', handleLightboxKeydown);
    }

    let swiped = false;
    let touchStartX = null;
    if (mainWrap) {
      mainWrap.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        swiped = false;
      }, { passive: true });
      mainWrap.addEventListener('touchmove', (e) => {
        if (touchStartX == null) return;
        if (Math.abs(e.touches[0].clientX - touchStartX) > 10) swiped = true;
      }, { passive: true });
      mainWrap.addEventListener('touchend', (e) => {
        if (touchStartX == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) showImage(currentIndex + (dx < 0 ? 1 : -1));
        touchStartX = null;
      }, { passive: true });
      mainWrap.addEventListener('click', () => {
        if (swiped) {
          swiped = false;
          return;
        }
        openLightbox();
      });
    }

    if (zoomBtn) {
      zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox();
      });
    }
    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => showImage(currentIndex - 1));
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', () => showImage(currentIndex + 1));
  }
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

// Expandable info sections (description, specs, shipping, FAQs, reviews).
// Each header toggles its own panel independently — several can stay open.
function wireAccordion() {
  document.querySelectorAll('#detailAccordion .accordion-header').forEach((header) => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const isOpen = item.classList.toggle('open');
      header.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

const APPLICATION_CARE_CONTENT = {
  polish: {
    heading: 'Applying your polish',
    steps: [
      'Shake the bottle well, then apply a thin base coat and let it set.',
      'Apply two thin coats of color, letting each one set before the next.',
      'Finish with a top coat to seal and add shine.',
    ],
    care: 'Store the bottle upright in a cool, dry place out of direct sunlight, and wipe the neck before closing so the cap doesn\'t stick.',
  },
  'press-ons': {
    heading: 'Applying your press-ons',
    steps: [
      'Push back cuticles and lightly buff the natural nail surface for grip.',
      'Use the Size &amp; Fit Guide to pick the closest-fitting nail for each finger.',
      'Apply adhesive and press each nail firmly in place for 10–20 seconds.',
      'File the edges lightly to finish your shape.',
    ],
    care: 'Store any unused nails flat in their original packaging, away from direct sunlight and heat. To remove, soak in warm water to loosen the adhesive rather than peeling the nail off dry.',
  },
  'nail-art-supplies': {
    heading: 'Using this set',
    steps: ['See the product description above for how this item is used.'],
    care: 'Store in a cool, dry place, and keep small tools and decals away from children.',
  },
};

function renderApplicationCare(product) {
  const container = document.getElementById('applicationCareContent');
  if (!container) return;
  const type = product.attributes && product.attributes.type;
  const content = APPLICATION_CARE_CONTENT[type];

  if (!content) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <h4>${escapeHtml(content.heading)}</h4>
    <ol class="size-guide-steps">
      ${content.steps.map((step) => `<li>${step}</li>`).join('')}
    </ol>
    <p>${content.care}</p>
  `;
}

function renderProductSpecs(product) {
  const item = document.getElementById('productSpecsItem');
  const list = document.getElementById('productSpecsList');
  if (!item || !list) return;

  const attrs = product.attributes || {};
  const rows = [];
  if (product.category && product.category.name) rows.push(['Category', product.category.name]);
  if (attrs.shade) rows.push(['Shade', attrs.shade]);
  if (attrs.finish) rows.push(['Finish', attrs.finish]);
  if (attrs.size) rows.push(['Size', attrs.size]);

  if (rows.length === 0) {
    item.style.display = 'none';
    return;
  }

  item.style.display = '';
  list.innerHTML = rows
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');
}

async function renderShippingFacts() {
  const feeEl = document.getElementById('shipFeeAmount');
  const thresholdEl = document.getElementById('freeShipThreshold');
  if (window.currencyReady) await window.currencyReady;
  if (feeEl) feeEl.textContent = formatMoney(200);
  if (thresholdEl) thresholdEl.textContent = formatMoney(5000);
}

function renderBreadcrumb(product) {
  const nav = document.getElementById('detailBreadcrumb');
  if (!nav) return;
  const categoryName = product.category && product.category.name ? product.category.name : '';
  const categoryId = product.category && product.category._id ? product.category._id : '';
  nav.innerHTML = `
    <a href="/index.html">Home</a>
    <span aria-hidden="true">/</span>
    <a href="/products.html">Shop</a>
    ${
      categoryName
        ? `<span aria-hidden="true">/</span><a href="/products.html?category=${encodeURIComponent(categoryId)}">${escapeHtml(categoryName)}</a>`
        : ''
    }
    <span aria-hidden="true">/</span>
    <span>${escapeHtml(product.name)}</span>
  `;
}

// --- Related products (same category) ---

async function renderRelatedProducts(product) {
  const section = document.getElementById('relatedSection');
  const grid = document.getElementById('relatedGrid');
  if (!section || !grid) return;

  const categoryId = product.category && product.category._id ? product.category._id : product.category;
  if (!categoryId) {
    section.style.display = 'none';
    return;
  }

  try {
    const res = await api.get(`/products${qs({ category: categoryId, limit: 9 })}`);
    const related = res.data.filter((p) => p._id !== product._id).slice(0, 4);

    if (related.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    grid.innerHTML = related.map(renderProductCard).join('');
    wireProductCardActions(grid);
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
  } catch (err) {
    section.style.display = 'none';
  }
}

// --- Recently viewed (localStorage, this browser only) ---

const RECENTLY_VIEWED_KEY = 'nove_recently_viewed';
const RECENTLY_VIEWED_MAX = 8;

function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function recordRecentlyViewed(product) {
  try {
    const items = getRecentlyViewed().filter((p) => p._id !== product._id);
    items.unshift(product);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items.slice(0, RECENTLY_VIEWED_MAX)));
  } catch (err) {
    // localStorage unavailable/full — recently-viewed is a non-critical nicety.
  }
}

function renderRecentlyViewed(currentProductId) {
  const section = document.getElementById('recentlyViewedSection');
  const grid = document.getElementById('recentlyViewedGrid');
  if (!section || !grid) return;

  const items = getRecentlyViewed().filter((p) => p._id !== currentProductId);
  if (items.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = items.map(renderProductCard).join('');
  wireProductCardActions(grid);
  if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
}

// --- Mobile sticky Add to Cart bar ---
// Hidden until the main Add to Cart button scrolls out of view, so it never
// duplicates the primary CTA while it's already on screen.
function wireStickyAddToCart(product) {
  const stickyBar = document.getElementById('mobileStickyCta');
  const trigger = document.getElementById('addToCartBtn');
  const stickyBtn = document.getElementById('stickyAddToCartBtn');
  if (!stickyBar || !trigger || !stickyBtn) return;

  const nameEl = document.getElementById('stickyName');
  const priceEl = document.getElementById('stickyPrice');
  if (nameEl) nameEl.textContent = product.name;
  if (priceEl) priceEl.textContent = formatMoney(productCurrentPrice(product));

  if (product.stock <= 0) {
    stickyBtn.disabled = true;
    stickyBtn.textContent = 'Out of Stock';
  }

  stickyBtn.addEventListener('click', async () => {
    if (product.stock <= 0) return;
    const qtyInput = document.getElementById('qtyInput');
    stickyBtn.disabled = true;
    try {
      await addProductToCart(product._id, Number(qtyInput.value) || 1);
    } catch (err) {
      alert(err.message);
    } finally {
      stickyBtn.disabled = false;
    }
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      stickyBar.classList.toggle('active', !entry.isIntersecting);
    }, { threshold: 0 });
    observer.observe(trigger);
  }
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
    document.getElementById('detailRatingCount').textContent = `(${product.ratingsCount} review${product.ratingsCount === 1 ? '' : 's'})`;
    const reviewCountLabel = document.getElementById('reviewCountLabel');
    if (reviewCountLabel) reviewCountLabel.textContent = `(${reviews.length})`;

    renderBreadcrumb(product);

    const price = productCurrentPrice(product);
    const onSale = price < product.price;
    document.getElementById('detailPrice').textContent = formatMoney(price);
    const strikeEl = document.getElementById('detailPriceStrike');
    strikeEl.textContent = onSale ? formatMoney(product.price) : '';
    strikeEl.style.display = onSale ? 'inline' : 'none';
    const salePillEl = document.getElementById('detailSalePill');
    if (salePillEl) salePillEl.style.display = onSale ? 'inline-block' : 'none';

    const stockNote = document.getElementById('stockNote');
    const addBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (product.stock <= 0) {
      stockNote.textContent = 'Out of stock';
      stockNote.className = 'stock-note out-of-stock-note';
      addBtn.disabled = true;
      if (buyNowBtn) buyNowBtn.disabled = true;
    } else {
      stockNote.textContent = product.stock <= 5 ? `Only ${product.stock} left in stock` : `${product.stock} in stock`;
      stockNote.className = 'stock-note in-stock-note';
      addBtn.disabled = false;
      if (buyNowBtn) buyNowBtn.disabled = false;
    }

    await renderSwatches(product);
    renderGallery(product);
    renderReviews(reviews);
    renderProductSpecs(product);
    renderApplicationCare(product);
    renderShippingFacts();
    wireAccordion();
    wireSizeGuide(product);
    if (typeof initProductGallery === 'function') initProductGallery(product._id);

    const faqSizeItem = document.getElementById('faqSizeItem');
    if (faqSizeItem && product.attributes && product.attributes.type === 'press-ons') {
      faqSizeItem.style.display = 'block';
    }

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

    if (buyNowBtn) {
      // Adds to cart without popping the cart drawer (pointless right before
      // navigating straight to checkout) and reuses the same underlying calls
      // as addProductToCart.
      buyNowBtn.addEventListener('click', async () => {
        buyNowBtn.disabled = true;
        try {
          await window.noveUserReady;
          const quantity = Number(qtyInput.value) || 1;
          if (window.noveUser) {
            await api.post('/cart/items', { productId: product._id, quantity });
          } else {
            addToGuestCart(product._id, quantity);
          }
          window.location.href = '/checkout.html';
        } catch (err) {
          buyNowBtn.disabled = false;
          alert(err.message);
        }
      });
    }

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

    wireStickyAddToCart(product);
    renderRecentlyViewed(product._id);
    recordRecentlyViewed(product);
    renderRelatedProducts(product);

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
