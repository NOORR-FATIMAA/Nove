// Site-wide admin-controlled promo banner, plus homepage-only hero background
// media (video or image) — both driven by /api/settings. Pages without a
// hero section simply skip that half via the element-existence checks below.

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function renderBanner(settings) {
  const bannerEl = document.getElementById('promoBanner');
  if (!bannerEl) return;

  if (!settings.bannerEnabled || !settings.bannerText) {
    bannerEl.classList.remove('show');
    bannerEl.innerHTML = '';
    return;
  }

  const dismissKey = `nove_banner_dismissed_${simpleHash(settings.bannerText)}`;
  if (sessionStorage.getItem(dismissKey)) return;

  const message = escapeHtml(settings.bannerText);
  const content = settings.bannerLink
    ? `<a href="${escapeHtml(settings.bannerLink)}">${message}</a>`
    : `<span>${message}</span>`;

  bannerEl.innerHTML = `
    <div class="promo-banner-inner">
      ${content}
      <button type="button" class="promo-banner-close" id="promoBannerClose" aria-label="Dismiss">&times;</button>
    </div>
  `;
  bannerEl.classList.add('show');

  document.getElementById('promoBannerClose').addEventListener('click', () => {
    bannerEl.classList.remove('show');
    sessionStorage.setItem(dismissKey, '1');
  });
}

function applyHeroMedia(settings) {
  const heroVideoEl = document.getElementById('heroVideoEl');
  const heroImageEl = document.getElementById('heroImageEl');
  if (!heroVideoEl || !heroImageEl) return;

  if (settings.heroMediaType === 'image') {
    heroVideoEl.pause();
    heroVideoEl.style.display = 'none';
    heroImageEl.src = settings.heroImage || '/img/hero-visual.svg';
    heroImageEl.style.display = 'block';
    return;
  }

  heroImageEl.style.display = 'none';
  heroVideoEl.style.display = 'block';

  const source = heroVideoEl.querySelector('source');
  const newSrc = settings.heroVideo || '/videos/hero-fullscreen.mp4';
  if (source && source.getAttribute('src') !== newSrc) {
    source.setAttribute('src', newSrc);
    heroVideoEl.load();
    heroVideoEl.play().catch(() => {
      // Autoplay can be blocked by the browser — the poster image still shows.
    });
  }
}

async function initHomeContent() {
  const hasBanner = document.getElementById('promoBanner');
  const hasHero = document.getElementById('heroVideoEl');
  if (!hasBanner && !hasHero) return;

  try {
    const res = await api.get('/settings');
    renderBanner(res.data);
    applyHeroMedia(res.data);
  } catch (err) {
    // Settings are an enhancement on top of the defaults already in the markup.
  }
}

document.addEventListener('DOMContentLoaded', initHomeContent);
