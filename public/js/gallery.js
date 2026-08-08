// Masonry-style UGC/try-on gallery grid — homepage (all photos) and product
// detail pages (photos linked to that product only).

function renderGalleryItem(item) {
  return `
    <div class="gallery-item reveal">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.caption || 'Customer photo')}" loading="lazy">
      ${item.caption ? `<p class="gallery-caption">${escapeHtml(item.caption)}</p>` : ''}
    </div>
  `;
}

async function initHomeGallery() {
  const grid = document.getElementById('galleryGrid');
  const section = document.getElementById('gallerySection');
  if (!grid) return;

  try {
    const res = await api.get('/gallery');
    if (res.data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    grid.innerHTML = res.data.map(renderGalleryItem).join('');
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
  } catch (err) {
    if (section) section.style.display = 'none';
  }
}

async function initProductGallery(productId) {
  const grid = document.getElementById('productGalleryGrid');
  const section = document.getElementById('productGallerySection');
  if (!grid || !productId) return;

  try {
    const res = await api.get(`/gallery${qs({ product: productId })}`);
    if (res.data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = 'block';
    grid.innerHTML = res.data.map(renderGalleryItem).join('');
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
  } catch (err) {
    if (section) section.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initHomeGallery);
