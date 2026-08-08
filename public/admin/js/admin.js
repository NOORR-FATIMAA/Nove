// Nove Admin Panel — single page, tab-based, all mutations against /api/*.

let categoriesCache = [];

async function requireAdmin() {
  try {
    const res = await api.get('/auth/me');
    if (res.data.role !== 'admin') throw new Error('not admin');
    return res.data;
  } catch (err) {
    window.location.href = '/admin/login.html';
    return null;
  }
}

function wireSidebarNav() {
  document.querySelectorAll('.admin-nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');

      if (btn.dataset.panel === 'panelProducts') loadProducts();
      if (btn.dataset.panel === 'panelCategories') loadCategories();
      if (btn.dataset.panel === 'panelBundles') loadBundles();
      if (btn.dataset.panel === 'panelOffers') loadOffers();
      if (btn.dataset.panel === 'panelGallery') loadGallery();
      if (btn.dataset.panel === 'panelOrders') loadOrders();
      if (btn.dataset.panel === 'panelCoupons') loadCoupons();
      if (btn.dataset.panel === 'panelMessages') loadMessages();
      if (btn.dataset.panel === 'panelAbout') loadAboutSettings();
      if (btn.dataset.panel === 'panelSettings') loadSettings();
    });
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
    await api.post('/auth/logout');
    window.location.href = '/admin/login.html';
  });
}

// ===== Dashboard =====

async function loadDashboard() {
  const res = await api.get('/admin/dashboard');
  const { revenue, orderCount, customerCount, productCount, lowStockProducts, recentOrders } = res.data;

  document.getElementById('statRevenue').textContent = formatPKR(revenue);
  document.getElementById('statOrders').textContent = orderCount;
  document.getElementById('statCustomers').textContent = customerCount;
  document.getElementById('statProducts').textContent = productCount;

  document.getElementById('lowStockTableBody').innerHTML = lowStockProducts
    .map((p) => `<tr class="low-stock-row"><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku)}</td><td>${p.stock}</td></tr>`)
    .join('') || '<tr><td colspan="3">No low stock products.</td></tr>';

  document.getElementById('recentOrdersTableBody').innerHTML = recentOrders
    .map(
      (o) => `
      <tr>
        <td>${escapeHtml(o.orderNumber)}</td>
        <td>${escapeHtml(o.user ? o.user.name : 'Guest')}</td>
        <td>${formatPKR(o.total)}</td>
        <td><span class="status-pill">${escapeHtml(o.orderStatus)}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="5">No orders yet.</td></tr>';
}

// ===== Products =====

async function populateCategorySelect() {
  const select = document.getElementById('pCategory');
  const res = await api.get('/categories');
  categoriesCache = res.data;
  select.innerHTML = res.data.map((c) => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
}

function categoryName(id) {
  const cat = categoriesCache.find((c) => c._id === (id && id._id ? id._id : id));
  return cat ? cat.name : '';
}

async function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

  const res = await api.get('/products?limit=100&sort=-createdAt');
  if (categoriesCache.length === 0) await populateCategorySelect();

  tbody.innerHTML = res.data
    .map((p) => {
      const img = (p.images && p.images[0]) || '/img/placeholder.svg';
      const catName = p.category && p.category.name ? p.category.name : '';
      return `
        <tr data-id="${p._id}">
          <td><img class="thumb" src="${escapeHtml(img)}" alt=""></td>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.sku)}</td>
          <td>${escapeHtml(catName)}</td>
          <td>${formatPKR(p.price)}</td>
          <td>${p.stock}</td>
          <td>${p.isActive ? 'Yes' : 'No'}</td>
          <td class="table-actions">
            <button type="button" class="btn btn-sm btn-outline" data-action="edit">Edit</button>
            <button type="button" class="btn btn-sm btn-outline" data-action="banner" title="Promote this product in the homepage banner">📢</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const product = res.data.find((p) => p._id === id);
      openProductForm(product);
    });
  });

  tbody.querySelectorAll('[data-action="banner"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      const product = res.data.find((p) => p._id === id);
      await promoteProductInBanner(product);
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this product?')) return;
      const id = btn.closest('tr').dataset.id;
      await api.delete(`/products/${id}`);
      loadProducts();
    });
  });
}

