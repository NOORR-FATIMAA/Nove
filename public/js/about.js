// about.html — hero copy and value cards are admin-editable via /api/settings.
// The static markup already in the page is a fallback if this fetch fails,
// so errors here are swallowed rather than shown to the visitor.

function renderValueCard(value) {
  return `
    <div class="value-card reveal">
      <h3>${escapeHtml(value.title)}</h3>
      <p>${escapeHtml(value.description || '')}</p>
    </div>
  `;
}

async function initAboutPage() {
  const titleEl = document.getElementById('aboutHeroTitle');
  const subtitleEl = document.getElementById('aboutHeroSubtitle');
  const valuesGrid = document.getElementById('aboutValuesGrid');
  if (!titleEl) return;

  try {
    const res = await api.get('/settings');
    const settings = res.data;

    if (settings.aboutHeroTitle) titleEl.textContent = settings.aboutHeroTitle;
    if (settings.aboutHeroSubtitle) subtitleEl.textContent = settings.aboutHeroSubtitle;

    if (Array.isArray(settings.aboutValues) && settings.aboutValues.length > 0) {
      valuesGrid.innerHTML = settings.aboutValues.map(renderValueCard).join('');
      if (window.NoveAnimations) window.NoveAnimations.observeReveal(valuesGrid);
    }
  } catch (err) {
    // Keep the static fallback content already in the markup.
  }
}

document.addEventListener('DOMContentLoaded', initAboutPage);
