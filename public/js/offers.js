// Homepage "Special Offers" section — admin-managed via /api/offers.

function renderOfferCard(offer) {
  const img = offer.image || '/img/placeholder.svg';

  return `
    <a class="offer-card reveal" href="${escapeHtml(offer.link || '/products.html')}">
      <div class="offer-card-media">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(offer.title)}">
        ${offer.badge ? `<span class="offer-badge">${escapeHtml(offer.badge)}</span>` : ''}
      </div>
      <div class="offer-card-body">
        <h3>${escapeHtml(offer.title)}</h3>
        ${offer.description ? `<p>${escapeHtml(offer.description)}</p>` : ''}
        <span class="offer-card-cta">Shop Now &rarr;</span>
      </div>
    </a>
  `;
}

async function initOffersSection() {
  const grid = document.getElementById('offersGrid');
  const section = document.getElementById('offersSection');
  if (!grid) return;

  try {
    const res = await api.get('/offers');
    if (res.data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = 'block';
    grid.innerHTML = res.data.map(renderOfferCard).join('');
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(grid);
  } catch (err) {
    if (section) section.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initOffersSection);
