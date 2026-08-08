// Lightweight scroll effects: hero parallax + reveal-on-scroll. Plain CSS +
// IntersectionObserver, no dependencies. Respects prefers-reduced-motion.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Hero parallax ---

function initParallax() {
  if (prefersReducedMotion) return;

  const targets = Array.from(document.querySelectorAll('[data-parallax]'));
  if (targets.length === 0) return;

  let ticking = false;

  function update() {
    const viewportH = window.innerHeight;
    targets.forEach((el) => {
      const speed = Number(el.dataset.parallaxSpeed) || 0.15;
      const rect = el.getBoundingClientRect();
      // Only bother computing while the element is anywhere near the viewport.
      if (rect.bottom < -200 || rect.top > viewportH + 200) return;
      const offset = (rect.top - viewportH / 2) * speed;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    });
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// --- Scroll-reveal ---

let revealObserver = null;

// Grids whose direct children (cards) should reveal one after another rather
// than all at once. Delay is precomputed per element (see observeReveal) and
// applied as a CSS transition-delay right before the reveal class is added.
const STAGGER_MS = 60;
const STAGGER_SELECTOR = '.product-grid, .category-grid, .gallery-masonry';

function getRevealObserver() {
  if (revealObserver) return revealObserver;

  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = Number(entry.target.dataset.revealDelay) || 0;
          if (delay) entry.target.style.transitionDelay = `${delay}ms`;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  return revealObserver;
}

// Called on initial load for static markup, and again by page scripts after
// they inject dynamic content (product grids, wishlist grid, order lists...).
function observeReveal(root = document) {
  const elements = root.matches && root.matches('.reveal') ? [root] : Array.from(root.querySelectorAll('.reveal'));

  if (prefersReducedMotion) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // When observeReveal is called directly with a grid element (the pattern
  // every page script already uses), stagger its reveal-eligible children.
  const isStaggeredGrid = root.matches && root.matches(STAGGER_SELECTOR);

  const observer = getRevealObserver();
  elements.forEach((el, idx) => {
    if (el.classList.contains('is-visible')) return;
    if (isStaggeredGrid) el.dataset.revealDelay = String(idx * STAGGER_MS);
    observer.observe(el);
  });
}

window.NoveAnimations = { observeReveal };

document.addEventListener('DOMContentLoaded', () => {
  initParallax();
  observeReveal(document);
});