// One-click shortcut: set this product as the live homepage banner without
// leaving the Products panel or hand-filling the Settings form.
async function promoteProductInBanner(product) {
  const message = `New: ${product.name}`;
  if (!confirm(`Show "${message}" as the homepage banner?`)) return;

  try {
    await api.patch('/admin/settings', {
      bannerEnabled: true,
      bannerText: message,
      bannerLink: `/product-details.html?slug=${product.slug}`,
    });
    alert('Banner updated — it\'s now live on the homepage.');
  } catch (err) {
    alert(err.message);
  }
}

function wireBannerShortcut() {
  const btn = document.getElementById('goToBannerSettingsBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    document.querySelector('.admin-nav [data-panel="panelSettings"]').classList.add('active');
    document.getElementById('panelSettings').classList.add('active');

    await loadSettings();
    document.getElementById('bannerText').focus();
    document.getElementById('bannerText').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function resetProductForm() {
  const form = document.getElementById('productForm');
  form.reset();
  form.productId.value = '';
  document.getElementById('pExistingImages').innerHTML = '';
  hideAlert(document.getElementById('productFormAlert'));
}

async function openProductForm(product) {
  const form = document.getElementById('productForm');
  resetProductForm();

  if (categoriesCache.length === 0) await populateCategorySelect();

  if (product) {
    form.productId.value = product._id;
    form.name.value = product.name;
    form.sku.value = product.sku;
    form.category.value = product.category && product.category._id ? product.category._id : product.category;
    form.type.value = product.attributes.type;
    form.description.value = product.description || '';
    form.price.value = product.price;
    form.salePrice.value = product.salePrice != null ? product.salePrice : '';
    form.saleStartsAt.value = product.saleStartsAt ? product.saleStartsAt.slice(0, 10) : '';
    form.saleEndsAt.value = product.saleEndsAt ? product.saleEndsAt.slice(0, 10) : '';
    form.stock.value = product.stock;
    form.shade.value = product.attributes.shade || '';
    form.finish.value = product.attributes.finish || '';
    form.size.value = product.attributes.size || '';
    form.swatchHex.value = product.attributes.swatchHex || '#d97ea0';
    form.isFeatured.checked = product.isFeatured;
    form.isActive.checked = product.isActive;

    const existing = document.getElementById('pExistingImages');
    existing.innerHTML = (product.images || [])
      .map(
        (img) => `
        <div class="img-chip" data-path="${escapeHtml(img)}">
          <img src="${escapeHtml(img)}" alt="">
          <button type="button" data-action="remove-image" aria-label="Remove image">&times;</button>
        </div>
      `
      )
      .join('');

    existing.querySelectorAll('[data-action="remove-image"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const chip = btn.closest('.img-chip');
        try {
          await api.patch(`/products/${product._id}/remove-image`, { imagePath: chip.dataset.path });
          chip.remove();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  document.getElementById('productForm').classList.add('open');
  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function wireProductForm() {
  document.getElementById('showAddProductBtn').addEventListener('click', () => openProductForm(null));
  document.getElementById('cancelProductFormBtn').addEventListener('click', () => {
    document.getElementById('productForm').classList.remove('open');
  });

  const form = document.getElementById('productForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('productFormAlert');
    hideAlert(alertEl);

    const fd = new FormData();
    fd.append('name', form.name.value.trim());
    fd.append('sku', form.sku.value.trim());
    fd.append('category', form.category.value);
    fd.append('description', form.description.value.trim());
    fd.append('price', form.price.value);
    if (form.salePrice.value) fd.append('salePrice', form.salePrice.value);
    if (form.saleStartsAt.value) fd.append('saleStartsAt', form.saleStartsAt.value);
    if (form.saleEndsAt.value) fd.append('saleEndsAt', form.saleEndsAt.value);
    fd.append('stock', form.stock.value);
    fd.append('isFeatured', form.isFeatured.checked);
    fd.append('isActive', form.isActive.checked);
    fd.append(
      'attributes',
      JSON.stringify({
        type: form.type.value,
        shade: form.shade.value.trim(),
        finish: form.finish.value.trim(),
        size: form.size.value.trim(),
        swatchHex: form.type.value === 'polish' ? form.swatchHex.value : '',
      })
    );

    Array.from(form.images.files).forEach((file) => fd.append('images', file));

    const productId = form.productId.value;

    try {
      if (productId) {
        await api.patch(`/products/${productId}`, fd, { isFormData: true });
      } else {
        await api.post('/products', fd, { isFormData: true });
      }
      form.classList.remove('open');
      loadProducts();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Categories =====

async function loadCategories() {
  const tbody = document.getElementById('categoriesTableBody');
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

  const res = await api.get('/categories');
  categoriesCache = res.data;

  tbody.innerHTML = res.data
    .map(
      (c) => `
      <tr data-id="${c._id}">
        <td>${c.image ? `<img class="thumb" src="${escapeHtml(c.image)}" alt="">` : '—'}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.slug)}</td>
        <td>${c.isActive ? 'Yes' : 'No'}</td>
        <td class="table-actions">
          <button type="button" class="btn btn-sm btn-outline" data-action="edit">Edit</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `
    )
    .join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      openCategoryForm(res.data.find((c) => c._id === id));
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this category?')) return;
      const id = btn.closest('tr').dataset.id;
      try {
        await api.delete(`/categories/${id}`);
        loadCategories();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function openCategoryForm(category) {
  const form = document.getElementById('categoryForm');
  form.reset();
  hideAlert(document.getElementById('categoryFormAlert'));
  form.categoryId.value = category ? category._id : '';

  const existingImage = document.getElementById('cExistingImage');
  existingImage.innerHTML =
    category && category.image
      ? `<div class="img-chip"><img src="${escapeHtml(category.image)}" alt=""></div>`
      : '';

  if (category) {
    form.name.value = category.name;
    form.description.value = category.description || '';
    form.isActive.checked = category.isActive;
  }

  form.classList.add('open');
  form.scrollIntoView({ behavior: 'smooth' });
}

function wireCategoryForm() {
  document.getElementById('showAddCategoryBtn').addEventListener('click', () => openCategoryForm(null));
  document.getElementById('cancelCategoryFormBtn').addEventListener('click', () => {
    document.getElementById('categoryForm').classList.remove('open');
  });

  const form = document.getElementById('categoryForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('categoryFormAlert');
    hideAlert(alertEl);

    const fd = new FormData();
    fd.append('name', form.name.value.trim());
    fd.append('description', form.description.value.trim());
    fd.append('isActive', form.isActive.checked);
    if (form.image.files[0]) fd.append('image', form.image.files[0]);

    const categoryId = form.categoryId.value;

    try {
      if (categoryId) {
        await api.patch(`/categories/${categoryId}`, fd, { isFormData: true });
      } else {
        await api.post('/categories', fd, { isFormData: true });
      }
      form.classList.remove('open');
      loadCategories();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Bundles =====

let allProductsCache = [];

async function ensureAllProductsCache() {
  if (allProductsCache.length > 0) return allProductsCache;
  const res = await api.get('/products?limit=200');
  allProductsCache = res.data;
  return allProductsCache;
}

function addBundleProductRow(selectedProductId, quantity) {
  const container = document.getElementById('bundleProductRows');
  const row = document.createElement('div');
  row.className = 'form-row bundle-product-row';
  row.style.alignItems = 'center';

  const select = document.createElement('select');
  select.className = 'bundleProductSelect';
  select.innerHTML = allProductsCache
    .map((p) => `<option value="${p._id}" ${p._id === selectedProductId ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.sku)})</option>`)
    .join('');

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.min = '1';
  qtyInput.value = quantity || 1;
  qtyInput.className = 'bundleProductQty';
  qtyInput.style.width = '80px';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-sm btn-danger';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => row.remove());

  const selectWrap = document.createElement('div');
  selectWrap.className = 'form-group';
  selectWrap.style.flex = '2';
  selectWrap.appendChild(select);

  const qtyWrap = document.createElement('div');
  qtyWrap.className = 'form-group';
  qtyWrap.appendChild(qtyInput);

  row.appendChild(selectWrap);
  row.appendChild(qtyWrap);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

async function loadBundles() {
  const tbody = document.getElementById('bundlesTableBody');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  const res = await api.get('/bundles');
  await ensureAllProductsCache();

  tbody.innerHTML = res.data
    .map((b) => {
      const img = (b.images && b.images[0]) || '/img/placeholder.svg';
      const itemCount = b.products.reduce((sum, p) => sum + p.quantity, 0);
      return `
        <tr data-id="${b._id}">
          <td><img class="thumb" src="${escapeHtml(img)}" alt=""></td>
          <td>${escapeHtml(b.name)}</td>
          <td>${itemCount}</td>
          <td>${formatPKR(b.bundlePrice)}</td>
          <td>${b.isActive ? 'Yes' : 'No'}</td>
          <td class="table-actions">
            <button type="button" class="btn btn-sm btn-outline" data-action="edit">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('') || '<tr><td colspan="6">No bundles yet.</td></tr>';

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      openBundleForm(res.data.find((b) => b._id === id));
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this bundle?')) return;
      const id = btn.closest('tr').dataset.id;
      await api.delete(`/bundles/${id}`);
      loadBundles();
    });
  });
}

async function openBundleForm(bundle) {
  const form = document.getElementById('bundleForm');
  form.reset();
  hideAlert(document.getElementById('bundleFormAlert'));
  document.getElementById('bundleProductRows').innerHTML = '';
  document.getElementById('bExistingImages').innerHTML = '';
  form.bundleId.value = bundle ? bundle._id : '';

  await ensureAllProductsCache();

  if (bundle) {
    form.name.value = bundle.name;
    form.description.value = bundle.description || '';
    form.bundlePrice.value = bundle.bundlePrice;
    form.isActive.checked = bundle.isActive;

    bundle.products.forEach((item) => {
      if (item.product) addBundleProductRow(item.product._id, item.quantity);
    });

    const existing = document.getElementById('bExistingImages');
    existing.innerHTML = (bundle.images || [])
      .map((img) => `<div class="img-chip"><img src="${escapeHtml(img)}" alt=""></div>`)
      .join('');
  } else {
    addBundleProductRow();
  }

  form.classList.add('open');
  form.scrollIntoView({ behavior: 'smooth' });
}

function wireBundleForm() {
  document.getElementById('showAddBundleBtn').addEventListener('click', () => openBundleForm(null));
  document.getElementById('cancelBundleFormBtn').addEventListener('click', () => {
    document.getElementById('bundleForm').classList.remove('open');
  });
  document.getElementById('addBundleProductRowBtn').addEventListener('click', async () => {
    await ensureAllProductsCache();
    addBundleProductRow();
  });

  const form = document.getElementById('bundleForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('bundleFormAlert');
    hideAlert(alertEl);

    const rows = Array.from(document.querySelectorAll('.bundle-product-row'));
    const products = rows.map((row) => ({
      product: row.querySelector('.bundleProductSelect').value,
      quantity: Number(row.querySelector('.bundleProductQty').value) || 1,
    }));

    if (products.length === 0) {
      showAlert(alertEl, 'Add at least one product to the bundle.');
      return;
    }

    const fd = new FormData();
    fd.append('name', form.name.value.trim());
    fd.append('description', form.description.value.trim());
    fd.append('bundlePrice', form.bundlePrice.value);
    fd.append('isActive', form.isActive.checked);
    fd.append('products', JSON.stringify(products));
    Array.from(form.images.files).forEach((file) => fd.append('images', file));

    const bundleId = form.bundleId.value;

    try {
      if (bundleId) {
        await api.patch(`/bundles/${bundleId}`, fd, { isFormData: true });
      } else {
        await api.post('/bundles', fd, { isFormData: true });
      }
      form.classList.remove('open');
      loadBundles();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Gallery =====

async function loadGallery() {
  const tbody = document.getElementById('galleryTableBody');
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

  const [galleryRes] = await Promise.all([api.get('/gallery'), ensureAllProductsCache()]);

  const productSelect = document.getElementById('gProduct');
  productSelect.innerHTML =
    '<option value="">None</option>' +
    allProductsCache.map((p) => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join('');

  tbody.innerHTML = galleryRes.data
    .map(
      (item) => `
      <tr data-id="${item._id}">
        <td><img class="thumb" src="${escapeHtml(item.image)}" alt=""></td>
        <td>${escapeHtml(item.caption || '—')}</td>
        <td>${item.product ? escapeHtml(item.product.name) : '—'}</td>
        <td class="table-actions">
          <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="4">No photos yet.</td></tr>';

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this photo?')) return;
      const id = btn.closest('tr').dataset.id;
      await api.delete(`/gallery/${id}`);
      loadGallery();
    });
  });
}

function wireGalleryForm() {
  document.getElementById('showAddGalleryBtn').addEventListener('click', async () => {
    await ensureAllProductsCache();
    const productSelect = document.getElementById('gProduct');
    productSelect.innerHTML =
      '<option value="">None</option>' +
      allProductsCache.map((p) => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join('');
    document.getElementById('galleryForm').classList.add('open');
    document.getElementById('galleryForm').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('cancelGalleryFormBtn').addEventListener('click', () => {
    document.getElementById('galleryForm').classList.remove('open');
  });

  const form = document.getElementById('galleryForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('galleryFormAlert');
    hideAlert(alertEl);

    const fd = new FormData();
    if (form.image.files[0]) fd.append('image', form.image.files[0]);
    fd.append('caption', form.caption.value.trim());
    if (form.product.value) fd.append('product', form.product.value);

    try {
      await api.post('/gallery', fd, { isFormData: true });
      form.reset();
      form.classList.remove('open');
      loadGallery();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Orders =====

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'];

async function loadOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

  const res = await api.get('/orders?limit=100&sort=-createdAt');

  tbody.innerHTML = res.data
    .map(
      (o) => `
      <tr data-id="${o._id}">
        <td>${escapeHtml(o.orderNumber)}</td>
        <td>${escapeHtml(o.user ? o.user.name : o.guestEmail || 'Guest')}</td>
        <td>${o.items.length}</td>
        <td>${formatPKR(o.total)}</td>
        <td>
          <select data-role="paymentStatus">
            ${PAYMENT_STATUSES.map((s) => `<option value="${s}" ${s === o.paymentStatus ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <select data-role="orderStatus">
            ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === o.orderStatus ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td><button type="button" class="btn btn-sm" data-action="save-status">Save</button></td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="8">No orders yet.</td></tr>';

  tbody.querySelectorAll('[data-action="save-status"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const id = row.dataset.id;
      const orderStatus = row.querySelector('[data-role="orderStatus"]').value;
      const paymentStatus = row.querySelector('[data-role="paymentStatus"]').value;
      btn.disabled = true;
      try {
        await api.patch(`/orders/${id}/status`, { orderStatus, paymentStatus });
        btn.textContent = 'Saved!';
        setTimeout(() => {
          btn.textContent = 'Save';
          btn.disabled = false;
        }, 1000);
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });
}

// ===== Coupons =====

async function loadCoupons() {
  const tbody = document.getElementById('couponsTableBody');
  tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

  const res = await api.get('/coupons');

  tbody.innerHTML = res.data
    .map(
      (c) => `
      <tr data-id="${c._id}">
        <td>${escapeHtml(c.code)}</td>
        <td>${escapeHtml(c.type)}</td>
        <td>${c.type === 'percent' ? `${c.value}%` : formatPKR(c.value)}</td>
        <td>${formatPKR(c.minSubtotal)}</td>
        <td>${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
        <td>${c.usedCount}${c.usageLimit != null ? ` / ${c.usageLimit}` : ''}</td>
        <td>${c.isActive ? 'Yes' : 'No'}</td>
        <td class="table-actions">
          <button type="button" class="btn btn-sm btn-outline" data-action="edit">Edit</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="8">No coupons yet.</td></tr>';

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      openCouponForm(res.data.find((c) => c._id === id));
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this coupon?')) return;
      const id = btn.closest('tr').dataset.id;
      await api.delete(`/coupons/${id}`);
      loadCoupons();
    });
  });
}

function openCouponForm(coupon) {
  const form = document.getElementById('couponForm');
  form.reset();
  hideAlert(document.getElementById('couponFormAlert'));
  form.couponId.value = coupon ? coupon._id : '';

  if (coupon) {
    form.code.value = coupon.code;
    form.type.value = coupon.type;
    form.value.value = coupon.value;
    form.minSubtotal.value = coupon.minSubtotal;
    form.expiresAt.value = coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '';
    form.usageLimit.value = coupon.usageLimit != null ? coupon.usageLimit : '';
    form.isActive.checked = coupon.isActive;
  } else {
    form.isActive.checked = true;
  }

  form.classList.add('open');
  form.scrollIntoView({ behavior: 'smooth' });
}

function wireCouponForm() {
  document.getElementById('showAddCouponBtn').addEventListener('click', () => openCouponForm(null));
  document.getElementById('cancelCouponFormBtn').addEventListener('click', () => {
    document.getElementById('couponForm').classList.remove('open');
  });

  const form = document.getElementById('couponForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('couponFormAlert');
    hideAlert(alertEl);

    const payload = {
      code: form.code.value.trim().toUpperCase(),
      type: form.type.value,
      value: Number(form.value.value),
      minSubtotal: Number(form.minSubtotal.value) || 0,
      expiresAt: form.expiresAt.value || null,
      usageLimit: form.usageLimit.value ? Number(form.usageLimit.value) : null,
      isActive: form.isActive.checked,
    };

    const couponId = form.couponId.value;

    try {
      if (couponId) {
        await api.patch(`/coupons/${couponId}`, payload);
      } else {
        await api.post('/coupons', payload);
      }
      form.classList.remove('open');
      loadCoupons();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Messages =====

async function loadMessages() {
  const tbody = document.getElementById('messagesTableBody');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  const res = await api.get('/contact');

  tbody.innerHTML = res.data
    .map(
      (m) => `
      <tr data-id="${m._id}" style="${m.isRead ? '' : 'font-weight:700;'}">
        <td>${escapeHtml(m.name)}<br><small>${escapeHtml(m.email)}</small></td>
        <td>${escapeHtml(m.subject)}</td>
        <td style="white-space:normal;max-width:320px;">${escapeHtml(m.message)}</td>
        <td>${new Date(m.createdAt).toLocaleDateString()}</td>
        <td>${m.isRead ? 'Read' : 'Unread'}</td>
        <td class="table-actions">
          ${!m.isRead ? '<button type="button" class="btn btn-sm btn-outline" data-action="mark-read">Mark Read</button>' : ''}
          <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="6">No messages yet.</td></tr>';

  tbody.querySelectorAll('[data-action="mark-read"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      await api.patch(`/contact/${id}/read`, { isRead: true });
      loadMessages();
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return;
      const id = btn.closest('tr').dataset.id;
      await api.delete(`/contact/${id}`);
      loadMessages();
    });
  });
}

// ===== Settings =====

async function loadSettings() {
  const form = document.getElementById('settingsForm');
  const res = await api.get('/settings');
  const settings = res.data;

  form.usdExchangeRate.value = settings.usdExchangeRate;
  form.heroMediaType.value = settings.heroMediaType || 'video';
  form.bannerEnabled.checked = !!settings.bannerEnabled;
  form.bannerText.value = settings.bannerText || '';
  form.bannerLink.value = settings.bannerLink || '';

  const videoPreview = document.getElementById('heroVideoPreview');
  if (settings.heroVideo) {
    videoPreview.src = settings.heroVideo;
    videoPreview.style.display = 'block';
  }

  const imagePreview = document.getElementById('heroImagePreview');
  if (settings.heroImage) {
    imagePreview.src = settings.heroImage;
    imagePreview.style.display = 'block';
  }
}

function wireSettingsForm() {
  const form = document.getElementById('settingsForm');
  const alertEl = document.getElementById('settingsFormAlert');

  document.getElementById('heroVideoFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('heroVideoPreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  });

  document.getElementById('heroImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('heroImagePreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const fd = new FormData();
    fd.append('usdExchangeRate', form.usdExchangeRate.value);
    fd.append('heroMediaType', form.heroMediaType.value);
    fd.append('bannerEnabled', form.bannerEnabled.checked);
    fd.append('bannerText', form.bannerText.value.trim());
    fd.append('bannerLink', form.bannerLink.value.trim());
    if (form.heroVideo.files[0]) fd.append('heroVideo', form.heroVideo.files[0]);
    if (form.heroImage.files[0]) fd.append('heroImage', form.heroImage.files[0]);

    try {
      await api.patch('/admin/settings', fd, { isFormData: true });
      showAlert(alertEl, 'Settings saved.', 'success');
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== About Page =====

function addAboutValueRow(title, description) {
  const container = document.getElementById('aboutValueRows');
  const row = document.createElement('div');
  row.className = 'bundle-product-row';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'form-group';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Title';
  titleInput.className = 'aboutValueTitle';
  titleInput.value = title || '';
  titleInput.required = true;
  titleWrap.appendChild(titleInput);

  const descWrap = document.createElement('div');
  descWrap.className = 'form-group';
  descWrap.style.flex = '2 1 280px';
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.placeholder = 'Description';
  descInput.className = 'aboutValueDescription';
  descInput.value = description || '';
  descWrap.appendChild(descInput);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-sm btn-danger';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => row.remove());

  row.appendChild(titleWrap);
  row.appendChild(descWrap);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

async function loadAboutSettings() {
  const form = document.getElementById('aboutForm');
  const res = await api.get('/settings');
  const settings = res.data;

  form.aboutHeroTitle.value = settings.aboutHeroTitle || '';
  form.aboutHeroSubtitle.value = settings.aboutHeroSubtitle || '';

  document.getElementById('aboutValueRows').innerHTML = '';
  (settings.aboutValues || []).forEach((v) => addAboutValueRow(v.title, v.description));
  if ((settings.aboutValues || []).length === 0) addAboutValueRow();
}

function wireAboutForm() {
  document.getElementById('addAboutValueRowBtn').addEventListener('click', () => addAboutValueRow());

  const form = document.getElementById('aboutForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('aboutFormAlert');
    hideAlert(alertEl);

    const rows = Array.from(document.querySelectorAll('#aboutValueRows .bundle-product-row'));
    const aboutValues = rows
      .map((row) => ({
        title: row.querySelector('.aboutValueTitle').value.trim(),
        description: row.querySelector('.aboutValueDescription').value.trim(),
      }))
      .filter((v) => v.title);

    try {
      await api.patch('/admin/settings', {
        aboutHeroTitle: form.aboutHeroTitle.value.trim(),
        aboutHeroSubtitle: form.aboutHeroSubtitle.value.trim(),
        aboutValues,
      });
      showAlert(alertEl, 'About page saved.', 'success');
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Offers =====

async function loadOffers() {
  const tbody = document.getElementById('offersTableBody');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  const res = await api.get('/offers');

  tbody.innerHTML = res.data
    .map((o) => {
      const img = o.image || '/img/placeholder.svg';
      return `
        <tr data-id="${o._id}">
          <td><img class="thumb" src="${escapeHtml(img)}" alt=""></td>
          <td>${escapeHtml(o.title)}</td>
          <td>${escapeHtml(o.badge || '—')}</td>
          <td>${o.expiresAt ? new Date(o.expiresAt).toLocaleDateString() : '—'}</td>
          <td>${o.isActive ? 'Yes' : 'No'}</td>
          <td class="table-actions">
            <button type="button" class="btn btn-sm btn-outline" data-action="edit">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('') || '<tr><td colspan="6">No offers yet.</td></tr>';

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      openOfferForm(res.data.find((o) => o._id === id));
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this offer?')) return;
      const id = btn.closest('tr').dataset.id;
      await api.delete(`/offers/${id}`);
      loadOffers();
    });
  });
}

function openOfferForm(offer) {
  const form = document.getElementById('offerForm');
  form.reset();
  hideAlert(document.getElementById('offerFormAlert'));
  document.getElementById('oExistingImage').innerHTML = '';
  form.offerId.value = offer ? offer._id : '';

  if (offer) {
    form.title.value = offer.title;
    form.description.value = offer.description || '';
    form.badge.value = offer.badge || '';
    form.link.value = offer.link || '/products.html';
    form.expiresAt.value = offer.expiresAt ? offer.expiresAt.slice(0, 10) : '';
    form.isActive.checked = offer.isActive;

    if (offer.image) {
      document.getElementById('oExistingImage').innerHTML = `
        <div class="img-chip"><img src="${escapeHtml(offer.image)}" alt=""></div>
      `;
    }
  } else {
    form.isActive.checked = true;
  }

  form.classList.add('open');
  form.scrollIntoView({ behavior: 'smooth' });
}

function wireOfferForm() {
  document.getElementById('showAddOfferBtn').addEventListener('click', () => openOfferForm(null));
  document.getElementById('cancelOfferFormBtn').addEventListener('click', () => {
    document.getElementById('offerForm').classList.remove('open');
  });

  const form = document.getElementById('offerForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('offerFormAlert');
    hideAlert(alertEl);

    const fd = new FormData();
    fd.append('title', form.title.value.trim());
    fd.append('description', form.description.value.trim());
    fd.append('badge', form.badge.value.trim());
    fd.append('link', form.link.value.trim() || '/products.html');
    fd.append('isActive', form.isActive.checked);
    if (form.expiresAt.value) fd.append('expiresAt', form.expiresAt.value);
    if (form.image.files[0]) fd.append('image', form.image.files[0]);

    const offerId = form.offerId.value;

    try {
      if (offerId) {
        await api.patch(`/offers/${offerId}`, fd, { isFormData: true });
      } else {
        await api.post('/offers', fd, { isFormData: true });
      }
      form.classList.remove('open');
      loadOffers();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

// ===== Init =====

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdmin();
  if (!user) return;

  document.getElementById('adminGreeting').textContent = `Welcome back, ${user.name.split(' ')[0]}`;

  wireSidebarNav();
  wireProductForm();
  wireCategoryForm();
  wireBundleForm();
  wireOfferForm();
  wireGalleryForm();
  wireCouponForm();
  wireSettingsForm();
  wireBannerShortcut();
  wireAboutForm();

  await loadDashboard();
});
